import { ruLang, enLang, frLang } from './modules/lang.js';
import * as infoConstants from './modules/constants.js';
import imageManifest from './modules/image-manifest.js';
import * as btns from './modules/buttons.js';

const DENOMS_DESC = [500000000, 250000000, 100000000, 50000000, 25000000, 10000000, 5000000, 2000000, 1000000];
const FPS = 60;
const FRAME_DELAY = 1000 / FPS;
const STACK_STEP = 0.4;
const cancelBetSfx = new Audio(`src/sfx/sfx/cancelBet.mp3`);
const doubleSound = new Audio(`src/sfx/sfx/doubleBet.mp3`);
const endRollSound = new Audio(`src/sfx/sfx/endSpin.mp3`);
const rollSound = new Audio(`src/sfx/sfx/spin.mp3`);
const undoSound = new Audio(`src/sfx/sfx/undo.mp3`);

let angle = 0;
let angle2 = 0;
let angle3 = 0.2;
let ball = document.querySelector('#ball');
let ballSpin = document.querySelector('#ballSpin');
let bet = 1;
let betHistory = [];
let betPointerDisable = document.querySelector('#betPointerDisable');
let betSection = document.querySelector('#betSection');
let betSize = 0;
let betStart = false;
let endrollActive = false;

function syncGameState() {
  window.parent.postMessage({ type: 'gameState', active: betStart || betSize > 0 }, '*');
}
let betWindow = document.querySelector('#betWindow');
let buttonName = [];
let chipsIndex = 0;
let chipsMenuOpen = document.querySelector('.menu-open');
const CHIP_COLOR_BY_VALUE = {
  1000000:   '#ef4444',
  2000000:   '#3b82f6',
  5000000:   '#22c55e',
  10000000:  '#f97316',
  25000000:  '#374151',
  50000000:  '#D4AF37',
  100000000: '#8b5cf6',
  250000000: '#ec4899',
  500000000: '#06b6d4',
};
let chipsPutSfx = new Audio(`src/sfx/sfx/chipPut.mp3`);
let chipsPutSfx2 = new Audio(`src/sfx/sfx/chipPut2.mp3`);

function formatChipLabel(n) {
  if (n >= 1000000000) return '1B';
  if (n >= 1000000) {
    const v = n / 1000000;
    return (v % 1 === 0) ? v + 'M' : v.toFixed(1) + 'M';
  }
  if (n >= 1000) {
    const v = n / 1000;
    return (v % 1 === 0) ? v + 'K' : v.toFixed(1) + 'K';
  }
  return String(n);
}

const ROULETTE_CHIP_STYLES = {
  1000000:   { body:'#7a0030', bodyL:'#d03055', bodyD:'#3a0010', notch:'#ff6080', notch2:'#900020', ring:'#ef4444', tierRing:'#00E5FF' },
  2000000:   { body:'#1040a0', bodyL:'#3878f8', bodyD:'#002080', notch:'#6090ff', notch2:'#0030a0', ring:'#3b82f6', tierRing:'#00E5FF' },
  5000000:   { body:'#0a6028', bodyL:'#20b050', bodyD:'#003810', notch:'#60e080', notch2:'#105020', ring:'#22c55e', tierRing:'#00E5FF' },
  10000000:  { body:'#a04000', bodyL:'#f97040', bodyD:'#602000', notch:'#ffb060', notch2:'#a04000', ring:'#f97316', tierRing:'#00E5FF' },
  25000000:  { body:'#2a3040', bodyL:'#485a70', bodyD:'#0a1020', notch:'#D4AF37', notch2:'#8a7020', ring:'#D4AF37', tierRing:'#FFD700' },
  50000000:  { body:'#906000', bodyL:'#D4AF37', bodyD:'#503800', notch:'#ffe060', notch2:'#a07800', ring:'#D4AF37', tierRing:'#FFD700' },
  100000000: { body:'#5020a0', bodyL:'#8b5cf6', bodyD:'#280060', notch:'#d0a0ff', notch2:'#6020a0', ring:'#8b5cf6', tierRing:'#E040FB' },
  250000000: { body:'#a01060', bodyL:'#ec4899', bodyD:'#600030', notch:'#ffb0d8', notch2:'#901050', ring:'#ec4899', tierRing:'#E040FB' },
  500000000: { body:'#007090', bodyL:'#06b6d4', bodyD:'#004060', notch:'#80f0ff', notch2:'#007090', ring:'#06b6d4', tierRing:'#00BCD4' },
};

function makeChipSVG(value, sizePx) {
  const s = ROULETTE_CHIP_STYLES[value] || ROULETTE_CHIP_STYLES[1000000];
  const size = sizePx || 60;
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 1.5;
  const rMed = r * 0.60;
  const lbl = formatChipLabel(value);
  const uid = 'rc-' + value + '-' + size;
  const numFS = size * (lbl.length >= 4 ? 0.155 : lbl.length === 3 ? 0.175 : 0.20);
  const NOTCH_COUNT = 16;
  const notchW = size * 0.10;
  const notchH = r * 0.22;
  let notches = '';
  for (let i = 0; i < NOTCH_COUNT; i++) {
    const fill = i % 2 === 0 ? s.notch : s.notch2;
    const rot = (i * 360) / NOTCH_COUNT;
    notches += '<rect x="' + (cx - notchW/2) + '" y="1.5" width="' + notchW + '" height="' + notchH + '" fill="' + fill + '" rx="1.5" transform="rotate(' + rot + ', ' + cx + ', ' + cy + ')" clip-path="url(#' + uid + '-clip)" />';
  }
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;overflow:visible">'
    + '<defs>'
    + '<radialGradient id="' + uid + '-body" cx="38%" cy="28%" r="72%"><stop offset="0%" stop-color="' + s.bodyL + '"/><stop offset="55%" stop-color="' + s.body + '"/><stop offset="100%" stop-color="' + s.bodyD + '"/></radialGradient>'
    + '<radialGradient id="' + uid + '-med" cx="35%" cy="28%" r="70%"><stop offset="0%" stop-color="#ffffff"/><stop offset="60%" stop-color="#e8e8e8"/><stop offset="100%" stop-color="#cacaca"/></radialGradient>'
    + '<clipPath id="' + uid + '-clip"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"/></clipPath>'
    + '</defs>'
    + '<circle cx="' + (cx+1.5) + '" cy="' + (cy+2.5) + '" r="' + r + '" fill="rgba(0,0,0,0.45)"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + uid + '-body)"/>'
    + notches
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r-0.5) + '" fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="1.5"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rMed+3.5) + '" fill="none" stroke="' + s.tierRing + '" stroke-width="2.5" opacity="0.85"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + (rMed+6.5) + '" fill="none" stroke="' + s.ring + '" stroke-width="0.8" stroke-dasharray="' + (size*0.038) + ' ' + (size*0.032) + '" opacity="0.5"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + rMed + '" fill="url(#' + uid + '-med)"/>'
    + '<circle cx="' + cx + '" cy="' + cy + '" r="' + rMed + '" fill="none" stroke="' + s.ring + '" stroke-width="1.0" opacity="0.4"/>'
    + '<text x="' + cx + '" y="' + (cy - rMed*0.44) + '" text-anchor="middle" dominant-baseline="middle" font-size="' + (size*0.10) + '" font-weight="900" fill="#111" font-family="Arial Black,Arial,sans-serif" letter-spacing="0.2">$Pc</text>'
    + '<text x="' + cx + '" y="' + (cy + rMed*0.12) + '" text-anchor="middle" dominant-baseline="middle" font-size="' + numFS + '" font-weight="900" fill="#111" font-family="Arial Black,Arial,sans-serif" letter-spacing="-0.5">' + lbl + '</text>'
    + '<text x="' + cx + '" y="' + (cy + rMed*0.66) + '" text-anchor="middle" dominant-baseline="middle" font-size="' + (size*0.068) + '" font-weight="800" fill="' + s.tierRing + '" font-family="Arial,sans-serif" letter-spacing="1.5" opacity="0.9">— M —</text>'
    + '<ellipse cx="' + (cx - r*0.08) + '" cy="' + (cy - r*0.38) + '" rx="' + (r*0.36) + '" ry="' + (r*0.15) + '" fill="rgba(255,255,255,0.20)"/>'
    + '</svg>';
}
let cornerBets = initializeBets(btns.cornerBtns, 'corner');
let currentLang = enLang;
let endrollTimer;
let fastBet = document.querySelectorAll('.fastBet');
let haben;
let history = 0;
let i = 0;
let insideFB = document.querySelector('.insideFB');
let isMouseDown = false;
let lastBetSize;
let lastSelectedChip = btns.allChips[0];
let loading = document.querySelector('.loading');
let loadingScreen = document.querySelector('#loadingScreen');
let menuName;
let menuOpen = false;
const _urlBalance = parseInt(new URLSearchParams(window.location.search).get("balance"), 10);
let money = isNaN(_urlBalance) ? 1000 : _urlBalance;
let moneyInfo = document.querySelector('#money');
let moneyTotal;
let mouseChip = document.querySelector('#circle');
let movable = document.querySelector('.menu');
let music = new Audio(`src/sfx/music/music0.mp3`);
let musicNumber = 0;
let musicStatus = true;
let musicStatusColor = 'red';
let numberBets = initializeBets(btns.numberButtons, 'number');
let oddsInfo = document.querySelector('#disableBackground');
let preMoney = money;
let random;
let rollEndWindow = document.querySelector('#rollEndWindow');
let rollEndWindowCircle = document.querySelector('#rollEndWindowCircle');
let rollNumEl = document.querySelector('#rollEndWindowNumber');
let rolls = 0;
let savedChip2 = {};
let savedChip3 = {};
let savedCornerBets = null;
let savedNumberBets = null;
let savedSectionBets = null;
let savedSixainBets = null;
let savedSplitXbets = null;
let savedSplitYbets = null;
let savedStreetBets = null;
let sectionBets = initializeBets(btns.outsideButtons, 'section');
let setSpin;
let sixainBets = initializeBets(btns.sixainBtns, 'sixain');
let soundText = document.querySelectorAll('.soundText');
let splitAdd = {};
let splitBetsX = initializeBets(btns.splitBtnsX, 'split');
let splitBetsY = initializeBets(btns.splitBtnsY, 'splitY');
let startIcon = document.querySelector('#startIcon');
let streetBets = initializeBets(btns.streetBtns, 'street');
let suppressChipAnim = false;
let game = document.querySelector('#game');
let totalBet = document.querySelector('#totalBet');
let totalWin = document.querySelector('#totalWin');
let winSum = 0;
let xCord;
let yCord;
let zone = document.querySelector('#chipsSelector');
let _currentDictor = null;

function animateChipToTargetPercent(chip, targetPercent, duration = 500) {
  return new Promise((resolve) => {
    if (!chip || !document.body.contains(chip)) return resolve();
    const startTop = parseFloat(chip.style.top) || 0;
    const startLeft = parseFloat(chip.style.left) || 0;
    const startOpacity = parseFloat(getComputedStyle(chip).opacity) || 1;
    const start = performance.now();
    function step(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const tE = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const curTop = startTop + (targetPercent.top - startTop) * tE;
      const curLeft = startLeft + (targetPercent.left - startLeft) * tE;
      const curOpacity = startOpacity + (0 - startOpacity) * tE;
      chip.style.top = curTop + '%';
      chip.style.left = curLeft + '%';
      chip.style.opacity = curOpacity;
      chip.style.transform = `translateY(0px) scale(${1 - 0.15 * tE})`;
      if (t < 1 && document.body.contains(chip)) {
        requestAnimationFrame(step);
      } else {
        if (document.body.contains(chip)) chip.remove();
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function animateDrop(el, fromPx, toPx, duration) {
  const start = performance.now();
  function step(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const tE = 1 - Math.pow(1 - t, 3);
    const current = fromPx + (toPx - fromPx) * tE;
    if (!document.body.contains(el)) return;
    el.style.transform = `translateY(${current}px)`;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      el.style.transform = `translateY(${toPx}px)`;
      el.style.willChange = '';
    }
  }
  requestAnimationFrame(step);
}

function appendChip(btn, denom, animate = true) {
  const chip = document.createElement('div');
  chip.className = 'chipsPut';
  if (suppressChipAnim) {
    chip.style.setProperty('animation', 'none', 'important');
    chip.style.setProperty('transition', 'none', 'important');
  }
  const tableChipPx = Math.round(window.innerHeight * 0.03);
  chip.innerHTML = makeChipSVG(denom, tableChipPx);
  chip.setAttribute('data-denom', denom);
  chip.setAttribute('data-zone', btn.id);
  const coords = getCoordsForButton(btn);
  const stack = getZoneStack(btn);
  const offset = stack.length * STACK_STEP;
  chip.style.top = `${coords.top - offset}%`;
  chip.style.left = `${coords.left}%`;

  if (coords && coords.zIndex != null) {
    chip.style.zIndex = String(coords.zIndex);
  }
  const vhPx = window.innerHeight / 100;
  const startY = -1 * vhPx;
  if (animate && !suppressChipAnim) {
    chip.style.transform = `translateY(${startY}px)`;
    chip.style.willChange = 'transform';
  } else {
    chip.style.transform = 'translateY(0px)';
  }
  game.appendChild(chip);
  if (animate && !suppressChipAnim) {
    animateDrop(chip, startY, 0, 50);
  }
}

function betClick(splitNumbers, splitBets, split) {
  ++history;
  ['cancelLastBtn', 'cancelAllbtn'].forEach((k) =>
    btns[k].classList.remove('disabledCircleBtns')
  );
  const oldValue = splitBets[split];
  const maxPerZone = 500000000;
  splitAdd[split] = splitNumbers[split];

  const allowedToAdd = Math.max(0, Math.min(bet, maxPerZone - (oldValue || 0)));
  if (allowedToAdd <= 0) {
    return;
  }
  splitBets[split] = (oldValue || 0) + allowedToAdd;
  money -= allowedToAdd;
  betSize += allowedToAdd;
  syncGameState();
  const fmt = (n) => n.toLocaleString('en-US');
  moneyInfo.innerHTML = `${currentLang[0]} ${fmt(money)} $Pc`;
  totalBet.innerHTML = `${currentLang[1]} ${fmt(betSize)} $Pc`;
  const counter = betHistory.reduce(
    (n, i) => n + (i.splitNumbers === split ? 1 : 0),
    0
  );
  betHistory.push({
    splitNumbers: split,
    oldValue,
    bet: allowedToAdd,
    newValue: (oldValue || 0) + allowedToAdd,
    counter,
  });
  checkMoney();
}

function betWindowInfo(buttons, bets, keyPrefix, multiplier) {
  const updateBetWindow = (index) => {
    const betKey = `${keyPrefix} ${index}`;
    const currentMultiplier = [
      'section3',
      'section4',
      'section5',
      'section9',
      'section10',
      'section11',
    ].includes(betKey)
      ? 2
      : multiplier;
    const amount = bets[betKey] || 0;
    const potentialWin = amount * currentMultiplier;
    const maxLabel =
      amount >= 500000000
        ? `<span style="color: red; margin-left:0.6vh; font-weight:700;">MAX</span>`
        : '';
    betWindow.innerHTML = `${currentLang[14]} ${amount} $Pc ${maxLabel}<br>${currentLang[15]} ${potentialWin} $Pc`;
  };

  Array.from(buttons).forEach((item, index) => {
    item.addEventListener('click', () =>
      setTimeout(() => updateBetWindow(index), 0)
    );
    item.addEventListener('mouseover', () => {
      updateBetWindow(index);
      setTimeout(() => (betWindow.style.opacity = 1), 1000);
    });
    item.addEventListener('mouseleave', () => {
      betWindow.style.opacity = 0;
    });
  });
}

function bindBetGroup(buttons, numbersMap, betsObj, prefix) {
  Array.from(buttons).forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const hadStack = getZoneStack(btn).length > 0;
      const sfx = hadStack ? chipsPutSfx2 : chipsPutSfx;
      sfx.currentTime = 0;
      sfx.play();
      const key = `${prefix} ${i}`;
      betClick(numbersMap, betsObj, key);
      updateChipsForButton(btn, betsObj[key]);
    });
  });
}

function cancelLastBet() {
  undoSound.currentTime = 0;
  undoSound.play();
  history--;
  const last = betHistory.pop();
  const name = last.splitNumbers?.replace(/\d/g, '') || '';
  const betType = {
    split: splitBetsX,
    splitY: splitBetsY,
    street: streetBets,
    sixain: sixainBets,
    corner: cornerBets,
    section: sectionBets,
    number: numberBets,
  }[name];
  const updateUI = () => {
    moneyInfo.innerHTML = `${currentLang[0]} ${money.toLocaleString("en-US")} $Pc`;
    totalBet.innerHTML = `${currentLang[1]} ${betSize.toLocaleString("en-US")} $Pc`;
  };
  if (history > 0 && betType && last.splitNumbers) {
    betType[last.splitNumbers] = last.oldValue;
    money += +last.bet;
    betSize -= +last.bet;
    updateUI();
  }
  if (last.repeatBet === 'active') {
    btns.cancelAllbtn.click();
    if (rolls > 0) btns.repeatBetBtn.classList.remove('disabledCircleBtns');
  }
  if (last.doubleBet === 'active') {
    betSize -= last.bet / 2;
    money += betSize;
    updateUI();
    const halve = (obj, prefix) =>
      Object.keys(obj).forEach((_, i) => (obj[`${prefix} ${i}`] /= 2));
    [
      ['number', numberBets],
      ['split', splitBetsX],
      ['splitY', splitBetsY],
      ['corner', cornerBets],
      ['street', streetBets],
      ['sixain', sixainBets],
      ['section', sectionBets],
    ].forEach(([p, o]) => halve(o, p));
  }
  if (history === 0) {
    money += +last.bet;
    betSize -= +last.bet;
    updateUI();
    btns.cancelLastBtn.classList.add('disabledCircleBtns');
    btns.cancelAllbtn.classList.add('disabledCircleBtns');
    [
      numberBets,
      splitBetsX,
      splitBetsY,
      cornerBets,
      sectionBets,
      streetBets,
      sixainBets,
    ].forEach((obj) => Object.keys(obj).forEach((k) => (obj[k] = 0)));
  }
  syncGameState();
  refreshAllZonesWithPositiveBets();
  checkMoney();
}

function changeLang(lang) {
  currentLang = lang;
  const fmt = (n) => n.toLocaleString('en-US');
  const $ = (s) => document.querySelector(s);
  moneyInfo.innerHTML = `${currentLang[0]} ${fmt(money)} $Pc`;
  totalBet.innerHTML = `${currentLang[1]} ${fmt(betSize)} $Pc`;
  totalWin.innerHTML = `${currentLang[2]}0 $Pc`;
  $('#langChoose').style.transform = 'scale(0)';
  setTimeout(() => {
    loading.style.display = 'flex';
    loadingStart();
  }, 500);
  soundText[0].innerHTML = `<i class="fa-solid fa-music"></i> ${currentLang[0]}`;
  [
    ['#oddsText', 45],
    ['#gameoverText', 49],
    ['#restart', 50],
  ].forEach(([sel, i]) => {
    const el = $(sel);
    if (!el) return;

    if (sel === '#oddsText') {
      el.innerHTML = currentLang[i];
    } else {
      el.textContent = currentLang[i];
    }
  });
}

function checkMoney() {
  const values = infoConstants.chipValues;
  const chips = btns.allChips;
  let maxAffordable = -1;
  for (let i = 0; i < values.length; i++) {
    const affordable = money >= values[i];
    chips[i].classList.toggle('disabledChips', !affordable);
    chips[i].style.pointerEvents = affordable ? 'all' : 'none';
    if (affordable) maxAffordable = i;
  }
  const iBet = values.indexOf(bet);
  if (iBet !== -1 && money < values[iBet]) {
    for (let j = iBet - 1; j >= 0; j--) {
      if (money >= values[j]) {
        chips[j].click();
        break;
      }
    }
  }
  if (money < 1000000) {
    chips.forEach((chip) => {
      chip.classList.remove('biggerBtn');
      chip.style.pointerEvents = 'none';
    });
    betSection.style.pointerEvents = 'none';
  } else {
    betSection.style.pointerEvents = 'auto';
    lastSelectedChip.classList.add('biggerBtn');
  }
  btns.doubleBet.classList.toggle(
    'disabledCircleBtns',
    money < betSize || betSize == 0
  );
  for (let j = 3; j < values.length; j++) {
    const enabled = money >= values[j];
    const el = fastBet[j - 3];
    el.style.filter = enabled ? 'grayscale(0)' : 'grayscale(1)';
    el.style.pointerEvents = enabled ? 'all' : 'none';
  }
}

function chipHandler(e) {
  const r = game.getBoundingClientRect(),
    x = ((e.clientX - r.left) / r.width) * 100,
    y = ((e.clientY - r.top) / r.height) * 100;
  xCord = x;
  yCord = y;
  if (e.type === 'mousemove') {
    Object.assign(circle.style, { left: `${x - 1}%`, top: `${y - 2.5}%` });
    Object.assign(betWindow.style, { left: `${x - 5}%`, top: `${y - 11}%` });
  } else {
    const show = e.type === 'mouseover' ? 'block' : 'none';
    mouseChip.style.display = betWindow.style.display = show;
  }
}

function chipSelect(cost, chips, chipIndex) {
  bet = cost;
  const cursorPx = Math.round(window.innerHeight * 0.03);
  mouseChip.innerHTML = makeChipSVG(cost, cursorPx);
  mouseChip.style.background = 'transparent';
  mouseChip.style.border = 'none';
  mouseChip.style.borderRadius = '50%';
  mouseChip.style.boxShadow = 'none';
  // chipsPut no longer used for table chips (SVG via makeChipSVG)
  const list = btns.allChips,
    idx = chips - 1;
  list.forEach((c) => c.classList.remove('biggerBtn'));
  list[idx].classList.add('biggerBtn');
  lastSelectedChip = list[idx];
  chipsIndex = chipIndex;
}

function chipsMenu() {
  Object.assign(btns.fastChipsBtn.style, {
    backgroundImage: 'url(src/images/cancelAllIcon.png)',
  });
  btns.fastChipsBtn.classList.remove('fastChip');
  chipsMenuOpen.checked = false;
  Object.assign(movable.style, {
    left: `${xCord - 4.3}%`,
    top: `${yCord - 8}%`,
    display: 'none',
  });
  setTimeout(() => (movable.style.display = 'block'), 50);
  setTimeout(() => (chipsMenuOpen.checked = true), 200);
}

function decomposeToDenoms(amount) {
  const res = [];
  let left = amount | 0;
  for (const d of DENOMS_DESC) {
    while (left >= d) {
      res.push(d);
      left -= d;
    }
  }
  return res;
}

function dictorVoice() {
  const el = document.getElementById('dictorVoice');
  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));

  const dictor = new Audio(`src/sfx/dictor/dictor${random}.mp3`);
  dictor.volume = clamp01(el.value);
  _currentDictor = dictor;
  dictor.play();

  if (!el._dictorListenerAttached) {
    el.addEventListener('input', () => {
      if (_currentDictor) _currentDictor.volume = clamp01(el.value);
    });
    el._dictorListenerAttached = true;
  }
}

function double(betsObj, prefix) {
  const mapping = {
    number: btns.numberButtons,
    split: btns.splitBtnsX,
    splitY: btns.splitBtnsY,
    corner: btns.cornerBtns,
    street: btns.streetBtns,
    sixain: btns.sixainBtns,
    section: btns.outsideButtons,
  };
  const buttons = mapping[prefix];
  if (!buttons) return;
  Object.keys(betsObj).forEach((key) => {
    const idx = parseInt(key.replace(prefix, ''), 10);
    if (Number.isNaN(idx)) return;
    const btn = buttons[idx];
    if (!btn) return;
    updateChipsForButton(btn, betsObj[key] || 0);
  });
}

function doubleBets() {
  doubleSound.currentTime = 0;
  doubleSound.play();
  history++;
  if (money < betSize) return;
  const maxPerZone = 500000000;

  let extraNeeded = 0;
  const computeExtra = (obj, name) => {
    Object.keys(obj).forEach((k) => {
      const cur = obj[k] || 0;
      const target = Math.min(maxPerZone, cur * 2);
      extraNeeded += target - cur;
    });
  };
  computeExtra(numberBets, 'number');
  computeExtra(splitBetsX, 'split');
  computeExtra(splitBetsY, 'splitY');
  computeExtra(cornerBets, 'corner');
  computeExtra(sectionBets, 'section');
  computeExtra(streetBets, 'street');
  computeExtra(sixainBets, 'sixain');
  if (money < extraNeeded) return;

  const applyDouble = (obj) =>
    Object.keys(obj).forEach((k) => {
      const cur = obj[k] || 0;
      obj[k] = Math.min(maxPerZone, cur * 2);
    });

  money += betSize;
  applyDouble(numberBets);
  applyDouble(splitBetsX);
  applyDouble(splitBetsY);
  applyDouble(cornerBets);
  applyDouble(sectionBets);
  applyDouble(streetBets);
  applyDouble(sixainBets);

  const recomputeTotalBet = () =>
    [
      'number',
      'split',
      'splitY',
      'corner',
      'section',
      'street',
      'sixain',
    ].reduce((sum, p) => {
      const obj = {
        number: numberBets,
        split: splitBetsX,
        splitY: splitBetsY,
        corner: cornerBets,
        section: sectionBets,
        street: streetBets,
        sixain: sixainBets,
      }[p];
      return sum + Object.keys(obj).reduce((s, k) => s + (obj[k] || 0), 0);
    }, 0);
  betSize = recomputeTotalBet();
  syncGameState();
  money -= betSize;
  window.parent.postMessage({ type: "bet", amount: betSize }, "*");
  moneyInfo.innerHTML = `${currentLang[0]} ${money.toLocaleString("en-US")} $Pc`;
  totalBet.innerHTML = `${currentLang[1]} ${betSize.toLocaleString("en-US")} $Pc`;
  [
    'number',
    'split',
    'splitY',
    'corner',
    'section',
    'street',
    'sixain',
  ].forEach((k, i) =>
    double(
      [
        numberBets,
        splitBetsX,
        splitBetsY,
        cornerBets,
        sectionBets,
        streetBets,
        sixainBets,
      ][i],
      k
    )
  );

  checkMoney();
  refreshAllZonesWithPositiveBets();
  betHistory.push({ doubleBet: 'active', bet: betSize });
}

function endroll() {
  if (endrollActive) return;
  endrollActive = true;
  clearInterval(setSpin);
  let rollingInterval = setInterval(function () {
    if (i != haben) return spin(1);
    moneyTotal = money - preMoney;
    if (moneyTotal > 0) { window.parent.postMessage({ type: "win", amount: moneyTotal }, "*"); } else if (moneyTotal < 0) { window.parent.postMessage({ type: "bet", amount: Math.abs(moneyTotal) }, "*"); }
    btns.betCompleteBtn.classList.add('betActive');
    insideFB.className = 'fbDisable';
    clearTimeout(endrollTimer);
    angle3 = 0.4;
    ball.style.animationPlayState = 'running';
    rollSound.currentTime = 0;
    rollSound.pause();
    endRollSound.play();
    moneyInfo.innerHTML = currentLang[0] + money.toLocaleString('en-US') + ' $Pc';
    totalWin.innerHTML =
      currentLang[2] + moneyTotal.toLocaleString('en-US') + ' $Pc';
    btns.betCompleteBtn.style.pointerEvents = 'none';
    startIcon.className = 'fa-solid fa-hourglass-start statusWait';
    btns.betCompleteBtn.classList.add('activeShadow');
    preMoney = money;
    const specialSectionFactors = {
      section3: 3,
      section4: 3,
      section5: 3,
      section9: 3,
      section10: 3,
      section11: 3,
    };
    const collectWinners = () => {
      const res = [];
      const add = (betsObj, map, prefix, factor) => {
        for (let key in betsObj) {
          if ((betsObj[key] || 0) <= 0) continue;
          const nums = map[key];
          if (!nums || !nums.includes(random)) continue;
          const idx = parseInt(key.replace(prefix, ''), 10);
          const btn =
            prefix === 'number'
              ? btns.numberButtons[idx]
              : prefix === 'split'
              ? btns.splitBtnsX[idx]
              : prefix === 'splitY'
              ? btns.splitBtnsY[idx]
              : prefix === 'corner'
              ? btns.cornerBtns[idx]
              : prefix === 'street'
              ? btns.streetBtns[idx]
              : prefix === 'sixain'
              ? btns.sixainBtns[idx]
              : prefix === 'section'
              ? btns.outsideButtons[idx]
              : null;
          const f =
            prefix === 'section'
              ? specialSectionFactors.hasOwnProperty(key)
                ? specialSectionFactors[key]
                : 2
              : factor;
          res.push({ btn, amount: betsObj[key] * f });
        }
      };
      add(numberBets, infoConstants.numbers, 'number', 36);
      add(splitBetsX, infoConstants.splitNumbersX, 'split', 18);
      add(splitBetsY, infoConstants.splitNumbersY, 'splitY', 18);
      add(cornerBets, infoConstants.cornerNumbers, 'corner', 9);
      add(streetBets, infoConstants.streetNumbers, 'street', 12);
      add(sixainBets, infoConstants.sixainNumbers, 'sixain', 6);
      add(sectionBets, infoConstants.sectionNumbers, 'section', 2);

      return res;
    };
    setTimeout(() => {
      startIcon.className = 'fa-solid fa-hourglass-half statusWait';
      dictorVoice();
      numbersBlink();
      winNumberWindow();
      const winnersFirst = collectWinners();
      const prevSuppress2 = suppressChipAnim;
      suppressChipAnim = true;
      winnersFirst.forEach(({ btn, amount }) => {
        if (btn && amount > 0) updateChipsForButton(btn, amount);
      });
      suppressChipAnim = prevSuppress2;

      if (moneyTotal > 0) {
        rollEndWindowCircle.style.animation = 'spin 8s linear infinite';
        rollEndWindow.style.boxShadow = '#9a801c 0vh 0vh 4vh 1vh';
        rollEndWindow.style.animation = 'rotate-bg 1s linear infinite';
        document.querySelector('#rollMoneyInfo').style.display = 'block';
        document.querySelector('#rollMoneyInfo').innerHTML = `\n    ${
          currentLang[25]
        }<br />\n    ${moneyTotal.toLocaleString('en-US')} $Pc \n`;
      }
    }, 1000);
    setTimeout(
      () => (startIcon.className = 'fa-solid fa-hourglass-end statusWait'),
      2000
    );
    setTimeout(() => {
      startIcon.className = 'fa-solid fa-play';
      btns.betCompleteBtn.classList.remove('activeShadow');
    }, 3000);
    setTimeout(() => btns.betCompleteBtn.classList.remove('betActive'), 3000);
    setTimeout(() => {
      btns.numberButtons.forEach((button) => {
        button.classList.remove(
          'winningBets',
          'winningBets2',
          'winningBets3',
          'winningBets4'
        );
      });
      btns.outsideButtons.forEach((button) => {
        button.classList.remove('winningBets', 'winningBets2');
      });
      historyList();

      (async () => {
          try {
        const winnersSecond = collectWinners();
        const winningZoneSet = new Set();
        winnersSecond.forEach(
          (w) => w && w.btn && w.btn.id && winningZoneSet.add(w.btn.id)
        );
        const prevSuppress = suppressChipAnim;
        suppressChipAnim = true;
        winnersSecond.forEach(({ btn, amount }) => {
          if (btn && amount > 0) updateChipsForButton(btn, amount);
        });
        suppressChipAnim = prevSuppress;

        const zoneStacks = {};
        document.querySelectorAll('.chipsPut').forEach((chip) => {
          const zid = chip.getAttribute('data-zone');
          zoneStacks[zid] = zoneStacks[zid] || [];
          zoneStacks[zid].push(chip);
        });
        const allZoneButtons = [
          ...Array.from(btns.numberButtons),
          ...Array.from(btns.splitBtnsX),
          ...Array.from(btns.splitBtnsY),
          ...Array.from(btns.cornerBtns),
          ...Array.from(btns.streetBtns),
          ...Array.from(btns.sixainBtns),
          ...Array.from(btns.outsideButtons),
        ];
        const zoneIds = allZoneButtons
          .map((b) => (b && b.id ? b.id : null))
          .filter(Boolean);
        const anyChips = Object.keys(zoneStacks).some(
          (k) => zoneStacks[k].length > 0
        );
        if (anyChips) {
          cancelBetSfx.currentTime = 0;
          cancelBetSfx.play();
        }

        const flightDuration = 130;

        startIcon.style.color = 'red';
        startIcon.style.textShadow = '0vh 0vh 2vh red';
        btns.betCompleteBtn.classList.add('activeShadow');
        const flightPromises = [];
        for (const zid of zoneIds) {
          const stack = (zoneStacks[zid] || []).slice();
          if (stack.length === 0) continue;
          const isWin = winningZoneSet.has(zid);
          const target = isWin ? { top: 86, left: 50 } : { top: 6, left: 50 };
          const p = (async () => {
            for (let k = stack.length - 1; k >= 0; k--) {
              const chip = stack[k];
              await animateChipToTargetPercent(chip, target, flightDuration);
            }
          })();
          flightPromises.push(p);
        }
        await Promise.all(flightPromises);

        startIcon.style.color = 'black';
        startIcon.style.textShadow = 'none';
        btns.betCompleteBtn.classList.remove('activeShadow');

        btns.betCompleteBtn.style.pointerEvents = 'all';
        betSection.style.pointerEvents = 'all';
        reset(
          false,
          numberBets,
          splitBetsX,
          splitBetsY,
          cornerBets,
          streetBets,
          sixainBets,
          sectionBets
        );
        betStart = false;
        insideFB.className = 'insideFB';
        document.querySelector('#chipsSelector').style.filter = 'grayscale(0)';
        document.querySelector('#chipsSelectorDisabled').style.display = 'none';
        document
          .querySelector('#statisticBtn')
          .classList.remove('disabledCircleBtns');

        if (money >= lastBetSize && lastBetSize > 0)
          btns.repeatBetBtn.classList.remove('disabledCircleBtns');
        if (money < 1000000) {
          oddsInfoDisplay('block', 'blur(1vh)', 'none', 'restartGame', true);
          btns.closeBetInfo.style.display = 'none';
        }
          } catch(e) {
            console.error('endroll IIFE error:', e);
          } finally {
            endrollActive = false;
            betStart = false;
            syncGameState();
            document.querySelector('#chipsSelectorDisabled').style.display = 'none';
            checkMoney();
            if (money >= 1000000 && !menuOpen) {
              btns.betCompleteBtn.style.pointerEvents = 'all';
              betSection.style.pointerEvents = 'all';
              document.querySelector('#chipsSelector').style.filter = 'grayscale(0)';
            }
          }
      })();
    }, 3000);

    setTimeout(() => {
      rollEndWindow.style.transform = 'scale(0)';
      rollEndWindowCircle.style.animation = 'none';
      rollEndWindow.style.boxShadow = 'none';
      rollEndWindow.style.animation = 'none';
      document.querySelector('#rollMoneyInfo').style.display = 'none';
    }, 4000);
    clearInterval(rollingInterval);
  }, 1);
}

function fastChips(betSize, chips) {
  chipsMenuOpen.checked = false;
  const lastBet = bet;
  bet = betSize;
  buttonName.click();
  setTimeout(() => {
    movable.style.display = 'none';
  }, 550);
  const _fsvg = makeChipSVG(betSize, 40);
  btns.fastChipsBtn.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(_fsvg) + '")';
  btns.fastChipsBtn.style.backgroundSize = 'contain';
  btns.fastChipsBtn.classList.add('fastChip');
  bet = lastBet;
  checkMoney();
}

function getCoordsForButton(btn) {
  const id = btn.id,
    c = infoConstants.tableCoords;
  const get = (key) => (c[key] != null ? c[key] : null);

  if (c[id]) return c[id];

  const check = (cls, prefix, next = true) => {
    if (!btn.classList.contains(cls)) return;
    const num = parseInt(id.replace(prefix, ''), 10);
    return get(`${prefix} ${next ? num + 1 : num}`);
  };

  if (btn.classList.contains('numbers')) {
    const num = parseInt(id.replace('n', ''), 10);
    const r = get(num);
    if (r) return r;
  }

  let r;
  if (
    !r &&
    btn.classList.contains('split') &&
    !btn.classList.contains('splitY')
  )
    r = check('split', 'split');
  if (!r && btn.classList.contains('splitY')) r = check('splitY', 'splitY');
  if (!r && btn.classList.contains('corner')) r = check('corner', 'corner');
  if (!r && btn.classList.contains('street')) r = check('street', 'street');
  if (!r && btn.classList.contains('sixain')) r = check('sixain', 'sixain');
  if (r) return r;

  [
    [infoConstants.numbers, numberBets, 36],
    [infoConstants.splitNumbersX, splitBetsX, 18],
    [infoConstants.splitNumbersY, splitBetsY, 18],
    [infoConstants.cornerNumbers, cornerBets, 9],
    [infoConstants.streetNumbers, streetBets, 12],
    [infoConstants.sixainNumbers, sixainBets, 6],
    [infoConstants.sectionNumbers, sectionBets, 2, specialSectionFactors],
  ].forEach((a) => winCheck(...a));

  return stack.reduce((a, chip) => {
    const d = +chip.dataset.denom;
    a[d] = (a[d] || 0) + 1;
    return a;
  }, {});
}

function getZoneStack(btn) {
  return Array.from(document.querySelectorAll('.chipsPut')).filter(
    (chip) => chip.getAttribute('data-zone') === btn.id
  );
}

function handleScroll(e) {
  if (money <= 0 || betStart || menuOpen) return;
  const delta = e.deltaY ?? e.detail ?? e.wheelDelta ?? 0;
  const chips = Array.from(btns.allChips);
  if (delta > 0 && bet !== 1000000) {
    for (let i = chipsIndex - 1; i >= 0; i--) {
      if (chips[i] && chips[i].style.display !== 'none') {
        chips[i].click();
        break;
      }
    }
  } else if (delta < 1 && bet !== 500000000) {
    for (let i = chipsIndex + 1; i < chips.length; i++) {
      if (chips[i] && chips[i].style.display !== 'none' && chips[i].style.pointerEvents !== 'none') {
        chips[i].click();
        break;
      }
    }
  }
}

function highlightNumbers(betBtns, type, hover) {
  const numbers = btns.numberButtons;
  const paint = (arr, v) =>
    arr.forEach((i) => (numbers[i].style.boxShadow = v));
  const on = '0vh 0vh 1vh 0.2vh white inset';

  betBtns.forEach((btn, i) => {
    const group = hover[type + i];
    btn.addEventListener('mouseenter', () => paint(group, on));
    btn.addEventListener('mouseleave', () => paint(group, 'none'));
  });
}

function historyList() {
  let historyMenu = document.querySelector('#historyMenu');
  let total = document.createElement('div');
  let addHistory = document.createElement('div');
  let addHistory2 = document.createElement('div');
  let addHistory3 = document.createElement('div');
  let addHistory4 = document.createElement('div');
  let addHistory5 = document.createElement('div');
  let addHistory6 = document.createElement('div');
  let addHistory7 = document.createElement('div');

  let bets1 = [
    currentLang[26],
    currentLang[27],
    currentLang[28],
    currentLang[29],
    currentLang[30],
    currentLang[31],
    currentLang[32],
    currentLang[33],
    currentLang[34],
    currentLang[35],
    currentLang[36],
    currentLang[37],
  ];

  function formatBetResult(bets, numbers, random) {
    return Object.keys(bets).reduce((result, key) => {
      if (bets[key] > 0) {
        const formattedNumbers = numbers[key]
          .map((num) => {
            return num === random
              ? `<span style="color: green; border-bottom: 0.1vh solid white;">${num}</span>`
              : num;
          })
          .join(',');
        const numberArray = numbers[key].map((num) => Number(num));
        const randomNumber = Number(random);

        let color;
        if (numberArray.includes(randomNumber)) {
          color = '#0080001c';
        } else {
          color = '#8000001c';
        }

        result.push(
          `<span class="historySpan" style="background-color:${color}">${formattedNumbers}<br><span style="color: #00d634;">${bets[key]} $Pc</span></span>`
        );
      }
      return result;
    }, []);
  }

  function formatBetResult2() {
    let result = [];
    for (let i = 0; i <= 11; i++) {
      if (sectionBets['section' + i] > 0) {
        const formattedNumbers = infoConstants.sectionNumbers['section' + i]
          .map(
            (num) =>
              `<span class="${
                num == random ? 'green-number' : 'red-number'
              }">${num}</span>`
          )
          .join(',');

        result.push(
          `${bets1[i]}: ${formattedNumbers} [<span style="color: #00d634;">${
            sectionBets['section' + i]
          } $Pc</span>]`
        );
      }
    }

    return result;
  }

  let betTotal;
  let color;

  if (infoConstants.sectionNumbers.section2.includes(random)) {
    color = 'red';
  } else if (random === 0) {
    color = 'green';
  } else {
    color = 'black';
  }
  const container = document.createElement('div');
  container.className = 'container';

  if (moneyTotal < 0) {
    container.style.backgroundColor = '#3f07074d';
    betTotal = `${rolls}. ${currentLang[19]} &nbsp;<span class=menuWinningNumber style="background-color: ${color};"> ${random} </span> &nbsp;&nbsp;|&nbsp;&nbsp; ${currentLang[14]} <span style="color: #00d634;"> ${lastBetSize} $Pc </span> &nbsp;&nbsp;|&nbsp;&nbsp; ${currentLang[20]} <span style="color: red;"> ${currentLang[21]} ${moneyTotal} $Pc </span>`;
  } else {
    container.style.backgroundColor = '#073f0a4d;';
    betTotal = `${rolls}. ${currentLang[19]} &nbsp;<span class=menuWinningNumber style="background-color: ${color};">${random}</span> &nbsp;&nbsp;|&nbsp;&nbsp; ${currentLang[14]} <span style="color: #00d634;">${lastBetSize} $Pc</span> &nbsp;&nbsp;|&nbsp;&nbsp; ${currentLang[20]} <span style="color: green;">${currentLang[22]} ${moneyTotal} $Pc</span>`;
  }
  let betResult = formatBetResult(
    cornerBets,
    infoConstants.cornerNumbers,
    random
  );
  let betResult2 = formatBetResult(
    splitBetsX,
    infoConstants.splitNumbersX,
    random
  );
  let betResult3 = formatBetResult(
    splitBetsY,
    infoConstants.splitNumbersY,
    random
  );
  let betResult4 = formatBetResult(numberBets, infoConstants.numbers, random);
  let betResult6 = formatBetResult(
    streetBets,
    infoConstants.streetNumbers,
    random
  );
  let betResult7 = formatBetResult(
    sixainBets,
    infoConstants.sixainNumbers,
    random
  );

  let betResult5 = formatBetResult2();

  total.innerHTML = betTotal;
  container.appendChild(total);

  if (betResult5.length > 0) {
    addHistory5.innerHTML = betResult5.join(`<br>`);
    container.appendChild(addHistory5);
  }
  if (betResult.length > 0) {
    addHistory.innerHTML = `${currentLang[38]}<br>` + betResult.join(` `);
    container.appendChild(addHistory);
  }
  if (betResult2.length > 0) {
    addHistory2.innerHTML = `${currentLang[39]}<br>` + betResult2.join(` `);
    container.appendChild(addHistory2);
  }
  if (betResult3.length > 0) {
    addHistory3.innerHTML = `${currentLang[39]}<br>` + betResult3.join(` `);
    container.appendChild(addHistory3);
  }
  if (betResult4.length > 0) {
    addHistory4.innerHTML = `${currentLang[41]}<br>` + betResult4.join(` `);
    container.appendChild(addHistory4);
  }

  if (betResult6.length > 0) {
    addHistory6.innerHTML = `${currentLang[42]}<br>` + betResult6.join(` `);
    container.appendChild(addHistory6);
  }

  if (betResult7.length > 0) {
    addHistory7.innerHTML = `${currentLang[40]}<br>` + betResult7.join(` `);
    container.appendChild(addHistory7);
  }
  historyMenu.appendChild(container);
}

function initializeBets(buttons, prefix) {
  const bets = {};
  for (let i = 0; i < buttons.length; i++) {
    bets[`${prefix} ${i}`] = 0;
  }
  return bets;
}

function loadingStart() {
  game.style.opacity = '1';
  let progress = 0;
  let progressBar = document.getElementById('progress');
  let progressBar2 = document.getElementById('progressBar');

  if (progressBar) progressBar.textContent = '0';
  soundText[0].innerHTML = `<i class="fa-solid fa-music"></i> ${currentLang[16]}`;
  soundText[1].innerHTML = `<i class="fa-solid fa-volume-high"></i> ${currentLang[17]}`;
  soundText[2].innerHTML = `<i class="fa-solid fa-comment-dots"></i> ${currentLang[18]}`;
  document.querySelector(
    '#rollEndWindowText'
  ).innerHTML = `${currentLang[23]}<br />${currentLang[24]}`;
  const buttonTexts = [
    `${currentLang[4]}`,
    `${currentLang[5]}`,
    `${currentLang[6]}`,
    `${currentLang[7]}`,
    `${currentLang[8]}`,
    `${currentLang[9]}`,
    `${currentLang[10]}`,
    `${currentLang[11]}`,
  ];
  btns.circleBtns.forEach((btn, index) => {
    btn.addEventListener('mouseenter', function () {
      if (index > 3) {
        document.querySelector('#rightBtnInfo').textContent =
          buttonTexts[index];
      } else {
        document.querySelector('.buttonsInfo').textContent = buttonTexts[index];
      }

      if (index == 3 && !document.fullscreenElement) {
        document.querySelector('.buttonsInfo').textContent = buttonTexts[index];
      } else if (index == 3 && document.fullscreenElement) {
        document.querySelector('.buttonsInfo').textContent = currentLang[43];
      }
    });
  });
  let intervalId = setInterval(function () {
    progress++;
    if (progress >= 100) {
      setTimeout(() => {
        loadingScreen.remove();
      }, 5000);
      if (progressBar) progressBar.innerHTML = currentLang[44];
      progressBar.style.fontSize = '4vh';
      clearInterval(intervalId);
      setTimeout(() => {
        loadingScreen.style.transform = 'scale(0)';
      }, 1000);
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        music.play();
      }, 2000);
      function enablePointerEvents() {
        document.querySelector('#betSection').style.pointerEvents = 'all';
        document.removeEventListener('mousemove', enablePointerEvents);
      }
      document.addEventListener('mousemove', enablePointerEvents);
    } else {
      progressBar.innerHTML = progress;
    }
  }, 40);
}

function musicChange(prevNext) {
  const updateMusic = (num) => {
    music.pause();
    music = new Audio(`src/sfx/music/music${num}.mp3`);
    music.volume = document.querySelector('#musicVolume').value;
    music.currentTime = 0;
    music.addEventListener('timeupdate', updateTimer);
    setTimeout(() => music.play(), 1000);
  };
  document.querySelector('#musicPause').className = 'fa-solid fa-pause';
  document.querySelector('#vinyl').style.animationPlayState = 'running';
  document.querySelector('#musicPause').style.fontSize = '2vh';
  musicStatusColor = 'red';
  musicStatus = true;
  musicNumber += prevNext === 'prev' ? -1 : 1;
  musicNumber = (musicNumber + 8) % 8;
  updateMusic(musicNumber);
}

function musicPause() {
  const isPlaying = musicStatus;
  musicStatus = !isPlaying;

  musicStatus ? music.play() : music.pause();
  document.querySelector('#vinyl').style.animationPlayState = musicStatus
    ? 'running'
    : 'paused';
  btns.musicPauseBtn.className = musicStatus
    ? 'fa-solid fa-pause'
    : 'fa-solid fa-play';
  btns.musicPauseBtn.style.fontSize = musicStatus ? '2vh' : '1.8vh';
  btns.musicPauseBtn.style.color = musicStatus ? 'red' : '#08ff21';
  musicStatusColor = btns.musicPauseBtn.style.color;
}

function numbersBlink() {
  btns.numberButtons.forEach((button) => {
    const numId = parseInt(button.id.replace('n', ''));
    if (numId === random) {
      let hasBet = false;
      for (let i = 0; i < btns.numberButtons.length; i++) {
        const key = 'number' + i;
        const nums = infoConstants.numbers[key];
        if (nums && nums.includes(numId) && numberBets[key] > 0) {
          hasBet = true;
          break;
        }
      }
      if (random === 0) {
        button.classList.add(hasBet ? 'winningBets2' : 'winningBets');
      } else {
        button.classList.add(hasBet ? 'winningBets3' : 'winningBets4');
      }
    }
  });

  for (let i = 0; i < 12; i++) {
    const button = btns.outsideButtons[i];
    const hasBet = sectionBets['section' + i] > 0;
    if (infoConstants.sectionNumbers['section' + i].includes(random)) {
      button.classList.add(hasBet ? 'winningBets2' : 'winningBets');
    }
  }
}

function oddsInfoDisplay(show, blur, back, elementName, checker) {
  menuOpen = checker;
  menuName = elementName;
  oddsInfo.style.display = show;
  const menuEl = document.querySelector(`#${menuName}`);
  if (menuEl) menuEl.style.display = show;
  const historyTextEl = document.querySelector('#historyText');
  if (historyTextEl) {
    historyTextEl.style.display =
      elementName === 'historyMenu' && show === 'block' ? 'block' : 'none';
  }
  game.style.filter = blur;
  game.style.pointerEvents = back;
  document.querySelector('#historyMenu').scrollTop =
    document.querySelector('#historyMenu').scrollHeight;
}

function preloadImages(urls, onProgress, opts = {}) {
  const timeout = opts.timeout || 30000;
  return new Promise((resolve, reject) => {
    if (!Array.isArray(urls) || urls.length === 0) return resolve();
    let loaded = 0;
    let errored = 0;
    const total = urls.length;
    let finished = false;

    function tick() {
      if (onProgress) onProgress(loaded + errored, total, errored);
      if (loaded + errored >= total && !finished) {
        finished = true;
        clearTimeout(timer);
        resolve({ loaded, errored, total });
      }
    }

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;

        reject(new Error('Image preload timeout'));
      }
    }, timeout);

    urls.forEach((u) => {
      try {
        const img = new Image();
        img.onload = () => {
          loaded++;
          tick();
        };
        img.onerror = () => {
          errored++;
          tick();
        };

        img.src = u;
      } catch (err) {
        errored++;
        tick();
      }
    });
  });
}

function refreshAllZonesWithPositiveBets() {
  suppressChipAnim = true;
  const refreshMap = [
    { obj: numberBets, prefix: 'number', buttons: btns.numberButtons },
    { obj: splitBetsX, prefix: 'split', buttons: btns.splitBtnsX },
    { obj: splitBetsY, prefix: 'splitY', buttons: btns.splitBtnsY },
    { obj: cornerBets, prefix: 'corner', buttons: btns.cornerBtns },
    { obj: streetBets, prefix: 'street', buttons: btns.streetBtns },
    { obj: sixainBets, prefix: 'sixain', buttons: btns.sixainBtns },
    { obj: sectionBets, prefix: 'section', buttons: btns.outsideButtons },
  ];
  refreshMap.forEach(({ obj, prefix, buttons }) => {
    const count = buttons.length;
    for (let i = 0; i < count; i++) {
      const key = `${prefix} ${i}`;
      const amount = obj[key] || 0;
      if (amount > 0 || getZoneStack(buttons[i]).length) {
        updateChipsForButton(buttons[i], amount);
      }
    }
  });
  suppressChipAnim = false;
}

function repeatLastBet() {
  chipsPutSfx.play();
  btns.cancelAllbtn.click();
  money -= lastBetSize;

  betSize = lastBetSize;
  syncGameState();
  try {
    savedChip2 = savedChip3 ? JSON.parse(JSON.stringify(savedChip3)) : {};
  } catch (e) {
    savedChip2 = savedChip3 ? { ...savedChip3 } : {};
  }
  function applySavedBets(targetObj, savedObj) {
    if (!savedObj) return;
    const maxPerZone = 500000000;

    Object.keys(targetObj).forEach((k) => (targetObj[k] = 0));
    Object.keys(savedObj).forEach((k) => {
      const val = savedObj[k] || 0;
      targetObj[k] = Math.min(maxPerZone, val);
    });
  }

  applySavedBets(numberBets, savedNumberBets);
  applySavedBets(splitBetsX, savedSplitXbets);
  applySavedBets(splitBetsY, savedSplitYbets);
  applySavedBets(cornerBets, savedCornerBets);
  applySavedBets(sectionBets, savedSectionBets);
  applySavedBets(streetBets, savedStreetBets);
  applySavedBets(sixainBets, savedSixainBets);
  btns.doubleBet.classList.remove('disabledCircleBtns');
  btns.cancelAllbtn.classList.remove('disabledCircleBtns');
  btns.cancelLastBtn.classList.remove('disabledCircleBtns');

  btns.repeatBetBtn.classList.add('disabledCircleBtns');
  refreshAllZonesWithPositiveBets();
  betHistory.push({
    repeatBet: 'active',
    bet: 0,
  });
  moneyInfo.innerHTML = currentLang[0] + money.toLocaleString('en-US') + ' $Pc';
  totalBet.innerHTML = currentLang[1] + betSize.toLocaleString('en-US') + ' $Pc';
  history += 1;

  betWindowInfo(btns.numberButtons, numberBets, 'number', 35);
  betWindowInfo(btns.splitBtnsY, splitBetsY, 'splitY', 17);
  betWindowInfo(btns.splitBtnsX, splitBetsX, 'split', 17);
  betWindowInfo(btns.cornerBtns, cornerBets, 'corner', 8);
  betWindowInfo(btns.streetBtns, streetBets, 'street', 11);
  betWindowInfo(btns.sixainBtns, sixainBets, 'sixain', 5);
  betWindowInfo(btns.outsideButtons, sectionBets, 'section', 2);
}

function reset(checker, ...objects) {
  if (checker) {
    money += betSize;
    moneyInfo.textContent = `Cash: ${money.toLocaleString('en-US')} $Pc`;
    betSize = 0;
    syncGameState();
    totalBet.textContent = `Bet: ${betSize.toLocaleString('en-US')} $Pc`;
    savedChip2 = {};
    if (money >= lastBetSize && lastBetSize > 0) {
      btns.repeatBetBtn.classList.remove('disabledCircleBtns');
    }
  }
  splitAdd = {};
  betHistory = [];
  history = 0;
  objects.forEach((obj) => Object.keys(obj).forEach((key) => (obj[key] = 0)));
  document.querySelectorAll('.chipsPut').forEach((element) => element.remove());
  refreshAllZonesWithPositiveBets();
  btns.cancelAllbtn.classList.add('disabledCircleBtns');
  btns.cancelLastBtn.classList.add('disabledCircleBtns');
  checkMoney();
}

function restartGame() {
  cancelBetSfx.play();
  btns.allChips.forEach((c) =>
    c.classList.remove('disabledChips', (c.style.pointerEvents = 'all'))
  );
  fastBet.forEach((b) =>
    Object.assign(b.style, { filter: 'grayscale(0)', pointerEvents: 'all' })
  );
  ['#statisticBtn', btns.repeatBetBtn].forEach((e) =>
    document
      .querySelector(e?.id ? '#statisticBtn' : e)
      .classList.add('disabledCircleBtns')
  );
  betSection.style.pointerEvents = 'all';
  btns.closeBetInfo.click();
  btns.closeBetInfo.style.display = 'block';
  money = preMoney = (isNaN(_urlBalance) ? 1000 : _urlBalance);
  splitAdd = savedChip2 = savedChip3 = {};
  betHistory = buttonName = [];
  reset(
    false,
    numberBets,
    splitBetsX,
    splitBetsY,
    cornerBets,
    streetBets,
    sixainBets,
    sectionBets
  );
  moneyInfo.innerHTML = `${currentLang[0]} ${money.toLocaleString("en-US")} $Pc`;
  totalBet.innerHTML = `${currentLang[1]} ${betSize.toLocaleString("en-US")} $Pc`;
  totalWin.innerHTML = `${currentLang[2]}0 $Pc`;
  document.querySelector('#restartGame').style.display = 'none';
  historyMenu.innerHTML = '';
  zone.scrollLeft = 0;
  btns.allChips[0].click();
}

function rotate() {
  angle += angle3;
  angle2 += angle3 - 0.08;
  angle = angle > 360 || angle < 0 ? 0 : angle;
  document.querySelector(
    '#roulette5'
  ).style.transform = `rotateX(-45.2deg) rotate(${-angle}deg)`;
  document.querySelector(
    '#roulette2'
  ).style.transform = `rotateX(47deg) rotate(${-angle}deg)`;
  document.querySelector(
    '#rouletteShadow'
  ).style.transform = `rotateX(53deg) rotate(${-angle}deg)`;
  ball.style.transform = `rotate(${-angle}deg)`;
  setTimeout(rotate, FRAME_DELAY);
}

function saveBets() {
  savedNumberBets = { ...numberBets };
  savedSplitXbets = { ...splitBetsX };
  savedSplitYbets = { ...splitBetsY };
  savedCornerBets = { ...cornerBets };
  savedSectionBets = { ...sectionBets };
  savedStreetBets = { ...streetBets };
  savedSixainBets = { ...sixainBets };
}

function setIntSpin() {
  setSpin = setInterval(spin, 6, 2);
}

function spin(spinSpeed) {
  i = (i + spinSpeed) % 360;
  ball.style.display = 'block';
  ballSpin.style.transform = 'rotate(' + i + 'deg)';
}

function start() {
  winSum = 0;
  btns.repeatBetBtn.classList.add('disabledCircleBtns');
  [btns.doubleBet, btns.cancelLastBtn, btns.cancelAllbtn].forEach((el) =>
    el.classList.add('disabledCircleBtns')
  );
  startIcon.style.color = 'aqua';
  startIcon.style.textShadow = '0vh 0vh 2vh aqua';
  document.querySelector('#rightBtnInfo').textContent = `${currentLang[12]}`;
  document.querySelector('#chipsSelector').style.filter = 'grayscale(1)';
  document.querySelector('#chipsSelectorDisabled').style.display = 'block';
  lastSelectedChip.classList.remove('biggerBtn');
  betPointerDisable.style.display = 'block';
  setTimeout(() => {
    betPointerDisable.style.display = 'none';
  }, 10);
  betStart = true;
  syncGameState();
  angle3 = 2;
  const interval = setInterval(
    () => (angle3 > 0.4 ? (angle3 -= 0.1) : clearInterval(interval)),
    500
  );
  lastBetSize = betSize;
  rolls += 1;
  savedChip3 = savedChip2;
  savedChip2 = {};
  saveBets();
  ball.style.animation = 'none';
  void ball.offsetWidth;
  ball.style.animation = null;
  rollSound.play();
  random = Math.floor(Math.random() * 37);
  haben = infoConstants.rollerInfo[random];
  setIntSpin();
  endrollTimer = setTimeout(() => {
    if (betStart) endroll();
  }, 6000);
  const specialSectionFactors = {
    section3: 3,
    section4: 3,
    section5: 3,
    section9: 3,
    section10: 3,
    section11: 3,
  };
  [
    [infoConstants.numbers, numberBets, 36],
    [infoConstants.splitNumbersX, splitBetsX, 18],
    [infoConstants.splitNumbersY, splitBetsY, 18],
    [infoConstants.cornerNumbers, cornerBets, 9],
    [infoConstants.streetNumbers, streetBets, 12],
    [infoConstants.sixainNumbers, sixainBets, 6],
    [infoConstants.sectionNumbers, sectionBets, 2, specialSectionFactors],
  ].forEach((args) => winCheck(...args));
  if (random === 0) {
    const halfBackSections = [
      'section0',
      'section1',
      'section2',
      'section6',
      'section7',
      'section8',
    ];
    money = Math.floor(
      money + halfBackSections.reduce((s, k) => s + sectionBets[k], 0) / 2
    );
  }
  betSize = 0;
  document.querySelector('#betSection').style.pointerEvents = 'none';
  startIcon.className = 'fa-solid fa-forward';
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(
        `Error attempting to enable full-screen mode: ${err.message}`
      );
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function updateChipsForButton(btn, amount) {
  const target = decomposeToDenoms(amount);
  const targetCounts = {};
  target.forEach((v) => (targetCounts[v] = (targetCounts[v] || 0) + 1));
  const previousStack = getZoneStack(btn);
  previousStack.forEach((chip) => chip.remove());
  const denomsOrdered = Object.keys(targetCounts)
    .map(Number)
    .sort((a, b) => b - a);
  const totalToAppend = Object.values(targetCounts).reduce((s, v) => s + v, 0);
  let appended = 0;
  for (const d of denomsOrdered) {
    const need = targetCounts[d];
    for (let k = 0; k < need; k++) {
      const isLast = appended === totalToAppend - 1;
      const shouldAnimate = isLast && !suppressChipAnim;
      appendChip(btn, d, shouldAnimate);
      appended += 1;
    }
  }
}

function updateTimer() {
  let duration = music.duration;
  let remainingTime = duration - music.currentTime;
  let minutes = Math.floor(remainingTime / 60);
  let seconds = Math.floor(remainingTime % 60);
  minutes = isNaN(minutes) ? '00' : minutes < 10 ? '0' + minutes : minutes;
  seconds = isNaN(seconds) ? '00' : seconds < 10 ? '0' + seconds : seconds;
  document.querySelector('#nowPlaying').textContent =
    infoConstants.songName[musicNumber];
  document.querySelector('#musicTimer').textContent = minutes + ':' + seconds;
  if (minutes == 0 && seconds == 1) {
    musicChange('next');
  }
}

function winCheck(numbers, bets, factor, specialFactors = {}) {
  for (let sector in numbers) {
    let range = numbers[sector];
    if (range.includes(random)) {
      let currentFactor = factor;
      if (specialFactors.hasOwnProperty(sector)) {
        currentFactor = specialFactors[sector];
      }
      money += bets[sector] * currentFactor;
      winSum += bets[sector] * currentFactor;
    }
  }
}

function winNumberWindow() {
  rollEndWindow.style.transform = 'scale(1)';
  rollNumEl.textContent = random;
  rollEndWindow.style.backgroundColor =
    infoConstants.sectionNumbers.section2.includes(random)
      ? '#400000de'
      : random === 0
      ? '#004003de'
      : '#000000bd';
}

(function () {
  function setVh() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  setVh();

  window.addEventListener('resize', setVh, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      setVh();

      if (window.scrollY !== 0)
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 150);
  });
})();

btns.musicPauseBtn.onmouseover = () =>
  (btns.musicPauseBtn.style.color = musicStatusColor);
btns.musicPauseBtn.onmouseleave = () =>
  (btns.musicPauseBtn.style.color = 'black');

btns.numberButtons.forEach((button) => {
  button.addEventListener(
    'mouseenter',
    () => (button.style.background = '#7b787887')
  );
  button.addEventListener(
    'mouseleave',
    () => (button.style.background = '#7b787800')
  );
});

btns.allButtons.forEach((buttonArray) => {
  buttonArray.forEach((button, i) => {
    button.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      chipsMenu();
      buttonName = button;
    });
  });
});

document.addEventListener('mousemove', chipHandler);
document.addEventListener('mouseup', () => {
  if (isMouseDown) {
    insideFB.className = 'insideFB';
    isMouseDown = false;
  }
});
document.addEventListener('wheel', (e) => e.ctrlKey && e.preventDefault(), {
  passive: false,
});
document.body.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});
document.querySelector('#musicVolume').addEventListener('input', function () {
  music.volume = document.querySelector('#musicVolume').value;
});
document.querySelector('#soundFx').addEventListener('input', function () {
  rollSound.volume = document.querySelector('#soundFx').value;
  chipsPutSfx.volume = document.querySelector('#soundFx').value;
  chipsPutSfx2.volume = document.querySelector('#soundFx').value;
  endRollSound.volume = document.querySelector('#soundFx').value;
  cancelBetSfx.volume = document.querySelector('#soundFx').value;
  doubleSound.volume = document.querySelector('#soundFx').value;
  undoSound.volume = document.querySelector('#soundFx').value;
});
music.addEventListener('timeupdate', updateTimer);
game.addEventListener('click', () => {
  chipsMenuOpen.checked = false;
  setTimeout(() => {
    movable.style.display = 'none';
  }, 500);
});
betSection.addEventListener('mouseover', chipHandler);
betSection.addEventListener('mouseout', chipHandler);

btns.betCompleteBtn.addEventListener('mouseenter', function () {
  if (!betStart) {
    document.querySelector('#rightBtnInfo').textContent = `${currentLang[12]}`;
  } else {
    document.querySelector('#rightBtnInfo').textContent = `${currentLang[13]}`;
  }
  if (betStart) {
    startIcon.classList.add('statusPlay');
    startIcon.style.textShadow = '0vh 0vh 2vh aqua';
  } else {
    startIcon.style.color = 'lime';
    startIcon.style.textShadow = '0vh 0vh 2vh lime';
  }
});

btns.betCompleteBtn.addEventListener('mouseleave', function () {
  document.querySelector('#rightBtnInfo').textContent = '';
  startIcon.classList.remove('statusPlay');
  startIcon.style.color = 'black';
  startIcon.style.textShadow = 'none';
});

btns.betCompleteBtn.addEventListener('mousedown', () => {
  isMouseDown = true;
  insideFB.className = 'fbDisable';
});

btns.circleBtns.forEach((btn) => {
  btn.addEventListener('mouseleave', function () {
    document.querySelector('.buttonsInfo').textContent = '';
    document.querySelector('#rightBtnInfo').textContent = '';
  });
});

btns.langBtns.forEach((button) => {
  button.addEventListener('mouseenter', () => {
    document.querySelector('#chooseLangTitle').textContent =
      infoConstants.langTexts[button.id];
  });
});

if (window.addEventListener) {
  window.addEventListener('wheel', handleScroll);
} else {
  window.attachEvent('onmousewheel', handleScroll);
}

window.onload = function () {
  preloadImages(imageManifest, (loaded, total, errored) => {
    const progressEl = document.getElementById('progress');
    if (progressEl) {
      const percent = total > 0 ? Math.round((loaded / total) * 100) : 100;
      progressEl.textContent = String(percent);
    }
  })
    .then(() => {
      const langChooseEl = document.querySelector('#langChoose');
      if (langChooseEl) langChooseEl.style.transform = 'scale(1)';

      highlightNumbers(btns.splitBtnsX, 'split', infoConstants.hoverSplits);
      highlightNumbers(btns.splitBtnsY, 'splitY', infoConstants.hoverSplitsY);
      highlightNumbers(
        btns.outsideButtons,
        'outside',
        infoConstants.hoverNumbers
      );
      highlightNumbers(btns.cornerBtns, 'corner', infoConstants.hoverCorners);
      highlightNumbers(btns.streetBtns, 'street', infoConstants.hoverStreets);
      highlightNumbers(btns.sixainBtns, 'sixain', infoConstants.hoverSixain);
      document.addEventListener('mousemove', chipHandler);
      betSection.addEventListener('mouseover', chipHandler);
      betSection.addEventListener('mouseout', chipHandler);
      rotate();
    })
    .catch((e) => {
      console.error('Preloading images failed or timed out', e);

      highlightNumbers(btns.splitBtnsX, 'split', infoConstants.hoverSplits);
      highlightNumbers(btns.splitBtnsY, 'splitY', infoConstants.hoverSplitsY);
      highlightNumbers(
        btns.outsideButtons,
        'outside',
        infoConstants.hoverNumbers
      );
      highlightNumbers(btns.cornerBtns, 'corner', infoConstants.hoverCorners);
      highlightNumbers(btns.streetBtns, 'street', infoConstants.hoverStreets);
      highlightNumbers(btns.sixainBtns, 'sixain', infoConstants.hoverSixain);
      document.addEventListener('mousemove', chipHandler);
      betSection.addEventListener('mouseover', chipHandler);
      betSection.addEventListener('mouseout', chipHandler);
      rotate();
    });
};

betWindowInfo(btns.numberButtons, numberBets, 'number', 35);
betWindowInfo(btns.splitBtnsY, splitBetsY, 'splitY', 17);
betWindowInfo(btns.splitBtnsX, splitBetsX, 'split', 17);
betWindowInfo(btns.cornerBtns, cornerBets, 'corner', 8);
betWindowInfo(btns.streetBtns, streetBets, 'street', 11);
betWindowInfo(btns.sixainBtns, sixainBets, 'sixain', 5);
betWindowInfo(btns.outsideButtons, sectionBets, 'section', 1);

bindBetGroup(btns.numberButtons, infoConstants.numbers, numberBets, 'number');
bindBetGroup(
  btns.outsideButtons,
  infoConstants.sectionNumbers,
  sectionBets,
  'section'
);
bindBetGroup(btns.splitBtnsX, infoConstants.splitNumbersX, splitBetsX, 'split');
bindBetGroup(
  btns.splitBtnsY,
  infoConstants.splitNumbersY,
  splitBetsY,
  'splitY'
);
bindBetGroup(
  btns.cornerBtns,
  infoConstants.cornerNumbers,
  cornerBets,
  'corner'
);
bindBetGroup(
  btns.streetBtns,
  infoConstants.streetNumbers,
  streetBets,
  'street'
);
bindBetGroup(
  btns.sixainBtns,
  infoConstants.sixainNumbers,
  sixainBets,
  'sixain'
);

btns.allChips.forEach((chip, index) => {
  chip.addEventListener('click', () =>
    chipSelect([1000000, 2000000, 5000000, 10000000, 25000000, 50000000, 100000000, 250000000, 500000000][index], index + 1, index)
  );
});

// ── Casino chip SVG initialization ──────────────────────────────────────────
(function initChipSVGs() {
  const chipValues = [1000000, 2000000, 5000000, 10000000, 25000000, 50000000, 100000000, 250000000, 500000000];
  const selectorPx = Math.round(window.innerHeight * 0.0745);
  btns.allChips.forEach((btn, i) => {
    btn.innerHTML = makeChipSVG(chipValues[i], selectorPx);
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.boxShadow = 'none';
  });

  // Init cursor chip
  const cursorPx = Math.round(window.innerHeight * 0.03);
  mouseChip.innerHTML = makeChipSVG(chipValues[0], cursorPx);
  mouseChip.style.background = 'transparent';
  mouseChip.style.border = 'none';
  mouseChip.style.boxShadow = 'none';

  // Tier filter tabs
  const TIER_MAP = {
    low:  [0, 1, 2, 3],
    mid:  [4, 5, 6],
    high: [7, 8],
    all:  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  };

  function applyTierFilter(tier) {
    btns.allChips.forEach((btn, i) => {
      const show = TIER_MAP[tier].includes(i);
      btn.style.display = show ? 'inline-flex' : 'none';
    });
    // If currently selected chip is hidden, auto-select first visible chip in tier
    const currentIdx = Array.from(btns.allChips).indexOf(lastSelectedChip);
    if (!TIER_MAP[tier].includes(currentIdx)) {
      const firstVisible = TIER_MAP[tier][0];
      btns.allChips[firstVisible].click();
    }
  }

  document.querySelectorAll('.chipTierTab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chipTierTab').forEach(t => t.classList.remove('active-tier'));
      tab.classList.add('active-tier');
      applyTierFilter(tab.dataset.tier);
    });
  });

  // Start on low tier (1M-10M)
  applyTierFilter('low');
})();

btns.betCompleteBtn.addEventListener('click', () => {
  if (betStart) {
    i = haben - 1;
    endroll();
  } else {
    start();
  }
});

btns.betInfoBtn.addEventListener('click', () =>
  oddsInfoDisplay('block', 'blur(1vh)', 'none', 'settings', true)
);

btns.cancelAllbtn.addEventListener('click', () => {
  cancelBetSfx.currentTime = 0;
  cancelBetSfx.play();
  reset(
    true,
    numberBets,
    splitBetsX,
    splitBetsY,
    cornerBets,
    streetBets,
    sixainBets,
    sectionBets
  );
});

btns.cancelLastBtn.addEventListener('click', () => cancelLastBet());

btns.closeBetInfo.addEventListener('click', () =>
  oddsInfoDisplay('none', 'none', 'auto', menuName, false)
);

btns.doubleBet.addEventListener('click', () => doubleBets());

btns.fullscreenBtn.addEventListener('click', () => toggleFullScreen());

btns.langBtns.forEach((button, i) => {
  button.addEventListener('click', () =>
    changeLang([enLang, ruLang, frLang][i])
  );
});

btns.musicChangeBtn[0].addEventListener('click', () => musicChange('prev'));
btns.musicChangeBtn[1].addEventListener('click', () => musicChange('next'));

btns.repeatBetBtn.addEventListener('click', () => repeatLastBet());

btns.soundBtn.addEventListener('click', () =>
  oddsInfoDisplay('block', 'blur(1vh)', 'none', 'soundSettings', true)
);

chipsMenuOpen.addEventListener('click', () =>
  setTimeout(() => {
    movable.style.display = 'none';
  }, 500)
);

btns.pausePlay.addEventListener('click', musicPause);

btns.restartBtn.addEventListener('click', restartGame);

btns.statisticBtn.addEventListener('click', () =>
  oddsInfoDisplay('block', 'blur(1vh)', 'none', 'historyMenu', true)
);

fastBet.forEach((btn, index) => {
  btn.addEventListener('click', () => {
    fastChips([10000000, 25000000, 50000000, 100000000, 250000000, 500000000][index], [4, 5, 6, 7, 8, 9][index]);
  });
});


window.addEventListener('message', function(e) {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'balance:update' && typeof e.data.balance === 'number') {
    money = e.data.balance;
    if (!betStart) preMoney = money;
    if (moneyInfo) moneyInfo.innerHTML = (currentLang && currentLang[0] ? currentLang[0] : '') + money.toLocaleString('en-US') + ' $Pc';
  }
});

window.addEventListener('message', function(e) {
  if (!e.data || e.data.type !== 'music:state') return;
  var playing = e.data.playing;
  var musicInfoEl = document.getElementById('musicInfo');
  var musicVolRow = document.getElementById('musicVolume') ? document.getElementById('musicVolume').closest('div') : null;
  var parentBanner = document.getElementById('parentMusicBanner');
  if (playing) {
    // Pause in-game music and hide music controls
    if (musicStatus) {
      music.pause();
      musicStatus = false;
      var pauseIcon = document.querySelector('#musicPause');
      if (pauseIcon) pauseIcon.className = 'fa-solid fa-play';
      var vinyl = document.querySelector('#vinyl');
      if (vinyl) vinyl.style.animationPlayState = 'paused';
    }
    if (musicInfoEl) musicInfoEl.style.display = 'none';
    if (musicVolRow) musicVolRow.style.display = 'none';
    if (!parentBanner) {
      var banner = document.createElement('div');
      banner.id = 'parentMusicBanner';
      banner.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(139,92,246,0.18);border:1px solid rgba(139,92,246,0.4);border-radius:12px;padding:7px 18px;font-size:12px;color:#c4b5fd;z-index:9999;pointer-events:none;white-space:nowrap;';
      banner.textContent = e.data.trackTitle ? ('Now playing: ' + e.data.trackTitle) : 'Music playing from main player';
      document.body.appendChild(banner);
    }
  } else {
    // Restore in-game music controls
    if (musicInfoEl) musicInfoEl.style.display = '';
    if (musicVolRow) musicVolRow.style.display = '';
    var banner2 = document.getElementById('parentMusicBanner');
    if (banner2) banner2.remove();
  }
});

window.addEventListener('beforeunload', function(e) {
  if (betStart || betSize > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});
