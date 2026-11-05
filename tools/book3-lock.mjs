#!/usr/bin/env node
/**
 * Шифрует текст третьей книги («Где нас нет») в book3-vault.js.
 *
 * Зачем: пароль на статическом сайте нельзя «спрятать» — пока текст лежит
 * в HTML, любой может открыть исходник страницы или удалить оверлей.
 * Поэтому текст хранится только в зашифрованном виде (AES-GCM 256,
 * ключ из пароля через PBKDF2-SHA256), а расшифровывается в браузере.
 *
 * Использование:
 *   node tools/book3-lock.mjs            # из book3-source.html
 *   node tools/book3-lock.mjs путь.html  # из другого файла
 *
 * book3-source.html в git не попадает (см. .gitignore).
 */
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ITER = 250000;
const PASSWORDS = ['накануне', 'начало']; // [основной текст, "начало истории"]
const root = path.resolve(new URL('.', import.meta.url).pathname, '..');
const srcPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'book3-source.html');

if (!fs.existsSync(srcPath)) {
  console.error('Нет файла с текстом:', srcPath);
  process.exit(1);
}

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

const raw = fs.readFileSync(srcPath, 'utf8');
const startTag = '<div id="book-content">';
const s = raw.indexOf(startTag);
const e = raw.indexOf('\n    </div>\n\n    <script>');
if (s < 0 || e < 0) { console.error('Не нашёл блок #book-content в', srcPath); process.exit(1); }
let inner = raw.slice(s + startTag.length, e);

const mainHtml = inner.trim();

const salt = crypto.getRandomValues(new Uint8Array(16));
// оба пароля («накануне» и «начало») открывают один и тот же текст —
// так было и раньше: второй пароль в старом коде дублировал первую ветку.
const entries = {};
for (const [name, pass] of Object.entries({ main: PASSWORDS[0], alt: PASSWORDS[1] })) {
  entries[name] = await seal(mainHtml, pass, salt);
}

const vault = {
  v: 1,
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: ITER, salt: b64(salt) },
  entries,
};

fs.writeFileSync(path.join(root, 'book3-vault.js'),
  '/* Сгенерировано tools/book3-lock.mjs — не редактировать вручную.\n' +
  '   Текст книги здесь только в зашифрованном виде (AES-GCM, ключ из пароля). */\n' +
  'window.BOOK3_VAULT=' + JSON.stringify(vault) + ';\n');

console.log('Готово: book3-vault.js');
console.log('  текст:', (mainHtml.length / 1024).toFixed(1), 'КБ, пароли:',
  PASSWORDS.join(' / '));
