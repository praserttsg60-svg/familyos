import { getEnv } from './_env.mjs';
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

const store = getStore('familyos-push');

export default async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method Not Allowed' }, { status: 405 });

  const pub = getEnv('VAPID_PUBLIC_KEY');
  const priv = getEnv('VAPID_PRIVATE_KEY');
  const subject = getEnv('VAPID_SUBJECT') || 'mailto:admin@example.com';
  if (!pub || !priv) return Response.json({ error: 'VAPID keys are not configured' }, { status: 503 });

  let deviceId;
  try {
    ({ deviceId } = await req.json());
    if (!deviceId) return Response.json({ error: 'deviceId is required' }, { status: 400 });

    const key = `device/${String(deviceId).slice(0, 120)}`;
    const rec = await store.get(key, { type: 'json', consistency: 'strong' });
    if (!rec?.subscription?.endpoint) return Response.json({ error: 'ไม่พบ Push subscription ของเครื่องนี้' }, { status: 404 });

    webpush.setVapidDetails(subject, pub, priv);
    await webpush.sendNotification(rec.subscription, JSON.stringify({
      title: 'Family OS — ทดสอบสำเร็จ ✅',
      body: 'ถ้าเห็นข้อความนี้ ระบบแจ้งเตือนจริงพร้อมใช้งานแล้ว',
      icon: '/icon-192.png', badge: '/icon-192.png',
      tag: 'familyos-test', renotify: true, url: '/'
    }));

    return Response.json({ ok: true });
  } catch (e) {
    console.error('push-test failed', e);
    if ((e?.statusCode === 404 || e?.statusCode === 410) && deviceId) {
      try { await store.delete(`device/${String(deviceId).slice(0, 120)}`); } catch (_) {}
      return Response.json({ error: 'Push subscription หมดอายุหรือถูกยกเลิก ให้กดเปิดการแจ้งเตือนใหม่' }, { status: 410 });
    }
    return Response.json({ error: e?.message || 'ส่ง Push ไม่สำเร็จ' }, { status: 500 });
  }
};
