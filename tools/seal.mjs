// Seals and opens the private notes for build.py: AES-256-GCM, key from the password by PBKDF2-SHA256.
// stdin: {"mode": "seal"|"open", "password": "...", "salt": "<base64>", "iter": 310000, "items": [...]}
//   seal items: [{"id": "...", "text": "..."}]   ->  stdout [{"id", "iv", "ct"}]   (base64; ct ends with the 16 byte tag, as WebCrypto expects)
//   open items: [{"id", "iv", "ct"}]             ->  stdout [{"id", "text"}]
// The IV is an HMAC of the id and text, so an unchanged note seals to the same bytes and the build stays reproducible.
import { pbkdf2Sync, createCipheriv, createDecipheriv, createHmac } from 'node:crypto';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const { mode, password, salt, iter, items } = JSON.parse(input);
const key = pbkdf2Sync(Buffer.from(password, 'utf8'), Buffer.from(salt, 'base64'), iter, 32, 'sha256');

const out = items.map((it) => {
  if (mode === 'seal') {
    const iv = createHmac('sha256', key).update(it.id + '\n' + it.text).digest().subarray(0, 12);
    const c = createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([c.update(it.text, 'utf8'), c.final(), c.getAuthTag()]);
    return { id: it.id, iv: iv.toString('base64'), ct: ct.toString('base64') };
  }
  const raw = Buffer.from(it.ct, 'base64');
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(it.iv, 'base64'));
  d.setAuthTag(raw.subarray(raw.length - 16));
  const text = Buffer.concat([d.update(raw.subarray(0, raw.length - 16)), d.final()]).toString('utf8');
  return { id: it.id, text };
});
process.stdout.write(JSON.stringify(out));
