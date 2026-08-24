import { getStore } from '@netlify/blobs';

const store = getStore('familyos-push');

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const body = await req.json();
    if (!body?.deviceId || !body?.subscription?.endpoint) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    const record = {
      deviceId: String(body.deviceId).slice(0, 120),
      subscription: body.subscription,
      timezone: body.timezone || 'Asia/Bangkok',
      items: Array.isArray(body.items) ? body.items.slice(0, 300) : [],
      updatedAt: new Date().toISOString(),
      lastSent: body.lastSent || {}
    };
    await store.setJSON(`device/${record.deviceId}`, record);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Unable to save subscription' }, { status: 500 });
  }
};
