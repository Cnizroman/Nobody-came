/* ============================================================
   Скрытые страницы (secret.html / secret2.html).

   Текста в самих страницах нет: он зашифрован в secret-vault.js
   (AES-GCM-256, ключ из слова через PBKDF2-SHA256, 250 000 итераций).
   Слово, набранное на главной, передаётся через sessionStorage, поэтому
   пасхалка работает как раньше — без лишнего окна. Прямой заход по
   адресу показывает окно со словом; исходник страницы пуст.
   ============================================================ */
(() => {
  'use strict';

  const VAULT = window.SECRET_VAULT;
  const id = document.body.dataset.secret;           // "s1" | "s2"
  const content = document.getElementById('secret-content');
  const gate = document.getElementById('secretGate');
  const input = document.getElementById('secretInput');
  const submitBtn = document.getElementById('secretSubmit');
  const errorEl = document.getElementById('secretError');
  if (!VAULT || !id || !content) return;

  const KEY = 'secret-key-' + id;
  const HANDOFF = 'secret-word';
  const cryptoOk = !!(window.crypto && window.crypto.subtle && window.TextEncoder);
  const te = new TextEncoder();
  const td = new TextDecoder();
  const b64ToBytes = (s) => {
    const bin = atob(s); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const bytesToB64 = (bytes) => {
    let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin);
  };

  async function deriveKey(word) {
    const salt = b64ToBytes(VAULT.kdf.salt);
    const base = await crypto.subtle.importKey('raw', te.encode(word), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: VAULT.kdf.iterations, hash: VAULT.kdf.hash },
      base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']
    );
  }

  async function decryptWith(key) {
    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(VAULT.entries[id].iv) },
        key, b64ToBytes(VAULT.entries[id].ct)
      );
      return td.decode(plain);
    } catch (e) { return null; }
  }

  function reveal() {
    const blocks = [...content.querySelectorAll('.void-block')];
    blocks.forEach((el, i) => setTimeout(() => el.classList.add('visible'), 120 + i * 42));
  }

  function render(html) {
    content.innerHTML = html;
    content.classList.add('unlocked');
    document.body.classList.add('secret-unlocked');
    if (gate) { gate.hidden = true; gate.setAttribute('aria-hidden', 'true'); }
    reveal();
    content.dispatchEvent(new CustomEvent('secret:rendered', { bubbles: true }));
  }

  function fail(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    const box = gate && gate.querySelector('.password-box');
    if (box) { box.classList.add('shake'); setTimeout(() => box.classList.remove('shake'), 400); }
    if (input) { input.value = ''; input.focus(); }
  }

  let busy = false;
  async function submit(word) {
    if (busy) return;
    const value = (word || (input ? input.value : '')).trim().toLowerCase();
    if (!value) { fail('Введите слово'); return; }
    if (!cryptoOk) { fail('Браузер не поддерживает расшифровку. Обновите браузер или откройте сайт по HTTPS.'); return; }
    busy = true;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Проверяю…'; }
    try {
      const key = await deriveKey(value);
      const html = await decryptWith(key);
      if (!html) { fail('Это слово ничего не открыло.'); return; }
      try {
        const raw = await crypto.subtle.exportKey('raw', key);
        sessionStorage.setItem(KEY, bytesToB64(new Uint8Array(raw)));
      } catch (e) { /* приватный режим */ }
      render(html);
    } catch (e) {
      fail('Не удалось проверить слово. Попробуйте ещё раз.');
    } finally {
      busy = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Открыть'; }
    }
  }

  if (submitBtn) submitBtn.addEventListener('click', () => submit());
  if (input) {
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    setTimeout(() => input.focus({ preventScroll: true }), 60);
  }

  (async () => {
    if (!cryptoOk) { fail('Браузер не поддерживает расшифровку. Обновите браузер или откройте сайт по HTTPS.'); return; }
    // слово, набранное на главной, открывает страницу сразу
    let handoff = null;
    try { handoff = sessionStorage.getItem(HANDOFF); if (handoff) sessionStorage.removeItem(HANDOFF); } catch (e) {}
    if (handoff) { await submit(handoff); if (content.classList.contains('unlocked')) return; }
    // иначе — ключ, сохранённый при прошлом открытии в этой сессии
    let saved = null;
    try { saved = sessionStorage.getItem(KEY); } catch (e) {}
    if (saved) {
      try {
        const key = await crypto.subtle.importKey('raw', b64ToBytes(saved), 'AES-GCM', true, ['decrypt']);
        const html = await decryptWith(key);
        if (html) { render(html); return; }
      } catch (e) { /* ключ устарел */ }
      try { sessionStorage.removeItem(KEY); } catch (e) {}
    }
    if (gate) gate.hidden = false;
  })();
})();
