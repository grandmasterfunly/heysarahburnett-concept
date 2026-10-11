/* Sarah Burnett: interactions. Progressive enhancement: the page is fully usable without JS. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const saveData = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
export const motionOK = () => !mqReduce.matches && !root.classList.contains('no-motion');
window.__motionOK = motionOK;

/* ---------- Motion toggle (WCAG 2.3.3) ---------- */
const motionBtn = $('#motion-toggle');
function syncMotionBtn() {
  const off = !motionOK();
  motionBtn.setAttribute('aria-pressed', String(off));
  motionBtn.textContent = off ? 'Motion reduced' : 'Reduce motion';
  document.dispatchEvent(new CustomEvent('motionchange'));
}
motionBtn.addEventListener('click', () => {
  const off = !root.classList.contains('no-motion');
  root.classList.toggle('no-motion', off);
  try { localStorage.setItem('sb-motion', off ? 'off' : 'on'); } catch (e) {}
  syncMotionBtn();
});
mqReduce.addEventListener('change', syncMotionBtn);
syncMotionBtn();
$('#year').textContent = new Date().getFullYear();

/* ---------- Header, progress, active section ---------- */
const header = $('.site-header');
const progress = $('.progress');
let lastY = scrollY;
function onScroll() {
  const y = scrollY;
  header.classList.toggle('is-solid', y > 40);
  lastY = y;
  const h = document.documentElement.scrollHeight - innerHeight;
  progress.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
}
addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
onScroll();


const navLinks = $$('.nav-desktop a');
const sectionObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => (a.hash === '#' + e.target.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const s = $(a.hash); if (s) sectionObs.observe(s); });

/* ---------- Mobile menu (native modal dialog = focus trap + Esc) ---------- */
const menu = $('#menu');
const menuBtn = $('.menu-btn');
menuBtn.addEventListener('click', () => { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; });
$('.menu-close').addEventListener('click', () => menu.close());
menu.addEventListener('close', () => { menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; });
$$('.menu-list a', menu).forEach((a) => a.addEventListener('click', () => menu.close()));
menuBtn.setAttribute('aria-expanded', 'false');

/* ---------- Background videos ---------- */
function setupAmbient(video, { sources, toggle }) {
  if (!video) return;
  let loaded = false; let userPaused = false; let visible = true;
  const pick = () => (typeof sources === 'function' ? sources() : sources);
  const shouldPlay = () => motionOK() && !saveData && !userPaused && visible;
  const update = () => {
    if (shouldPlay()) {
      if (!loaded) { video.src = pick(); loaded = true; video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true }); }
      video.play().catch(() => {});
    } else if (loaded) video.pause();
    if (toggle) {
      toggle.hidden = !motionOK() || saveData;
      toggle.setAttribute('aria-pressed', String(userPaused));
      $('.visually-hidden', toggle).textContent = userPaused ? 'Play background video' : 'Pause background video';
      $('.i-pause', toggle).style.display = userPaused ? 'none' : '';
      $('.i-play', toggle).style.display = userPaused ? '' : 'none';
    }
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(video.parentElement);
  if (toggle) toggle.addEventListener('click', () => { userPaused = !userPaused; update(); });
  document.addEventListener('motionchange', update);
  update();
}
const heroVideo = $('.hero-video');
heroVideo.style.cssText = 'position:absolute;inset:0;opacity:0;transition:opacity 1.2s';
heroVideo.addEventListener('playing', () => (heroVideo.style.opacity = 1));
setupAmbient(heroVideo, {
  sources: () => (matchMedia('(max-width: 47.99rem) and (orientation: portrait)').matches ? heroVideo.dataset.srcPortrait : heroVideo.dataset.srcWide),
  toggle: $('.hero-toggle'),
});
const amb = $('.retreats .ambient');
amb.style.cssText = 'position:absolute;inset:0;opacity:0;transition:opacity 1.2s';
amb.addEventListener('playing', () => (amb.style.opacity = 1));
setupAmbient(amb, { sources: amb.dataset.src });

/* ---------- Marquee pause ---------- */
const mq = $('.marquee'); const mqBtn = $('.marquee-toggle');
mqBtn.addEventListener('click', () => {
  const p = mq.classList.toggle('is-paused');
  mqBtn.setAttribute('aria-pressed', String(p));
  $('.visually-hidden', mqBtn).textContent = p ? 'Play scrolling credentials' : 'Pause scrolling credentials';
  $('use', mqBtn).setAttribute('href', p ? '#i-play' : '#i-pause');
});

/* ---------- Reveal on scroll ---------- */
const revObs = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); revObs.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
$$('.reveal, .reveal-img').forEach((el) => revObs.observe(el));

/* Hero headline line-by-line entrance */
if (motionOK()) {
  $$('.hero h1 .line > span').forEach((s, i) => s.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 1200, delay: 150 + i * 140, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
  $$('.hero .lead, .hero .btn-row, .hero .badge').forEach((s, i) => s.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: 600 + i * 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
}

/* ---------- Manifesto word scrub + parallax (rAF, motion-gated) ---------- */
const scrub = $('.scrub');
if (scrub) {
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((w) => { if (/^\s+$/.test(w) || !w) frag.append(w); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; frag.append(s); } });
        n.replaceWith(frag);
      } else walk(n);
    });
  };
  walk(scrub);
}
const words = $$('.scrub .w');
const parallaxEls = $$('[data-parallax]');
function frame() {
  if (motionOK()) {
    if (words.length) {
      const r = scrub.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    }
    parallaxEls.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      const c = r.top + r.height / 2 - innerHeight / 2;
      el.style.transform = `translate3d(0, ${(c * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0)`;
    });
  } else { words.forEach((w) => w.classList.add('is-lit')); parallaxEls.forEach((el) => (el.style.transform = '')); }
}
addEventListener('scroll', () => requestAnimationFrame(frame), { passive: true });
document.addEventListener('motionchange', frame);
frame();

/* Scroll only the horizontal strip that contains el (never the page): no scrollIntoView. */
export function centerInStrip(el) {
  let strip = el.parentElement;
  while (strip && strip !== document.body && !(strip.scrollWidth > strip.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(strip).overflowX))) strip = strip.parentElement;
  if (!strip || strip === document.body) return;
  const sr = strip.getBoundingClientRect(), er = el.getBoundingClientRect();
  const left = strip.scrollLeft + (er.left - sr.left) - (strip.clientWidth - er.width) / 2;
  strip.scrollTo({ left: Math.max(0, left), behavior: motionOK() ? 'smooth' : 'auto' });
}
window.__centerInStrip = centerInStrip;

/* ---------- Accessible tabs helper (roving tabindex + swipe) ---------- */
export function tabs(tabEls, onSelect, { swipeTargets = [] } = {}) {
  const select = (i, focus = true) => {
    i = (i + tabEls.length) % tabEls.length;
    tabEls.forEach((t, j) => { const on = i === j; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    if (focus) tabEls[i].focus({ preventScroll: true });
    centerInStrip(tabEls[i]);
    onSelect(i);
  };
  tabEls.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', (e) => {
      const k = e.key; const cur = tabEls.indexOf(document.activeElement);
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); select(cur + 1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); select(cur - 1); }
      else if (k === 'Home') { e.preventDefault(); select(0); }
      else if (k === 'End') { e.preventDefault(); select(tabEls.length - 1); }
    });
  });
  swipeTargets.forEach((el) => onSwipe(el, (dir) => { const cur = tabEls.findIndex((t) => t.getAttribute('aria-selected') === 'true'); select(cur + dir, false); }));
  return select;
}
export function onSwipe(el, cb) {
  let x0 = null, y0 = null, t0 = 0;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && Date.now() - t0 < 700) cb(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}
window.__tabs = tabs; window.__onSwipe = onSwipe;

/* ---------- Service explorer ---------- */
const needTabs = $$('.need-tab');
const panels = needTabs.map((t) => $('#' + t.getAttribute('aria-controls')));
tabs(needTabs, (i) => {
  panels.forEach((p, j) => { p.hidden = i !== j; p.classList.remove('is-entering'); });
  if (motionOK()) { void panels[i].offsetWidth; panels[i].classList.add('is-entering'); }
}, { swipeTargets: panels });

/* ---------- Testimonials carousel ---------- */
$$('[data-carousel]').forEach((c) => {
  const track = $('.t-track', c); const cards = $$('.t-card', c);
  const dots = $('.dots', c); const prev = $('.prev', c); const next = $('.next', c);
  cards.forEach((card, i) => {
    card.setAttribute('aria-roledescription', 'slide');
    card.setAttribute('aria-label', `${i + 1} of ${cards.length}`);
    const b = document.createElement('button'); b.type = 'button';
    b.setAttribute('aria-label', `Show testimonial ${i + 1}`);
    b.addEventListener('click', () => go(i)); dots.append(b);
  });
  const dotBtns = $$('button', dots);
  let current = 0;
  const go = (i) => { i = Math.max(0, Math.min(cards.length - 1, i)); const card = cards[i]; track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.clientWidth) / 2, behavior: motionOK() ? 'smooth' : 'auto' }); };
  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  const update = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = Infinity;
    cards.forEach((card, i) => { const d = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    current = best;
    dotBtns.forEach((d, i) => (i === best ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    prev.disabled = best === 0; next.disabled = best === cards.length - 1;
    cards.forEach((card, i) => { card.style.transform = motionOK() && i !== best ? 'scale(.96)' : ''; });
  };
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); } });
  addEventListener('resize', update); update();
  $$('.more', c).forEach((b) => b.addEventListener('click', () => {
    const full = $('.q-full', b.closest('.t-card')); const open = b.getAttribute('aria-expanded') === 'true';
    full.hidden = open; b.setAttribute('aria-expanded', String(!open)); b.textContent = open ? 'Read full story' : 'Show less';
  }));
});

/* ---------- Gallery filter + previews ---------- */
const masonry = $('#masonry');
$$('.filter-bar button').forEach((b) => b.addEventListener('click', () => {
  $$('.filter-bar button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const f = b.dataset.filter; let n = 0;
  $$('li', masonry).forEach((li) => { const show = f === 'all' || li.dataset.cat.split(' ').includes(f); li.hidden = !show; if (show) n++; });
  $('#gallery-status').textContent = `Showing ${n} items`;
}));
function startPreview(tile) {
  if (!motionOK() || saveData || !tile.dataset.preview) return;
  let v = $('video.preview', tile);
  if (!v) { v = document.createElement('video'); v.className = 'preview'; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('aria-hidden', 'true'); v.src = tile.dataset.preview; tile.prepend(v); tile.append(tile.querySelector('.vid-badge')); }
  v.play().then(() => tile.classList.add('is-previewing')).catch(() => {});
}
function stopPreview(tile) { const v = $('video.preview', tile); if (v) { v.pause(); tile.classList.remove('is-previewing'); } }
$$('.tile[data-preview]').forEach((t) => {
  if (finePointer.matches) {
    t.addEventListener('pointerenter', () => startPreview(t));
    t.addEventListener('pointerleave', () => stopPreview(t));
  }
  t.addEventListener('focus', () => startPreview(t));
  t.addEventListener('blur', () => stopPreview(t));
});
/* Touch equivalent of hover-preview: the tile nearest the centre of the screen previews itself */
if (!finePointer.matches) {
  const centreObs = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? startPreview(e.target) : stopPreview(e.target))), { rootMargin: '-40% 0px -40% 0px' });
  $$('.tile[data-preview]').forEach((t) => centreObs.observe(t));
}

/* ---------- Lightbox ---------- */
const lb = $('#lightbox'); const stage = $('.lb-stage', lb);
let lbItems = [], lbIndex = 0, opener = null;
function renderLB() {
  const t = lbItems[lbIndex];
  stage.innerHTML = '';
  const cap = t.dataset.caption || '';
  if (t.dataset.lb === 'img') {
    const img = new Image(); img.src = t.dataset.full; img.alt = cap; img.decoding = 'async'; stage.append(img);
  } else {
    const v = document.createElement('video');
    v.controls = true; v.playsInline = true; v.preload = 'metadata'; v.src = t.dataset.src;
    v.poster = $('img', t)?.currentSrc || '';
    v.setAttribute('aria-label', cap);
    const tr = document.createElement('track'); tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English'; tr.src = t.dataset.track; tr.default = true; v.append(tr);
    stage.append(v);
    if (motionOK()) v.play().catch(() => {});
  }
  $('.lb-caption', lb).textContent = cap;
  $('.lb-count', lb).textContent = lbItems.length > 1 ? `${lbIndex + 1} / ${lbItems.length}` : '';
  $('.lb-arrows', lb).hidden = lbItems.length < 2;
  if (motionOK()) stage.firstChild.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.22,1,.36,1)' });
}
function openLB(tile) {
  opener = tile;
  lbItems = tile.hasAttribute('data-solo') ? [tile] : $$('#masonry li:not([hidden]) .tile');
  lbIndex = Math.max(0, lbItems.indexOf(tile));
  renderLB(); lb.showModal(); document.body.style.overflow = 'hidden';
  $('.lb-close', lb).focus({ preventScroll: true });
}
const step = (d) => { lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; renderLB(); };
$$('.tile[data-lb]').forEach((t) => t.addEventListener('click', () => openLB(t)));
$('.lb-close', lb).addEventListener('click', () => lb.close());
$('.lb-prev', lb).addEventListener('click', () => step(-1));
$('.lb-next', lb).addEventListener('click', () => step(1));
lb.addEventListener('keydown', (e) => { if (e.target.tagName === 'VIDEO') return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
lb.addEventListener('close', () => { stage.innerHTML = ''; document.body.style.overflow = ''; opener && opener.focus({ preventScroll: true }); });
lb.addEventListener('click', (e) => { if (e.target === stage) lb.close(); });
onSwipe(stage, (d) => lbItems.length > 1 && step(d));

/* ---------- Magnetic buttons, ripple light & custom cursor (fine pointers only) ---------- */
if (finePointer.matches) {
  $$('.btn').forEach((b) => b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', `${e.clientX - r.left}px`); b.style.setProperty('--my', `${e.clientY - r.top}px`);
    if (motionOK() && b.classList.contains('magnetic')) b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
  }));
  $$('.btn.magnetic').forEach((b) => b.addEventListener('pointerleave', () => (b.style.transform = '')));
  const cur = $('.cursor'); const label = $('.cursor-label');
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy, raf = 0;
  const loop = () => { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cur.style.transform = `translate(${cx}px, ${cy}px)`; raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(loop) : 0; };
  addEventListener('pointermove', (e) => {
    if (!motionOK() || e.pointerType !== 'mouse') { cur.classList.remove('is-on'); return; }
    tx = e.clientX; ty = e.clientY; cur.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(loop);
    const t = e.target.closest('a, button, input, select, textarea, summary, [role="tab"]');
    cur.classList.toggle('is-hover', !!t);
    const l = e.target.closest('[data-cursor]')?.dataset.cursor || '';
    label.textContent = l; cur.classList.toggle('has-label', !!l);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
}

/* ---------- Sticky mobile CTA ---------- */
const sticky = $('.sticky-cta');
let heroVisible = true, contactVisible = false;
const stickyUpdate = () => sticky.classList.toggle('is-visible', !heroVisible);
new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; stickyUpdate(); }, { threshold: 0.15 }).observe($('.hero'));
// Stop the sticky bar from ever covering a focused element (WCAG 2.4.11 Focus Not Obscured)
document.addEventListener('focusin', (e) => {
  if (sticky.contains(e.target) || !sticky.classList.contains('is-visible')) return;
  const r = e.target.getBoundingClientRect(); const s = sticky.getBoundingClientRect();
  if (r.bottom > s.top - 8) scrollBy({ top: r.bottom - s.top + 24, behavior: 'auto' });
});

/* ---------- Free gift form ---------- */
const form = $('#gift-form');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const status = $('.form-status', form); let firstBad = null;
  $$('input[required]', form).forEach((inp) => {
    const ok = inp.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value) : inp.value.trim().length > 0;
    inp.setAttribute('aria-invalid', String(!ok));
    if (!ok && !firstBad) firstBad = inp;
  });
  if (firstBad) { status.textContent = firstBad.type === 'email' ? 'Please enter a valid email address, like name@example.com.' : 'Please enter your first name.'; firstBad.focus(); return; }
  const n = $('#g-name').value.trim(); const em = $('#g-email').value.trim();
  status.textContent = `Thank you, ${n}! Your email app will open so you can send the request to Sarah.`;
  location.href = `mailto:sarah@heysarahburnett.com?subject=${encodeURIComponent('Free guided visualization')}&body=${encodeURIComponent(`Hi Sarah, I'd love the free guided visualization.\n\nName: ${n}\nEmail: ${em}`)}`;
});

/* ---------- Read more (mobile long-copy clamp; content is never removed) ---------- */
const clampMQ = matchMedia('(max-width: 47.99rem)');
function evalClamp(el) {
  const btn = el.nextElementSibling;
  if (el.classList.contains('is-open') || !el.offsetParent) return;
  el.classList.add('is-clampable');
  const over = clampMQ.matches && el.scrollHeight > el.clientHeight + 2;
  el.classList.toggle('is-clampable', over);
}
const clampRO = 'ResizeObserver' in window ? new ResizeObserver((ents) => ents.forEach((e) => evalClamp(e.target))) : null;
$$('[data-clamp]').forEach((el) => {
  const btn = el.nextElementSibling;
  if (!btn || !btn.classList.contains('read-more')) return;
  btn.addEventListener('click', () => { const open = el.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Show less' : 'Read more'; });
  clampRO ? clampRO.observe(el) : evalClamp(el);
});
const recheckClamps = () => $$('[data-clamp]').forEach(evalClamp);
clampMQ.addEventListener('change', recheckClamps); addEventListener('load', recheckClamps);
