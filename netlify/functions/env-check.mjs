import { getEnv } from './_env.mjs';
export default async () => { const variables={VAPID_PUBLIC_KEY:!!getEnv('VAPID_PUBLIC_KEY'),VAPID_PRIVATE_KEY:!!getEnv('VAPID_PRIVATE_KEY'),VAPID_SUBJECT:!!getEnv('VAPID_SUBJECT')}; const ok=Object.values(variables).every(Boolean); return Response.json({ok,variables},{status:ok?200:503}); };
