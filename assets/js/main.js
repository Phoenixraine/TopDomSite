/* TD × Riga Life — анимации и интерактив */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;
  const anim = !!G && !!ST && !reduced;
  if (reduced) root.classList.add('reduced');
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- дата события ---------------- */
  // Поменяйте дату здесь — обратный отсчёт пересчитается сам.
  const EVENT_START = new Date('2027-05-22T11:00:00+03:00');

  /* ---------------- заголовок героя под ширину ---------------- */
  const title = $('#heroTitle');
  function fitTitle() {
    if (!title) return;
    const avail = title.clientWidth;
    title.style.setProperty('--t', '100px');
    const words = $$('.hero__word', title).map(w => w.getBoundingClientRect().width);
    const stacked = getComputedStyle(title).flexDirection === 'column';
    const w = stacked ? Math.max(...words) : words.reduce((a, b) => a + b, 0) * 1.08;
    title.style.setProperty('--t', Math.min(100 * avail / w, stacked ? 230 : 320).toFixed(1) + 'px');
  }
  fitTitle(); document.fonts?.ready.then(fitTitle); addEventListener('resize', fitTitle);

  /* ---------------- обратный отсчёт ---------------- */
  const cd = Object.fromEntries($$('[data-cd]').map(el => [el.dataset.cd, el]));
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  function tick() {
    let s = Math.max(0, Math.floor((EVENT_START - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    if (cd.d) { cd.d.textContent = d; cd.h.textContent = pad(h); cd.m.textContent = pad(m); cd.s.textContent = pad(s); }
  }
  tick(); setInterval(tick, 1000);

  /* ---------------- плавный скролл ---------------- */
  let lenis = null;
  if (!reduced && fine && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (anim) { lenis.on('scroll', ST.update); G.ticker.add(t => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -10, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------------- меню ---------------- */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.setAttribute('aria-hidden', !open);
    lenis && (open ? lenis.stop() : lenis.start());
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------- навигация ---------------- */
  const nav = $('#nav'), sticky = $('#stickyCta'), hero = $('#hero'), reg = $('#register');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY, hb = hero.offsetTop + hero.offsetHeight;
    nav.classList.toggle('is-scrolled', y > hb - 90);
    if (!root.classList.contains('menu-open')) {
      if (y > hb && y > lastY + 2) nav.classList.add('is-hidden');
      if (y < lastY - 2 || y < hb) nav.classList.remove('is-hidden');
    }
    lastY = y;
    const r = reg.getBoundingClientRect();
    sticky?.classList.toggle('is-visible', y > hb * .8 && !(r.top < innerHeight && r.bottom > 0));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const pills = $$('.nav__pills .pill');
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) pills.forEach(p => p.classList.toggle('is-current', p.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  pills.forEach(p => { const s = $(p.getAttribute('href')); s && io.observe(s); });

  /* ---------------- кнопки ---------------- */
  $$('.btn').forEach(btn => {
    const setXY = e => { const r = btn.getBoundingClientRect(); btn.style.setProperty('--x', (e.clientX - r.left) + 'px'); btn.style.setProperty('--y', (e.clientY - r.top) + 'px'); };
    btn.addEventListener('pointerenter', setXY); btn.addEventListener('pointerleave', setXY);
    btn.addEventListener('pointerdown', e => {   // на тач-экранах — заливка из точки касания
      if (e.pointerType === 'mouse') return;
      setXY(e); btn.classList.add('is-filled'); clearTimeout(btn._t);
      btn._t = setTimeout(() => btn.classList.remove('is-filled'), 650);
    });
  });

  /* ---------------- всё, что зависит от мыши ---------------- */
  if (fine && !reduced) {
    // курсор
    const cur = $('#cursor'), label = $('#cursorLabel');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() { cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('pointerenter', () => { label.textContent = el.dataset.cursor; cur.classList.add('is-big'); });
      el.addEventListener('pointerleave', () => cur.classList.remove('is-big'));
    });
    $$('a, button, input, label, summary, iframe').forEach(el => {
      el.addEventListener('pointerenter', () => { if (!cur.classList.contains('is-big')) cur.style.scale = '2.4'; });
      el.addEventListener('pointerleave', () => { cur.style.scale = ''; });
    });
    $$('.map, .place').forEach(el => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-hidden'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-hidden'));
    });

    // превью-картинка у строк программы
    const peek = $('#peek'), peekImg = $('#peekImg');
    let px = 0, py = 0, pvx = 0, pvy = 0, prot = 0;
    $$('[data-peek]').forEach(li => {
      li.addEventListener('pointerenter', () => { peekImg.src = li.dataset.peek; peek.classList.add('is-on'); });
      li.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
    (function peekLoop() {
      const nx = lerp(px, mx, .14), ny = lerp(py, my, .14);
      pvx = nx - px; pvy = ny - py; px = nx; py = ny;
      prot = lerp(prot, clamp(pvx * .6, -14, 14), .15);
      peek.style.left = px + 'px'; peek.style.top = py + 'px'; peek.style.rotate = prot + 'deg';
      requestAnimationFrame(peekLoop);
    })();

    // световое пятно за курсором в карточках
    $$('.feat, [data-spot]').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px'); el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));

    if (G) {
      // магнитные кнопки
      $$('[data-magnetic]').forEach(el => {
        const xTo = G.quickTo(el, 'x', { duration: .6, ease: 'power3' }), yTo = G.quickTo(el, 'y', { duration: .6, ease: 'power3' });
        el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
        el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
      });
      // фото героя и заголовок слегка смещаются за мышью
      const hm = $('#heroMedia');
      const hx = G.quickTo(hm, 'x', { duration: 1.2, ease: 'power3' }), hy = G.quickTo(hm, 'y', { duration: 1.2, ease: 'power3' });
      const tx = G.quickTo(title, 'x', { duration: 1.2, ease: 'power3' });
      hero.addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        hx(-nx * 30); hy(-ny * 20); tx(nx * 24);
      });
      // карточки домов наклоняются
      $$('[data-house]').forEach(card => {
        const rx = G.quickTo(card, 'rotationX', { duration: .8, ease: 'power3' }), ry = G.quickTo(card, 'rotationY', { duration: .8, ease: 'power3' });
        G.set(card, { transformPerspective: 1000 });
        card.addEventListener('pointermove', e => { const r = card.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 10); rx(-((e.clientY - r.top) / r.height - .5) * 8); });
        card.addEventListener('pointerleave', () => { rx(0); ry(0); });
      });
    }
  }

  /* ---------------- слайдер домов ---------------- */
  const rail = $('#rail'), bar = $('#railBar');
  if (rail) {
    const step = () => (rail.querySelector('.house')?.offsetWidth || 300) + 16;
    $('#prevHouse')?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('#nextHouse')?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    const upd = () => {
      const max = rail.scrollWidth - rail.clientWidth, p = max > 0 ? rail.scrollLeft / max : 0, vis = rail.clientWidth / rail.scrollWidth;
      bar.style.width = (vis + (1 - vis) * p) * 100 + '%';
      $('#prevHouse').disabled = rail.scrollLeft < 4; $('#nextHouse').disabled = rail.scrollLeft > max - 4;
    };
    rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); } rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; if (moved) { rail.classList.remove('is-dragging'); const s = step(); rail.scrollTo({ left: Math.round(rail.scrollLeft / s) * s, behavior: 'smooth' }); } });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
    rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') rail.scrollBy({ left: step(), behavior: 'smooth' }); if (e.key === 'ArrowLeft') rail.scrollBy({ left: -step(), behavior: 'smooth' }); });
  }

  /* ---------------- вкладки программы ---------------- */
  const tabs = $$('.tab'), ink = $('.tabs__ink');
  const placeInk = t => { if (ink && t) { ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft - 4}px)`; } };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t); });
    placeInk(t);
    $$('.day').forEach(d => {
      const on = d.id === t.getAttribute('aria-controls'); d.hidden = !on;
      if (on && anim) G.fromTo(d.children, { x: 60, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .8, stagger: .05, ease: 'expo.out' });
    });
    ST?.refresh();
  }));
  const placeActive = () => placeInk($('.tab.is-active'));
  placeActive(); addEventListener('resize', placeActive); document.fonts?.ready.then(placeActive);

  /* ---------------- форма ---------------- */
  const form = $('#form'), ticket = $('#ticket'), phone = $('#f-phone'), out = $('#guests');
  let guests = 2;
  const bump = el => anim && G.fromTo(el, { scale: 1.4 }, { scale: 1, duration: .45, ease: 'back.out(3)' });
  $('#minus')?.addEventListener('click', () => { guests = Math.max(1, guests - 1); out.textContent = guests; bump(out); });
  $('#plus')?.addEventListener('click', () => { guests = Math.min(10, guests + 1); out.textContent = guests; bump(out); });
  const digits = v => v.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  const fmt = d => { let s = '+7'; if (d.length) s += ' (' + d.slice(0, 3); if (d.length >= 3) s += ')'; if (d.length > 3) s += ' ' + d.slice(3, 6); if (d.length > 6) s += '-' + d.slice(6, 8); if (d.length > 8) s += '-' + d.slice(8, 10); return s; };
  phone?.addEventListener('input', () => { const d = digits(phone.value); phone.value = d.length ? fmt(d) : ''; });
  phone?.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 '; });
  phone?.addEventListener('blur', () => { if (!digits(phone.value).length) phone.value = ''; });
  $$('.field input').forEach(i => i.addEventListener('input', () => i.parentElement.classList.remove('is-error')));
  form?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#f-name'), agree = $('#f-agree'); let ok = true;
    const fail = el => { ok = false; el.classList.remove('is-error'); void el.offsetWidth; el.classList.add('is-error'); };
    if (name.value.trim().length < 2) fail(name.parentElement);
    if (digits(phone.value).length !== 10) fail(phone.parentElement);
    agree.closest('.check').classList.toggle('is-error', !agree.checked);
    if (!agree.checked) ok = false;
    if (!ok) return;
    // TODO: отправка заявки (CRM / Telegram-бот / Google-таблица)
    $('#tName').textContent = name.value.trim().split(' ')[0];
    $('#tDay').textContent = form.querySelector('input[name="day"]:checked').value;
    $('#tGuests').textContent = guests;
    $('#tNo').textContent = pad(Math.floor(Math.random() * 9000) + 1000, 4);
    const show = () => { form.hidden = true; ticket.hidden = false; };
    if (anim) G.to(form, { y: -20, autoAlpha: 0, duration: .4, ease: 'power2.in', onComplete: () => {
      show(); G.set(form, { clearProps: 'all' });
      G.fromTo(ticket, { y: 80, rotation: -6, autoAlpha: 0, scale: .9 }, { y: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: 1.1, ease: 'elastic.out(1, .7)' });
    } }); else show();
  });
  $('#again')?.addEventListener('click', () => { form.reset(); guests = 2; out.textContent = 2; ticket.hidden = true; form.hidden = false; $('#f-name').focus(); });

  /* ---------------- копирование ---------------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Скопировано'; }
    catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Выделено'; }
    b.classList.add('is-done'); setTimeout(() => { b.textContent = 'Копировать'; b.classList.remove('is-done'); }, 1800);
  }));

  /* ================= мини-игра «Это место для вас» ================= */
  (function game() {
    const arena = $('#place'), fly = $('#flyer'), slot = $('#slot'), promo = $('#promo'), hint = $('#placeHint');
    if (!arena || !fly) return;
    const W = 96, H = 86;
    let p = { x: 0, y: 0 }, v = { x: 0, y: 0 }, rot = 0, scale = 1, mode = 'idle', target = { x: 0, y: 0 }, grab = { x: 0, y: 0 }, t0 = 0, cooldown = 0, base = null;
    const rect = () => arena.getBoundingClientRect();
    const slotC = () => { const a = rect(), s = slot.getBoundingClientRect(); return { x: s.left - a.left + s.width / 2, y: s.top - a.top + s.height / 2, w: s.width }; };
    const home = () => { const a = rect(); return { x: a.width * (innerWidth < 800 ? .62 : .72), y: a.height * (innerWidth < 800 ? .74 : .3) }; };
    function reset() { base = home(); p = { ...base }; v = { x: 0, y: 0 }; rot = 0; scale = 1; mode = 'idle'; fly.classList.remove('is-done'); slot.classList.remove('is-done', 'is-near'); promo.hidden = true; hint.hidden = false; }
    reset(); addEventListener('resize', () => { if (mode === 'idle') reset(); });
    const near = () => { const s = slotC(); return Math.hypot(p.x + W / 2 - s.x, p.y + H / 2 - s.y) < Math.max(70, s.w * .55); };

    function place() {
      mode = 'done'; const s = slotC(); slot.classList.remove('is-near'); slot.classList.add('is-done'); fly.classList.add('is-done');
      const tScale = s.w / W, end = { x: s.x - W / 2, y: s.y - H / 2 };
      const from = { ...p, r: rot, sc: scale };
      const st = performance.now();
      (function go(now) {
        const k = Math.min(1, (now - st) / 700), e = 1 - Math.pow(1 - k, 4), b = k < 1 ? Math.sin(k * Math.PI) * .25 : 0;
        p.x = lerp(from.x, end.x, e); p.y = lerp(from.y, end.y, e); rot = lerp(from.r, 0, e); scale = lerp(from.sc, tScale, e) * (1 + b);
        draw(); if (k < 1) requestAnimationFrame(go); else win(s);
      })(st);
    }
    function win(s) {
      burst(s.x, s.y); hint.hidden = true; promo.hidden = false;
      if (anim) G.fromTo(promo, { y: 40, autoAlpha: 0, scale: .9 }, { y: 0, autoAlpha: 1, scale: 1, duration: .9, ease: 'back.out(1.6)' });
    }
    $('#replay')?.addEventListener('click', reset);

    // мышь: домик следует за курсором, клик рядом с рамкой — поставить
    arena.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || mode === 'done' || mode === 'drag') return;
      const a = rect(); target = { x: e.clientX - a.left - W / 2, y: e.clientY - a.top - H / 2 };
      if (performance.now() > cooldown) mode = 'follow';
    });
    arena.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && mode === 'follow') mode = 'fall'; });
    arena.addEventListener('click', e => {
      if (mode === 'done' || e.target.closest('.promo')) return;
      if (near()) place(); else if (mode === 'follow') { mode = 'fall'; v.y = -6; cooldown = performance.now() + 900; }
    });
    // палец: перетаскивание
    fly.addEventListener('pointerdown', e => {
      if (mode === 'done' || e.pointerType === 'mouse') return;
      e.preventDefault(); fly.setPointerCapture(e.pointerId);
      const a = rect(); grab = { x: e.clientX - a.left - p.x, y: e.clientY - a.top - p.y }; mode = 'drag';
    });
    fly.addEventListener('pointermove', e => {
      if (mode !== 'drag') return;
      const a = rect(), nx = e.clientX - a.left - grab.x, ny = e.clientY - a.top - grab.y;
      v = { x: nx - p.x, y: ny - p.y }; p = { x: nx, y: ny };
    });
    const release = () => { if (mode !== 'drag') return; if (near()) place(); else mode = 'fall'; };
    fly.addEventListener('pointerup', release); fly.addEventListener('pointercancel', release);

    function draw() { fly.style.transform = `translate3d(${p.x}px,${p.y}px,0) rotate(${rot}deg) scale(${scale})`; }
    function step(now) {
      const a = rect(), floor = a.height - H - 8;
      if (mode === 'idle') { t0 += .03; p.y = base.y + Math.sin(t0) * 10; p.x = base.x + Math.cos(t0 * .7) * 6; v.x = Math.cos(t0 * .7) * -.4; }
      else if (mode === 'follow') { v.x += (target.x - p.x) * .07; v.y += (target.y - p.y) * .07; v.x *= .8; v.y *= .8; p.x += v.x; p.y += v.y; }
      else if (mode === 'fall') {
        v.y += .9; v.x *= .99; p.x += v.x; p.y += v.y;
        if (p.y > floor) { p.y = floor; v.y *= -.45; v.x *= .8; if (Math.abs(v.y) < 1.2) v.y = 0; }
        if (p.x < 0) { p.x = 0; v.x *= -.6; } if (p.x > a.width - W) { p.x = a.width - W; v.x *= -.6; }
      }
      if (mode !== 'done') {
        rot = lerp(rot, clamp(v.x * 2.4, -40, 40), .15);
        slot.classList.toggle('is-near', near());
        draw();
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);

    // конфетти
    const cv = $('#confetti'), ctx = cv.getContext('2d'); let parts = [];
    function burst(x, y) {
      const a = rect(); cv.width = a.width; cv.height = a.height;
      const cols = ['#e8913a', '#f6c37f', '#121315', '#ffffff', '#1e2722'];
      parts = Array.from({ length: 140 }, () => ({ x, y, vx: (Math.random() - .5) * 18, vy: -Math.random() * 16 - 4, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[(Math.random() * cols.length) | 0], life: 1 }));
      (function f() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        parts.forEach(q => { q.vy += .45; q.vx *= .985; q.x += q.vx; q.y += q.vy; q.r += q.vr; q.life -= .008; ctx.save(); ctx.globalAlpha = Math.max(0, q.life); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); });
        parts = parts.filter(q => q.life > 0 && q.y < cv.height + 40);
        if (parts.length) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
      })();
    }
  })();

  /* ================= GSAP-анимации ================= */
  const loader = $('#loader');
  if (!anim) { loader?.remove(); return; }
  G.registerPlugin(ST);

  // разбивка текста на буквы (слова не переносятся посередине)
  function splitChars(el) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    el.setAttribute('aria-label', text);
    el.textContent = '';
    const chars = [];
    text.split(' ').forEach((w, i, arr) => {
      const cw = document.createElement('span'); cw.className = 'cw'; cw.setAttribute('aria-hidden', 'true');
      [...w].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; cw.appendChild(c); chars.push(c); });
      el.appendChild(cw); if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return chars;
  }
  const charEls = $$('[data-chars]').map(el => [el, splitChars(el)]);

  // одометр
  $$('.odo').forEach(el => {
    const val = String(el.dataset.odo), suf = el.dataset.suffix || '';
    el.setAttribute('aria-label', val + suf); el.textContent = '';
    el._strips = [...val].map(d => {
      const box = document.createElement('span'); box.className = 'odo__d'; box.setAttribute('aria-hidden', 'true');
      const s = document.createElement('span'); s.className = 'odo__s';
      for (let i = 0; i < 20; i++) { const n = document.createElement('span'); n.textContent = i % 10; s.appendChild(n); }
      box.appendChild(s); el.appendChild(box); return { s, d: +d };
    });
    if (suf) { const x = document.createElement('span'); x.className = 'odo__suf'; x.textContent = suf; x.setAttribute('aria-hidden', 'true'); el.appendChild(x); }
  });

  // начальные состояния
  G.set('.hero__title .ch', { yPercent: 115 });
  G.set('#heroMedia', { scale: 1.25 });
  G.set('[data-hero-fade]', { y: 30, autoAlpha: 0 });
  G.set('.nav', { y: -30, autoAlpha: 0 });

  // прелоадер
  const heroImg = $('#heroMedia img');
  const imgReady = heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.onload = heroImg.onerror = r; });
  const counter = { v: 0 };
  document.body.classList.add('is-loading');
  const render = () => { $('#loaderNum').textContent = Math.round(counter.v); $('#loaderBar').style.width = counter.v + '%'; };
  G.from('.loader .logo > *', { yPercent: 120, autoAlpha: 0, duration: .9, stagger: .1, ease: 'expo.out' });
  const lt = G.to(counter, { v: 85, duration: 1.2, ease: 'power2.out', onUpdate: render });
  Promise.race([Promise.all([imgReady, document.fonts?.ready]), new Promise(r => setTimeout(r, 3500))]).then(() => {
    lt.kill(); G.to(counter, { v: 100, duration: .4, onUpdate: render, onComplete: intro });
  });

  function intro() {
    fitTitle();
    G.timeline({ defaults: { ease: 'expo.out' } })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' })
      .add(() => { loader.remove(); document.body.classList.remove('is-loading'); })
      .to('#heroMedia', { scale: 1, duration: 2.2 }, '<')
      .to('.hero__title .ch', { yPercent: 0, duration: 1.5, stagger: .06 }, '-=1.9')
      .to('.nav', { y: 0, autoAlpha: 1, duration: 1 }, '-=1.3')
      .to('[data-hero-fade]', { y: 0, autoAlpha: 1, duration: 1.1, stagger: .08 }, '-=1.2')
      .add(setupScroll, '-=.6');
  }

  function setupScroll() {
    // буквы проявляются из размытия
    charEls.forEach(([el, chars]) => {
      G.from(chars, {
        yPercent: 80, rotate: 8, autoAlpha: 0, filter: 'blur(14px)', duration: 1.3, ease: 'expo.out',
        stagger: { each: .028 }, scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    // блоки появляются снизу
    G.set('[data-reveal]', { y: 40, autoAlpha: 0 });
    ST.batch('[data-reveal]', { start: 'top 90%', onEnter: b => G.to(b, { y: 0, autoAlpha: 1, duration: 1.1, stagger: .08, ease: 'expo.out', overwrite: true }) });
    // карточки выезжают в экран
    $$('[data-slide]').forEach((el, i) => {
      const dir = el.dataset.slide;
      const from = dir === 'left' ? { xPercent: -30, rotate: -4 } : dir === 'right' ? { xPercent: 30, rotate: 4 } : { yPercent: 40, rotate: 2 };
      G.from(el, { ...from, autoAlpha: 0, duration: 1.3, ease: 'expo.out', delay: (i % 3) * .06, scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
    // одометр
    $$('.odo').forEach(el => {
      el._strips.forEach((st, i) => {
        G.fromTo(st.s, { yPercent: 0 }, { yPercent: -((10 + st.d) / 20) * 100, duration: 2.2 + i * .35, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });
    });
    // фото на всю ширину: параллакс + бегущая дата
    $$('[data-parallax]').forEach(el => G.fromTo(el, { yPercent: -10 }, { yPercent: 10, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
    G.fromTo('#bandText', { xPercent: 5 }, { xPercent: -45, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: true } });
    G.fromTo('.band', { clipPath: 'inset(8% 6% 8% 6% round 40px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: '.band', start: 'top 95%', end: 'top 30%', scrub: .5 } });
    // герой уходит при скролле
    G.to('#heroMedia', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    G.to('#heroTitle', { yPercent: -30, autoAlpha: .2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    // карта раскрывается
    G.fromTo('.map', { clipPath: 'inset(10% 10% 10% 10% round 60px)' }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', ease: 'none', scrollTrigger: { trigger: '.map', start: 'top 95%', end: 'top 45%', scrub: .5 } });
    // дома въезжают сбоку
    G.from('.house', { x: 160, autoAlpha: 0, rotate: 3, duration: 1.3, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: '#rail', start: 'top 85%' } });
    G.from('#day1 li', { x: 80, autoAlpha: 0, duration: 1, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.days', start: 'top 85%' } });
    G.from('.footer__logo > *', { yPercent: 100, autoAlpha: 0, duration: 1.4, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.footer__logo', start: 'top 95%' } });
    // строка «для [] вас»
    G.from('.place__line:nth-child(2)', { yPercent: 60, autoAlpha: 0, filter: 'blur(14px)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.place__title', start: 'top 80%' } });
    ST.refresh();
  }

  // бегущая строка ускоряется от скролла
  const track = $('#marquee');
  if (track) {
    track.innerHTML += track.innerHTML;
    let x = 0, speed = 1, dir = 1;
    ST.create({ onUpdate: s => { speed = 1 + Math.min(Math.abs(s.getVelocity()) / 250, 10); dir = s.direction; } });
    G.ticker.add(() => {
      const half = track.scrollWidth / 2;
      x -= .7 * speed * dir; speed += (1 - speed) * .05;
      if (x <= -half) x += half; if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }
})();
