const stack     = document.getElementById('cardStack');
const counterEl = document.getElementById('counterValue');
const btnPlus   = document.getElementById('btnPlus');
const btnMinus  = document.getElementById('btnMinus');

let count   = 1;
const MAX   = 3;
const BW    = 285, BH = 172;
const SW    = 247, SH = 149;
const MAXT  = 37;

/* ── helpers ───────────────────────────────── */

let lastTap = 0;
function vel() {
  const now = Date.now();
  const gap = now - lastTap;
  lastTap = now;
  if (gap > 600) return 1;
  if (gap > 350) return 0.75;
  return 0.5;
}

function depth(d) {
  const t = Math.min(d / Math.max(MAX - 1, 1), 1);
  return {
    w:  BW - (BW - SW) * t,
    h:  BH - (BH - SH) * t,
    l:  ((BW - SW) * t) / 2,
    t:  MAXT * t,
    ov: (0.5 * t).toFixed(3),
    fs: 24 - 3.2 * t,
    ls: 40 - 5 * t,
  };
}

function mkCard() {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML =
    '<div class="card-bg"></div>' +
    '<div class="card-overlay"></div>' +
    '<div class="card-amount">5000 ₽</div>' +
    '<div class="card-logo"><img src="logo.png" alt=""></div>';
  return el;
}

function place(card, d) {
  const s = depth(d);
  card.style.width  = s.w  + 'px';
  card.style.height = s.h  + 'px';
  card.style.left   = s.l  + 'px';
  card.style.top    = s.t  + 'px';
  card.style.zIndex = 200 - d;
  card.querySelector('.card-overlay').style.background = `rgba(255,255,255,${s.ov})`;
  card.querySelector('.card-amount').style.fontSize    = s.fs + 'px';
  const logo = card.querySelector('.card-logo');
  logo.style.width  = s.ls + 'px';
  logo.style.height = s.ls + 'px';
}

function live() {
  return [...stack.children].filter(c =>
    !c.classList.contains('card--sink') &&
    !c.classList.contains('card--lift')
  );
}

function play(el, cls, dur) {
  el.classList.remove(cls);
  el.style.animationDuration = dur + 'ms';
  void el.offsetWidth;
  el.classList.add(cls);
}

function onDone(el, cls, cb) {
  const fn = (e) => {
    if (e.target !== el) return;
    el.removeEventListener('animationend', fn);
    el.classList.remove(cls);
    el.style.animationDuration = '';
    if (cb) cb();
  };
  el.addEventListener('animationend', fn);
}

function tidy() {
  stack.querySelectorAll('.card--sink, .card--lift').forEach(c => c.remove());
  const c = live();
  while (c.length > MAX) c.shift().remove();
}

function build() {
  stack.innerHTML = '';
  const n = Math.min(count, MAX);
  for (let d = n - 1; d >= 0; d--) {
    const c = mkCard();
    place(c, d);
    stack.appendChild(c);
  }
}

/* ── ADD ───────────────────────────────────── */

function addCard() {
  tidy();
  const v = vel();
  count++;
  counterEl.textContent = count;

  const cards = live();
  const full  = cards.length >= MAX;

  // if full, bottom card sinks away
  if (full) {
    const bot = cards[0];
    play(bot, 'card--sink', 280 * v);
    onDone(bot, 'card--sink', () => bot.remove());
  }

  // push existing cards one level deeper
  const start = full ? 1 : 0;
  for (let i = start; i < cards.length; i++) {
    const d = cards.length - i;
    place(cards[i], Math.min(d, MAX - 1));
  }

  // new card drops on top
  const nc = mkCard();
  place(nc, 0);
  play(nc, 'card--drop', 500 * v);
  stack.appendChild(nc);
  onDone(nc, 'card--drop', null);

  // impact on existing after slight delay
  setTimeout(() => {
    live().forEach(card => {
      if (card === nc) return;
      play(card, 'card--impact', 460 * v);
      onDone(card, 'card--impact', null);
    });
  }, Math.round(180 * v));
}

/* ── REMOVE ────────────────────────────────── */

function removeCard() {
  if (count <= 1) return;
  tidy();
  const v = vel();
  count--;
  counterEl.textContent = count;

  const cards = live();

  // top card lifts off (reverse drop)
  const top = cards[cards.length - 1];
  play(top, 'card--lift', 400 * v);
  onDone(top, 'card--lift', () => top.remove());

  // pull remaining cards one level closer
  for (let i = 0; i < cards.length - 1; i++) {
    const d = cards.length - 2 - i;
    place(cards[i], Math.max(d, 0));
  }

  // if still overflowing, a new card emerges at the bottom
  if (count >= MAX) {
    const nc = mkCard();
    place(nc, MAX - 1);
    play(nc, 'card--emerge', 380 * v);
    stack.insertBefore(nc, stack.firstChild);
    onDone(nc, 'card--emerge', null);
  }

  // impact on remaining after delay
  setTimeout(() => {
    live().forEach(card => {
      if (card === top) return;
      play(card, 'card--impact', 460 * v);
      onDone(card, 'card--impact', null);
    });
  }, Math.round(160 * v));
}

/* ── haptic (checkbox switch trick for iOS) ── */

const hapticCheckbox = document.createElement('input');
hapticCheckbox.type = 'checkbox';
hapticCheckbox.setAttribute('switch', '');
hapticCheckbox.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;pointer-events:none;';
const hapticLabel = document.createElement('label');
hapticLabel.appendChild(hapticCheckbox);
hapticLabel.style.cssText = 'position:fixed;top:-100px;left:-100px;';
document.body.appendChild(hapticLabel);

function hapticTick() {
  hapticLabel.click();
}

/* ── bind ──────────────────────────────────── */

btnPlus.addEventListener('click', () => { hapticTick(); addCard(); });
btnMinus.addEventListener('click', () => { hapticTick(); removeCard(); });

build();
