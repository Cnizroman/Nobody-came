#!/usr/bin/env node
/**
 * Шифрует тексты скрытых страниц (secret.html → «The Void», secret2.html)
 * в secret-vault.js. Слова-ключи те же, что открывают страницы с главной:
 * «конец» и «осознание».
 *
 * Исходники с открытым текстом (secret-source.html, secret2-source.html)
 * в git не попадают — см. .gitignore.
 *
 *   node tools/secret-lock.mjs
 */
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ITER = 250000;
const PAGES = [
  { key: 's1', file: 'secret-source.html',  password: 'конец' },
  { key: 's2', file: 'secret2-source.html', password: 'осознание' },
];
const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const b64 = (buf) => Buffer.from(buf).toString('base64');
const enc = new TextEncoder();

async function derive(password, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

async function seal(plain, password, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  return { iv: b64(iv), ct: b64(ct) };
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const entries = {};
for (const page of PAGES) {
  const file = path.join(root, page.file);
  if (!fs.existsSync(file)) {
    console.error('Нет файла с текстом:', page.file);
    process.exit(1);
  }
  const html = fs.readFileSync(file, 'utf8');
  const s = html.indexOf('<main class="secret-wrap">');
  const e = html.indexOf('</main>', s);
  if (s < 0 || e < 0) { console.error('Не нашёл <main class="secret-wrap"> в', page.file); process.exit(1); }
  const inner = html.slice(s + '<main class="secret-wrap">'.length, e).trim();
  entries[page.key] = await seal(inner, page.password, salt);
  console.log(`  ${page.file}: ${(inner.length / 1024).toFixed(1)} КБ → ${page.key}`);
}

fs.writeFileSync(path.join(root, 'secret-vault.js'),
  '/* Сгенерировано tools/secret-lock.mjs — не редактировать вручную.\n' +
  '   Тексты скрытых страниц здесь только в зашифрованном виде (AES-GCM, ключ из слова). */\n' +
  'window.SECRET_VAULT=' + JSON.stringify({ v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITER, salt: b64(salt) }, entries }) + ';\n');
console.log('Готово: secret-vault.js');
