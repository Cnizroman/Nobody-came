(() => {
  'use strict';

  const VAULT = window.BOOK3_VAULT;
  const SESSION_KEY = 'book3-unlocked-key';
  const overlay = document.getElementById('passwordOverlay');
  const box = document.getElementById('passwordBox');
  const input = document.getElementById('passwordInput');
  const errorMsg = document.getElementById('errorMsg');
  const unlockBtn = document.getElementById('unlockBtn');
  const closeBtn = document.getElementById('closePasswordBtn');
  const content = document.getElementById('book-content');

  if (!overlay || !content) return;

  const b64ToBytes = (s) => {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const bytesToB64 = (bytes) => {
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  };

  const cryptoOk = !!(window.crypto && window.crypto.subtle && window.TextEncoder);
  const te = new TextEncoder();
  const td = new TextDecoder();

  async function deriveKey(password) {
    const salt = b64ToBytes(VAULT.kdf.salt);
    const base = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: VAULT.kdf.iterations, hash: VAULT.kdf.hash },
      base,
      { name: 'AES-GCM', length: 256 },
      true,            // нужен export → чтобы не спрашивать пароль при обновлении страницы
      ['encrypt', 'decrypt']
    );
  }

  async function tryDecrypt(key, entry) {
    if (!entry) return null;
    try {
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(entry.iv) },
        key,
        b64ToBytes(entry.ct)
      );
      return td.decode(plain);
    } catch (e) {
      return null;
    }
  }

  async function openWith(key) {
    for (const name of ['main', 'alt']) {
      const html = await tryDecrypt(key, VAULT.entries[name]);
      if (html) return html;
    }
    return null;
  }

  function render(html) {
    content.innerHTML = html;
    content.classList.add('unlocked');
    document.body.classList.add('book3-unlocked');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    initFinalVoice(content);
    startStars();
    document.dispatchEvent(new CustomEvent('book3:unlocked'));
  }

  function fail(message) {
    errorMsg.textContent = message;
    if (box) {
      box.classList.add('shake');
      setTimeout(() => box.classList.remove('shake'), 400);
    }
    input.value = '';
    input.focus();
  }

  let busy = false;
  async function submit() {
    if (busy) return;
    const value = input.value.trim().toLowerCase();
    if (!value) { fail('Введите слово'); return; }
    if (!cryptoOk) { fail('Браузер не поддерживает расшифровку. Обновите браузер или откройте сайт по HTTPS.'); return; }
    busy = true;
    unlockBtn.disabled = true;
    const label = unlockBtn.textContent;
    unlockBtn.textContent = 'Проверяю…';
    errorMsg.textContent = '';
    try {
      const key = await deriveKey(value);
      const html = await openWith(key);
      if (!html) { fail('❌ Неверный пароль.'); return; }
      try {
        const raw = await crypto.subtle.exportKey('raw', key);
        sessionStorage.setItem(SESSION_KEY, bytesToB64(new Uint8Array(raw)));
      } catch (e) {
        /* приватный режим — просто спросим пароль снова после перезагрузки */
      }
      render(html);
    } catch (e) {
      fail('Не удалось проверить пароль. Попробуйте ещё раз.');
    } finally {
      busy = false;
      unlockBtn.disabled = false;
      unlockBtn.textContent = label;
    }
  }

  unlockBtn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  closeBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
  input.focus();


  (async () => {
    if (!cryptoOk) return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const key = await crypto.subtle.importKey('raw', b64ToBytes(saved), 'AES-GCM', true, ['decrypt']);
      const html = await openWith(key);
      if (html) { render(html); return; }
    } catch (e) { /* ключ устарел после обновления текста */ }
    sessionStorage.removeItem(SESSION_KEY);
  })();

  /* ---------- финальное голосовое сообщение ---------- */
  function initFinalVoice(root) {
    const scope = root || document;
    const boxEl = scope.querySelector ? scope.querySelector('[data-final-voice]') : null;
    if (!boxEl || boxEl.dataset.ready === '1') return;
    boxEl.dataset.ready = '1';
    const audio = boxEl.querySelector('.final-voice-audio');
    const play = boxEl.querySelector('.final-voice-play');
    const status = boxEl.querySelector('.final-voice-status');
    const current = boxEl.querySelector('.final-voice-current');
    const duration = boxEl.querySelector('.final-voice-duration');
    const bars = [...boxEl.querySelectorAll('.final-voice-wave i')];
    const unfinished = scope.querySelector('[data-message-unfinished]');
    if (!audio || !play || !status) return;
    const fmt = sec => {
      if (!Number.isFinite(sec)) return '0:00';
      sec = Math.max(0, Math.floor(sec));
      return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    };
    const paint = () => {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      bars.forEach((bar, idx) => bar.classList.toggle('active', idx / bars.length < ratio));
      if (current) current.textContent = fmt(audio.currentTime);
    };
    play.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => {
          play.textContent = '❚❚';
          play.setAttribute('aria-label', 'Поставить голосовое на паузу');
          status.textContent = 'идёт воспроизведение';
        }).catch(() => { status.textContent = 'не удалось воспроизвести аудио'; });
      } else {
        audio.pause();
      }
    });
    audio.addEventListener('loadedmetadata', () => { if (duration) duration.textContent = fmt(audio.duration); });
    audio.addEventListener('timeupdate', paint);
    audio.addEventListener('pause', () => {
      if (!audio.ended) {
        play.textContent = '▶';
        play.setAttribute('aria-label', 'Продолжить голосовое');
        status.textContent = 'приостановлено';
      }
    });
    audio.addEventListener('ended', () => {
      play.textContent = '↻';
      play.setAttribute('aria-label', 'Прослушать голосовое ещё раз');
      status.textContent = 'сообщение завершено';
      paint();
      if (unfinished) requestAnimationFrame(() => unfinished.classList.add('visible'));
    });
    bars.forEach((bar, idx) => bar.addEventListener('click', () => {
      if (audio.duration) { audio.currentTime = audio.duration * (idx / bars.length); paint(); }
    }));
    audio.addEventListener('error', () => { status.textContent = 'аудиофайл не найден'; });
  }

  /* ---------- мерцающие звёзды ---------- */
  function startStars() {
    const container = document.getElementById('starsContainer');
    if (!container || container.dataset.ready === '1') return;
    container.dataset.ready = '1';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 120; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const size = Math.random() * 4 + 2;
      star.style.width = size + 'px';
      star.style.height = size + 'px';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
      star.style.animationDelay = (Math.random() * 5) + 's';
      star.style.opacity = Math.random() * 0.6 + 0.2;
      frag.appendChild(star);
    }
    container.appendChild(frag);
  }
})();
