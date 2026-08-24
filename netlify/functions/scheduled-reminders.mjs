import { getEnv } from './_env.mjs';
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

export const config = { schedule: '@hourly' };

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23'
  }).formatToParts(date).reduce((a, p) => (a[p.type] = p.value, a), {});
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

function nextDue(iso, rep) {
  const d = new Date(`${iso}T12:00:00Z`);
  if (rep === 'daily') d.setUTCDate(d.getUTCDate() + 1);
  else if (rep === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (rep === 'monthly') {
    const day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + 1);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  } else if (rep === 'yearly') {
    const day = d.getUTCDate();
    d.setUTCDate(1); d.setUTCFullYear(d.getUTCFullYear() + 1);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }
  return d.toISOString().slice(0, 10);
}

function reminderDays(item) {
  const raw = Array.isArray(item?.remind) && item.remind.length ? item.remind : [1];
  return [...new Set(raw.map(Number).filter(Number.isFinite).map(Math.max(0)))].slice(0, 10);
}

function targetTime(item, days) {
  // ก่อนถึงกำหนด: ส่งเวลา 09:00 ของวันเตือน
  // วันครบกำหนด: ใช้เวลาของรายการ ถ้ามี มิฉะนั้น 09:00
  return days === 0 ? (item.time || '09:00') : '09:00';
}

function sentKey(item, days) {
  return `${item.id}|${item.due}|${days}`;
}

export default async () => {
  const pub = getEnv('VAPID_PUBLIC_KEY');
  const priv = getEnv('VAPID_PRIVATE_KEY');
  const subject = getEnv('VAPID_SUBJECT') || 'mailto:admin@example.com';
  if (!pub || !priv) {
    console.error('FamilyOS push: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY is not configured');
    return;
  }

  webpush.setVapidDetails(subject, pub, priv);
  const store = getStore('familyos-push');
  const { blobs } = await store.list({ prefix: 'device/' });
  const now = new Date();
  let sent = 0, expired = 0, failed = 0;

  for (const blob of blobs) {
    const key = blob.key;
    let rec;
    try { rec = await store.get(key, { type: 'json', consistency: 'strong' }); }
    catch (e) { console.error('FamilyOS push: read failed', key, e); continue; }
    if (!rec?.subscription?.endpoint) continue;

    const tz = rec.timezone || 'Asia/Bangkok';
    const z = localParts(now, tz);
    const lastSent = rec.lastSent && typeof rec.lastSent === 'object' ? rec.lastSent : {};
    let changed = false, remove = false;
    const items = Array.isArray(rec.items) ? rec.items : [];

    for (const item of items) {
      if (!item?.id || !item?.due) continue;
      const daysList = reminderDays(item);

      // 1) ส่งการเตือนตามวันที่กำหนด
      for (const daysRaw of daysList) {
        const days = Number(daysRaw);
        const target = addDays(item.due, -days);
        if (z.date !== target) continue;
        if (z.time < targetTime(item, days)) continue;

        const stamp = sentKey(item, days);
        if (lastSent[stamp]) continue;

        const title = days === 0
          ? 'ครบกำหนดวันนี้'
          : `ใกล้ครบกำหนดในอีก ${days} วัน`;
        const body = `${item.em || '📌'} ${item.title || 'มีรายการที่ต้องจัดการ'}`;

        try {
          await webpush.sendNotification(rec.subscription, JSON.stringify({
            title, body,
            icon: '/icon-192.png', badge: '/icon-192.png',
            tag: `familyos-reminder-${item.id}-${days}`,
            renotify: true, url: '/'
          }));
          lastSent[stamp] = now.toISOString();
          changed = true; sent++;
        } catch (e) {
          const code = e?.statusCode;
          if (code === 404 || code === 410) { remove = true; expired++; break; }
          failed++;
          console.error('FamilyOS push failed', key, e?.message || e);
        }
      }
      if (remove) break;

      // 2) สำคัญ: รายการทำซ้ำต้องเลื่อนไปวันถัดไปเอง แม้ผู้ใช้ไม่ได้เลือกเตือน "วันนี้"
      //    ไม่เช่นนั้นรายการ recurring จะค้างอยู่ที่วันเดิมตลอดไป
      if (item.repeat && item.repeat !== 'none' && z.date >= item.due) {
        const advanceKey = `${item.id}|advanced|${item.due}`;
        if (!lastSent[advanceKey]) {
          item.due = nextDue(item.due, item.repeat);
          lastSent[advanceKey] = now.toISOString();
          changed = true;
        }
      }
    }

    if (remove) {
      await store.delete(key);
      continue;
    }

    if (changed) {
      const entries = Object.entries(lastSent)
        .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
        .slice(-500);
      rec.lastSent = Object.fromEntries(entries);
      rec.items = items;
      rec.updatedAt = now.toISOString();
      try { await store.setJSON(key, rec); }
      catch (e) { console.error('FamilyOS push: write failed', key, e); }
    }
  }

  console.log(`FamilyOS push: sent=${sent}, expired=${expired}, failed=${failed}, devices=${blobs.length}`);
};
