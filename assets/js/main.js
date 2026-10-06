/* ТОП ДОМ — анимации и интерактив */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  if (reduced) root.classList.add('reduced');

  /* ---------------- дата события ---------------- */
  // Поменяйте дату здесь — обратный отсчёт пересчитается сам.
  const EVENT_START = new Date('2027-05-22T11:00:00+03:00');

  /* ---------------- заголовок героя: подгоняем под ширину ---------------- */
  const title = $('.hero__title');
  function fitTitle() {
    if (!title) return;
    const box = title.parentElement;
    const cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    title.style.setProperty('--t', '100px');
    const lines = $$('.hero__line', title);
    const st = getComputedStyle(title);
    const stacked = st.flexDirection === 'column';
    const widths = lines.map(l => l.getBoundingClientRect().width);
    const w = stacked ? Math.max(...widths) : widths.reduce((a, b) => a + b, 0) + parseFloat(st.columnGap || 0);
    const size = Math.min(100 * avail / w * .98, stacked ? 260 : 330);
    title.style.setProperty('--t', size.toFixed(2) + 'px');
    $('.hero__house')?.style.setProperty('--t', size.toFixed(2) + 'px');
  }
  fitTitle();
  document.fonts?.ready.then(fitTitle);
  addEventListener('resize', fitTitle);

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

  /* ---------------- плавный скролл ---------------- */
  let lenis = null;
  if (!reduced && finePointer && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
    }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -20, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }));

  /* ---------------- навигация: фон, скрытие, активный пункт ---------------- */
  const nav = $('#nav'), sticky = $('#stickyCta'), hero = $('#hero'), reg = $('#register');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (!root.classList.contains('menu-open')) nav.classList.toggle('is-hidden', y > 500 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove('is-hidden');
    lastY = y;
    const heroEnd = hero.offsetTop + hero.offsetHeight * .7;
    const r = reg.getBoundingClientRect();
    const regVisible = r.top < innerHeight && r.bottom > 0;
    sticky?.classList.toggle('is-visible', y > heroEnd && !regVisible);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const pills = $$('.nav__pills .pill');
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    pills.forEach(p => p.classList.toggle('is-current', p.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  pills.forEach(p => { const s = $(p.getAttribute('href')); s && io.observe(s); });

  /* ---------------- кнопки: заливка из точки касания + магнит ---------------- */
  $$('.btn').forEach(btn => {
    const setXY = e => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--x', (e.clientX - r.left) + 'px');
      btn.style.setProperty('--y', (e.clientY - r.top) + 'px');
    };
    btn.addEventListener('pointerenter', setXY);
    btn.addEventListener('pointerleave', setXY);
    // на тач-экранах ховера нет — показываем заливку коротким «откликом» при нажатии
    btn.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      setXY(e);
      btn.classList.add('is-filled');
      clearTimeout(btn._t);
      btn._t = setTimeout(() => btn.classList.remove('is-filled'), 650);
    });
  });
  if (finePointer && hasGsap && !reduced) {
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * .22);
        yTo((e.clientY - r.top - r.height / 2) * .35);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
    // лёгкий 3D-наклон карточек
    $$('[data-tilt]').forEach(card => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: .8, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: .8, ease: 'power3' });
      gsap.set(card, { transformPerspective: 1200 });
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - .5) * 6);
        rx(-((e.clientY - r.top) / r.height - .5) * 6);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ---------------- слайдер домов ---------------- */
  const rail = $('#rail'), bar = $('#railBar');
  if (rail) {
    const step = () => (rail.querySelector('.house')?.offsetWidth || 300) + 16;
    $('#prevHouse')?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('#nextHouse')?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    const upd = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const p = max > 0 ? rail.scrollLeft / max : 0;
      const vis = rail.clientWidth / rail.scrollWidth;
      bar.style.width = (vis + (1 - vis) * p) * 100 + '%';
      $('#prevHouse').disabled = rail.scrollLeft < 4;
      $('#nextHouse').disabled = rail.scrollLeft > max - 4;
    };
    rail.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    // перетаскивание мышью (на тач-экранах работает нативный свайп)
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); }
      rail.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return; down = false;
      if (moved) { rail.classList.remove('is-dragging'); const s = step(); rail.scrollTo({ left: Math.round(rail.scrollLeft / s) * s, behavior: 'smooth' }); }
    });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
    rail.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') rail.scrollBy({ left: step(), behavior: 'smooth' });
      if (e.key === 'ArrowLeft') rail.scrollBy({ left: -step(), behavior: 'smooth' });
    });
  }

  /* ---------------- вкладки программы ---------------- */
  const tabs = $$('.tab'), ink = $('.tabs__ink');
  const placeInk = t => { if (!ink || !t) return; ink.style.width = t.offsetWidth + 'px'; ink.style.transform = `translateX(${t.offsetLeft - 5}px)`; };
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', x === t); });
    placeInk(t);
    $$('.day').forEach(d => {
      const on = d.id === t.getAttribute('aria-controls');
      d.hidden = !on;
      if (on && hasGsap && !reduced) gsap.fromTo(d.children, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .6, stagger: .05, ease: 'power3.out' });
    });
    window.ScrollTrigger?.refresh();
  }));
  const placeActive = () => placeInk($('.tab.is-active'));
  placeActive(); addEventListener('resize', placeActive); document.fonts?.ready.then(placeActive);

  /* ---------------- форма ---------------- */
  const form = $('#form'), ticket = $('#ticket'), phone = $('#f-phone');
  let guests = 2;
  const out = $('#guests');
  $('#minus')?.addEventListener('click', () => { guests = Math.max(1, guests - 1); out.textContent = guests; bump(out); });
  $('#plus')?.addEventListener('click', () => { guests = Math.min(10, guests + 1); out.textContent = guests; bump(out); });
  function bump(el) { if (hasGsap && !reduced) gsap.fromTo(el, { scale: 1.35 }, { scale: 1, duration: .4, ease: 'back.out(3)' }); }

  const digits = v => v.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  function fmt(d) {
    let s = '+7';
    if (d.length) s += ' (' + d.slice(0, 3);
    if (d.length >= 3) s += ')';
    if (d.length > 3) s += ' ' + d.slice(3, 6);
    if (d.length > 6) s += '-' + d.slice(6, 8);
    if (d.length > 8) s += '-' + d.slice(8, 10);
    return s;
  }
  phone?.addEventListener('input', () => { const d = digits(phone.value); phone.value = d.length ? fmt(d) : ''; });
  phone?.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 '; });
  phone?.addEventListener('blur', () => { if (!digits(phone.value).length) phone.value = ''; });
  $$('.field input').forEach(i => i.addEventListener('input', () => i.parentElement.classList.remove('is-error')));

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#f-name'), agree = $('#f-agree');
    let ok = true;
    const fail = el => { ok = false; el.classList.remove('is-error'); void el.offsetWidth; el.classList.add('is-error'); };
    if (name.value.trim().length < 2) fail(name.parentElement);
    if (digits(phone.value).length !== 10) fail(phone.parentElement);
    agree.closest('.check').classList.toggle('is-error', !agree.checked);
    if (!agree.checked) ok = false;
    if (!ok) return;

    // TODO: здесь отправка заявки (CRM / Telegram-бот / Google-таблица)
    $('#tName').textContent = name.value.trim().split(' ')[0];
    $('#tDay').textContent = form.querySelector('input[name="day"]:checked').value;
    $('#tGuests').textContent = guests;
    $('#tNo').textContent = pad(Math.floor(Math.random() * 9000) + 1000, 4);
    const show = () => { form.hidden = true; ticket.hidden = false; };
    if (hasGsap && !reduced) {
      gsap.to(form, { y: -20, autoAlpha: 0, duration: .4, ease: 'power2.in', onComplete: () => {
        show();
        gsap.fromTo(ticket, { y: 60, rotation: -4, autoAlpha: 0, scale: .92 }, { y: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: 1, ease: 'elastic.out(1, .7)' });
        gsap.set(form, { clearProps: 'all' });
      } });
    } else show();
  });
  $('#again')?.addEventListener('click', () => { form.reset(); guests = 2; out.textContent = 2; ticket.hidden = true; form.hidden = false; $('#f-name').focus(); });

  /* ---------------- копирование телефона ---------------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Скопировано'; }
    catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Выделено'; }
    b.classList.add('is-done'); setTimeout(() => { b.textContent = 'Копировать'; b.classList.remove('is-done'); }, 1800);
  }));

  /* ---------------- декоративная смена чипов в герое ---------------- */
  const chips = $$('.hero__chips .chip'); let ci = 0;
  if (!reduced) setInterval(() => { chips[ci].classList.remove('is-active'); ci = (ci + 1) % chips.length; chips[ci].classList.add('is-active'); }, 2200);

  /* ================= GSAP-анимации ================= */
  const loader = $('#loader');
  if (!hasGsap || reduced) { loader?.remove(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // --- разбивка заголовков на строки
  function splitLines(el) {
    const parts = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/([ \t\n\r]+)/).forEach(t => { if (t.trim()) parts.push(document.createTextNode(t)); else if (t) parts.push(' '); });
      else parts.push(n.cloneNode(true));
    });
    el.textContent = '';
    const words = [];
    parts.forEach(p => {
      if (p === ' ') { el.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span'); w.style.display = 'inline-block'; w.appendChild(p); el.appendChild(w); words.push(w);
    });
    const lines = []; let top = null;
    words.forEach(w => { const t = w.offsetTop; if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; } lines[lines.length - 1].push(w); });
    el.textContent = '';
    return lines.map(ws => {
      const line = document.createElement('span'); line.className = 'line';
      const inner = document.createElement('span');
      ws.forEach((w, i) => { inner.append(...w.childNodes); if (i < ws.length - 1) inner.append(' '); });
      line.appendChild(inner); el.appendChild(line); el.appendChild(document.createTextNode(' '));
      return inner;
    });
  }
  const splitTargets = $$('[data-split]');
  const splitOriginal = new Map(splitTargets.map(el => [el, el.innerHTML]));

  // --- статичный текст «по словам» для эффекта проявления
  const words = $('[data-words]');
  if (words) {
    const frag = [];
    [...words.childNodes].forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/([ \t\n\r]+)/).forEach(t => frag.push(t.trim() ? `<span class="w">${t}</span>` : t));
      else { n.classList.add('w'); frag.push(n.outerHTML); }
    });
    words.innerHTML = frag.join('');
  }

  // --- начальные состояния
  gsap.set('.hero__title .ch', { yPercent: 115 });
  gsap.set('[data-hero-house]', { y: 120, autoAlpha: 0, scale: .94 });
  gsap.set('[data-hero-fade]', { y: 24, autoAlpha: 0 });
  gsap.set('.nav', { y: -30, autoAlpha: 0 });

  // --- прелоадер
  const heroImg = $('.hero__house img');
  const imgReady = heroImg.complete ? Promise.resolve() : new Promise(r => { heroImg.onload = heroImg.onerror = r; });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const counter = { v: 0 };
  document.body.classList.add('is-loading');
  const loadTween = gsap.to(counter, { v: 85, duration: 1.1, ease: 'power2.out', onUpdate: renderCount });
  function renderCount() { $('#loaderNum').textContent = Math.round(counter.v); $('#loaderBar').style.width = counter.v + '%'; }
  Promise.race([Promise.all([imgReady, fontsReady]), new Promise(r => setTimeout(r, 3500))]).then(() => {
    loadTween.kill();
    gsap.to(counter, { v: 100, duration: .45, ease: 'power1.inOut', onUpdate: renderCount, onComplete: intro });
  });

  function intro() {
    fitTitle();
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to(loader, { yPercent: -100, duration: 1.05, ease: 'expo.inOut' })
      .add(() => { loader.remove(); document.body.classList.remove('is-loading'); })
      .to('.hero__title .ch', { yPercent: 0, duration: 1.4, stagger: .06 }, '-=.45')
      .to('[data-hero-house]', { y: 0, autoAlpha: 1, scale: 1, duration: 1.8 }, '-=1.25')
      .to('.nav', { y: 0, autoAlpha: 1, duration: 1 }, '-=1.5')
      .to('[data-hero-fade]', { y: 0, autoAlpha: 1, duration: 1.1, stagger: .07 }, '-=1.4')
      .add(setupScroll, '-=.8');
  }

  function setupScroll() {
    // заголовки секций — построчно
    splitTargets.forEach(el => {
      el.innerHTML = splitOriginal.get(el);
      const lines = splitLines(el);
      gsap.from(lines, { yPercent: 110, duration: 1.2, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    // появление блоков пачками
    gsap.set('[data-reveal]', { y: 50, autoAlpha: 0 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      onEnter: b => gsap.to(b, { y: 0, autoAlpha: 1, duration: 1.1, stagger: .08, ease: 'expo.out', overwrite: true }),
    });

    // картинки: раскрытие маской
    $$('[data-reveal-img]').forEach(el => {
      gsap.fromTo(el, { clipPath: 'inset(18% 10% 18% 10% round 36px)', scale: .96 }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 35%', scrub: .6 },
      });
    });

    // дом в герое уезжает чуть медленнее скролла, буквы — быстрее
    gsap.to('.hero__house', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__title', { yPercent: 28, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    // параллакс
    $$('[data-speed]').forEach(el => {
      const s = parseFloat(el.dataset.speed);
      gsap.fromTo(el, { yPercent: -s * 100 }, { yPercent: s * 100, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('[data-parallax-bg]', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.auction', start: 'top bottom', end: 'bottom top', scrub: true } });

    // текст-манифест проявляется словами по скроллу
    const ws = $$('.statement__text .w');
    if (ws.length) ScrollTrigger.create({
      trigger: '.statement__text', start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: self => { const n = Math.round(self.progress * ws.length); ws.forEach((w, i) => w.classList.toggle('is-on', i < n)); },
    });

    // счётчики
    $$('[data-count]').forEach(el => {
      const to = +el.dataset.count, o = { v: 0 };
      el.textContent = '0';
      gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v), scrollTrigger: { trigger: el, start: 'top 90%' } });
    });

    // маршрут на карте рисуется
    gsap.fromTo('.map__route', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: '.map', start: 'top 70%' } });

    // карточки домов «въезжают» сбоку
    gsap.from('.house', { x: 120, autoAlpha: 0, duration: 1.2, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '#rail', start: 'top 85%' } });

    // строки программы
    gsap.from('#day1 li', { y: 30, autoAlpha: 0, duration: .9, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.days', start: 'top 85%' } });

    // огромное слово в подвале
    gsap.from('.footer__word', { yPercent: 40, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.footer__word', start: 'top 98%' } });

    ScrollTrigger.refresh();
  }

  // бегущая строка: скорость зависит от скорости скролла
  const track = $('#marquee');
  if (track) {
    track.innerHTML += track.innerHTML;
    let x = 0, speed = 1, dir = 1;
    ScrollTrigger.create({ onUpdate: self => { speed = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 8); dir = self.direction; } });
    gsap.ticker.add(() => {
      const half = track.scrollWidth / 2;
      x -= .6 * speed * dir; speed += (1 - speed) * .05;
      if (x <= -half) x += half; if (x > 0) x -= half;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  // пересчёт разбиения строк при изменении ширины
  let rw = innerWidth;
  addEventListener('resize', () => {
    if (Math.abs(innerWidth - rw) < 60) return; rw = innerWidth;
    splitTargets.forEach(el => { el.innerHTML = splitOriginal.get(el); });
    ScrollTrigger.refresh();
  });
})();
