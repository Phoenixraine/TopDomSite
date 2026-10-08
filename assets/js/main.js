/* Riga Life — анимации и интерактив */
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
  const rub = n => Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
  const mln = n => (n / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн ₽';
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ================= ДАННЫЕ (заменить на реальные) ================= */
  // Площади и цены — с официального сайта по данным поисковой выдачи. Названия, спальни и описания — черновые.
  const PROJECTS = [
    { id: '121', area: 121, beds: 3, baths: 2, price: 17900000, plot: 'от 6 соток' },
    { id: '142', area: 142, beds: 3, baths: 2, price: 23920000, plot: 'от 6 соток' },
    { id: '162', area: 162, beds: 4, baths: 2, price: 25820000, plot: 'от 6,85 сотки' },
  ];
  const STYLES = {
    hitech: { name: 'Хай-тек', img: { 121: 'house-hitech', 142: 'house-hitech', 162: 'house-hitech2' }, text: 'Плоская кровля, панорамные окна в пол, терраса из лиственницы.' },
    classic: { name: 'Классика', img: { 121: 'house-classic2', 142: 'house-classic', 162: 'house-classic' }, text: 'Вальмовая кровля, белые рамы, крыльцо и тёплый кирпич.' },
  };
  const VARIANTS = PROJECTS.flatMap(p => Object.keys(STYLES).map(s => ({ ...p, style: s, title: `${STYLES[s].name} ${p.area}`, img: `assets/img/${STYLES[s].img[p.area]}-sm.webp` })));

  /* ---------------- заголовок героя под ширину ---------------- */
  const title = $('#heroTitle');
  function fitTitle() {
    if (!title) return;
    const avail = title.parentElement.clientWidth - parseFloat(getComputedStyle(title.parentElement).paddingLeft) * 2;
    title.style.setProperty('--t', '100px');
    const words = $$('.hero__word', title).map(w => w.getBoundingClientRect().width);
    const stacked = getComputedStyle(title).flexDirection === 'column';
    const w = stacked ? Math.max(...words) : words.reduce((a, b) => a + b, 0) + 16;
    const size = Math.min(100 * avail / w * .98, stacked ? 220 : 330).toFixed(1) + 'px';
    title.style.setProperty('--t', size);
    $('#heroHouse')?.style.setProperty('--t', size);
  }
  fitTitle(); document.fonts?.ready.then(fitTitle); addEventListener('resize', fitTitle);

  /* ---------------- плавный скролл ---------------- */
  let lenis = null;
  if (!reduced && fine && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (anim) { lenis.on('scroll', ST.update); G.ticker.add(t => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  const goTo = (target, off = -10) => lenis ? lenis.scrollTo(target, { offset: off, duration: 1.4 }) : target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href'), target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault(); closeDrawer(); goTo(target, id === '#top' ? 0 : -10);
  });

  /* ---------------- меню ---------------- */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = open => {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.setAttribute('aria-hidden', !open);
    lenis && (open ? lenis.stop() : lenis.start());
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') { setMenu(false); closeDrawer(); hideTip(); } });

  /* ---------------- навигация ---------------- */
  const nav = $('#nav'), sticky = $('#stickyCta'), hero = $('#hero'), visit = $('#visit');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY, hb = hero.offsetTop + hero.offsetHeight;
    nav.classList.toggle('is-scrolled', y > 30);
    if (!root.classList.contains('menu-open')) {
      if (y > hb && y > lastY + 2) nav.classList.add('is-hidden');
      if (y < lastY - 2 || y < hb) nav.classList.remove('is-hidden');
    }
    lastY = y;
    const r = visit.getBoundingClientRect();
    sticky?.classList.toggle('is-visible', y > hb * .7 && !(r.top < innerHeight && r.bottom > 0));
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const pills = $$('.nav__pills .pill');
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) pills.forEach(p => p.classList.toggle('is-current', p.getAttribute('href') === '#' + en.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  pills.forEach(p => { const s = $(p.getAttribute('href')); s && io.observe(s); });

  /* ---------------- кнопки: заливка из точки касания ---------------- */
  function wireBtn(btn) {
    const setXY = e => { const r = btn.getBoundingClientRect(); btn.style.setProperty('--x', (e.clientX - r.left) + 'px'); btn.style.setProperty('--y', (e.clientY - r.top) + 'px'); };
    btn.addEventListener('pointerenter', setXY); btn.addEventListener('pointerleave', setXY);
    btn.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      setXY(e); btn.classList.add('is-filled'); clearTimeout(btn._t);
      btn._t = setTimeout(() => btn.classList.remove('is-filled'), 650);
    });
  }
  $$('.btn').forEach(wireBtn);

  /* ================= ПРОЕКТЫ ================= */
  const rail = $('#rail'), bar = $('#railBar');
  rail.innerHTML = VARIANTS.map((v, i) => `
    <article class="house" data-style="${v.style}" data-i="${i}" tabindex="0" role="button" aria-label="Подробнее: ${v.title}">
      <div class="house__img"><img src="${v.img}" alt="" loading="lazy" draggable="false"></div>
      <div class="house__body">
        <div class="house__top"><span class="tag">${STYLES[v.style].name}</span><span class="house__area">${v.area} м²</span></div>
        <h3>${v.title}</h3>
        <div class="house__specs"><span>${v.beds} спальни</span><span>${v.baths} санузла</span><span>${v.plot}</span></div>
        <div class="house__foot"><span>от ${mln(v.price)}</span><span class="arrow-link" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span></div>
      </div>
    </article>`).join('');
  const step = () => (rail.querySelector('.house:not(.is-out)')?.offsetWidth || 300) + 16;
  const updRail = () => {
    const max = rail.scrollWidth - rail.clientWidth, p = max > 0 ? rail.scrollLeft / max : 0, vis = rail.clientWidth / rail.scrollWidth;
    bar.style.width = (vis + (1 - vis) * p) * 100 + '%';
    $('#prevHouse').disabled = rail.scrollLeft < 4; $('#nextHouse').disabled = rail.scrollLeft > max - 4;
  };
  $('#prevHouse').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('#nextHouse').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
  rail.addEventListener('scroll', updRail, { passive: true }); addEventListener('resize', updRail); updRail();
  let down = false, sx = 0, sl = 0, moved = false;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-dragging'); } rail.scrollLeft = sl - dx; });
  addEventListener('pointerup', () => { if (!down) return; down = false; if (moved) { rail.classList.remove('is-dragging'); setTimeout(() => moved = false, 50); } });
  rail.addEventListener('click', e => { const card = e.target.closest('.house'); if (!card || moved) return; openDrawer(VARIANTS[+card.dataset.i]); });
  rail.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('house')) openDrawer(VARIANTS[+e.target.dataset.i]);
    if (e.key === 'ArrowRight') rail.scrollBy({ left: step(), behavior: 'smooth' });
    if (e.key === 'ArrowLeft') rail.scrollBy({ left: -step(), behavior: 'smooth' });
  });
  function setFilter(f) {
    $$('.filter__btn').forEach(b => b.classList.toggle('is-active', b.dataset.filter === f));
    const cards = $$('.house', rail);
    cards.forEach(c => c.classList.toggle('is-out', f !== 'all' && c.dataset.style !== f));
    rail.scrollTo({ left: 0 });
    if (anim) G.fromTo(cards.filter(c => !c.classList.contains('is-out')), { x: 80, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .9, stagger: .06, ease: 'expo.out' });
    updRail();
  }
  $$('.filter__btn').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
  $$('[data-filter-link]').forEach(a => a.addEventListener('click', () => setFilter(a.dataset.filterLink)));

  /* ---------------- выдвижная карточка проекта ---------------- */
  const drawer = $('#drawer');
  function openDrawer(v) {
    $('#dImg').src = v.img.replace('-sm', ''); $('#dImg').alt = v.title;
    $('#dStyle').textContent = 'Проект · ' + STYLES[v.style].name;
    $('#dTitle').textContent = v.title;
    $('#dSpecs').innerHTML = [['Площадь', v.area + ' м²'], ['Спальни', v.beds], ['Санузлы', v.baths], ['Участок', v.plot]].map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    $('#dText').textContent = STYLES[v.style].text + ' Один этаж, выход на террасу из гостиной, отделка White Box.';
    $('#dPrice').textContent = 'от ' + mln(v.price);
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    lenis?.stop(); document.body.style.overflow = 'hidden';
    if (anim) G.fromTo('.drawer__img img', { y: 60, autoAlpha: 0, scale: .9 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1, delay: .2, ease: 'expo.out' });
    $('#drawerClose').focus();
  }
  function closeDrawer() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
    lenis?.start(); document.body.style.overflow = '';
  }
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerBg').addEventListener('click', closeDrawer);

  /* ================= ГЕНПЛАН ================= */
  const svg = $('#planSvg'), NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };
  const plots = [];
  (function buildPlan() {
    el('rect', { x: 0, y: 0, width: 1000, height: 620, fill: '#2e3d33' });
    for (let i = 0; i < 260; i++) { const x = rnd() * 1000, y = rnd() * 620; if (x > 50 && x < 950 && y > 40 && y < 580) continue; el('circle', { cx: x, cy: y, r: 8 + rnd() * 10, fill: rnd() > .5 ? '#3d5243' : '#34483a' }); }
    el('rect', { x: 50, y: 40, width: 900, height: 540, rx: 30, fill: '#e9ece4' });
    el('rect', { x: 480, y: 40, width: 40, height: 560, fill: '#c9cbc6' });
    [150, 300, 450].forEach(y => el('rect', { x: 60, y: y - 10, width: 880, height: 20, fill: '#c9cbc6' }));
    el('rect', { x: 70, y: 232, width: 180, height: 136, rx: 18, fill: '#a9c79f' });
    for (let i = 0; i < 14; i++) el('circle', { cx: 90 + rnd() * 140, cy: 250 + rnd() * 100, r: 6 + rnd() * 5, fill: '#7fa678' });
    el('text', { x: 160, y: 306, 'text-anchor': 'middle', class: 'plan-label' }).textContent = 'Парк 1 га';
    el('rect', { x: 540, y: 500, width: 110, height: 60, rx: 10, fill: '#121315' });
    el('text', { x: 595, y: 535, 'text-anchor': 'middle', class: 'plan-label', fill: '#fff', style: 'fill:#fff' }).textContent = 'Клубный дом';
    el('rect', { x: 470, y: 580, width: 60, height: 26, rx: 6, fill: '#e8913a' });
    el('text', { x: 500, y: 598, 'text-anchor': 'middle', class: 'plan-label' }).textContent = 'КПП';
    let no = 1;
    const rows = [[150, -1], [150, 1], [300, -1], [300, 1], [450, -1], [450, 1]];
    rows.forEach(([y, side]) => {
      for (let x = 66; x < 930; x += 36) {
        if (x > 448 && x < 520) continue;
        const top = side < 0 ? y - 10 - 52 - (y === 150 ? 0 : 0) : y + 12;
        if (x < 256 && top > 220 && top < 370) continue;
        if (y === 450 && side > 0 && x > 520 && x < 660) continue;
        const r = rnd(), status = r < .42 ? 'free' : r < .55 ? 'reserved' : 'sold';
        const v = VARIANTS[(rnd() * VARIANTS.length) | 0];
        const area = +(6 + rnd() * 6).toFixed(1);
        const p = el('rect', { x, y: top, width: 32, height: 50, rx: 4, class: `plot plot--${status}`, tabindex: 0, role: 'button', 'aria-label': `Участок ${no}` });
        plots.push({ node: p, no, status, v, area, price: v.price + Math.max(0, area - 6) * 320000 });
        no++;
      }
    });
    const counts = { free: 0, reserved: 0, sold: 0 }; plots.forEach(p => counts[p.status]++);
    $('#cntFree').textContent = counts.free; $('#cntRes').textContent = counts.reserved; $('#cntSold').textContent = counts.sold;
  })();
  const tip = $('#tip'); let pinned = null;
  const statusName = { free: 'Свободно', reserved: 'Бронь', sold: 'Продано' };
  function showTip(p) {
    tip.hidden = false;
    $('#tipNo').textContent = '№ ' + p.no;
    $('#tipArea').textContent = String(p.area).replace('.', ',') + ' сот.';
    const b = $('#tipStatus'); b.textContent = statusName[p.status]; b.className = 'badge badge--' + p.status;
    $('#tipImg').src = p.v.img;
    $('#tipProj').textContent = p.status === 'sold' ? 'Дом построен' : 'Проект: ' + p.v.title;
    $('#tipPrice').textContent = p.status === 'sold' ? '' : 'от ' + mln(p.price);
    $('#tipBtn').hidden = p.status !== 'free';
  }
  function hideTip() { tip.hidden = true; pinned?.node.classList.remove('is-active'); pinned = null; }
  plots.forEach(p => {
    if (fine) {
      p.node.addEventListener('pointerenter', () => { if (!pinned) showTip(p); });
      p.node.addEventListener('pointerleave', () => { if (!pinned) tip.hidden = true; });
    }
    const pick = () => { pinned?.node.classList.remove('is-active'); pinned = p; p.node.classList.add('is-active'); showTip(p); if (anim) G.fromTo(tip, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .5, ease: 'expo.out' }); };
    p.node.addEventListener('click', pick);
    p.node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  $('#tipClose').addEventListener('click', hideTip);
  $$('.lg').forEach(b => b.addEventListener('click', () => {
    b.classList.toggle('is-on');
    const on = $$('.lg.is-on').map(x => x.dataset.status);
    plots.forEach(p => p.node.classList.toggle('is-dim', !on.includes(p.status)));
  }));
  // на телефоне карта шире экрана — начинаем с центра
  const ps = $('#planScroll'); requestAnimationFrame(() => { ps.scrollLeft = (ps.scrollWidth - ps.clientWidth) / 2; });

  /* ================= ЛЕС: силуэты сосен ================= */
  function pines(id, count, minH, maxH) {
    let d = 'M0 400 ';
    for (let i = 0; i <= count; i++) {
      const x = (i / count) * 1600 + (rnd() - .5) * 20, h = minH + rnd() * (maxH - minH), w = h * .32;
      const b = 400 - h * .12;
      d += `L${x - w} ${b} L${x - w * .55} ${b - h * .3} L${x - w * .8} ${b - h * .3} L${x - w * .35} ${b - h * .6} L${x - w * .55} ${b - h * .6} L${x} ${400 - h} L${x + w * .55} ${b - h * .6} L${x + w * .35} ${b - h * .6} L${x + w * .8} ${b - h * .3} L${x + w * .55} ${b - h * .3} L${x + w} ${b} `;
    }
    $('#' + id).setAttribute('d', d + 'L1600 400 Z');
  }
  pines('pines3', 46, 160, 280); pines('pines2', 32, 200, 330); pines('pines1', 20, 260, 390);

  /* ================= КАЛЬКУЛЯТОР ================= */
  const rP = $('#rPrice'), rD = $('#rDown'), rT = $('#rTerm'), rR = $('#rRate');
  let mode = 'mortgage', shown = 0;
  const fill = r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min)) * 100 + '%');
  function calc() {
    [rP, rD, rT, rR].forEach(fill);
    const price = +rP.value, downPct = +rD.value, down = price * downPct / 100, loan = price - down;
    let pay;
    if (mode === 'install') pay = loan / 24;
    else { const r = +rR.value / 100 / 12, n = +rT.value * 12; pay = r ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n; }
    $('#oPrice').textContent = mln(price);
    $('#oDown').textContent = downPct + '% · ' + mln(down);
    $('#oTerm').textContent = rT.value + ' лет';
    $('#oRate').textContent = (+rR.value).toFixed(1).replace('.', ',') + '%';
    $('#loan').textContent = rub(loan) + ' ₽'; $('#downSum').textContent = rub(down) + ' ₽';
    const o = { v: shown };
    if (anim) G.to(o, { v: pay, duration: .6, ease: 'power3.out', overwrite: true, onUpdate: () => { $('#pay').textContent = rub(o.v); shown = o.v; } });
    else { $('#pay').textContent = rub(pay); shown = pay; }
  }
  [rP, rD, rT, rR].forEach(r => r.addEventListener('input', calc));
  $$('.calc__mode').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    $$('.calc__mode').forEach(x => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-checked', x === b); });
    $('#termWrap').hidden = $('#rateWrap').hidden = mode === 'install';
    if (mode === 'install' && +rD.value < 30) rD.value = 30;
    calc();
  }));
  calc();

  /* ================= ФОРМА ================= */
  const form = $('#form'), ticket = $('#ticket'), phone = $('#f-phone');
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const digits = v => v.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
  const fmt = d => { let s = '+7'; if (d.length) s += ' (' + d.slice(0, 3); if (d.length >= 3) s += ')'; if (d.length > 3) s += ' ' + d.slice(3, 6); if (d.length > 6) s += '-' + d.slice(6, 8); if (d.length > 8) s += '-' + d.slice(8, 10); return s; };
  phone.addEventListener('input', () => { const d = digits(phone.value); phone.value = d.length ? fmt(d) : ''; });
  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 '; });
  phone.addEventListener('blur', () => { if (!digits(phone.value).length) phone.value = ''; });
  $$('.field input').forEach(i => i.addEventListener('input', () => i.parentElement.classList.remove('is-error')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#f-name'), agree = $('#f-agree'); let ok = true;
    const fail = n => { ok = false; n.classList.remove('is-error'); void n.offsetWidth; n.classList.add('is-error'); };
    if (name.value.trim().length < 2) fail(name.parentElement);
    if (digits(phone.value).length !== 10) fail(phone.parentElement);
    agree.closest('.check').classList.toggle('is-error', !agree.checked);
    if (!agree.checked) ok = false;
    if (!ok) return;
    // TODO: отправка заявки (CRM / Telegram-бот / почта)
    $('#tName').textContent = name.value.trim().split(' ')[0];
    $('#tDay').textContent = form.querySelector('input[name="day"]:checked').value;
    $('#tStyle').textContent = form.querySelector('input[name="style"]:checked').value;
    $('#tNo').textContent = pad(Math.floor(Math.random() * 9000) + 1000, 4);
    const show = () => { form.hidden = true; ticket.hidden = false; };
    if (anim) G.to(form, { y: -20, autoAlpha: 0, duration: .4, ease: 'power2.in', onComplete: () => {
      show(); G.set(form, { clearProps: 'all' });
      G.fromTo(ticket, { y: 80, rotation: -6, autoAlpha: 0, scale: .9 }, { y: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: 1.1, ease: 'elastic.out(1, .7)' });
    } }); else show();
  });
  $('#again').addEventListener('click', () => { form.reset(); ticket.hidden = true; form.hidden = false; $('#f-name').focus(); });

  $$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Скопировано'; }
    catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Выделено'; }
    b.classList.add('is-done'); setTimeout(() => { b.textContent = 'Копировать'; b.classList.remove('is-done'); }, 1800);
  }));

  /* ================= МЫШЬ: курсор, магниты, наклоны ================= */
  if (fine && !reduced) {
    const cur = $('#cursor'), label = $('#cursorLabel');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() { cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2); cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
    $$('[data-cursor]').forEach(n => {
      n.addEventListener('pointerenter', () => { label.textContent = n.dataset.cursor; cur.classList.add('is-big'); });
      n.addEventListener('pointerleave', () => cur.classList.remove('is-big'));
    });
    document.addEventListener('pointerover', e => { if (!cur.classList.contains('is-big')) cur.style.scale = e.target.closest('a, button, input, label, summary, .plot') ? '2.4' : ''; });
    $$('.map, .place').forEach(n => {
      n.addEventListener('pointerenter', () => cur.classList.add('is-hidden'));
      n.addEventListener('pointerleave', () => cur.classList.remove('is-hidden'));
    });
    $$('[data-spot]').forEach(n => n.addEventListener('pointermove', e => {
      const r = n.getBoundingClientRect(); n.style.setProperty('--mx', (e.clientX - r.left) + 'px'); n.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
    if (G) {
      $$('[data-magnetic]').forEach(n => {
        const xTo = G.quickTo(n, 'x', { duration: .6, ease: 'power3' }), yTo = G.quickTo(n, 'y', { duration: .6, ease: 'power3' });
        n.addEventListener('pointermove', e => { const r = n.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
        n.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
      });
      // дом в герое и буквы двигаются за мышью в разные стороны
      const hx = G.quickTo('#heroHouse', 'x', { duration: 1.2, ease: 'power3' }), hr = G.quickTo('#heroHouse', 'rotationY', { duration: 1.2, ease: 'power3' });
      const tx = G.quickTo(title, 'x', { duration: 1.4, ease: 'power3' });
      G.set('#heroHouse', { transformPerspective: 1600 });
      hero.addEventListener('pointermove', e => { const n = e.clientX / innerWidth - .5; hx(n * 30); hr(n * 8); tx(-n * 40); });
      // лес сдвигается слоями за мышью
      const forest = $('.forest');
      const layers = $$('.forest__layer').map(l => ({ to: G.quickTo(l, 'x', { duration: 1.2, ease: 'power3' }), d: +l.dataset.depth }));
      forest.addEventListener('pointermove', e => { const n = e.clientX / innerWidth - .5; layers.forEach(l => l.to(-n * 120 * l.d)); });
      // карточки проектов наклоняются
      rail.addEventListener('pointermove', e => {
        const c = e.target.closest('.house'); if (!c) return;
        const r = c.getBoundingClientRect();
        G.to(c, { rotationY: ((e.clientX - r.left) / r.width - .5) * 10, rotationX: -((e.clientY - r.top) / r.height - .5) * 8, transformPerspective: 1000, duration: .6, ease: 'power3' });
      });
      rail.addEventListener('pointerout', e => { const c = e.target.closest('.house'); if (c && !c.contains(e.relatedTarget)) G.to(c, { rotationX: 0, rotationY: 0, duration: .8, ease: 'power3' }); });
    }
  }

  /* ================= МИНИ-ИГРА «Это место для вас» ================= */
  (function game() {
    const arena = $('#place'), fly = $('#flyer'), slot = $('#slot'), promo = $('#promo'), hint = $('#placeHint');
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
      const tScale = s.w / W, end = { x: s.x - W / 2, y: s.y - H / 2 }, from = { ...p, r: rot, sc: scale }, st = performance.now();
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
    $('#replay').addEventListener('click', reset);
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
    (function stepF() {
      const a = rect(), floor = a.height - H - 8;
      if (mode === 'idle') { t0 += .03; p.y = base.y + Math.sin(t0) * 10; p.x = base.x + Math.cos(t0 * .7) * 6; v.x = Math.cos(t0 * .7) * -.4; }
      else if (mode === 'follow') { v.x += (target.x - p.x) * .07; v.y += (target.y - p.y) * .07; v.x *= .8; v.y *= .8; p.x += v.x; p.y += v.y; }
      else if (mode === 'fall') {
        v.y += .9; v.x *= .99; p.x += v.x; p.y += v.y;
        if (p.y > floor) { p.y = floor; v.y *= -.45; v.x *= .8; if (Math.abs(v.y) < 1.2) v.y = 0; }
        if (p.x < 0) { p.x = 0; v.x *= -.6; } if (p.x > a.width - W) { p.x = a.width - W; v.x *= -.6; }
      }
      if (mode !== 'done') { rot = lerp(rot, clamp(v.x * 2.4, -40, 40), .15); slot.classList.toggle('is-near', near()); draw(); }
      requestAnimationFrame(stepF);
    })();
    const cv = $('#confetti'), ctx = cv.getContext('2d'); let parts = [];
    function burst(x, y) {
      const a = rect(); cv.width = a.width; cv.height = a.height;
      const cols = ['#e8913a', '#f6c37f', '#121315', '#ffffff', '#9a5a42'];
      parts = Array.from({ length: 140 }, () => ({ x, y, vx: (Math.random() - .5) * 18, vy: -Math.random() * 16 - 4, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[(Math.random() * cols.length) | 0], life: 1 }));
      (function f() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        parts.forEach(q => { q.vy += .45; q.vx *= .985; q.x += q.vx; q.y += q.vy; q.r += q.vr; q.life -= .008; ctx.save(); ctx.globalAlpha = Math.max(0, q.life); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); });
        parts = parts.filter(q => q.life > 0 && q.y < cv.height + 40);
        if (parts.length) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
      })();
    }
  })();

  /* ================= GSAP: прелоадер и скролл ================= */
  const loader = $('#loader');
  if (!anim) { loader?.remove(); return; }
  G.registerPlugin(ST);

  function splitChars(n) {
    const text = n.textContent.trim().replace(/\s+/g, ' ');
    n.setAttribute('aria-label', text); n.textContent = '';
    const chars = [];
    text.split(' ').forEach((w, i, arr) => {
      const cw = document.createElement('span'); cw.className = 'cw'; cw.setAttribute('aria-hidden', 'true');
      [...w].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; cw.appendChild(c); chars.push(c); });
      n.appendChild(cw); if (i < arr.length - 1) n.appendChild(document.createTextNode(' '));
    });
    return chars;
  }
  const charEls = $$('[data-chars]').map(n => [n, splitChars(n)]);
  $$('.odo').forEach(n => {
    const val = String(n.dataset.odo), suf = n.dataset.suffix || '';
    n.setAttribute('aria-label', val + suf); n.textContent = '';
    n._strips = [...val].map(d => {
      const box = document.createElement('span'); box.className = 'odo__d'; box.setAttribute('aria-hidden', 'true');
      const s = document.createElement('span'); s.className = 'odo__s';
      for (let i = 0; i < 20; i++) { const k = document.createElement('span'); k.textContent = i % 10; s.appendChild(k); }
      box.appendChild(s); n.appendChild(box); return { s, d: +d };
    });
    if (suf) { const x = document.createElement('span'); x.className = 'odo__suf'; x.textContent = suf; x.setAttribute('aria-hidden', 'true'); n.appendChild(x); }
  });

  G.set('.hero__title .ch', { yPercent: 115 });
  G.set('#heroHouse', { y: 140, autoAlpha: 0, scale: .92 });
  G.set('[data-hero-fade]', { y: 30, autoAlpha: 0 });
  G.set('.nav', { y: -30, autoAlpha: 0 });

  const heroImg = $('#heroHouse');
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
      .to('.hero__title .ch', { yPercent: 0, duration: 1.5, stagger: .05 }, '-=.5')
      .to('#heroHouse', { y: 0, autoAlpha: 1, scale: 1, duration: 1.8 }, '-=1.3')
      .to('.nav', { y: 0, autoAlpha: 1, duration: 1 }, '-=1.4')
      .to('[data-hero-fade]', { y: 0, autoAlpha: 1, duration: 1.1, stagger: .07 }, '-=1.3')
      .add(setupScroll, '-=.6');
  }

  function setupScroll() {
    charEls.forEach(([n, chars]) => G.from(chars, { yPercent: 80, rotate: 8, autoAlpha: 0, filter: 'blur(14px)', duration: 1.3, ease: 'expo.out', stagger: .028, scrollTrigger: { trigger: n, start: 'top 85%' } }));
    G.set('[data-reveal]', { y: 40, autoAlpha: 0 });
    ST.batch('[data-reveal]', { start: 'top 90%', onEnter: b => G.to(b, { y: 0, autoAlpha: 1, duration: 1.1, stagger: .08, ease: 'expo.out', overwrite: true }) });
    $$('[data-slide]').forEach((n, i) => {
      const dir = n.dataset.slide;
      const from = dir === 'left' ? { xPercent: -30, rotate: -4 } : dir === 'right' ? { xPercent: 30, rotate: 4 } : { yPercent: 40, rotate: 2 };
      G.from(n, { ...from, autoAlpha: 0, duration: 1.3, ease: 'expo.out', delay: (i % 3) * .06, scrollTrigger: { trigger: n, start: 'top 92%' } });
    });
    $$('.odo').forEach(n => {
      const done = () => { n.textContent = n.getAttribute('aria-label'); };
      n._strips.forEach((st, i, a) => G.fromTo(st.s, { yPercent: 0 }, { yPercent: -((10 + st.d) / 20) * 100, duration: 2.2 + i * .35, ease: 'expo.out', onComplete: i === a.length - 1 ? done : null, scrollTrigger: { trigger: n, start: 'top 88%' } }));
    });
    // герой: дом приближается, буквы уезжают
    G.to('#heroHouse', { scale: 1.12, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    G.to('#heroTitle', { yPercent: 40, autoAlpha: .3, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    // дома стилей выезжают при скролле на телефоне (на компьютере — при наведении)
    if (!fine) $$('.style-card__house').forEach(n => G.from(n, { yPercent: 40, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: n.parentElement, start: 'top 75%' } }));
    // лес: слои с разной скоростью + текст
    $$('.forest__layer').forEach(l => G.fromTo(l, { yPercent: 30 * +l.dataset.depth }, { yPercent: -10 * +l.dataset.depth, ease: 'none', scrollTrigger: { trigger: '.forest', start: 'top bottom', end: 'bottom top', scrub: true } }));
    G.from('#forestText', { yPercent: 60, autoAlpha: 0, filter: 'blur(12px)', ease: 'none', scrollTrigger: { trigger: '.forest', start: 'top 80%', end: 'center center', scrub: true } });
    // генплан: участки появляются волной
    G.fromTo('.plot', { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .6, ease: 'back.out(2)', stagger: { each: .006, from: 'center' }, scrollTrigger: { trigger: '.plan__box', start: 'top 80%' } });
    G.fromTo('.map', { clipPath: 'inset(10% 10% 10% 10% round 60px)' }, { clipPath: 'inset(0% 0% 0% 0% round 30px)', ease: 'none', scrollTrigger: { trigger: '.map', start: 'top 95%', end: 'top 45%', scrub: .5 } });
    G.from('.house', { x: 160, autoAlpha: 0, rotate: 3, duration: 1.3, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '#rail', start: 'top 85%' } });
    G.from('.dev__logo', { xPercent: -30, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.dev', start: 'top 75%' } });
    G.from('.footer__logo > *', { yPercent: 100, autoAlpha: 0, duration: 1.4, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.footer__logo', start: 'top 95%' } });
    G.from('.place__line:nth-child(2)', { yPercent: 60, autoAlpha: 0, filter: 'blur(14px)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.place__title', start: 'top 80%' } });
    ST.refresh();
  }

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
