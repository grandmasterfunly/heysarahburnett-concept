/* Featured KAP episode: click-to-load player, chapters, synced searchable transcript, flip cards, walkthrough, rewire art */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const motionOK = () => (window.__motionOK ? window.__motionOK() : !matchMedia('(prefers-reduced-motion: reduce)').matches);
const VIDEO_ID = 'nyrSDmtrJ8w';
const fmt = (s) => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

const CHAPTERS = [
  [0, 'Intro & retreat recap'], [375, "Sarah's first KAP journey"], [912, "Petey's first journey"], [1757, 'Meet Dr. Eric'],
  [2312, 'What ketamine is'], [2550, 'Medications & safety'], [2752, 'Neuroplasticity'], [3120, 'Who it may help & cautions'],
  [3384, 'Recovery & harm reduction'], [4082, 'The nervous system'], [4416, 'Set & setting'], [5187, 'We heal in community'],
  [5387, 'A session, start to finish'], [5794, 'Trusting yourself'], [6191, 'The spiritual side'], [6770, 'Affirmation'],
];

/* ---------- Player ---------- */
let player = null, ready = false, pendingSeek = null, pollId = 0;
const shell = $('#player-shell');
function loadAPI() {
  return new Promise((res) => {
    if (window.YT && window.YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.append(s);
  });
}
async function startPlayer(seek = 0) {
  if (player) { if (ready) { player.seekTo(seek, true); player.playVideo(); } else pendingSeek = seek; return; }
  pendingSeek = seek;
  const facade = $('#player-facade');
  const mount = document.createElement('div'); mount.id = 'yt-mount'; shell.append(mount);
  facade.setAttribute('aria-busy', 'true');
  await loadAPI();
  player = new YT.Player('yt-mount', {
    host: 'https://www.youtube-nocookie.com', videoId: VIDEO_ID,
    playerVars: { autoplay: 1, start: Math.floor(seek), rel: 0, playsinline: 1, cc_load_policy: 1, modestbranding: 1 },
    events: {
      onReady: (e) => {
        ready = true; facade.remove();
        const ifr = e.target.getIframe(); ifr.title = 'Therapy Unfiltered episode 107: Ketamine-Assisted Psychotherapy with Dr. Eric Milbrandt (YouTube video player)';
        if (pendingSeek) e.target.seekTo(pendingSeek, true);
        e.target.playVideo(); ifr.focus({ preventScroll: true });
      },
      onStateChange: (e) => { clearInterval(pollId); if (e.data === 1) pollId = setInterval(sync, 500); },
    },
  });
}
$('#player-facade').addEventListener('click', () => startPlayer(0));

/* ---------- Chapters ---------- */
const chapList = $('#chapters');
CHAPTERS.forEach(([t, title]) => {
  const li = document.createElement('li');
  li.innerHTML = `<button class="chapter" type="button" data-t="${t}"><time>${fmt(t)}</time><span>${title}</span></button>`;
  chapList.append(li);
});
const chapBtns = $$('.chapter', chapList);
chapBtns.forEach((b) => b.addEventListener('click', () => { startPlayer(+b.dataset.t); setChapter(+b.dataset.t); }));
$$('[data-seek]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); { const r = shell.getBoundingClientRect(); window.scrollTo({ top: Math.max(0, scrollY + r.top - (innerHeight - r.height) / 2), behavior: motionOK() ? 'smooth' : 'auto' }); } startPlayer(+a.dataset.seek); }));
function setChapter(t) {
  let idx = 0; CHAPTERS.forEach(([s], i) => { if (t >= s) idx = i; });
  chapBtns.forEach((b, i) => (i === idx ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
  const b = chapBtns[idx]; const strip = chapList;
  if (strip.scrollWidth <= strip.clientWidth + 1) return;
  const sr = strip.getBoundingClientRect(), br = b.getBoundingClientRect();
  strip.scrollTo({ left: Math.max(0, strip.scrollLeft + (br.left - sr.left) - (strip.clientWidth - br.width) / 2), behavior: motionOK() ? 'smooth' : 'auto' });
}

/* ---------- Transcript ---------- */
const list = $('#t-list'); const search = $('#t-search'); const count = $('.t-count'); const follow = $('#t-follow');
const body = $('.transcript-body');
let lines = [], data = [], activeIdx = -1;
fetch('assets/data/transcript.json').then((r) => r.json()).then((json) => {
  data = json; list.innerHTML = '';
  const frag = document.createDocumentFragment();
  json.forEach((d, i) => {
    const li = document.createElement('li'); li.className = 't-line'; li.dataset.i = i;
    if (d.omit) { li.innerHTML = `<button type="button" data-t="${d.s}" aria-label="Jump to ${fmt(d.s)}">${fmt(d.s)}</button><span class="who">Note</span><p class="t-omit">${d.t}</p>`; }
    else li.innerHTML = `<button type="button" data-t="${d.s}" aria-label="Play from ${fmt(d.s)}, ${d.sp}">${fmt(d.s)}</button><span class="who" data-s="${d.sp}">${d.sp}</span><p></p>`;
    if (!d.omit) li.querySelector('p').textContent = d.t;
    frag.append(li);
  });
  list.append(frag);
  lines = $$('.t-line', list);
  count.textContent = `${json.length} passages`;
}).catch(() => { list.innerHTML = '<li class="t-line"><p>Transcript could not load. Please refresh the page.</p></li>'; });
list.addEventListener('click', (e) => { const b = e.target.closest('button[data-t]'); if (b) startPlayer(+b.dataset.t); });

let searchT = 0;
search.addEventListener('input', () => { clearTimeout(searchT); searchT = setTimeout(runSearch, 180); });
function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function runSearch() {
  const q = search.value.trim(); const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null;
  let n = 0;
  lines.forEach((li, i) => {
    const d = data[i]; const p = li.querySelector('p');
    if (!rx) { li.hidden = false; if (!d.omit) p.textContent = d.t; return; }
    const hit = rx.test(d.t) || rx.test(d.sp || ''); rx.lastIndex = 0;
    li.hidden = !hit; if (hit) { n++; if (!d.omit) p.innerHTML = esc(d.t).replace(rx, (m) => `<mark>${m}</mark>`); }
  });
  count.textContent = rx ? `${n} passage${n === 1 ? '' : 's'} match "${q}"` : `${data.length} passages`;
}

function sync() {
  if (!player || !player.getCurrentTime) return;
  const t = player.getCurrentTime(); setChapter(t);
  let idx = -1; for (let i = 0; i < data.length; i++) { if (data[i].s <= t + 0.3) idx = i; else break; }
  if (idx === activeIdx || idx < 0) return;
  lines[activeIdx]?.classList.remove('is-active'); lines[activeIdx]?.removeAttribute('aria-current');
  activeIdx = idx; const li = lines[idx]; li.classList.add('is-active'); li.setAttribute('aria-current', 'true');
  if (follow.checked && !search.value && !body.contains(document.activeElement)) body.scrollTo({ top: body.scrollTop + (li.getBoundingClientRect().top - body.getBoundingClientRect().top) - body.clientHeight / 3, behavior: motionOK() ? 'smooth' : 'auto' });
}

/* ---------- Myth / fact flip cards ---------- */
$$('.flip-btn').forEach((b) => b.addEventListener('click', () => b.setAttribute('aria-expanded', String(b.getAttribute('aria-expanded') !== 'true'))));

/* ---------- Session walkthrough ---------- */
const jPanels = $$('.j-panel'); const jList = $('.journey-steps'); const bar = $('.j-progress i');
jPanels.forEach((p, i) => {
  p.id = `jp-${i + 1}`; p.setAttribute('aria-labelledby', `js-${i + 1}`); p.tabIndex = 0;
  const li = document.createElement('li'); li.setAttribute('role', 'presentation');
  li.innerHTML = `<button class="j-step" role="tab" id="js-${i + 1}" aria-controls="jp-${i + 1}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span aria-hidden="true">${i + 1}</span><span class="lbl">${p.dataset.label}</span><span class="visually-hidden">Step ${i + 1}: ${p.dataset.label}</span></button>`;
  jList.append(li);
});
const jTabs = $$('.j-step'); const jPrev = $('.j-prev'); const jNext = $('.j-next');
let jCur = 0;
const showStep = (i) => {
  jCur = i;
  jPanels.forEach((p, k) => { p.hidden = k !== i; p.classList.remove('is-entering'); });
  if (motionOK()) { void jPanels[i].offsetWidth; jPanels[i].classList.add('is-entering'); }
  jTabs.forEach((t, k) => t.classList.toggle('is-done', k < i));
  bar.style.width = `${((i + 1) / jPanels.length) * 100}%`;
  jPrev.disabled = i === 0; jNext.hidden = i === jPanels.length - 1;
};
const selectStep = window.__tabs(jTabs, showStep, { swipeTargets: jPanels });
jPrev.addEventListener('click', () => selectStep(Math.max(0, jCur - 1), false));
jNext.addEventListener('click', () => { selectStep(Math.min(jPanels.length - 1, jCur + 1), false); if (jCur === jPanels.length - 1) jPanels[jCur].focus({ preventScroll: true }); });
showStep(0);

/* ---------- Rewire: a neuron-tree grows with the slider (and once on scroll if motion is allowed) ---------- */
const art = $('#rewire-art'); const range = $('#rewire-range');
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 400 400'); svg.setAttribute('focusable', 'false');
art.append(svg);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const branches = [], leaves = [];
function grow(x, y, ang, len, depth) {
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  const cx = (x + x2) / 2 + (rnd() - 0.5) * len * 0.35, cy = (y + y2) / 2 + (rnd() - 0.5) * len * 0.35;
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
  p.setAttribute('class', 'br'); p.setAttribute('stroke-width', Math.max(0.8, 9 - depth * 1.5).toFixed(1));
  svg.append(p); branches.push({ p, depth });
  if (depth >= 6) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x2.toFixed(1)); c.setAttribute('cy', y2.toFixed(1)); c.setAttribute('r', (3 + rnd() * 4).toFixed(1)); c.setAttribute('class', 'leaf'); c.setAttribute('fill', ['#f7c3a6', '#e98a5f', '#c9a96a', '#ffd9a8'][Math.floor(rnd() * 4)]); leaves.push({ c, t: 0.55 + rnd() * 0.4 }); return; }
  const n = depth < 2 ? 2 : 2 + (rnd() > 0.6 ? 1 : 0);
  for (let i = 0; i < n; i++) grow(x2, y2, ang + (i - (n - 1) / 2) * (0.5 + rnd() * 0.25) + (rnd() - 0.5) * 0.3, len * (0.68 + rnd() * 0.12), depth + 1);
}
grow(200, 395, -Math.PI / 2, 92, 0);


leaves.forEach(({ c }) => svg.append(c));
branches.forEach((b) => { const L = b.p.getTotalLength(); b.L = L; b.p.style.strokeDasharray = L; });
function render(v) {
  const g = v / 100; const maxD = 7;
  branches.forEach((b) => {
    const start = b.depth <= 2 ? 0 : (b.depth - 2) / (maxD - 1) * 0.75; const local = Math.min(1, Math.max(0, (g - start) / 0.25));
    const base = b.depth <= 2 ? 1 : local; b.p.style.strokeDashoffset = (b.L * (1 - base)).toFixed(1);
  });
  leaves.forEach(({ c, t }) => { const s = Math.min(1, Math.max(0, (g - t) / 0.12)); c.style.transform = `scale(${s})`; c.style.opacity = s; });
  range.setAttribute('aria-valuetext', `${v} percent grown${v > 85 ? ', full bloom' : v < 20 ? ', winter branches' : ''}`);
}
range.addEventListener('input', () => { touched = true; render(+range.value); });
let touched = false; render(+range.value);
new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting || touched || !motionOK()) return; o.disconnect();
  const from = +range.value, t0 = performance.now(), dur = 3200;
  const tick = (now) => { if (touched) return; const k = Math.min(1, (now - t0) / dur); const v = Math.round(from + (100 - from) * (1 - Math.pow(1 - k, 3))); range.value = v; render(v); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}, { threshold: 0.5 }).observe(art);
