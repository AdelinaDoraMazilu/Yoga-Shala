/* ============================================================
   YOGA SHALA SHANGRI LA — scripts.js
   Purple trail scrolling, gong & Peter Hess bowl synthesis,
   breath circle, floating next-breath button.
   ============================================================ */
/* ============================================================
   Yoga Shala Shangri La — interactions
   ============================================================ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Nav ---------- */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

/* ---------- Hero stars ---------- */
const stars = document.getElementById('stars');
for (let i = 0; i < 26; i++) {
  const s = document.createElement('i');
  s.style.left = Math.random() * 100 + '%';
  s.style.top = Math.random() * 100 + '%';
  s.style.animationDelay = (Math.random() * 6) + 's';
  s.style.animationDuration = (4 + Math.random() * 5) + 's';
  stars.appendChild(s);
}

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- Golden thread + traveler ---------- */
const journey = document.getElementById('journey');
const threadDraw = document.getElementById('threadDraw');
const traveler = document.getElementById('traveler');
const threadLen = threadDraw.getTotalLength();

function updateThread() {
  const rect = journey.getBoundingClientRect();
  const vh = window.innerHeight;
  // progress of viewport-center through the journey block
  let p = (vh * 0.55 - rect.top) / rect.height;
  p = Math.max(0, Math.min(1, p));
  threadDraw.style.strokeDashoffset = 1 - p;
  if (!reduceMotion) {
    const pt = threadDraw.getPointAtLength(p * threadLen);
    // viewBox is 100 x 1000, preserveAspectRatio=none → linear map
    traveler.style.left = (pt.x / 100 * rect.width) + 'px';
    traveler.style.top = (pt.y / 1000 * rect.height) + 'px';
    traveler.classList.toggle('on', p > 0.005 && p < 0.995);
  }
}

/* ---------- Floating next-breath button ---------- */
const nextBreath = document.getElementById('nextBreath');
const ringFg = document.getElementById('ringFg');
const stops = ['#top', '#about', '#sound', '#breathe', '#schedule', '#visit', '#contact'];

function scrollProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? window.scrollY / max : 0;
}
function updateRing() {
  const p = scrollProgress();
  ringFg.style.strokeDashoffset = 1 - p;
  nextBreath.classList.toggle('flip', p > 0.98);
}
function docTop(el) { return el.getBoundingClientRect().top + window.scrollY; }
nextBreath.addEventListener('click', () => {
  if (scrollProgress() > 0.98) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const y = window.scrollY + 10;
  for (const sel of stops) {
    const el = document.querySelector(sel);
    if (el && docTop(el) > y + window.innerHeight * 0.3) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
  }
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
});

/* ---------- Scroll listeners ---------- */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
    updateThread();
    updateRing();
    ticking = false;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

document.getElementById('scrollCue').addEventListener('click', () =>
  document.getElementById('about').scrollIntoView({ behavior: 'smooth' }));

/* ============================================================
   SOUND — Web Audio synthesis (no samples needed)
   ============================================================ */
let actx = null;
function audio() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

/* --- Gong: inharmonic partials + strike noise, long decay --- */
function playGong(gain = 0.9) {
  const ctx = audio();
  const t = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = gain;
  master.connect(ctx.destination);

  const partials = [
    { f: 54,  g: .60, d: 11 }, { f: 82,  g: .40, d: 10 },
    { f: 109, g: .34, d: 9  }, { f: 163, g: .26, d: 8  },
    { f: 218, g: .20, d: 7  }, { f: 327, g: .13, d: 6  },
    { f: 436, g: .09, d: 5  }, { f: 655, g: .05, d: 4  },
  ];
  partials.forEach(p => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = p.f * (1 + (Math.random() - .5) * 0.012);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(p.g, t + 0.04 + Math.random() * 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + p.d);
    // slow shimmer
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.4 + Math.random() * 1.2;
    lfoG.gain.value = p.f * 0.004;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    o.connect(g); g.connect(master);
    o.start(t); lfo.start(t);
    o.stop(t + p.d + 0.2); lfo.stop(t + p.d + 0.2);
  });

  // mallet strike (filtered noise burst)
  const len = 0.25 * ctx.sampleRate;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  const noise = ctx.createBufferSource(); noise.buffer = buf;
  const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 900;
  const ng = ctx.createGain(); ng.gain.value = 0.5;
  noise.connect(nf); nf.connect(ng); ng.connect(master);
  noise.start(t);
}

/* --- Singing bowl: pure-ish partials with slow beating --- */
function playBowl(freq, gain = 0.5, dur = 7) {
  const ctx = audio();
  const t = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(gain, t + 0.05);
  master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  master.connect(ctx.destination);

  [[1, .9], [1.004, .5], [2.71, .18], [4.9, .06]].forEach(([m, g]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * m;
    const og = ctx.createGain(); og.gain.value = g;
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + dur + 0.2);
  });
}

/* ---------- Gong interaction + ripples ---------- */
const gongEl = document.getElementById('gong');
function strikeGong(ev) {
  playGong();
  gongEl.classList.remove('ringing');
  void gongEl.offsetWidth;            // restart animation
  gongEl.classList.add('ringing');
  // ripples across the screen
  const r = gongEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.47;
  const size = Math.max(window.innerWidth, window.innerHeight) * 2.2;
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const rip = document.createElement('div');
      rip.className = 'ripple';
      rip.style.left = cx + 'px'; rip.style.top = cy + 'px';
      rip.style.width = rip.style.height = size + 'px';
      document.body.appendChild(rip);
      setTimeout(() => rip.remove(), 3500);
    }, i * 260);
  }
}
gongEl.addEventListener('click', strikeGong);
gongEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); strikeGong(); } });

/* ---------- Bowls ---------- */
const bowls = [
  { name: 'Root',   note: 'earth',  f: 130.8, size: 92 },
  { name: 'Belly',  note: 'warmth', f: 174.6, size: 82 },
  { name: 'Heart',  note: 'love',   f: 220.0, size: 72 },
  { name: 'Throat', note: 'truth',  f: 293.7, size: 62 },
  { name: 'Crown',  note: 'light',  f: 392.0, size: 52 },
];
const bowlsRow = document.getElementById('bowlsRow');
bowls.forEach((b, i) => {
  const btn = document.createElement('button');
  btn.className = 'bowl';
  btn.setAttribute('aria-label', `Play the ${b.name} bowl`);
  const w = b.size, h = b.size * 0.62;
  btn.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 100 62">
      <path d="M8 18 Q50 62 92 18 L86 34 Q50 60 14 34 Z" fill="#B98C3B"/>
      <path d="M14 34 Q50 60 86 34 Q78 54 50 56 Q22 54 14 34 Z" fill="#9C7430"/>
      <ellipse class="rim" cx="50" cy="18" rx="42" ry="10" fill="#D9B060" stroke="#C69B45" stroke-width="2"/>
      <ellipse cx="50" cy="18" rx="30" ry="6.5" fill="#8F6A25" opacity=".55"/>
    </svg>
    <div class="b-name">${b.name}</div>
    <div class="b-note">${b.note}</div>`;
  btn.addEventListener('click', () => {
    playBowl(b.f);
    btn.classList.remove('singing'); void btn.offsetWidth; btn.classList.add('singing');
  });
  bowlsRow.appendChild(btn);
});

/* ---------- Mini sound bath ---------- */
let bathTimer = null;
const bathBtn = document.getElementById('bathBtn');
bathBtn.addEventListener('click', () => {
  if (bathTimer) { clearInterval(bathTimer); bathTimer = null; bathBtn.textContent = '▶ one-minute mini sound bath'; return; }
  audio();
  bathBtn.textContent = '■ stop the bath';
  playGong(0.55);
  let count = 0;
  bathTimer = setInterval(() => {
    const b = bowls[Math.floor(Math.random() * bowls.length)];
    playBowl(b.f, 0.32, 8);
    const el = bowlsRow.children[bowls.indexOf(b)];
    el.classList.remove('singing'); void el.offsetWidth; el.classList.add('singing');
    if (++count % 7 === 0) playGong(0.4);
    if (count >= 18) { clearInterval(bathTimer); bathTimer = null; bathBtn.textContent = '▶ one-minute mini sound bath'; }
  }, 3300);
});

/* ---------- Breath circle ---------- */
const breathCircle = document.getElementById('breathCircle');
const breathNote = document.getElementById('breathNote');
let breathing = false;
breathCircle.addEventListener('click', () => {
  if (breathing) return;
  breathing = true;
  breathCircle.textContent = 'inhale…';
  breathCircle.classList.add('inhale');
  playBowl(174.6, 0.25, 9);
  setTimeout(() => {
    breathCircle.textContent = 'hold';
  }, 4000);
  setTimeout(() => {
    breathCircle.textContent = 'exhale…';
    breathCircle.classList.remove('inhale');
    breathCircle.classList.add('exhale');
  }, 5500);
  setTimeout(() => {
    breathCircle.textContent = 'again?';
    breathCircle.classList.remove('exhale');
    breathNote.textContent = 'beautiful. imagine a whole hour of that.';
    breathing = false;
  }, 10500);
});
