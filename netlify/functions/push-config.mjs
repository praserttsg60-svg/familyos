import { getEnv } from './_env.mjs';
export default async () => {
  const key = getEnv('VAPID_PUBLIC_KEY');
  if (!key) return Response.json({ error: 'VAPID_PUBLIC_KEY is not configured' }, { status: 503 });
  return Response.json({ publicKey: key });
};
