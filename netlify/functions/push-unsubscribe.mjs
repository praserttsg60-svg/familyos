import { getStore } from '@netlify/blobs';
const store = getStore('familyos-push');
export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const { deviceId } = await req.json();
    if (deviceId) await store.delete(`device/${String(deviceId).slice(0,120)}`);
    return Response.json({ ok: true });
  } catch (e) { return Response.json({ error: 'Unable to unsubscribe' }, { status: 500 }); }
};
