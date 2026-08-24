import { getEnv, inspectVapid } from './_env.mjs';
import webpush from 'web-push';

export default async () => {
  const pub = getEnv('VAPID_PUBLIC_KEY');
  const priv = getEnv('VAPID_PRIVATE_KEY');
  const subject = getEnv('VAPID_SUBJECT');

  const missing = [!pub && 'VAPID_PUBLIC_KEY', !priv && 'VAPID_PRIVATE_KEY', !subject && 'VAPID_SUBJECT'].filter(Boolean);
  const problems = inspectVapid(pub, priv, subject);

  if (missing.length || problems.length) {
    return Response.json({
      ok: false, configured: false, missing, problems,
      detail: problems[0] || ('ยังไม่ได้ตั้งค่า: ' + missing.join(', ')),
      lengths: { publicKey: pub ? pub.length : 0, privateKey: priv ? priv.length : 0, subject: subject || null }
    }, { status: 503 });
  }

  try {
    webpush.setVapidDetails(subject, pub, priv);
    return Response.json({
      ok: true, configured: true,
      variables: { VAPID_PUBLIC_KEY: true, VAPID_PRIVATE_KEY: true, VAPID_SUBJECT: true },
      lengths: { publicKey: pub.length, privateKey: priv.length }
    });
  } catch (e) {
    return Response.json({
      ok: false, configured: false,
      detail: 'web-push ปฏิเสธกุญแจนี้: ' + (e && e.message ? e.message : 'ไม่ทราบสาเหตุ') +
              ' — สาเหตุที่พบบ่อยคือกุญแจสาธารณะกับกุญแจส่วนตัวไม่ใช่คู่เดียวกัน ให้สร้างใหม่ทั้งคู่พร้อมกัน',
      lengths: { publicKey: pub.length, privateKey: priv.length, subject }
    }, { status: 503 });
  }
};
