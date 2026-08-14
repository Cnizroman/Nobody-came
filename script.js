
/* =========================================================
   NOBODY CAME 2.0 — READER ENGINE
   Работает поверх существующих intro/book HTML без изменения текста.
   ========================================================= */
(() => {
  'use strict';

  const path = location.pathname.split('/').pop() || 'index.html';
  const isReader = path !== 'index.html' && document.querySelector('main');

  const bookKey = path.replace('.html','') || 'home';
  const progressKey = `nobody-progress-${bookKey}`;
  const audioKey = `nobody-audio-${bookKey}`;
  const lastKey = 'nobody-last-page';

  const $ = (s, root=document) => root.querySelector(s);

  function saveLastPage(){
    if(path !== 'index.html') localStorage.setItem(lastKey, path);
  }

  function getProgress(){
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    return max <= 0 ? 0 : Math.min(100, Math.max(0, (window.scrollY / max) * 100));
  }

  function setupProgress(){
    const bar = document.createElement('div');
    bar.className = 'reader-progress';
    document.body.appendChild(bar);

    const update = () => {
      const p = getProgress();
      bar.style.width = `${p}%`;
      localStorage.setItem(progressKey, String(Math.round(p)));
      const label = $('#readerPercent');
      if(label) label.textContent = `${Math.round(p)}%`;
    };
    window.addEventListener('scroll', update, {passive:true});
    window.addEventListener('resize', update);
    update();
  }

  function setupBackTop(){
    const b = document.createElement('button');
    b.className='back-top';
    b.setAttribute('aria-label','Наверх');
    b.textContent='↑';
    document.body.appendChild(b);
    const toggle=()=>b.classList.toggle('visible',window.scrollY>500);
    window.addEventListener('scroll',toggle,{passive:true});
    b.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  }

  function setupTools(){
    const wrap=document.createElement('div');
    wrap.className='reader-tools';
    wrap.innerHTML=`
      <div class="reader-tools-panel">
        <div class="tool-title">Настройки чтения</div>
        <div class="tool-row">
          <button data-action="font-down">A−</button>
          <button data-action="font-reset">A</button>
          <button data-action="font-up">A+</button>
        </div>
        <div class="tool-row">
          <button data-action="focus">Фокус</button>
          <button data-action="top">Наверх</button>
        </div>
        <div class="reader-stat"><span>Прогресс</span><strong id="readerPercent">0%</strong></div>
        <div class="reader-stat"><span>Размер</span><strong id="readerSize">20px</strong></div>
        <div class="reader-stat"><span>История</span><strong>${bookKey}</strong></div>
      </div>
      <button class="reader-tools-toggle" aria-label="Настройки">☰</button>
    `;
    document.body.appendChild(wrap);

    const panel=wrap.querySelector('.reader-tools-panel');
    wrap.querySelector('.reader-tools-toggle').addEventListener('click',()=>wrap.classList.toggle('open'));

    let size=Number(localStorage.getItem('nobody-font-size')||20);
    const applySize=()=>{
      size=Math.min(28,Math.max(15,size));
      document.documentElement.style.setProperty('--font-size',`${size}px`);
      $('#readerSize').textContent=`${size}px`;
      localStorage.setItem('nobody-font-size',size);
    };
    applySize();

    wrap.addEventListener('click',e=>{
      const action=e.target.dataset.action;
      if(!action) return;
      if(action==='font-down') size-=1;
      if(action==='font-up') size+=1;
      if(action==='font-reset') size=20;
      if(action.startsWith('font')) applySize();
      if(action==='focus') document.body.classList.toggle('focus-mode');
      if(action==='top') window.scrollTo({top:0,behavior:'smooth'});
    });
  }

  function restoreProgress(){
    const saved=Number(localStorage.getItem(progressKey)||0);
    if(saved<5) return;
    const max=document.documentElement.scrollHeight-window.innerHeight;
    if(max>300){
      // Restore only after the page has laid out.
      setTimeout(()=>window.scrollTo({top:max*(saved/100),behavior:'auto'}),250);
    }
  }

  function setupAudio(){
    const audio=document.querySelector('audio');
    if(!audio) return;

    const id=audio.id;
    const button=audio.closest('.audio-player')?.querySelector('button.play-btn');
    const status=audio.closest('.audio-player')?.querySelector('.audio-status');
    const key=audioKey;

    if(button){
      button.addEventListener('click',()=>{
        if(audio.paused){
          audio.play().catch(()=>{});
        }else{
          audio.pause();
        }
      });
    }
    audio.addEventListener('play',()=>{
      if(button) button.textContent='❚❚ Пауза';
      if(status) status.textContent='(играет)';
    });
    audio.addEventListener('pause',()=>{
      if(button) button.textContent='▶ Воспроизвести озвучку';
      if(status) status.textContent='(пауза)';
    });
    audio.addEventListener('ended',()=>{
      if(button) button.textContent='▶ Воспроизвести озвучку';
      if(status) status.textContent='(завершено)';
      localStorage.removeItem(key);
    });
    audio.addEventListener('timeupdate',()=>{
      if(Number.isFinite(audio.currentTime)) localStorage.setItem(key,String(audio.currentTime));
    });
    audio.addEventListener('loadedmetadata',()=>{
      const saved=Number(localStorage.getItem(key)||0);
      if(saved>5 && saved<audio.duration-5) audio.currentTime=saved;
    });
  }

  function setupChapterMarkers(){
    const main=$('main');
    if(!main) return;
    const headings=[...main.querySelectorAll('h3,h4')];
    if(!headings.length) return;

    headings.forEach((h,i)=>{
      h.id=`chapter-${i+1}`;
      h.dataset.chapter=i+1;
    });

    const nav=document.createElement('nav');
    nav.className='chapter-nav';
    const prev=headings[0];
    const next=headings.length>1 ? headings[1] : null;
    nav.innerHTML=`
      <a href="${prev ? '#'+prev.id : '#'}">← К началу</a>
      <a href="#${next ? next.id : headings[0].id}">${next ? 'Следующая часть →' : '↑ В начало'}</a>
    `;
    main.appendChild(nav);
  }

  function setupStars(){
    if(!document.body.classList.contains('theme-book3')) return;
    let container=$('#starsContainer');
    if(!container){
      container=document.createElement('div');
      container.className='stars-container';
      container.id='starsContainer';
      document.body.prepend(container);
    }
    if(container.children.length) return;
    const count=window.innerWidth<600?70:130;
    const frag=document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const s=document.createElement('i');
      s.className='star';
      s.style.left=`${Math.random()*100}%`;
      s.style.top=`${Math.random()*100}%`;
      const size=(Math.random()*2+.6).toFixed(2);
      s.style.width=`${size}px`;
      s.style.height=`${size}px`;
      s.style.animationDuration=`${(2+Math.random()*5).toFixed(2)}s`;
      s.style.animationDelay=`${(-Math.random()*5).toFixed(2)}s`;
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  function setupSnow(){
    if(!document.body.classList.contains('theme-book1')) return;
    let container=$('#snowContainer');
    if(!container){
      container=document.createElement('div');
      container.className='snow-container';
      container.id='snowContainer';
      document.body.prepend(container);
    }
    if(container.children.length) return;
    const count=window.innerWidth<600?30:65;
    const frag=document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const s=document.createElement('span');
      s.className='snowflake';
      s.textContent=Math.random()>.75?'✦':'•';
      s.style.left=`${Math.random()*100}%`;
      s.style.fontSize=`${(5+Math.random()*9).toFixed(1)}px`;
      s.style.animationDuration=`${(7+Math.random()*12).toFixed(1)}s`;
      s.style.animationDelay=`${(-Math.random()*15).toFixed(1)}s`;
      s.style.setProperty('--drift',`${-80+Math.random()*160}px`);
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  function improvePassword(){
    const overlay=$('#passwordOverlay');
    const input=$('#passwordInput');
    if(!overlay || !input) return;
    input.setAttribute('autocomplete','off');
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter') $('#unlockBtn')?.click();
    });
  }

  function setupHome(){
    const btn=$('#continueBtn');
    const last=localStorage.getItem(lastKey);
    if(btn && last && last!=='index.html'){
      btn.href=last;
      btn.innerHTML='Продолжить чтение <span>→</span>';
    }

    document.querySelectorAll('[data-progress-for]').forEach(line=>{
      const key=line.dataset.progressFor.replace('.html','');
      const p=Number(localStorage.getItem(`nobody-progress-${key}`)||0);
      line.style.width=`${Math.round(p)}%`;
    });
  }

  function init(){
    if(!isReader){
      setupHome();
      return;
    }
    saveLastPage();
    setupProgress();
    setupBackTop();
    setupTools();
    setupAudio();
    setupChapterMarkers();
    setupStars();
    setupSnow();
    improvePassword();
    setTimeout(restoreProgress,350);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
/* silent hidden easter egg — handwritten/glitched descent */
(()=>{const x=[118,111,105,100,119,104,105,115,112,101,114],k=String.fromCharCode(...x);let s="",q,locked=false;addEventListener("keydown",e=>{if(locked||e.ctrlKey||e.altKey||e.metaKey||e.key.length!==1)return;s=(s+e.key.toLowerCase()).slice(-k.length);if(s===k){locked=true;s="";const v=document.createElement("div");v.className="void-descent";v.innerHTML='<div class="void-descent-noise"></div><div class="void-descent-glow"></div><div class="void-descent-vignette"></div><div class="void-descent-word"><span class="void-main"></span><span class="void-glitch void-g1"></span><span class="void-glitch void-g2"></span><span class="void-glitch void-g3"></span></div>';document.body.appendChild(v);document.documentElement.classList.add("void-descending");requestAnimationFrame(()=>requestAnimationFrame(()=>{v.classList.add("active");const target="THE VOID",main=v.querySelector(".void-main");let i=0;const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\\\|<>_";const type=()=>{if(i>=target.length)return;i++;main.textContent=target.slice(0,i);if(i<target.length)setTimeout(type,85+Math.random()*115);else v.classList.add("written")};setTimeout(type,1150)}));setTimeout(()=>location.replace("secret.html"),7600)}clearTimeout(q);q=setTimeout(()=>s="",5000)},{passive:true})})();

