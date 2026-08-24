/* อ่านค่า Environment Variable และตัดช่องว่าง/บรรทัดใหม่ที่มักติดมาตอนคัดลอกวาง
   สาเหตุที่ VAPID พังบ่อยที่สุดคือมีช่องว่างหรือ newline ปนอยู่ท้ายค่า */
export function getEnv(name) {
  let v;
  const p = typeof process !== 'undefined' ? process.env : undefined;
  if (p && typeof p[name] === 'string') v = p[name];
  if (!v) {
    try { const n = globalThis.Netlify; if (n?.env?.get) v = n.env.get(name); } catch (_) {}
  }
  if (typeof v !== 'string') return undefined;
  v = v.replace(/^[\s"']+|[\s"']+$/g, '');   // ตัดช่องว่าง เครื่องหมายคำพูด บรรทัดใหม่
  return v.length ? v : undefined;
}

/* ตรวจรูปแบบกุญแจ VAPID อย่างละเอียด เพื่อบอกได้ว่าผิดตรงไหน */
export function inspectVapid(pub, priv, subject) {
  const problems = [];
  const b64u = /^[A-Za-z0-9_-]+$/;

  if (!subject) problems.push('ยังไม่ได้ตั้ง VAPID_SUBJECT');
  else if (!/^mailto:\S+@\S+\.\S+$/.test(subject) && !/^https:\/\/\S+$/.test(subject))
    problems.push('VAPID_SUBJECT ต้องขึ้นต้นด้วย mailto: ตามด้วยอีเมล เช่น mailto:me@example.com (หรือเป็น https://... ก็ได้) — ค่าปัจจุบันคือ "' + subject + '"');

  if (!pub) problems.push('ยังไม่ได้ตั้ง VAPID_PUBLIC_KEY');
  else {
    if (/[+/=]/.test(pub)) problems.push('VAPID_PUBLIC_KEY อยู่ในรูปแบบ base64 ธรรมดา (มี + / =) ต้องใช้แบบ base64url (มีแค่ - _ ) — ให้สร้างกุญแจใหม่');
    else if (!b64u.test(pub)) problems.push('VAPID_PUBLIC_KEY มีอักขระที่ใช้ไม่ได้ อาจมีช่องว่างหรือขึ้นบรรทัดใหม่ปนอยู่');
    else if (pub.length < 86 || pub.length > 88) problems.push('VAPID_PUBLIC_KEY ยาว ' + pub.length + ' ตัวอักษร แต่ต้องยาว 87–88 ตัวอักษร (อาจคัดลอกมาไม่ครบ)');
  }

  if (!priv) problems.push('ยังไม่ได้ตั้ง VAPID_PRIVATE_KEY');
  else {
    if (/[+/=]/.test(priv)) problems.push('VAPID_PRIVATE_KEY อยู่ในรูปแบบ base64 ธรรมดา ต้องใช้แบบ base64url — ให้สร้างกุญแจใหม่');
    else if (!b64u.test(priv)) problems.push('VAPID_PRIVATE_KEY มีอักขระที่ใช้ไม่ได้ อาจมีช่องว่างปนอยู่');
    else if (priv.length < 42 || priv.length > 44) problems.push('VAPID_PRIVATE_KEY ยาว ' + priv.length + ' ตัวอักษร แต่ต้องยาว 43 ตัวอักษร');
  }

  return problems;
}
