// ============================================================
//  АНИМАЦИЯ НАБОРА ТЕКСТА (для intro)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const typeElements = document.querySelectorAll('.typewriter');
    typeElements.forEach(el => {
        const text = el.textContent.trim();
        el.textContent = '';
        let index = 0;
        const speed = 30;
        function type() {
            if (index < text.length) {
                el.textContent += text.charAt(index);
                index++;
                setTimeout(type, speed);
            }
        }
        setTimeout(type, 400);
    });
});

// ============================================================
//  ПЛАВНАЯ НАВИГАЦИЯ
// ============================================================
document.querySelectorAll('a[href]').forEach(link => {
    if (link.href && link.href.includes('.html') && !link.href.includes('http')) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.href;
            const container = document.querySelector('.container');
            if (container) {
                container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                container.style.opacity = '0.2';
                container.style.transform = 'scale(0.97)';
                setTimeout(() => {
                    window.location.href = url;
                }, 450);
            } else {
                window.location.href = url;
            }
        });
    }
});

// ============================================================
//  СОХРАНЕНИЕ ПРОГРЕССА ЧТЕНИЯ
// ============================================================
window.addEventListener('beforeunload', () => {
    localStorage.setItem('scrollPos_' + window.location.pathname, window.scrollY);
});
window.addEventListener('load', () => {
    const saved = localStorage.getItem('scrollPos_' + window.location.pathname);
    if (saved) {
        setTimeout(() => {
            window.scrollTo({ top: parseInt(saved), behavior: 'smooth' });
        }, 300);
    }
});

// ============================================================
//  КНОПКА "НАВЕРХ"
// ============================================================
const btn = document.createElement('button');
btn.className = 'scroll-top-btn';
btn.innerHTML = '↑';
btn.setAttribute('aria-label', 'Наверх');
document.body.appendChild(btn);

window.addEventListener('scroll', () => {
    if (window.scrollY > 350) {
        btn.classList.add('visible');
    } else {
        btn.classList.remove('visible');
    }
});

btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ============================================================
//  ПОЯВЛЕНИЕ ЭЛЕМЕНТОВ ПРИ СКРОЛЛЕ
// ============================================================
if ('IntersectionObserver' in window) {
    const elements = document.querySelectorAll('main p, main h3, main h4, .quote, .big-quote, .dialog');
    elements.forEach(el => {
        if (el.closest('.quote') && !el.classList.contains('quote')) return;
        if (el.classList.contains('fade-in')) return;
        el.classList.add('fade-in');
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
}

// ============================================================
//  ПОДСВЕТКА АКТИВНОЙ СТРАНИЦЫ
// ============================================================
const currentPath = window.location.pathname.split('/').pop();
document.querySelectorAll('.top-nav a').forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath) {
        link.classList.add('active');
    }
});

// ============================================================
//  СНЕГОПАД ДЛЯ BOOK1 — ГОЛУБОЙ (адаптивный под тему)
// ============================================================
function createSnow() {
    const isBook1 = document.body.classList.contains('theme-book1');
    if (!isBook1) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:0;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let W, H;
    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const flakes = [];
    const count = 130;
    // Цвет снега – берём из CSS-переменной accent-book1 (с учётом темы)
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent-book1').trim() || '#6bb8d4';
    const rgba = hexToRgba(color, 0.7);

    function hexToRgba(hex, alpha) {
        let r, g, b;
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
            r = parseInt(hex.substring(0,2), 16);
            g = parseInt(hex.substring(2,4), 16);
            b = parseInt(hex.substring(4,6), 16);
        } else {
            return 'rgba(107,184,212,0.7)';
        }
        return `rgba(${r},${g},${b},${alpha})`;
    }

    for (let i = 0; i < count; i++) {
        flakes.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 3 + 1,
            speed: Math.random() * 1.2 + 0.4,
            wind: (Math.random() - 0.5) * 0.4,
        });
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = rgba;
        flakes.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
            ctx.fill();
            f.y += f.speed;
            f.x += f.wind;
            if (f.y > H) { f.y = -5; f.x = Math.random() * W; }
            if (f.x > W) f.x = 0;
            if (f.x < 0) f.x = W;
        });
        requestAnimationFrame(draw);
    }
    draw();
}
window.addEventListener('load', createSnow);

// ============================================================
//  ПАНЕЛЬ УПРАВЛЕНИЯ (тема + размер текста) — ГАРАНТИРОВАННОЕ ПОЯВЛЕНИЕ
// ============================================================
(function createToolbar() {
    // Убедимся, что панель не создаётся повторно
    if (document.getElementById('toolbar-toggle')) return;

    // Создаём элементы
    const toggle = document.createElement('button');
    toggle.id = 'toolbar-toggle';
    toggle.innerHTML = '⚙️';
    toggle.setAttribute('aria-label', 'Настройки');
    document.body.appendChild(toggle);

    const panel = document.createElement('div');
    panel.id = 'toolbar-panel';
    panel.innerHTML = `
        <div class="toolbar-row">
            <span class="toolbar-label">Тема</span>
            <button class="theme-btn" id="themeToggle">🌙</button>
        </div>
        <div class="toolbar-row">
            <span class="toolbar-label">Размер</span>
            <div class="size-btn-group">
                <button class="size-btn" data-size="small">A-</button>
                <button class="size-btn active" data-size="medium">A</button>
                <button class="size-btn" data-size="large">A+</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);

    // Состояния (тёмная тема – основная)
    let currentTheme = localStorage.getItem('theme') || 'dark';
    let currentSize = localStorage.getItem('textSize') || 'medium';

    function applyTheme(theme) {
        document.body.classList.toggle('light-theme', theme === 'light');
        const btn = document.getElementById('themeToggle');
        if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
        localStorage.setItem('theme', theme);
        currentTheme = theme;
    }

    function applySize(size) {
        const html = document.documentElement;
        html.classList.remove('text-small', 'text-medium', 'text-large');
        if (size !== 'medium') {
            html.classList.add('text-' + size);
        }
        document.querySelectorAll('.size-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.size === size);
        });
        localStorage.setItem('textSize', size);
        currentSize = size;
    }

    // Применяем сохранённые настройки (или дефолтные)
    applyTheme(currentTheme);
    applySize(currentSize);

    // Обработчики событий
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    document.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applySize(btn.dataset.size);
        });
    });

    // Закрываем панель при клике вне неё
    document.addEventListener('click', (e) => {
        if (panel && !panel.contains(e.target) && e.target !== toggle) {
            panel.classList.remove('open');
        }
    });

    console.log('🛠️ Панель управления загружена');
})();

// Дополнительная страховка: если панель не появилась, создать её через 1 секунду
setTimeout(() => {
    if (!document.getElementById('toolbar-toggle')) {
        // Повторно вызываем создание (но функция уже выполнилась, поэтому просто пересоздадим)
        // Просто вызовем функцию ещё раз, но она проверяет наличие, так что ничего страшного
        // Однако функция обёрнута в IIFE и уже выполнилась, но мы можем вызвать её снова,
        // если переопределим – но проще просто создать элементы вручную.
        // Для надёжности добавим проверку и создадим заново.
        (function createToolbarFallback() {
            if (document.getElementById('toolbar-toggle')) return;
            const toggle = document.createElement('button');
            toggle.id = 'toolbar-toggle';
            toggle.innerHTML = '⚙️';
            toggle.setAttribute('aria-label', 'Настройки');
            document.body.appendChild(toggle);
            const panel = document.createElement('div');
            panel.id = 'toolbar-panel';
            panel.innerHTML = `
                <div class="toolbar-row">
                    <span class="toolbar-label">Тема</span>
                    <button class="theme-btn" id="themeToggle">🌙</button>
                </div>
                <div class="toolbar-row">
                    <span class="toolbar-label">Размер</span>
                    <div class="size-btn-group">
                        <button class="size-btn" data-size="small">A-</button>
                        <button class="size-btn active" data-size="medium">A</button>
                        <button class="size-btn" data-size="large">A+</button>
                    </div>
                </div>
            `;
            document.body.appendChild(panel);
            // Повторно применить настройки
            let theme = localStorage.getItem('theme') || 'dark';
            let size = localStorage.getItem('textSize') || 'medium';
            document.body.classList.toggle('light-theme', theme === 'light');
            document.getElementById('themeToggle').textContent = theme === 'light' ? '☀️' : '🌙';
            const html = document.documentElement;
            html.classList.remove('text-small', 'text-medium', 'text-large');
            if (size !== 'medium') html.classList.add('text-' + size);
            document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === size));
            // Добавить обработчики...
            toggle.addEventListener('click', (e) => { e.stopPropagation(); panel.classList.toggle('open'); });
            document.getElementById('themeToggle').addEventListener('click', (e) => {
                e.stopPropagation();
                const isLight = document.body.classList.contains('light-theme');
                document.body.classList.toggle('light-theme', !isLight);
                const newTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
                localStorage.setItem('theme', newTheme);
                document.getElementById('themeToggle').textContent = newTheme === 'light' ? '☀️' : '🌙';
            });
            document.querySelectorAll('.size-btn').forEach(b => {
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sz = b.dataset.size;
                    const html2 = document.documentElement;
                    html2.classList.remove('text-small', 'text-medium', 'text-large');
                    if (sz !== 'medium') html2.classList.add('text-' + sz);
                    document.querySelectorAll('.size-btn').forEach(bb => bb.classList.toggle('active', bb.dataset.size === sz));
                    localStorage.setItem('textSize', sz);
                });
            });
            document.addEventListener('click', (e) => {
                if (panel && !panel.contains(e.target) && e.target !== toggle) panel.classList.remove('open');
            });
            console.log('🛠️ Панель управления создана (fallback)');
        })();
    }
}, 1000);

console.log('📖 Трилогия загружена. Приятного чтения.');
// ============================================================
//  УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ АУДИОПЛЕЕРОВ
// ============================================================
function initAudioPlayer(audioId, btnId, statusId) {
    const audio = document.getElementById(audioId);
    const btn = document.getElementById(btnId);
    const status = document.getElementById(statusId);

    if (!audio || !btn || !status) return;

    btn.addEventListener('click', function() {
        if (audio.paused) {
            audio.play().catch(e => {
                status.textContent = '(ошибка воспроизведения)';
                console.warn('Audio error:', e);
            });
            btn.textContent = '⏸ Пауза';
            status.textContent = '(играет)';
        } else {
            audio.pause();
            btn.textContent = '▶ Воспроизвести озвучку';
            status.textContent = '(приостановлено)';
        }
    });

    audio.addEventListener('ended', function() {
        btn.textContent = '▶ Воспроизвести озвучку';
        status.textContent = '(завершено)';
    });

    audio.addEventListener('error', function() {
        status.textContent = '(файл не найден)';
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
}

// Инициализация всех плееров при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initAudioPlayer('introAudio', 'playBtnIntro', 'audioStatusIntro');
    initAudioPlayer('book1Audio', 'playBtnBook1', 'audioStatusBook1');
    initAudioPlayer('book2Audio', 'playBtnBook2', 'audioStatusBook2');
    initAudioPlayer('book3Audio', 'playBtnBook3', 'audioStatusBook3');
});
