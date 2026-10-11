/* Sarah Burnett: interactions for inner pages (progressive enhancement; pages work without JS). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const motionOK = () => !mqReduce.matches && !root.classList.contains('no-motion');
window.__motionOK = motionOK;

/* Motion toggle (WCAG 2.3.3) */
const motionBtn = $('#motion-toggle');
function syncMotionBtn() { const off = !motionOK(); motionBtn.setAttribute('aria-pressed', String(off)); motionBtn.textContent = off ? 'Motion reduced' : 'Reduce motion'; document.dispatchEvent(new CustomEvent('motionchange')); }
motionBtn.addEventListener('click', () => { const off = !root.classList.contains('no-motion'); root.classList.toggle('no-motion', off); try { localStorage.setItem('sb-motion', off ? 'off' : 'on'); } catch (e) {} syncMotionBtn(); });
mqReduce.addEventListener('change', syncMotionBtn); syncMotionBtn();
$('#year').textContent = new Date().getFullYear();

/* Header + progress */
const header = $('.site-header'); const progress = $('.progress'); const menu = $('#menu');
let lastY = scrollY;
function onScroll() {
  const y = scrollY;
  header.classList.toggle('is-solid', y > 40);
  lastY = y;
  const h = root.scrollHeight - innerHeight; progress.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
  parallax();
}
addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });


/* Mobile menu (native modal dialog) */
const menuBtn = $('.menu-btn');
menuBtn.setAttribute('aria-expanded', 'false');
menuBtn.addEventListener('click', () => { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; });
$('.menu-close').addEventListener('click', () => menu.close());
menu.addEventListener('close', () => { menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; });
$$('a', menu).forEach((a) => a.addEventListener('click', () => menu.close()));

/* Reveal on scroll */
const revObs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); revObs.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.reveal, .reveal-img').forEach((el) => revObs.observe(el));

/* Gentle hero parallax (motion-gated) */
const par = $$('[data-parallax]');
function parallax() {
  if (!motionOK()) { par.forEach((el) => (el.style.transform = '')); return; }
  par.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; el.style.transform = `translate3d(0, ${(-r.top * parseFloat(el.dataset.parallax)).toFixed(1)}px, 0) scale(1.08)`; });
}
document.addEventListener('motionchange', parallax); onScroll();

/* Scroll a horizontal strip to an element without moving the page */
function centerInStrip(el) {
  let strip = el.parentElement;
  while (strip && strip !== document.body && !(strip.scrollWidth > strip.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(strip).overflowX))) strip = strip.parentElement;
  if (!strip || strip === document.body) return;
  const sr = strip.getBoundingClientRect(), er = el.getBoundingClientRect();
  strip.scrollTo({ left: Math.max(0, strip.scrollLeft + (er.left - sr.left) - (strip.clientWidth - er.width) / 2), behavior: motionOK() ? 'smooth' : 'auto' });
}

/* Accessible tabs (package switchers etc.): [data-tabs] > [role=tablist] > [role=tab] + [role=tabpanel] */
$$('[data-tabs]').forEach((box) => {
  const tabs = $$('[role="tab"]', box); const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  const select = (i, focus) => {
    i = (i + tabs.length) % tabs.length;
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; panels[j].classList.toggle('is-entering', i === j && motionOK()); });
    if (focus) tabs[i].focus({ preventScroll: true });
    centerInStrip(tabs[i]);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i, false));
    t.addEventListener('keydown', (e) => {
      const k = e.key; const map = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 };
      if (k in map) { e.preventDefault(); select(map[k], true); }
    });
  });
  // swipe between panels on touch
  panels.forEach((p) => {
    let x0 = null, y0 = 0;
    p.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    p.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'); select(cur + (dx < 0 ? 1 : -1), false); } x0 = null; }, { passive: true });
  });
});

/* Read more (mobile long-copy clamp; content is never removed) */
const clampMQ = matchMedia('(max-width: 47.99rem)');
function evalClamp(el) {
  if (el.classList.contains('is-open') || !el.offsetParent) return;
  el.classList.add('is-clampable');
  el.classList.toggle('is-clampable', clampMQ.matches && el.scrollHeight > el.clientHeight + 2);
}
const clampRO = 'ResizeObserver' in window ? new ResizeObserver((es) => es.forEach((e) => evalClamp(e.target))) : null;
$$('[data-clamp]').forEach((el) => {
  const btn = el.nextElementSibling; if (!btn || !btn.classList.contains('read-more')) return;
  btn.addEventListener('click', () => { const open = el.classList.toggle('is-open'); btn.setAttribute('aria-expanded', String(open)); btn.textContent = open ? 'Show less' : (btn.dataset.label || 'Read more'); });
  clampRO ? clampRO.observe(el) : evalClamp(el);
});
clampMQ.addEventListener('change', () => $$('[data-clamp]').forEach(evalClamp));

/* Expand/collapse long quotes */
$$('[data-expand]').forEach((btn) => {
  const t = document.getElementById(btn.getAttribute('aria-controls'));
  btn.addEventListener('click', () => { const open = btn.getAttribute('aria-expanded') !== 'true'; btn.setAttribute('aria-expanded', String(open)); t.hidden = !open; btn.textContent = open ? 'Show less' : btn.dataset.label; });
});

/* Strip arrows for horizontal scrollers */
$$('[data-strip]').forEach((wrap) => {
  const track = $('[data-track]', wrap); const prev = $('.prev', wrap); const next = $('.next', wrap); if (!track || !prev) return;
  const step = () => (track.firstElementChild?.getBoundingClientRect().width || 300) + 16;
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: motionOK() ? 'smooth' : 'auto' }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: motionOK() ? 'smooth' : 'auto' }));
  const upd = () => { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4; };
  track.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true }); addEventListener('resize', upd); upd();
});

/* Count-up numbers (e.g. prices) when they enter view; final value is in the DOM from the start */
const cntObs = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return; cntObs.unobserve(e.target); if (!motionOK()) return;
  const el = e.target; const end = +el.dataset.count; const fmt = (n) => n.toLocaleString('en-US'); const t0 = performance.now();
  el.setAttribute('aria-hidden', 'true'); const sr = document.createElement('span'); sr.className = 'visually-hidden'; sr.textContent = el.textContent; el.after(sr);
  const tick = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = '$' + fmt(Math.round(end * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), { threshold: 0.6 });
$$('[data-count]').forEach((el) => cntObs.observe(el));

/* Sticky mobile CTA: hidden over the hero and the final CTA */
const sticky = $('.sticky-cta'); let heroVis = true, endVis = false;
const upd = () => sticky.classList.toggle('is-visible', !heroVis);
const hero = $('.page-hero'); if (hero) new IntersectionObserver(([e]) => { heroVis = e.isIntersecting; upd(); }, { threshold: 0.15 }).observe(hero); else { heroVis = false; upd(); }
document.addEventListener('focusin', (e) => {
  if (sticky.contains(e.target) || !sticky.classList.contains('is-visible')) return;
  const r = e.target.getBoundingClientRect(); const s = sticky.getBoundingClientRect();
  if (r.bottom > s.top - 8) scrollBy({ top: r.bottom - s.top + 24, behavior: 'auto' });
});

/* Inline video players with a poster facade (load on click) */
$$('[data-video-facade]').forEach((btn) => btn.addEventListener('click', () => {
  const v = document.createElement('video'); v.controls = true; v.playsInline = true; v.preload = 'metadata'; v.src = btn.dataset.src; v.poster = btn.dataset.poster || '';
  v.setAttribute('aria-label', btn.dataset.label || 'Video');
  if (btn.dataset.track) { const tr = document.createElement('track'); tr.kind = 'captions'; tr.srclang = 'en'; tr.label = 'English'; tr.src = btn.dataset.track; tr.default = true; v.append(tr); }
  btn.replaceWith(v); v.focus({ preventScroll: true }); v.play().catch(() => {});
}));

/* Magnetic buttons + custom cursor (fine pointers only) */
if (finePointer.matches) {
  $$('.btn').forEach((b) => b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect(); b.style.setProperty('--mx', `${e.clientX - r.left}px`); b.style.setProperty('--my', `${e.clientY - r.top}px`);
    if (motionOK() && b.classList.contains('magnetic')) b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.15}px, ${(e.clientY - r.top - r.height / 2) * 0.25}px)`;
  }));
  $$('.btn.magnetic').forEach((b) => b.addEventListener('pointerleave', () => (b.style.transform = '')));
  const cur = $('.cursor'); const label = $('.cursor-label');
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy, raf = 0;
  const loop = () => { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; cur.style.transform = `translate(${cx}px, ${cy}px)`; raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(loop) : 0; };
  addEventListener('pointermove', (e) => {
    if (!motionOK() || e.pointerType !== 'mouse') { cur.classList.remove('is-on'); return; }
    tx = e.clientX; ty = e.clientY; cur.classList.add('is-on'); if (!raf) raf = requestAnimationFrame(loop);
    cur.classList.toggle('is-hover', !!e.target.closest('a, button, input, select, textarea, summary, [role="tab"]'));
    const l = e.target.closest('[data-cursor]')?.dataset.cursor || ''; label.textContent = l; cur.classList.toggle('has-label', !!l);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
}

/* Flip cards */
$$('.flip-btn').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'))));

/* Self-check lists: [data-selfcheck] with checkboxes; reveals a response once any is checked */
$$('[data-selfcheck]').forEach((box) => {
  const out = $('.sc-result', box); const boxes = $$('input[type="checkbox"]', box);
  const upd = () => { const n = boxes.filter((c) => c.checked).length; out.hidden = n === 0; const c = $('.sc-count', box); if (c) c.textContent = `${n} of ${boxes.length}`; };
  boxes.forEach((c) => c.addEventListener('change', upd)); upd();
});
