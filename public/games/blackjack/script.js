const DURATION_MS = 4000;
const loadingSpinner = document.getElementById('loadingSpinner');
const percentEl = document.getElementById('loadingPercent');
const playBtn = document.getElementById('playBtn');
const game = document.querySelector('#game');
const dealBtn = document.querySelector('#dealBtn');
const hitBtn = document.querySelector('#hitBtn');
const standBtn = document.querySelector('#standBtn');
const splitBtn = document.querySelector('#splitBtn');
const doubleBtn = document.querySelector('#doubleBtn');
const clearAllBtn = document.querySelector('#clearAllBtn');
const betZones = document.querySelectorAll('.betZones');
const tableZones = document.querySelectorAll('.zones');
const scoreInfo = document.querySelectorAll('.scoreInfo');
const betStatusInfo = document.querySelectorAll('.numbersInfo');
const pairs = document.querySelectorAll('.pairs');
const plus = document.querySelectorAll('.plus23');
const superSevens = document.querySelectorAll('.superSevens');
const royal = document.querySelectorAll('.royal');
const chips = document.querySelectorAll('.chips');
const cardScore = document.querySelectorAll('.cardScore');
const insuranceBtn = document.querySelector('#insuranceBtn');
const undoBtn = document.querySelector('#undoBtn');
const noInsuranceBtn = document.querySelector('#noInsuranceBtn');
const surrenderBtn = document.querySelector('#surrenderBtn');
const evenMoneyBtn = document.querySelector('#evenMoneyBtn');
const rebetBtn = document.querySelector('#rebetBtn');
const newGameBtn = document.querySelector('#newGameBtn');
const helpBtn = document.querySelector('#helpBtn');
const pausePlayBtn = document.querySelector('#pausePlay');
const settingsBtn = document.querySelector('#settingsBtn');
const closeWindow = document.querySelectorAll('.closeWindow');
const loadingScreen = document.getElementById('loadingScreen');
const settingsWindow = document.querySelector('#settingsWindow');
const rebetDealBtn = document.querySelector('#rebetDealBtn');
const declineEvenMoneyBtn = document.querySelector('#declineEvenMoneyBtn');
const notifWindow = document.querySelector('#notification');
const sfxSlider = document.querySelector('#soundFx');
const musicChangeBtn = document.querySelectorAll('.changeMusic');
const musicPauseBtn = document.querySelector('#musicPause');
const musicVol = document.querySelector('#musicVolume');
const deckQtyEl = document.querySelector('#deckQuantity');
const helpWindow = document.querySelector('#helpWindow');
const scrollArea = helpWindow.querySelector('.help__scroll');
const zoneChips = [[], [], []];
const zonePairsChips = [[], [], []];
const zoneSplitChips = [[], [], []];
const zonePlus21Chips = [[], [], []];
const zoneRoyalChips = [[], [], []];
const zoneSuperSevenChips = [[], [], []];
const zoneInsuranceChips = [[], [], []];
const zoneSurrenderChips = [[], [], [], [], [], []];
const betHistory = [];
const BASE_ZONES = ['betZone1', 'betZone2', 'betZone3'];
const chipValues = [1000000, 5000000, 10000000, 25000000, 100000000, 500000000];
const CHIP_IMG_MAP = {1000000: 1, 5000000: 5, 10000000: 10, 25000000: 25, 100000000: 100, 500000000: 1000};
function chipImg(v) { return 'src/images/chips/chip' + (CHIP_IMG_MAP[v] || v) + '.png'; }
const REBET_CHECK_BY = 'amount';
const songName = [
  'Velvet Groove',
  'Midnight Mirage',
  'Night Skies',
  'Lucky 8',
  'Elegance in Blue',
  'Forgiveness',
  'Your Beauty',
  'Moonlight',
];
const upgradeRules = {
  1000000: { count: 5, next: 5000000 },
  5000000: { count: 2, next: 10000000 },
  10000000: { count: 10, next: 100000000 },
  25000000: { count: 4, next: 100000000 },
  100000000: { count: 10, next: 500000000 },
};

const groups = [
  { arr: plus, type: 'plus' },
  { arr: pairs, type: 'pair' },
  { arr: royal, type: 'royal' },
  { arr: superSevens, type: 'super7' },
  { arr: betZones, type: 'main' },
];
const chipSelectPositions = [
  { top: 67, right: 94 },
  { top: 71.8, right: 90.7 },
  { top: 76, right: 87.2 },
  { top: 79.6, right: 83.45 },
  { top: 82.7, right: 79.6 },
  { top: 85.3, right: 75.6 },
];
const betZoneInfo = {
  betZone1: {
    insuranceChipPositions: [55, 80.9],
    top: 36,
    right: 77,
    score: 0,
    suitCards: [],
    suitCardsScore: [],
    status: false,
    bet: 0,
    pairsBet: 0,
    plus21Bet: 0,
    royalBet: 0,
    insuranceBet: 0,
    superSevenBet: 0,
    scoreZone: scoreInfo[0],
    cardScore: cardScore[0],
    scoreZoneTop: 42,
    splitRight: [85, 69],
    scoreLeft: [12.5, 27.6],
    chipPositions: [55, 77.9],
    pairChipPositions: [59.2, 75.2],
    royalChipPositions: [59.2, 80.7],
    plus21ChipPositions: [52, 75.1],
    superSevenChipPositions: [52, 80.7],
  },
  betZone2: {
    insuranceChipPositions: [69.5, 51.8],
    top: 50,
    right: 47.9,
    status: false,
    score: 0,
    suitCards: [],
    suitCardsScore: [],
    bet: 0,
    pairsBet: 0,
    plus21Bet: 0,
    royalBet: 0,
    superSevenBet: 0,
    insuranceBet: 0,
    scoreZone: scoreInfo[1],
    cardScore: cardScore[2],
    scoreZoneTop: 58.8,
    splitRight: [56, 39.78],
    scoreLeft: [40.6, 56.7],
    chipPositions: [69.5, 48.8],
    pairChipPositions: [73.6, 46.1],
    royalChipPositions: [73.6, 51.4],
    plus21ChipPositions: [66.2, 46.1],
    superSevenChipPositions: [66.2, 51.4],
  },
  betZone3: {
    insuranceChipPositions: [55, 23.9],
    top: 36,
    right: 19.9,
    status: false,
    score: 0,
    suitCards: [],
    suitCardsScore: [],
    bet: 0,
    plus21Bet: 0,
    pairsBet: 0,
    royalBet: 0,
    superSevenBet: 0,
    insuranceBet: 0,
    scoreZone: scoreInfo[2],
    cardScore: cardScore[4],
    scoreZoneTop: 42,
    splitRight: [28.26, 11.86],
    scoreLeft: [68.5, 84.6],
    chipPositions: [55, 19.92],
    pairChipPositions: [59.3, 17.2],
    royalChipPositions: [59.3, 22.5],
    plus21ChipPositions: [52, 17.1],
    superSevenChipPositions: [52, 22.65],
  },
  splitZone1: {
    top: 36,
    right: 85,
    score: 0,
    scoreZone: scoreInfo[0],
    status: false,
    bet: 0,
    cardScore: cardScore[0],
    suitCards: [],
    suitCardsScore: [],
  },

  splitZone2: {
    top: 36,
    right: 69,
    score: 0,
    scoreZone: scoreInfo[6],
    status: false,
    bet: 0,
    cardScore: cardScore[1],
    suitCards: [],
    suitCardsScore: [],
  },

  splitZone3: {
    top: 50,
    right: 56,
    score: 0,
    status: false,
    bet: 0,
    scoreZone: scoreInfo[1],
    cardScore: cardScore[2],
    suitCards: [],
    suitCardsScore: [],
  },

  splitZone4: {
    top: 50,
    right: 39.78,
    score: 0,
    status: false,
    bet: 0,
    scoreZone: scoreInfo[7],
    cardScore: cardScore[3],
    suitCards: [],
    suitCardsScore: [],
  },

  splitZone5: {
    top: 36,
    right: 28.26,
    score: 0,
    status: false,
    bet: 0,
    scoreZone: scoreInfo[2],
    cardScore: cardScore[4],
    suitCards: [],
    suitCardsScore: [],
  },

  splitZone6: {
    top: 36,
    right: 11.86,
    score: 0,
    status: false,
    bet: 0,
    scoreZone: scoreInfo[8],
    cardScore: cardScore[5],
    suitCards: [],
    suitCardsScore: [],
  },

  dealerZone: {
    top: 16,
    right: 47.6,
    score: 0,
    cardScore: cardScore[6],
    suitCards: [],
    suitCardsScore: [],
  },
};
const playerInfo = {
  balance: (() => { const p = new URLSearchParams(window.location.search); const b = parseInt(p.get("balance"), 10); return isNaN(b) ? 10000000 : b; })(),
  bet: 1,
  totalBet: 0,
  lastWin: 0,
};

let hideTimer;
let gameStart = false;
let afterInsurance = false;
let chipIndex = 0;
let rebetSnapshot = null;
let roundNet = 0;
let splitActive = false;
let insuranceActive = false;
let lastBalance = null;
let aceSplitInProgress = false;
let currentDecks = 6;
let activeZone;
let cardSuit;
let cardSuitValue;
let cardTexture;
let dealerStatus = false;
let canBet = true;
let __chipSendSoundTimer = null;
let __chipSendBatchCount = 0;
let sfxVolume = 0.5;
let musicNumber = 0;
let musicStatus = true;
let startTs = null;
let done = false;
let musicStatusColor = 'red';
let music = new Audio(`src/sfx/music/music0.mp3`);

if (deckQtyEl) {
  deckQtyEl.min = '2';
  deckQtyEl.max = '8';
  const v0 = Number(deckQtyEl.value);
  currentDecks = Number.isFinite(v0) ? Math.max(2, Math.min(8, v0)) : 6;
  deckQtyEl.value = String(currentDecks);
  deckQtyEl.addEventListener('input', () => {
    const next = Math.max(2, Math.min(8, Number(deckQtyEl.value) || 6));
    currentDecks = next;
    document.querySelector('#deckNum').textContent = currentDecks;
    if (!window.gameStart) {
      deck = createDeck(currentDecks);
    } else if (typeof notification === 'function') {
      notification('Количество колод обновится со следующего раунда');
    }
  });
}

function createDeck(numDecks = 6) {
  const suits = ['s1', 's2', 's3', 's4'];
  const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
  const deck = {};
  suits.forEach((suit) => {
    deck[suit] = [];
    for (let i = 0; i < numDecks; i++) {
      deck[suit].push(...ranks);
    }
  });
  return deck;
}
let deck = createDeck(currentDecks);

function tick(ts) {
  if (!startTs) startTs = ts;
  const elapsed = ts - startTs;
  const pct = Math.min(100, Math.floor((elapsed / DURATION_MS) * 100));
  if (percentEl.textContent !== pct) {
    percentEl.textContent = pct;
  }
  if (pct >= 100 && !done) {
    done = true;
    percentEl.style.fontSize = '4vh';
    percentEl.innerHTML = 'GOOD <br/> LUCK';
    loadingSpinner.style.animationPlayState = 'paused';
    percentEl.style.animationPlayState = 'paused';
    playBtn.style.pointerEvents = 'all';
    playBtn.style.opacity = '1';
    return;
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

const zoneSum = (z) =>
  [
    'bet',
    'pairsBet',
    'plus21Bet',
    'royalBet',
    'superSevenBet',
    'insuranceBet',
  ].reduce((sum, k) => sum + (betZoneInfo[z]?.[k] ?? 0), 0);

function anyBetsOnTable() {
  return BASE_ZONES.some(zoneSum);
}

const updateUndoBtnState = () =>
  undoBtn?.classList.toggle(
    'inactiveBtn',
    !anyBetsOnTable() || !betHistory.length
  );

const showStandardButtons = () =>
  [dealBtn, clearAllBtn, undoBtn].forEach(
    (el) => el && (el.style.display = 'flex')
  );
const hideStandardButtons = () =>
  [dealBtn, clearAllBtn, undoBtn].forEach(
    (el) => el && (el.style.display = 'none')
  );
const showPostRoundButtons = () =>
  [newGameBtn, rebetBtn, rebetDealBtn].forEach(
    (el) => el && (el.style.display = 'flex')
  );
const hidePostRoundButtons = () =>
  [newGameBtn, rebetBtn, rebetDealBtn].forEach(
    (el) => el && (el.style.display = 'none')
  );

function applyBaseTransform(cardOrEl) {
  if (!cardOrEl) return;
  if (cardOrEl.classList && cardOrEl.classList.contains('doubleTilt')) {
    cardOrEl.style.transform =
      'perspective(12vh) rotateX(10deg) rotateZ(90deg) scale(1)';
  } else {
    cardOrEl.style.transform = 'perspective(12vh) rotateX(10deg) scale(1)';
  }
}

function dealCard(zone, targetTop, targetRight, flip = true, isDouble = false) {
  getCardScore(zone, flip);
  document
    .querySelectorAll('.buttonAreaBtns')
    .forEach((el) => (el.style.display = 'none'));
  const game = document.getElementById('game'),
    baseCard = document.querySelector('.card'),
    card = document.createElement('div');
  card.classList.add('card', zone);
  card.innerHTML =
    '<div class="card-inner"><div class="card-back"></div><div class="card-front" style="background-image:url(src/images/' +
    cardSuit +
    '/' +
    cardTexture +
    '.png)"></div></div>';
  if (isDouble) {
    card.classList.add('doubleTilt');
    card.style.transform = 'rotateZ(90deg) scale(1.1)';
  }
  const cs = baseCard ? getComputedStyle(baseCard) : null;
  card.style.top = cs ? cs.top : '1.8%';
  card.style.right = cs ? cs.right : '67.8%';
  game.appendChild(card);
  setTimeout(() => {
    setTimeout(() => {
      playSound('sendCard');
    }, 100);
    card.style.top = '19%';
    card.style.right = '27%';
    setTimeout(() => {
      card.style.top = targetTop + '%';
      card.style.right = targetRight + '%';
      card.classList.add('cardEnd');
    }, 250);
  }, 50);
  setTimeout(() => {
    if (flip) card.classList.add('flipped');
    if (!isDouble && !splitActive && !zone.startsWith('splitZone'))
      applyBaseTransform(card);
    if (betZoneInfo[zone].cardScore && (zone !== 'dealerZone' || flip)) {
      betZoneInfo[zone].cardScore.textContent = betZoneInfo[zone].score;
      betZoneInfo[zone].cardScore.style.opacity = 1;
    }
  }, 500);
  if (zone === 'dealerZone' && !flip) card.classList.add('cardInactive');
  setTimeout(() => {
    if (gameStart && !dealerStatus) checkButtons();
  }, 1000);
  return card;
}

function deal() {
  if (lastBalance === null) lastBalance = playerInfo.balance;
  snapshotRebet();
  document.querySelector('#deckQuantity').style.pointerEvents = 'none';
  document.querySelector('#deckQuantity').style.filter = 'grayscale(1)';
  const activeZones = Object.keys(betZoneInfo).filter(
    (zone) => betZoneInfo[zone].status && zone !== 'dealerZone'
  );
  const dealtCount = {};
  activeZones.forEach((zone) => (dealtCount[zone] = 0));
  dealtCount['dealerZone'] = 0;
  const order = [];
  for (let round = 0; round < 2; round++) {
    activeZones.forEach((zone) => order.push(zone));
    order.push('dealerZone');
  }
  order.forEach((zone, i) => {
    setTimeout(() => {
      const { top, right } = betZoneInfo[zone];
      dealtCount[zone]++;
      const offsetRight = dealtCount[zone] > 1 ? right - 1 : right;
      const flip = !(zone === 'dealerZone' && dealtCount[zone] === 2);
      dealCard(zone, top, offsetRight, flip);
      if (i === order.length - 1) {
        setTimeout(() => {
          checkBets();
          const dealerUpRank =
            betZoneInfo.dealerZone?.suitCardsScore?.[0]?.[1] || null;
          const dealerNatural =
            betZoneInfo.dealerZone.score === 21 &&
            betZoneInfo.dealerZone.suitCards.length === 2;
          const upIsTenValue = ['10', 'J', 'Q', 'K'].includes(dealerUpRank);
          if (upIsTenValue && dealerNatural) {
            (typeof BASE_ZONES !== 'undefined'
              ? BASE_ZONES
              : ['betZone1', 'betZone2', 'betZone3']
            ).forEach((z) => {
              const bz = betZoneInfo[z];
              if (bz?.status && bz.suitCards?.length === 2 && bz.score === 21) {
                createBetNotif(z, 'BLACKJACK');
              }
            });
            dealerPlay();
            return;
          }
          document.querySelectorAll('.card.cardEnd').forEach((card) => {
            card.style.filter = 'brightness(0.5)';
          });
          activeZone = activeZones.length ? activeZones[0] : null;
          activeHand(activeZone);
          if (
            betZoneInfo.betZone1?.score === 21 &&
            betZoneInfo.betZone1?.suitCards?.length === 2
          )
            createBetNotif('betZone1', 'BLACKJACK');
          if (
            betZoneInfo.betZone2?.score === 21 &&
            betZoneInfo.betZone2?.suitCards?.length === 2
          )
            createBetNotif('betZone2', 'BLACKJACK');
          if (
            betZoneInfo.betZone3?.score === 21 &&
            betZoneInfo.betZone3?.suitCards?.length === 2
          )
            createBetNotif('betZone3', 'BLACKJACK');
          gameStart = true;
          checkButtons();
        }, 800);
      }
    }, i * 500);
  });
  dealBtn.style.display = 'none';
  clearAllBtn.style.display = 'none';
  tableZones.forEach((el) => {
    el.style.pointerEvents = 'none';
  });
  chips.forEach((el) => {
    el.style.pointerEvents = 'none';
  });
  if (undoBtn) undoBtn.style.display = 'none';
}

function placeBet(betName, type = 'main') {
  if (!canBet) return;
  if (playerInfo.bet <= 0) {
    notification('NO CHIPS AVAILABLE');
    return;
  }
  if (playerInfo.bet > playerInfo.balance) {
    notification('NOT ENOUGH MONEY');
    return;
  }
  let scoreBet;
  let betType;
  if (lastBalance === null) lastBalance = playerInfo.balance;
  const index = betName === 'betZone1' ? 0 : betName === 'betZone2' ? 1 : 2;
  if (type !== 'main' && (betZoneInfo[betName].bet || 0) <= 0) {
    notification('PLACE MAIN BET FIRST');
    return;
  }
  if (type === 'pair') {
    if (betZoneInfo[betName].pairsBet + playerInfo.bet > 100000000) {
      notification('SIDE BETS MAX 100M $Pc');
      return;
    }
    betZoneInfo[betName].pairsBet += playerInfo.bet;
    scoreBet = '.pairInfo';
    betType = 'pairsBet';
  } else if (type === 'plus') {
    if (betZoneInfo[betName].plus21Bet + playerInfo.bet > 100000000) {
      notification('SIDE BETS MAX 100M $Pc');
      return;
    }
    betZoneInfo[betName].plus21Bet += playerInfo.bet;
    scoreBet = '.plus21Info';
    betType = 'plus21Bet';
  } else if (type === 'royal') {
    if (betZoneInfo[betName].royalBet + playerInfo.bet > 100000000) {
      notification('SIDE BETS MAX 100M $Pc');
      return;
    }
    betZoneInfo[betName].royalBet += playerInfo.bet;
    scoreBet = '.royalInfo';
    betType = 'royalBet';
  } else if (type === 'super7') {
    if (betZoneInfo[betName].superSevenBet + playerInfo.bet > 100000000) {
      notification('SIDE BETS MAX 100M $Pc');
      return;
    }
    betZoneInfo[betName].superSevenBet += playerInfo.bet;
    scoreBet = '.superSevenInfo';
    betType = 'superSevenBet';
  } else {
    if (betZoneInfo[betName].bet + playerInfo.bet > 500000000) {
      notification('MAX BET 500M $Pc');
      return;
    }
    betZoneInfo[betName].bet += playerInfo.bet;
    betZoneInfo[betName].status = betZoneInfo[betName].bet > 0;
    scoreBet = '.mainInfo';
    betType = 'bet';
  }
  const scoreElement = document.querySelectorAll(scoreBet);
  createChipWithFlight(playerInfo.bet, index, type);
  playerInfo.balance -= playerInfo.bet;
  playerInfo.totalBet += playerInfo.bet;
  betStatusInfo[1].textContent =
    '$Pc ' + playerInfo.totalBet.toLocaleString('de-DE');
  betStatusInfo[0].textContent =
    '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
  scoreElement[index].textContent =
    '$Pc ' + betZoneInfo[betName][betType].toLocaleString('de-DE');
  scoreElement[index].style.opacity = 1;
  betHistory.push({
    betName,
    type,
    value: playerInfo.bet,
    timestamp: Date.now(),
  });
  dealBtn.classList.remove('inactiveBtn');
  clearAllBtn.classList.remove('inactiveBtn');
  undoBtn.classList.remove('inactiveBtn');
  updateUndoBtnState();
}

function clearBets() {
  try {
    const allGroups = [
      zoneChips,
      zonePairsChips,
      zoneSplitChips,
      zonePlus21Chips,
      zoneRoyalChips,
      zoneSuperSevenChips,
      zoneInsuranceChips,
      zoneSurrenderChips,
    ];
    const totalChipsOnTable = allGroups.reduce(
      (sum, group) => sum + group.reduce((s, arr) => s + (arr?.length || 0), 0),
      0
    );
    if (totalChipsOnTable === 1) {
      playSound('undoChip');
    } else if (totalChipsOnTable > 1) {
      playSound('lotChips');
    }
  } catch (_) {}

  const refund = BASE_ZONES.reduce((acc, z) => acc + zoneSum(z), 0);
  if (refund > 0) {
    playerInfo.balance += refund;
  }
  playerInfo.totalBet = 0;
  betStatusInfo[0].textContent =
    '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
  betStatusInfo[1].textContent = '0 $Pc';
  BASE_ZONES.forEach((z) => {
    const bz = betZoneInfo[z];
    if (!bz) return;
    bz.bet = 0;
    bz.pairsBet = 0;
    bz.plus21Bet = 0;
    bz.royalBet = 0;
    bz.superSevenBet = 0;
    bz.insuranceBet = 0;
    bz.status = false;
    if (bz.scoreZone) {
      bz.scoreZone.textContent = '';
      bz.scoreZone.style.opacity = 0;
    }
  });
  [
    zoneChips,
    zonePairsChips,
    zoneSplitChips,
    zonePlus21Chips,
    zoneRoyalChips,
    zoneSuperSevenChips,
    zoneInsuranceChips,
    zoneSurrenderChips,
  ].forEach((group) => {
    group.forEach((arr) => {
      arr.forEach((chip) => chip && chip.remove && chip.remove());
      arr.length = 0;
    });
  });
  document
    .querySelectorAll(
      '.pairInfo, .plus21Info, .royalInfo, .superSevenInfo, .insuranceInfo'
    )
    .forEach((el) => {
      el.textContent = '';
      el.style.boxShadow = 'none';
      el.style.opacity = 0;
    });
  betHistory.length = 0;
  lastBalance = null;
  if (dealBtn) dealBtn.classList.add('inactiveBtn');
  if (clearAllBtn) clearAllBtn.classList.add('inactiveBtn');
  if (undoBtn) undoBtn.classList.add('inactiveBtn');
  checkChipAvailable();
}

function checkChipAvailable() {
  const bal = Number(playerInfo.balance) || 0;
  let activeIdx = -1;
  for (let i = 0; i < chips.length; i++) {
    if (chips[i].classList.contains('chipActive')) {
      activeIdx = i;
      break;
    }
  }
  chips.forEach((chipEl, i) => {
    const denom = chipValues[i];
    const affordable = bal >= denom;
    if (affordable) {
      chipEl.style.pointerEvents = 'all';
      chipEl.style.opacity = '';
      chipEl.style.filter = 'grayscale(0) brightness(0.6)';
    } else {
      chipEl.style.pointerEvents = 'none';
      chipEl.style.filter = 'grayscale(1) brightness(0.6)';
      chipEl.style.opacity = '0.4';
      if (chipEl.classList.contains('chipActive')) {
        chipEl.classList.remove('chipActive');
        activeIdx = -1;
      }
    }
  });
  if (activeIdx >= 0 && chipValues[activeIdx] > bal) {
    activeIdx = -1;
  }
  if (activeIdx === -1) {
    for (let k = chipValues.length - 1; k >= 0; k--) {
      if (chipValues[k] <= bal) {
        chips.forEach((c) => c.classList.remove('chipActive'));
        chips[k].classList.add('chipActive');
        playerInfo.bet = chipValues[k];
        chipIndex = k;
        activeIdx = k;
        break;
      }
    }
  }
  if (activeIdx >= 0) {
    chips[activeIdx].style.filter = 'grayscale(0) brightness(1)';
    chips[activeIdx].style.opacity = '';
  } else {
    playerInfo.bet = 0;
    chipIndex = -1;
  }
}

function chipSelect(bet, index) {
  for (let i = 0; i < chips.length; i++) {
    const isActive = i === index;
    const affordable = Number(playerInfo.balance) >= chipValues[i];
    chips[i].classList.toggle('chipActive', isActive);
    if (affordable) {
      chips[i].style.opacity = '';
      chips[i].style.filter = isActive
        ? 'grayscale(0) brightness(1)'
        : 'grayscale(0) brightness(0.6)';
    } else {
      chips[i].style.pointerEvents = 'none';
      chips[i].style.filter = 'grayscale(1) brightness(0.6)';
      chips[i].style.opacity = '0.4';
    }
  }
  playerInfo.bet = bet;
  chipIndex = index;
}

function activeHand(zone) {
  if (!zone) return;
  document.querySelectorAll('.card.cardEnd').forEach((card) => {
    const isSplit = [...card.classList].some((cls) =>
      cls.startsWith('splitZone')
    );
    if (!isSplit) {
      applyBaseTransform(card);
    }
  });
  const cards = document.querySelectorAll(`.card.cardEnd.${zone}`);
  const cardArr = Array.from(cards).slice(0, 2);
  if (cardArr[0]) {
    cardArr[0].style.transform = 'scale(1.1)';
    cardArr[0].style.filter = 'brightness(1) ';
  }
  if (cardArr[1]) {
    cardArr[1].style.transform = 'scale(1.1)';
    cardArr[1].style.filter = 'brightness(1) ';
  }
  betZoneInfo[activeZone].cardScore.style.animation =
    'float-up-down 1s ease-in-out infinite';
  checkButtons();
  document.querySelector('#playerMenu').style.display = 'flex';
}

function hit() {
  if (!activeZone) return;
  const { top, right } = betZoneInfo[activeZone];
  const len = document.querySelectorAll(`.card.cardEnd.${activeZone}`).length;
  dealCard(activeZone, top, right - len, true);
  setTimeout(() => {
    const newCard = document.querySelector(
      `.card.cardEnd.${activeZone}:last-child`
    );
    if (newCard) {
      newCard.style.transform = `scale(1.1)`;
      newCard.style.filter = 'brightness(1)';
    }
  }, 500);
}

function drawRandomCardFromDeck(deck) {
  const entries = Object.entries(deck);
  const total = entries.reduce((sum, [, cards]) => sum + cards.length, 0);
  if (total <= 0) return null;
  let r = Math.floor(Math.random() * total);
  for (const [suit, cards] of entries) {
    if (r < cards.length) {
      const rank = cards[r];
      cards.splice(r, 1);
      return { suit, rank };
    }
    r -= cards.length;
  }
  return null;
}

function recomputeZoneScore(zoneName) {
  const z = betZoneInfo[zoneName];
  const ranks = (z.suitCardsScore || []).map(([, r]) => r);
  let total = 0,
    aces = 0;
  const numeric = [];
  for (const r of ranks) {
    if (r === 'A') {
      total += 11;
      aces += 1;
      numeric.push(11);
    } else if (r === 'K' || r === 'Q' || r === 'J') {
      total += 10;
      numeric.push(10);
    } else {
      const v = Number(r);
      total += v;
      numeric.push(v);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  z.score = total;
  z.suitCards = numeric;
}

function getCardScore(zone, flip = true) {
  const c = drawRandomCardFromDeck(deck);
  if (!c) return;
  cardSuit = c.suit;
  cardTexture = c.rank;
  betZoneInfo[zone].suitCardsScore.push([c.suit, c.rank]);
  recomputeZoneScore(zone);
}

function split() {
  if (!activeZone || !activeZone.startsWith('betZone')) return;
  if (playerInfo.balance < betZoneInfo[activeZone].bet) {
    notification('NOT ENOUGH MONEY');
    return;
  }
  document.querySelector('#playerMenu').style.display = 'none';
  splitActive = true;
  document.querySelectorAll('.cardScore').forEach((el) => {
    el.style.animation = 'none';
  });
  document.querySelectorAll('.buttonAreaBtns').forEach((el) => {
    el.style.display = 'none';
  });
  const mapping = {
    betZone1: ['splitZone1', 'splitZone2', 0, 6, 10.1, 26.2],
    betZone2: ['splitZone3', 'splitZone4', 1, 7, 39.15, 55.35],
    betZone3: ['splitZone5', 'splitZone6', 2, 8, 67.1, 83.24],
  };
  const origScores = betZoneInfo[activeZone].suitCardsScore || [];
  const isAcesSplit =
    Array.isArray(origScores) &&
    origScores.length >= 2 &&
    origScores[0][1] === 'A' &&
    origScores[1][1] === 'A';
  const pair = mapping[activeZone];
  if (!pair) return;
  const [splitZone1, splitZone2] = pair;
  const cards = Array.from(
    document.querySelectorAll(`.card.cardEnd.${activeZone}`)
  ).slice(0, 2);
  if (cards.length < 2) return;
  const originalSuitCards = betZoneInfo[activeZone].suitCards.slice(0, 2);
  betZoneInfo[splitZone1].suitCards = [originalSuitCards[0]];
  betZoneInfo[splitZone2].suitCards = [originalSuitCards[1]];
  betZoneInfo[splitZone1].bet = betZoneInfo[activeZone].bet;
  betZoneInfo[splitZone2].bet = betZoneInfo[activeZone].bet;
  betZoneInfo[splitZone1].score = betZoneInfo[splitZone1].suitCards.reduce(
    (a, b) => (a || 0) + b,
    0
  );
  betZoneInfo[splitZone2].score = betZoneInfo[splitZone2].suitCards.reduce(
    (a, b) => (a || 0) + b,
    0
  );
  betZoneInfo[splitZone1].suitCardsScore = origScores.slice(0, 1);
  betZoneInfo[splitZone2].suitCardsScore = origScores.slice(1, 2);
  betZoneInfo[activeZone].suitCardsScore = origScores.slice(2);
  betZoneInfo[activeZone].suitCards =
    betZoneInfo[activeZone].suitCards.slice(2) || [];
  betZoneInfo[activeZone].score = betZoneInfo[activeZone].suitCards.reduce(
    (a, b) => (a || 0) + b,
    0
  );
  const sl = betZoneInfo[activeZone].scoreLeft || [];
  if (sl.length >= 2) {
    if (betZoneInfo[splitZone1].cardScore) {
      betZoneInfo[splitZone1].cardScore.textContent =
        betZoneInfo[splitZone1].score;
      betZoneInfo[splitZone1].cardScore.style.left = sl[0] + '%';
    }
    if (betZoneInfo[splitZone2].cardScore) {
      betZoneInfo[splitZone2].cardScore.textContent =
        betZoneInfo[splitZone2].score;
      betZoneInfo[splitZone2].cardScore.style.left = sl[1] + '%';
      betZoneInfo[splitZone2].cardScore.style.opacity = 1;
    }
  }
  betZoneInfo[activeZone].status = false;
  betZoneInfo[splitZone1].status = true;
  betZoneInfo[splitZone2].status = true;
  scoreInfo[mapping[activeZone][2]].style.left = mapping[activeZone][4] + '%';
  scoreInfo[mapping[activeZone][3]].style.left = mapping[activeZone][5] + '%';
  scoreInfo[mapping[activeZone][3]].textContent =
    '$Pc ' + betZoneInfo[splitZone2].bet.toLocaleString('de-DE');
  scoreInfo[mapping[activeZone][3]].style.opacity = 1;
  cards.forEach((card) => {
    card.style.transform = 'none';
    card.classList.remove(activeZone);
  });

  const { top, splitRight } = betZoneInfo[activeZone];
  cards[0].classList.add(splitZone1);
  cards[0].style.top = top + '%';
  cards[0].style.right =
    (splitRight && splitRight[0] !== undefined
      ? splitRight[0]
      : betZoneInfo[splitZone1].right) + '%';
  cards[1].classList.add(splitZone2);
  cards[1].style.top = top + '%';
  cards[1].style.right =
    (splitRight && splitRight[1] !== undefined
      ? splitRight[1]
      : betZoneInfo[splitZone2].right) + '%';
  if (isAcesSplit) {
    aceSplitInProgress = true;
    dealCard(
      splitZone1,
      betZoneInfo[splitZone1].top,
      betZoneInfo[splitZone1].right - 1,
      true
    );
    setTimeout(() => {
      dealCard(
        splitZone2,
        betZoneInfo[splitZone2].top,
        betZoneInfo[splitZone2].right - 1,
        true
      );
      setTimeout(() => {
        activeZone = splitZone1;
        stand();
        setTimeout(() => {
          activeZone = splitZone2;
          aceSplitInProgress = false;
          stand();
        }, 500);
      }, 800);
    }, 300);
  } else {
    dealCard(
      splitZone1,
      betZoneInfo[splitZone1].top,
      betZoneInfo[splitZone1].right - 1,
      true
    );
    setTimeout(() => {
      dealCard(
        splitZone2,
        betZoneInfo[splitZone2].top,
        betZoneInfo[splitZone2].right - 1,
        true
      );
      setTimeout(() => {
        activeZone = splitZone1;
        activeHand(activeZone);
        const inactiveCards = document.querySelectorAll(`.card.${splitZone2}`);
        inactiveCards.forEach((card) => {
          applyBaseTransform(card);
          card.style.filter = 'brightness(0.5)';
        });
        if (activeZone === splitZone2) {
          activeHand(activeZone);
        }
      }, 1500);
    }, 400);
  }
  splitChips(activeZone);
  playerInfo.balance -= betZoneInfo[activeZone].bet;
  playerInfo.totalBet += betZoneInfo[activeZone].bet;
  betZoneInfo[activeZone].bet = 0;
  betStatusInfo[0].textContent =
    '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
  betStatusInfo[1].textContent =
    '$Pc ' + playerInfo.totalBet.toLocaleString('de-DE');
}

function stand() {
  splitBtn.classList.remove('inactiveBtn');
  doubleBtn.classList.remove('inactiveBtn');
  surrenderBtn.classList.remove('inactiveBtn');
  const mapping = {
    betZone1: ['splitZone1', 'splitZone2'],
    betZone2: ['splitZone3', 'splitZone4'],
    betZone3: ['splitZone5', 'splitZone6'],
  };
  document.querySelectorAll('.cardScore').forEach((el) => {
    el.style.animation = 'none';
  });
  document.querySelectorAll('.buttonAreaBtns').forEach((el) => {
    el.style.display = 'none';
  });
  const betZoneNames = Object.keys(betZoneInfo)
    .filter((z) => z.startsWith('betZone'))
    .sort((a, b) => {
      const na = parseInt(a.replace('betZone', ''), 10);
      const nb = parseInt(b.replace('betZone', ''), 10);
      return na - nb;
    });
  function buildPlayOrder() {
    const order = [];
    betZoneNames.forEach((bz) => {
      const splits = mapping[bz] || [];
      const activeSplits = splits.filter(
        (s) => betZoneInfo[s] && betZoneInfo[s].status
      );
      if (activeSplits.length) {
        order.push(...activeSplits);
      } else if (betZoneInfo[bz] && betZoneInfo[bz].status) {
        order.push(bz);
      }
    });
    return order;
  }
  if (!activeZone) {
    const startOrder = buildPlayOrder();
    if (startOrder.length) {
      activeZone = startOrder[0];
      activeHand(activeZone);
    } else {
      dealerPlay();
    }
    return;
  }
  const currentCards = document.querySelectorAll(`.card.cardEnd.${activeZone}`);
  currentCards.forEach((card) => {
    applyBaseTransform(card);
    card.style.filter = 'brightness(0.5)';
  });
  const order = buildPlayOrder();
  if (!order.length) {
    activeZone = null;
    dealerPlay();
    return;
  }
  let idx = order.indexOf(activeZone);
  if (idx >= 0 && idx < order.length - 1) {
    activeZone = order[idx + 1];
    activeHand(activeZone);
    return;
  }
  let currentGroupIndex = betZoneNames.findIndex((bz) => {
    if (bz === activeZone) return true;
    const splits = mapping[bz] || [];
    return splits.includes(activeZone);
  });
  let nextZone = null;
  for (let gi = currentGroupIndex + 1; gi < betZoneNames.length; gi++) {
    const bz = betZoneNames[gi];
    const splits = mapping[bz] || [];
    const activeSplits = splits.filter(
      (s) => betZoneInfo[s] && betZoneInfo[s].status
    );
    if (activeSplits.length) {
      nextZone = activeSplits[0];
      break;
    }
    if (betZoneInfo[bz] && betZoneInfo[bz].status) {
      nextZone = bz;
      break;
    }
  }
  if (nextZone) {
    activeZone = nextZone;
    activeHand(activeZone);
  } else {
    activeZone = null;
    dealerPlay();
  }
}

function dealerPlay() {
  if (!insuranceActive) {
    splitActive = false;
    dealerStatus = true;
    document
      .querySelectorAll('.card.dealerZone')
      .forEach((card) => (card.style.filter = 'brightness(1)'));
    const hiddenCard = document.querySelector('.card.dealerZone.cardInactive');
    if (hiddenCard) {
      hiddenCard.classList.add('flipped');
      hiddenCard.classList.remove('cardInactive');
    }
    if (betZoneInfo.dealerZone.cardScore)
      betZoneInfo.dealerZone.cardScore.textContent =
        betZoneInfo.dealerZone.score;
    if (
      betZoneInfo.dealerZone.score === 21 &&
      betZoneInfo.dealerZone.suitCards.length === 2
    )
      createBetNotif('dealerZone', 'BLACKJACK');
    const activeHands = Object.keys(betZoneInfo).filter(
      (zone) => betZoneInfo[zone].status && zone !== 'dealerZone'
    );
    const allBust = activeHands.every((zone) => betZoneInfo[zone].score > 21);
    if (allBust) {
      checkMainBets();
      return;
    }
    const allBjOrBust =
      activeHands.length > 0 &&
      activeHands.every((zone) => {
        const z = betZoneInfo[zone];
        const playerBlackjack =
          zone.startsWith('betZone') &&
          z.suitCards.length === 2 &&
          z.score === 21;
        return z.score > 21 || playerBlackjack;
      });
    if (allBjOrBust) {
      checkMainBets();
      return;
    }
    function drawDealerCard(callback) {
      const { top, right } = betZoneInfo.dealerZone;
      const existing = document.querySelectorAll('.card.dealerZone').length;
      dealCard('dealerZone', top, right - existing, true);
      setTimeout(() => {
        if (betZoneInfo.dealerZone.cardScore)
          betZoneInfo.dealerZone.cardScore.textContent =
            betZoneInfo.dealerZone.score;
        if (betZoneInfo.dealerZone.score > 21)
          createBetNotif('dealerZone', 'BUST');
        if (betZoneInfo.dealerZone.score < 17) drawDealerCard(callback);
        else {
          if (callback) callback();
        }
      }, 600);
    }
    if (betZoneInfo.dealerZone.score < 17)
      drawDealerCard(() => checkMainBets());
    else {
      checkMainBets();
    }
  } else {
    if (betZoneInfo.dealerZone.score == 21) {
      const __dealerCards = document.querySelectorAll('.dealerZone');
      if (__dealerCards[1]) __dealerCards[1].style.transform = 'none';
      document
        .querySelectorAll('.card.dealerZone')
        .forEach((card) => (card.style.filter = 'brightness(1) '));
      setTimeout(() => {
        insuranceActive = false;
        afterInsurance = true;
        createBetNotif('dealerZone', 'BLACKJACK');
        zoneInsuranceChips.forEach((_, i) => {
          const betName = `betZone${i + 1}`;
          const insBet = betZoneInfo[betName].insuranceBet || 0;
          const playerZone = betZoneInfo[betName];
          const playerBlackjack =
            playerZone.score === 21 && playerZone.suitCards.length === 2;
          if (insBet > 0 && !playerBlackjack) {
            const winnings = insBet * 2;
            const totalReturn = insBet + winnings;
            playerInfo.balance += totalReturn;
            betStatusInfo[0].textContent =
              '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
            normalizeZone(i, 'insurance', totalReturn);
            sendChips('insurance', i, 'player');
            betZoneInfo[betName].insuranceBet = 0;
          }
        });
        const __dealerCards2 = document.querySelectorAll('.dealerZone');
        if (__dealerCards2[1])
          __dealerCards2[1].style.transform =
            'perspective(12vh) rotateX(10deg) scale(1)';
        setTimeout(() => dealerPlay(), 1000);
      }, 1000);
    } else {
      const __dealerCards = document.querySelectorAll('.dealerZone');
      if (__dealerCards[1]) __dealerCards[1].style.transform = 'none';
      document
        .querySelectorAll('.card.dealerZone')
        .forEach((card) => (card.style.filter = 'brightness(1) '));
      setTimeout(() => {
        insuranceActive = false;
        afterInsurance = true;
        document
          .querySelectorAll('.card.dealerZone')
          .forEach((card) => (card.style.filter = 'brightness(0.5)'));
        const activeZones = Object.keys(betZoneInfo).filter(
          (zone) => betZoneInfo[zone].status && zone !== 'dealerZone'
        );
        activeZone = activeZones.length ? activeZones[0] : null;
        checkBets();
        activeHand(activeZone);
        zoneInsuranceChips.forEach((_, i) => {
          if (zoneInsuranceChips[i] && zoneInsuranceChips[i].length) {
            sendChips('insurance', i, 'dealer');
            const betName = `betZone${i + 1}`;
            betZoneInfo[betName].insuranceBet = 0;
          }
        });
      }, 1000);
    }
  }
}

function checkMainBets() {
  const dealerScore = betZoneInfo.dealerZone.score;
  const dealerBust = dealerScore > 21;
  const dealerBlackjack =
    dealerScore === 21 && betZoneInfo.dealerZone.suitCards.length === 2;
  const activeHands = Object.keys(betZoneInfo).filter(
    (zone) => betZoneInfo[zone].status && zone !== 'dealerZone'
  );
  activeHands.forEach((zone) => {
    const playerScore = betZoneInfo[zone].score;
    const bet = betZoneInfo[zone].bet;
    const playerBlackjack =
      playerScore === 21 &&
      betZoneInfo[zone].suitCards.length === 2 &&
      zone.startsWith('betZone');
    let payout = 0;
    let message = '';
    let index, chipType;
    if (zone.startsWith('betZone')) {
      index = parseInt(zone.replace('betZone', '')) - 1;
      chipType = 'main';
    } else if (zone.startsWith('splitZone')) {
      const num = parseInt(zone.replace('splitZone', ''));
      index = Math.floor((num - 1) / 2);
      chipType = num % 2 === 1 ? 'main' : 'split';
    } else {
      return;
    }
    if (playerScore > 21) {
      message = 'BUST';
      setTimeout(() => {
        sendChips(chipType, index, 'dealer');
      }, 4000);
    } else if (dealerBlackjack) {
      if (playerBlackjack) {
        payout = bet;
        message = 'PUSH';
        setTimeout(() => {
          sendChips(chipType, index, 'player');
        }, 4000);
      } else {
        message = 'LOSE';
        setTimeout(() => {
          sendChips(chipType, index, 'dealer');
        }, 4000);
      }
    } else if (playerBlackjack) {
      payout = Math.floor(bet * 1.5) + bet;
      message = 'WIN';
      normalizeZone(index, chipType, payout);
      setTimeout(() => {
        sendChips(chipType, index, 'player');
      }, 4000);
    } else if (dealerBust || playerScore > dealerScore) {
      payout = bet * 2;
      message = 'WIN';
      normalizeZone(index, chipType, payout);
      setTimeout(() => {
        sendChips(chipType, index, 'player');
      }, 4000);
    } else if (playerScore === dealerScore) {
      payout = bet;
      message = 'PUSH';
      setTimeout(() => {
        sendChips(chipType, index, 'player');
      }, 4000);
    } else {
      message = 'LOSE';
      setTimeout(() => {
        sendChips(chipType, index, 'dealer');
      }, 4000);
    }

    playerInfo.balance += payout;
    createBetNotif(zone, message);
    betZoneInfo[zone].status = false;
    betZoneInfo[zone].bet = 0;
  });
  setTimeout(() => {
    gameStart = false;
    dealerStatus = false;
    afterInsurance = false;
    splitActive = false;
    insuranceActive = false;
    playerInfo.totalBet = 0;
    betStatusInfo[1].textContent = '0 $Pc';
    betStatusInfo[0].textContent =
      '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
    if (lastBalance !== null) {
      playerInfo.lastWin = playerInfo.balance - lastBalance;
      const value = playerInfo.lastWin;
      if (value > 0) { window.parent.postMessage({ type: "win", amount: value }, "*"); } else if (value < 0) { window.parent.postMessage({ type: "bet", amount: Math.abs(value) }, "*"); }
      betStatusInfo[2].textContent =
        (value < 0 ? '- ' : '') + '$Pc ' + Math.abs(value).toLocaleString('de-DE');
      lastBalance = null;
    }
    hideStandardButtons();
    document.querySelectorAll('.scoreInfo').forEach((el) => {
      el.style.boxShadow = 'none';
    });
    showPostRoundButtons();
    document.querySelector('#deckQuantity').style.pointerEvents = 'all';
    document.querySelector('#deckQuantity').style.filter = 'none';
    updateUndoBtnState();
  }, 3700);
}

function duplicateChips(index, type) {
  const array = getZoneChips(index, type);
  if (!array.length) return;
  const betName = ['betZone1', 'betZone2', 'betZone3'][index];
  array.forEach((chip, i) => {
    const value = +chip.dataset.value;
    const newChip = document.createElement('div');
    newChip.classList.add('tableChip');
    newChip.dataset.value = value;
    newChip.style.backgroundImage = `url(${chipImg(value)})`;
    newChip.style.top = chip.style.top;
    newChip.style.right = chip.style.right;
    newChip.style.zIndex = 2000 + i;
    game.appendChild(newChip);
    array.push(newChip);
  });
  normalizeZone(index, type);
}

function clearTable() {
  setTimeout(() => playSound('removeCards'), 600);
  const allCards = document.querySelectorAll('.card.cardEnd');
  allCards.forEach((card, i) => {
    const zone = Object.keys(betZoneInfo).find((z) =>
      card.classList.contains(z)
    );
    if (!zone) return;
    const baseRight = betZoneInfo[zone].right;
    setTimeout(() => (card.style.right = baseRight + '%'), 50);
    card.classList.remove('flipped');
    if (card.classList && card.classList.contains('doubleTilt')) {
      card.classList.remove('doubleTilt');
      card.style.transform = 'perspective(12vh) rotateX(10deg) scale(1)';
    }
    card.style.filter = 'brightness(1)';
    setTimeout(() => {
      card.style.top = '1.8%';
      card.style.right = '67.8%';
      card.style.transform =
        'rotateX(36deg) rotateZ(-34deg) rotateY(3deg) scale(0.74) skew(-2deg, 6deg)';
      card.addEventListener('transitionend', () => card.remove(), {
        once: true,
      });
    }, 600 + i * 50);
  });
}

function getZoneChips(index, type = 'main') {
  if (type === 'pair') return zonePairsChips[index];
  if (type === 'plus') return zonePlus21Chips[index];
  if (type === 'royal') return zoneRoyalChips[index];
  if (type === 'super7') return zoneSuperSevenChips[index];
  if (type === 'split') return zoneSplitChips[index];
  if (type === 'insurance') return zoneInsuranceChips[index];
  return zoneChips[index];
}

function repositionChips(zoneChips, top) {
  zoneChips.forEach((chip, i) => {
    chip.style.top = top - i * 0.5 + '%';
  });
}

function createChip(value, index, type = 'main') {
  const zone = getZoneChips(index, type);
  const chip = document.createElement('div');
  chip.classList.add('tableChip');
  chip.dataset.value = value;
  chip.style.backgroundImage = `url(${chipImg(value)})`;
  const betName =
    index === 0 ? 'betZone1' : index === 1 ? 'betZone2' : 'betZone3';
  const [chipTop, chipRight] =
    type === 'pair'
      ? betZoneInfo[betName].pairChipPositions
      : type === 'plus'
      ? betZoneInfo[betName].plus21ChipPositions
      : type === 'royal'
      ? betZoneInfo[betName].royalChipPositions
      : type === 'super7'
      ? betZoneInfo[betName].superSevenChipPositions
      : betZoneInfo[betName].chipPositions;
  chip.style.top = chipTop + '%';
  chip.style.right = chipRight + '%';
  game.appendChild(chip);
  zone.push(chip);
  checkMerge(value, index, type);
  normalizeZone(index, type);
  zone.forEach((c) => (c.style.animation = 'none'));
  setTimeout(() => {
    const lastChip = zone[zone.length - 1];
    if (lastChip) lastChip.style.animation = '';
  }, 0);
}

function checkMerge(value, index, type = 'main') {
  const zone = getZoneChips(index, type);
  const rule = upgradeRules[value];
  if (!rule) return;
  const same = zone.filter((chip) => +chip.dataset.value === value);
  if (same.length >= rule.count) {
    same.slice(0, rule.count).forEach((chip) => {
      chip.remove();
      zone.splice(zone.indexOf(chip), 1);
    });
    setTimeout(() => {
      createChip(rule.next, index, type);
      const betName =
        index === 0 ? 'betZone1' : index === 1 ? 'betZone2' : 'betZone3';
      const [chipTop] =
        type === 'pair'
          ? betZoneInfo[betName].pairChipPositions
          : type === 'plus'
          ? betZoneInfo[betName].plus21ChipPositions
          : type === 'royal'
          ? betZoneInfo[betName].royalChipPositions
          : type === 'super7'
          ? betZoneInfo[betName].superSevenChipPositions
          : betZoneInfo[betName].chipPositions;
      repositionChips(zone, chipTop);
    }, 0);
  }
}

function normalizeZone(index, type = 'main', customTotal = null) {
  const zone = getZoneChips(index, type);
  let total =
    customTotal !== null
      ? customTotal
      : zone.reduce((sum, chip) => sum + Number(chip.dataset.value), 0);
  zone.forEach((chip) => chip.remove());
  zone.length = 0;
  const denoms = [1000, 100, 25, 10, 5, 1];
  const betName =
    index === 0 ? 'betZone1' : index === 1 ? 'betZone2' : 'betZone3';
  let [chipTop, chipRight] =
    type === 'pair'
      ? betZoneInfo[betName].pairChipPositions
      : type === 'plus'
      ? betZoneInfo[betName].plus21ChipPositions
      : type === 'royal'
      ? betZoneInfo[betName].royalChipPositions
      : type === 'super7'
      ? betZoneInfo[betName].superSevenChipPositions
      : type === 'insurance'
      ? betZoneInfo[betName].insuranceChipPositions
      : betZoneInfo[betName].chipPositions;
  if (type === 'split') chipRight -= 2;
  try {
    if (
      type === 'main' &&
      Array.isArray(zoneSplitChips) &&
      zoneSplitChips[index] &&
      zoneSplitChips[index].length > 0
    )
      chipRight += 2;
  } catch (e) {
    /* no-op */
  }
  for (const d of denoms) {
    const count = Math.floor(total / d);
    for (let i = 0; i < count; i++) {
      const chip = document.createElement('div');
      chip.classList.add('tableChip');
      chip.dataset.value = d;
      chip.style.backgroundImage = `url(${chipImg(d)})`;
      chip.style.top = chipTop + '%';
      chip.style.right = chipRight + '%';
      game.appendChild(chip);
      zone.push(chip);
    }
    total -= count * d;
  }
  repositionChips(zone, chipTop);
}

function splitChips(activeZone) {
  if (!activeZone) return;
  const index =
    activeZone === 'betZone1' ? 0 : activeZone === 'betZone2' ? 1 : 2;
  const originals = zoneChips[index];
  const splitArray = zoneSplitChips[index];
  if (!originals?.length) return;
  const betName =
    index === 0 ? 'betZone1' : index === 1 ? 'betZone2' : 'betZone3';
  const [chipTop, chipRight] = betZoneInfo[betName].chipPositions;
  const createDelayBase = originals.length * 90;
  originals.forEach((chip, i) => {
    const currentRight = parseFloat(chip.style.right) || chipRight;
    chip.style.transition = 'right 220ms ease, top 220ms ease';
    chip.style.zIndex = 1000 + i;
    setTimeout(() => {
      chip.style.right = currentRight + 2 + '%';
    }, i * 80);
    const value = +chip.dataset.value;
    setTimeout(() => {
      const newChip = document.createElement('div');
      newChip.classList.add('tableChip');
      newChip.dataset.value = value;
      newChip.style.backgroundImage = `url(${chipImg(value)})`;
      newChip.style.top = chipTop + '%';
      newChip.style.right = chipRight - 2 + '%';
      newChip.style.zIndex = 2000 + i;
      game.appendChild(newChip);
      splitArray.push(newChip);
      setTimeout(() => (newChip.style.animation = ''), 20);
      setTimeout(() => repositionChips(splitArray, chipTop), 160);
    }, createDelayBase + i * 120);
  });
  const totalWait = createDelayBase + originals.length * 120 + 200;
  setTimeout(() => {
    repositionChips(originals, chipTop);
    repositionChips(splitArray, chipTop);
  }, totalWait);
}

function double() {
  if (!activeZone) return;
  if (playerInfo.balance < betZoneInfo[activeZone].bet) {
    notification('NOT ENOUGH MONEY');
    return;
  }
  function resolveZone(zone) {
    const splitMap = {
      splitZone1: { array: zoneChips[0], betZone: 'betZone1', offset: +2 },
      splitZone2: { array: zoneSplitChips[0], betZone: 'betZone1', offset: -2 },
      splitZone3: { array: zoneChips[1], betZone: 'betZone2', offset: +2 },
      splitZone4: { array: zoneSplitChips[1], betZone: 'betZone2', offset: -2 },
      splitZone5: { array: zoneChips[2], betZone: 'betZone3', offset: +2 },
      splitZone6: { array: zoneSplitChips[2], betZone: 'betZone3', offset: -2 },
    };
    if (zone.startsWith('betZone')) {
      const idx = parseInt(zone.replace('betZone', ''), 10) - 1;
      return { array: zoneChips[idx], betZone: zone, offset: 0 };
    }
    return splitMap[zone] || null;
  }
  const zone = resolveZone(activeZone);
  if (!zone) return;
  const { array, betZone, offset } = zone;
  array.forEach((chip, i) => {
    setTimeout(() => {
      chip.style.transition = 'transform 200ms ease, opacity 200ms ease';
      chip.style.transform = 'scale(0)';
      chip.style.opacity = '0';
      setTimeout(() => chip.remove(), 220);
    }, i * 50);
  });
  array.length = 0;
  const betTarget = betZoneInfo[activeZone] ?? betZoneInfo[betZone];
  playerInfo.balance -= betTarget.bet;
  playerInfo.totalBet += betTarget.bet;
  betTarget.bet *= 2;
  let total = betTarget.bet;
  const denoms = [1000, 100, 25, 10, 5, 1];
  const newChips = denoms.flatMap((d) => {
    const count = Math.floor(total / d);
    total -= count * d;
    return Array(count).fill(d);
  });
  let [chipTop, chipRight] = betZoneInfo[betZone].chipPositions;
  chipRight += offset;
  newChips.forEach((value, i) => {
    setTimeout(() => {
      const chip = document.createElement('div');
      chip.classList.add('tableChip');
      chip.dataset.value = value;
      chip.style.backgroundImage = `url(${chipImg(value)})`;
      chip.style.top = chipTop + '%';
      chip.style.right = chipRight + '%';
      chip.style.transform = 'scale(0)';
      chip.style.opacity = '0';
      chip.style.zIndex = 3000 + i;
      game.appendChild(chip);
      array.push(chip);
      playSound('chipPut');
      setTimeout(() => {
        chip.style.transition = 'transform 220ms ease, opacity 220ms ease';
        chip.style.transform = 'scale(1)';
        chip.style.opacity = '1';
      }, 20);
      setTimeout(() => repositionChips(array, chipTop), 160);
    }, i * 120);
  });
  if (betTarget.scoreZone) {
    betTarget.scoreZone.textContent =
      '$Pc ' + betTarget.bet.toLocaleString('de-DE');
    betStatusInfo[1].textContent =
      '$Pc ' + playerInfo.totalBet.toLocaleString('de-DE');
    betStatusInfo[0].textContent =
      '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
  }
  if (activeZone) {
    const { top, right } = betZoneInfo[activeZone];
    const existingCards = document.querySelectorAll(
      `.card.cardEnd.${activeZone}`
    );
    dealCard(activeZone, top, right - existingCards.length, true, true);
    const zoneForNotif = activeZone;
    setTimeout(() => {
      const total = betZoneInfo[zoneForNotif].score;
      if (total === 21) {
        createBetNotif(zoneForNotif, '21');
      } else if (total > 21) {
        createBetNotif(zoneForNotif, 'BUST');
      }
    }, 700);
    setTimeout(() => {
      stand();
    }, 900);
  }
}

function createChipWithFlight(value, index, type = 'main') {
  canBet = false;
  const zone = getZoneChips(index, type),
    isFirst = zone.length === 0;
  const betName = ['betZone1', 'betZone2', 'betZone3'][index];
  const key =
    {
      pair: 'pairChipPositions',
      plus: 'plus21ChipPositions',
      royal: 'royalChipPositions',
      super7: 'superSevenChipPositions',
    }[type] || 'chipPositions';
  const [baseTop, baseRight] = betZoneInfo[betName][key];
  const chipTop = baseTop - zone.length * 1,
    chipRight = baseRight;
  const start = chipSelectPositions[chipValues.indexOf(value)] || {
    top: 67,
    right: 0,
  };
  const chip = document.createElement('div');
  chip.classList.add('tableChip');
  chip.dataset.value = value;
  const css = (el, o) => Object.assign(el.style, o),
    T =
      'top 300ms ease, right 300ms ease, transform 300ms ease, opacity 300ms ease';
  css(chip, {
    backgroundImage: `url(${chipImg(value)})`,
    top: start.top + '%',
    right: start.right + '%',
    transition: T,
    willChange: 'top, right, transform',
    zIndex: 4000,
  });
  game.appendChild(chip);
  chip.getBoundingClientRect();
  requestAnimationFrame(() => {
    css(chip, { top: chipTop + '%', right: chipRight + '%' });
    const ch = chips[chipIndex];
    css(ch, {
      transition: T + ', width 300ms ease, height 300ms ease',
      right: chipRight + '%',
      top: chipTop + '%',
      width: '4vh',
      height: '3.48vh',
      pointerEvents: 'none',
    });
  });
  let finished = false;
  const finishFlight = () => {
    if (finished) return;
    finished = true;
    const ch = chips[chipIndex];
    css(ch, {
      transition: 'transform 0.1s ease-in-out',
      right: start.right + '%',
      top: start.top + '%',
      width: '7vh',
      height: '6.1vh',
      pointerEvents: 'all',
    });
    zone.push(chip);
    checkMerge(value, index, type);
    normalizeZone(index, type);
    playSound(isFirst ? 'firstChip' : 'chipPut');
    const z = getZoneChips(index, type);
    z.forEach((c) => (c.style.animation = 'none'));
    setTimeout(() => {
      const last = z[z.length - 1];
      if (last) last.style.animation = '';
    }, 0);
    setTimeout(() => {
      canBet = true;
    }, 100);
  };
  const onEnd = (e) => {
    if (e.propertyName === 'top' || e.propertyName === 'right') {
      chip.removeEventListener('transitionend', onEnd);
      finishFlight();
    }
  };
  chip.addEventListener('transitionend', onEnd);
  setTimeout(() => {
    finishFlight();
    checkChipAvailable();
  }, 400);
}

function checkBets() {
  const PAYOUTS = {
      pairs: { mixed: 5, colored: 12, perfect: 25 },
      royal: { royalMatch: 25, suited: 5 },
      superSeven: {
        oneSeven: 3,
        twoSevenUnsuited: 50,
        twoSevenSuited: 100,
        threeSevensUnsuited: 500,
        threeSevensSuited: 5000,
      },
      plus21: {
        flush: 5,
        straight: 10,
        trips: 30,
        straightFlush: 40,
        suitedTrips: 100,
      },
    },
    toDE = (n) => n.toLocaleString('de-DE'),
    cardStr = (c) => (c ? `${c[0]}:${c[1]}` : null),
    allEqual = (a) => a.length > 0 && a.every((v) => v === a[0]),
    rankToNums = (r) => {
      if (typeof r === 'number') return [r];
      if (r === 'A') return [1, 14];
      if (r === 'J') return [11];
      if (r === 'Q') return [12];
      if (r === 'K') return [13];
      const p = parseInt(r, 10);
      return Number.isNaN(p) ? [] : [p];
    },
    isStraight = (ranks) => {
      const cand = ranks.map(rankToNums);
      let combos = [[]];
      for (const opts of cand) {
        const next = [];
        for (const v of opts) for (const c of combos) next.push([...c, v]);
        combos = next;
      }
      return combos.some((c) => {
        c.sort((a, b) => a - b);
        return c[0] + 1 === c[1] && c[1] + 1 === c[2];
      });
    },
    UI = {
      pairs: { selector: '.pairInfo', normalize: 'pair', send: 'pairs' },
      plus21: { selector: '.plus21Info', normalize: 'plus', send: 'plus21' },
      royal: { selector: '.royalInfo', normalize: 'royal', send: 'royal' },
      superSeven: {
        selector: '.superSevenInfo',
        normalize: 'super7',
        send: 'super7',
      },
    },
    RESOLVERS = {
      pairs: ({ c1, c2, stake }) => {
        let payout = 0,
          detail = 'NO PAIR';
        if (c1 && c2 && c1[1] === c2[1]) {
          if (c1[0] === c2[0]) {
            payout = stake * PAYOUTS.pairs.perfect;
            detail = 'PERFECT PAIR (same rank & same suit)';
          } else {
            const color = (s) => (s === 's1' || s === 's4' ? 'RED' : 'BLACK');
            if (color(c1[0]) === color(c2[0])) {
              payout = stake * PAYOUTS.pairs.colored;
              detail = 'COLORED PAIR (same color)';
            } else {
              payout = stake * PAYOUTS.pairs.mixed;
              detail = 'MIXED PAIR (different color)';
            }
          }
        }
        return { payout, detail };
      },
      royal: ({ c1, c2, stake }) => {
        let payout = 0,
          detail = 'NO ROYAL/SUITED';
        if (c1 && c2) {
          const ranks = [c1[1], c2[1]],
            suited = c1[0] === c2[0],
            hasKQ = ranks.includes('K') && ranks.includes('Q');
          if (hasKQ && suited) {
            payout = stake * PAYOUTS.royal.royalMatch;
            detail = 'ROYAL MATCH (K+Q suited)';
          } else if (suited) {
            payout = stake * PAYOUTS.royal.suited;
            detail = 'SUITED (two-card suited)';
          }
        }
        return { payout, detail };
      },
      superSeven: ({ cards, dealerUp, stake }) => {
        let payout = 0,
          detail = 'NO SEVENS';
        const allCards = [...(cards || []), ...(dealerUp ? [dealerUp] : [])],
          sevenCards = allCards.filter(
            (c) => Number(c[1]) === 7 || c[1] === '7'
          );
        if (sevenCards.length === 1) {
          payout = stake * PAYOUTS.superSeven.oneSeven;
          detail = 'ONE SEVEN';
        } else if (sevenCards.length === 2) {
          if (sevenCards[0][0] === sevenCards[1][0]) {
            payout = stake * PAYOUTS.superSeven.twoSevenSuited;
            detail = 'TWO SEVENS SUITED';
          } else {
            payout = stake * PAYOUTS.superSeven.twoSevenUnsuited;
            detail = 'TWO SEVENS UNSUITED';
          }
        } else if (sevenCards.length >= 3) {
          const suits = sevenCards.map((c) => c[0]);
          if (allEqual(suits)) {
            payout = stake * PAYOUTS.superSeven.threeSevensSuited;
            detail = `THREE SEVENS SUITED (${sevenCards.length})`;
          } else {
            payout = stake * PAYOUTS.superSeven.threeSevensUnsuited;
            detail = `THREE SEVENS UNSUITED (${sevenCards.length})`;
          }
        }
        return { payout, detail };
      },
      plus21: ({ c1, c2, dealerUp, stake }) => {
        let payout = 0,
          detail = 'NO COMBO';
        if (!(c1 && c2 && dealerUp))
          return {
            payout,
            detail: 'not enough cards (need player 2 + dealer up)',
          };
        const trio = [c1, c2, dealerUp],
          ranks = trio.map((c) => c[1]),
          suits = trio.map((c) => c[0]),
          threeKind = ranks.every((r) => r === ranks[0]),
          flush = allEqual(suits),
          straight = isStraight(ranks);
        if (threeKind && flush) {
          payout = stake * PAYOUTS.plus21.suitedTrips;
          detail = 'SUITED TRIPS (three of a kind + same suit)';
        } else if (threeKind) {
          payout = stake * PAYOUTS.plus21.trips;
          detail = 'TRIPS (three of a kind)';
        } else if (straight && flush) {
          payout = stake * PAYOUTS.plus21.straightFlush;
          detail = 'STRAIGHT FLUSH (3-card suited straight)';
        } else if (straight) {
          payout = stake * PAYOUTS.plus21.straight;
          detail = 'STRAIGHT (3-card)';
        } else if (flush) {
          payout = stake * PAYOUTS.plus21.flush;
          detail = 'FLUSH (3-card same suit)';
        }
        return { payout, detail };
      },
    };

  const dealerUp = betZoneInfo.dealerZone?.suitCardsScore?.[0] || null,
    ZONES = ['betZone1', 'betZone2', 'betZone3'];

  ZONES.forEach((zoneName, idx) => {
    const z = betZoneInfo[zoneName];
    if (!z) return;
    const totalSideBets =
      (z.pairsBet || 0) +
      (z.plus21Bet || 0) +
      (z.royalBet || 0) +
      (z.superSevenBet || 0);
    if (!z.status && !totalSideBets) return;

    const c1 = z.suitCardsScore?.[0] || null,
      c2 = z.suitCardsScore?.[1] || null;

    const writeResult = (kind, stake, payout, detail) => {
      const { selector, normalize, send } = UI[kind],
        els = document.querySelectorAll(selector),
        el = els && els[idx],
        multiplier = stake > 0 ? payout / stake : 0,
        multStr = Number.isFinite(multiplier)
          ? Number.isInteger(multiplier)
            ? multiplier
            : multiplier.toFixed(2)
          : '0';

      if (el) {
        if (payout > 0) {
          el.style.boxShadow = '0vh 0vh 1vh 0vh green inset';
          el.innerHTML =
            '$Pc ' + toDE(stake) + ' × ' + multStr + '<br>+$' + toDE(payout);

          playerInfo.balance += payout + stake;
          normalizeZone(idx, normalize, stake + payout);
        } else {
          el.style.boxShadow = '0vh 0vh 1vh 0vh red inset';
          el.textContent = toDE(stake) + ' $Pc';
        }
      } else {
        if (payout > 0) {
          playerInfo.balance += payout + stake;
          normalizeZone(idx, normalize, stake + payout);
        } else {
          //
        }
      }

      if (send)
        setTimeout(() => {
          sendChips(send, idx, payout > 0 ? 'player' : 'dealer');
          betStatusInfo[0].textContent = toDE(playerInfo.balance) + ' $Pc';
        }, 500);
    };

    for (const [kind, stake] of [
      ['pairs', z.pairsBet],
      ['royal', z.royalBet],
      ['superSeven', z.superSevenBet],
      ['plus21', z.plus21Bet],
    ]) {
      if (stake > 0) {
        const { payout, detail } = RESOLVERS[kind]({
          c1,
          c2,
          dealerUp,
          stake,
          cards: z.suitCardsScore || [],
        });
        writeResult(kind, stake, payout, detail);
      }
    }
  });

  ZONES.forEach((n) => {
    const z = betZoneInfo[n];
    if (z) z.pairsBet = z.superSevenBet = z.royalBet = z.plus21Bet = 0;
  });
}

function queueChipSendSound(n) {
  __chipSendBatchCount += n;
  if (__chipSendSoundTimer) return;
  __chipSendSoundTimer = setTimeout(() => {
    playSound(__chipSendBatchCount > 1 ? 'lotChips' : 'chipPut');
    __chipSendBatchCount = 0;
    __chipSendSoundTimer = null;
  }, 80);
}

function sendChips(type, index, direction) {
  const map = {
    main: zoneChips,
    insurance: zoneInsuranceChips,
    pairs: zonePairsChips,
    split: zoneSplitChips,
    plus21: zonePlus21Chips,
    royal: zoneRoyalChips,
    super7: zoneSuperSevenChips,
    surrender: zoneSurrenderChips,
  };
  const chipsArray = map[type]?.[index];
  if (!chipsArray || !chipsArray.length) return;
  queueChipSendSound(chipsArray.length);
  const dealer = direction === 'dealer',
    targetTop = dealer ? 0 : 92,
    targetRight = dealer ? 48 : 23.8;

  chipsArray.forEach((chip, i) => {
    chip.style.transition =
      'top 500ms ease, right 500ms ease, opacity 1000ms ease';
    chip.style.zIndex = 5000 + i;
    const delay = (chipsArray.length - 1 - i) * 100;
    setTimeout(() => {
      chip.style.top = targetTop + '%';
      chip.style.right = targetRight + '%';
      chip.style.opacity = '0';
    }, delay);
    const onEnd = (e) => {
      if (e.propertyName === 'opacity') {
        chip.remove();
        chip.removeEventListener('transitionend', onEnd);
      }
    };
    chip.addEventListener('transitionend', onEnd);
    setTimeout(() => {
      if (chip.parentNode) chip.remove();
    }, delay + 600);
  });
  chipsArray.length = 0;
}

function surrender() {
  if (!activeZone) return;
  const bet = betZoneInfo[activeZone].bet,
    surrenderAmount = Math.floor(bet / 2);
  let index, betName;
  if (
    activeZone === 'betZone1' ||
    activeZone === 'splitZone1' ||
    activeZone === 'splitZone2'
  ) {
    index = 0;
    betName = 'betZone1';
  } else if (
    activeZone === 'betZone2' ||
    activeZone === 'splitZone3' ||
    activeZone === 'splitZone4'
  ) {
    index = 1;
    betName = 'betZone2';
  } else if (
    activeZone === 'betZone3' ||
    activeZone === 'splitZone5' ||
    activeZone === 'splitZone6'
  ) {
    index = 2;
    betName = 'betZone3';
  } else return;

  const isSplit = activeZone.startsWith('splitZone');
  let isFirst = true;
  if (isSplit) {
    const num = parseInt(activeZone.replace('splitZone', ''));
    isFirst = num % 2 === 1;
  }

  const originals = isSplit
    ? isFirst
      ? zoneChips[index]
      : zoneSplitChips[index]
    : zoneChips[index];
  const surrenderIndexPlayer = index * 2 + (isFirst ? 0 : 1),
    surrenderIndexDealer = index * 2 + (isFirst ? 1 : 0);
  const surrenderArrayPlayer = zoneSurrenderChips[surrenderIndexPlayer],
    surrenderArrayDealer = zoneSurrenderChips[surrenderIndexDealer];
  const [chipTop, chipRight] = betZoneInfo[betName].chipPositions;

  originals.forEach((chip, i) => {
    setTimeout(() => {
      chip.style.transition = 'transform 200ms ease, opacity 200ms ease';
      chip.style.transform = 'scale(0)';
      chip.style.opacity = '0';
      setTimeout(() => chip.remove(), 220);
    }, i * 50);
  });
  originals.length = 0;

  let total = surrenderAmount;
  const denoms = [1000, 100, 25, 10, 5, 1],
    newValues = [];
  for (const d of denoms) {
    const count = Math.floor(total / d);
    for (let i = 0; i < count; i++) newValues.push(d);
    total -= count * d;
  }

  const left =
    activeZone === 'splitZone1' ||
    activeZone === 'splitZone3' ||
    activeZone === 'splitZone5';
  const right =
    activeZone === 'splitZone2' ||
    activeZone === 'splitZone4' ||
    activeZone === 'splitZone6';

  newValues.forEach((value, i) => {
    setTimeout(() => {
      const c = document.createElement('div');
      c.classList.add('tableChip');
      c.dataset.value = value;
      c.style.backgroundImage = `url(${chipImg(value)})`;
      c.style.top = chipTop + '%';
      c.style.right =
        (left ? chipRight + 4 : right ? chipRight - 4 : chipRight + 2) + '%';
      c.style.zIndex = 1000 + i;
      game.appendChild(c);
      surrenderArrayDealer.push(c);
      setTimeout(() => repositionChips(surrenderArrayDealer, chipTop), 160);
    }, i * 50);
  });
  newValues.forEach((value, i) => {
    setTimeout(() => {
      const c = document.createElement('div');
      c.classList.add('tableChip');
      c.dataset.value = value;
      c.style.backgroundImage = `url(${chipImg(value)})`;
      c.style.top = chipTop + '%';
      c.style.right =
        (left ? chipRight + 1.5 : right ? chipRight - 1.5 : chipRight - 2) +
        '%';
      c.style.zIndex = 2000 + i;
      game.appendChild(c);
      surrenderArrayPlayer.push(c);
      setTimeout(() => {
        repositionChips(surrenderArrayPlayer, chipTop);
        c.style.animation = '';
      }, 20);
    }, i * 50);
  });

  const totalWait = newValues.length * 50 + 300;
  setTimeout(() => {
    sendChips(
      'surrender',
      surrenderIndexDealer,
      'dealer',
      surrenderArrayDealer
    );
    sendChips(
      'surrender',
      surrenderIndexPlayer,
      'player',
      surrenderArrayPlayer
    );
    surrenderArrayDealer.length = 0;
    surrenderArrayPlayer.length = 0;
    createBetNotif(activeZone, 'Surrender');
    stand();
  }, totalWait);
  playerInfo.balance += surrenderAmount;
  betStatusInfo[0].textContent =
    '$Pc ' + playerInfo.balance.toLocaleString('de-DE');

  betZoneInfo[activeZone].bet = 0;
  if (betZoneInfo[activeZone].scoreZone)
    betZoneInfo[activeZone].scoreZone.textContent = '0 $Pc';
  betZoneInfo[activeZone].status = false;
}

function insurance() {
  if (!activeZone) return;
  if (betZoneInfo[activeZone].bet < 2) {
    notification('CANT INSURANCE 1$Pc MIN');
    return;
  }
  const betName = activeZone,
    index = ['betZone1', 'betZone2', 'betZone3'].indexOf(betName);
  if (index === -1) return;
  const betTarget = betZoneInfo[activeZone],
    insuranceAmount = Math.floor(betTarget.bet / 2);
  if (insuranceAmount > playerInfo.balance) {
    notification('NOT ENOUGH MONEY');
    return;
  }

  betTarget.insuranceBet += insuranceAmount;
  playerInfo.totalBet += insuranceAmount;
  playerInfo.balance -= insuranceAmount;
  betStatusInfo[1].textContent =
    '$Pc ' + playerInfo.totalBet.toLocaleString('de-DE');
  betStatusInfo[0].textContent =
    '$Pc ' + playerInfo.balance.toLocaleString('de-DE');

  let total = insuranceAmount;
  const denoms = [1000, 100, 25, 10, 5, 1],
    newValues = [];
  for (const d of denoms) {
    const count = Math.floor(total / d);
    for (let i = 0; i < count; i++) newValues.push(d);
    total -= count * d;
  }

  const [chipTop, chipRight] = betZoneInfo[betName].insuranceChipPositions;
  newValues.forEach((value, i) => {
    setTimeout(() => {
      const c = document.createElement('div');
      c.classList.add('tableChip');
      c.dataset.value = value;
      c.style.backgroundImage = `url(${chipImg(value)})`;
      c.style.top = chipTop + '%';
      c.style.right = chipRight + '%';
      c.style.zIndex = 2000 + i;
      game.appendChild(c);
      zoneInsuranceChips[index].push(c);
      setTimeout(
        () => repositionChips(zoneInsuranceChips[index], chipTop),
        160
      );
    }, i * 50);
  });
  stand();
}

function notification(notifText) {
  notifWindow.textContent = notifText;
  notifWindow.style.transition = 'none';
  notifWindow.style.transform = 'translate(-50%, -100%)';
  void notifWindow.offsetHeight;
  notifWindow.style.transition = '';
  notifWindow.style.transform = 'translate(-50%, 0%)';
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    notifWindow.style.transform = 'translate(-50%, -100%)';
  }, 3000);
}

function checkButtons() {
  if (dealerStatus) return;
  if (!betZoneInfo.dealerZone.suitCardsScore[0] || !activeZone) return;
  if (aceSplitInProgress) {
    hitBtn.style.display = 'none';
    standBtn.style.display = 'none';
    splitBtn.style.display = 'none';
    doubleBtn.style.display = 'none';
    surrenderBtn.style.display = 'none';
    insuranceBtn.style.display = 'none';
    noInsuranceBtn.style.display = 'none';
    evenMoneyBtn.style.display = 'none';
    declineEvenMoneyBtn.style.display = 'none';
    return;
  }
  if (betZoneInfo.dealerZone.suitCardsScore[0][1] === 'A' && !afterInsurance) {
    const playerZone = betZoneInfo[activeZone];
    const isNaturalHand = String(activeZone).startsWith('betZone');
    const playerBlackjack =
      isNaturalHand &&
      playerZone.score === 21 &&
      playerZone.suitCards.length === 2;

    if (playerBlackjack) {
      evenMoneyBtn.style.display = 'flex';
      declineEvenMoneyBtn.style.display = 'flex';
    } else {
      insuranceActive = true;
      insuranceBtn.style.display = 'flex';
      noInsuranceBtn.style.display = 'flex';
    }
    splitBtn.style.display = 'none';
    doubleBtn.style.display = 'none';
    surrenderBtn.style.display = 'none';
    hitBtn.style.display = 'none';
    standBtn.style.display = 'none';
    return;
  } else {
    insuranceBtn.style.display = 'none';
    noInsuranceBtn.style.display = 'none';
    evenMoneyBtn.style.display = 'none';
    declineEvenMoneyBtn.style.display = 'none';
  }
  hitBtn.style.display = 'flex';
  standBtn.style.display = 'flex';
  surrenderBtn.style.display = 'flex';
  doubleBtn.style.display = 'flex';
  splitBtn.style.display = 'none';
  splitBtn.classList.remove('inactiveBtn');
  if (betZoneInfo[activeZone].suitCards.length > 2) {
    splitBtn.classList.add('inactiveBtn');
    doubleBtn.classList.add('inactiveBtn');
    surrenderBtn.classList.add('inactiveBtn');
  }
  if (betZoneInfo[activeZone].score == 21) {
    const isSplitHand = String(activeZone).startsWith('splitZone');
    const isTwoCard = betZoneInfo[activeZone].suitCards.length === 2;
    if (!isTwoCard || isSplitHand) {
      createBetNotif(activeZone, '21');
    }
    stand();
    return;
  }
  if (betZoneInfo[activeZone].score > 21) {
    createBetNotif(activeZone, 'BUST');
    stand();
    return;
  }
  const isBaseZone = String(activeZone).startsWith('betZone');
  if (isBaseZone && betZoneInfo[activeZone].suitCards.length === 2) {
    const [c1, c2] = betZoneInfo[activeZone].suitCards;
    const canAfford = playerInfo.balance >= (betZoneInfo[activeZone].bet || 0);
    if (c1 === c2 && canAfford) {
      splitBtn.style.display = 'flex';
      splitBtn.classList.remove('inactiveBtn');
    }
  }
}

function evenMoney() {
  const z = betZoneInfo[activeZone],
    bet = z.bet;
  playerInfo.balance += bet * 2;
  betStatusInfo[0].textContent =
    '$Pc ' + playerInfo.balance.toLocaleString('de-DE');

  let index, chipType;
  if (activeZone.startsWith('betZone')) {
    index = parseInt(activeZone.slice(7), 10) - 1;
    chipType = 'main';
  } else if (activeZone.startsWith('splitZone')) {
    const num = parseInt(activeZone.slice(9), 10);
    index = Math.floor((num - 1) / 2);
    chipType = num % 2 ? 'main' : 'split';
  }

  normalizeZone(index, chipType, bet * 2);
  sendChips(chipType, index, 'player');

  z.status = false;
  z.bet = 0;
  if (z.scoreZone) z.scoreZone.textContent = '0 $Pc';

  evenMoneyBtn.style.display = 'none';
  declineEvenMoneyBtn.style.display = 'none';
  stand();
}

function createBetNotif(zone, text) {
  let n = document.querySelector(`.betNotif[data-zone="${zone}"]`);
  const pos = betZoneInfo[zone] || {},
    top = (pos.top !== undefined ? pos.top : 0) + 3,
    right = (pos.right !== undefined ? pos.right : 0) - 2.2;
  if (!n) {
    n = document.createElement('div');
    n.classList.add('betNotif');
    n.dataset.zone = zone;
    game.appendChild(n);
  }
  n.style.top = top + '%';
  n.style.right = right + '%';
  n.textContent = text;
  const up = String(text || '').toUpperCase(),
    isP = zone !== 'dealerZone';
  if (isP && up === 'BLACKJACK') {
    n.style.color = 'gold';
    n.style.textShadow = '0 0 0.5vh rgba(0,0,0,0.6)';
  } else if (isP && (up === 'BUST' || up === 'LOSE')) {
    n.style.boxShadow = 'red 0vh 0vh 1vh 0vh inset';
  } else if (isP && up === 'WIN') {
    n.style.boxShadow = 'green 0vh 0vh 1vh 0vh inset';
  } else {
    n.style.color = '';
    n.style.webkitTextStroke = '';
    n.style.textShadow = '';
  }
  const s =
    betZoneInfo[zone] && betZoneInfo[zone].scoreZone
      ? betZoneInfo[zone].scoreZone
      : null;
  if (s) {
    if (up === 'BLACKJACK' || up === 'WIN')
      s.style.boxShadow = 'green 0vh 0vh 1vh 0vh inset';
    else if (up === 'LOSE' || up === 'BUST')
      s.style.boxShadow = 'red 0vh 0vh 1vh 0vh inset';
    else if (up === 'PUSH' || up === 'SURRENDER' || up === '21')
      s.style.boxShadow = 'none';
  }
}

function replaceZoneChips(zoneId, newTotal, typeHint = null) {
  const make = (idx, t, splitN = null) => ({
    index: idx,
    type: t || 'main',
    betZoneName: `betZone${idx + 1}`,
    splitZoneName: splitN,
  });
  function resolve(id, t) {
    if (typeof id === 'number') return make(id, t, null);
    if (typeof id === 'string') {
      let m = id.match(/^betZone([1-3])$/);
      if (m) return make(Number(m[1]) - 1, t, null);
      m = id.match(/^splitZone([1-6])$/);
      if (m) {
        const n = Number(m[1]),
          idx = Math.ceil(n / 2) - 1,
          inf = n % 2 === 0 ? 'split' : 'main';
        return make(idx, t || inf, `splitZone${n}`);
      }
      if (/^[0-2]$/.test(id)) return make(Number(id), t, null);
    }
    return null;
  }
  const r = resolve(zoneId, typeHint);
  if (!r) {
    return;
  }
  const { index, type: chipType, betZoneName, splitZoneName } = r;
  const zoneArray = getZoneChips(index, chipType);
  if (!Array.isArray(zoneArray)) {
    return;
  }
  zoneArray.forEach((c) => {
    try {
      c.remove();
    } catch (e) {}
  });
  zoneArray.length = 0;
  const fieldMap = {
    main: 'bet',
    split: 'bet',
    pair: 'pairsBet',
    plus: 'plus21Bet',
    royal: 'royalBet',
    super7: 'superSevenBet',
    insurance: 'insuranceBet',
  };
  const field = fieldMap[chipType] || 'bet';
  if (betZoneInfo[betZoneName]) betZoneInfo[betZoneName][field] = newTotal;
  if (splitZoneName && betZoneInfo[splitZoneName])
    betZoneInfo[splitZoneName].bet = newTotal;
  let total = Math.max(0, Math.floor(Number(newTotal) || 0)),
    denoms = [1000, 100, 25, 10, 5, 1],
    pieces = [];
  for (const d of denoms) {
    const cnt = Math.floor(total / d);
    for (let i = 0; i < cnt; i++) pieces.push(d);
    total -= cnt * d;
  }
  pieces.forEach((v) => createChip(v, index, chipType));
  if (betZoneInfo[betZoneName] && betZoneInfo[betZoneName].scoreZone) {
    try {
      betZoneInfo[betZoneName].scoreZone.textContent =
        '$Pc ' + (betZoneInfo[betZoneName][field] || 0).toLocaleString('de-DE');
      betZoneInfo[betZoneName].scoreZone.style.opacity = 1;
    } catch (e) {}
  }
  if (typeof betStatusInfo !== 'undefined' && betStatusInfo.length >= 2) {
    betStatusInfo[1].textContent =
      '$Pc ' + (playerInfo.totalBet || 0).toLocaleString('de-DE');
    betStatusInfo[0].textContent =
      '$Pc ' + (playerInfo.balance || 0).toLocaleString('de-DE');
  }
}

function undoLastBet() {
  if (!betHistory.length) {
    updateUndoBtnState();
    return;
  }
  const { betName, type, value } = betHistory.pop(),
    map = {
      main: { prop: 'bet', sel: '.mainInfo' },
      pair: { prop: 'pairsBet', sel: '.pairInfo' },
      plus: { prop: 'plus21Bet', sel: '.plus21Info' },
      royal: { prop: 'royalBet', sel: '.royalInfo' },
      super7: { prop: 'superSevenBet', sel: '.superSevenInfo' },
      insurance: { prop: 'insuranceBet', sel: '.insuranceInfo' },
    }[type] || { prop: 'bet', sel: '.mainInfo' },
    idx = betName === 'betZone1' ? 0 : betName === 'betZone2' ? 1 : 2,
    current = betZoneInfo[betName][map.prop] || 0;
  let newTotal = current - value;
  if (newTotal < 0) newTotal = 0;
  betZoneInfo[betName][map.prop] = newTotal;
  if (map.prop === 'bet' && newTotal === 0) betZoneInfo[betName].status = false;
  if (typeof normalizeZone === 'function') normalizeZone(idx, type, newTotal);
  else if (typeof replaceZoneChips === 'function')
    replaceZoneChips(betName, newTotal, type);
  const el = document.querySelectorAll(map.sel)[idx];
  if (el) {
    if (newTotal > 0) {
      el.textContent = newTotal.toLocaleString('de-DE') + ' $Pc';
      el.style.opacity = 1;
    } else {
      el.textContent = '';
      el.style.opacity = 0;
    }
  }
  playSound('undoChip');
  playerInfo.balance += value;
  playerInfo.totalBet = Math.max(0, (playerInfo.totalBet || 0) - value);
  betStatusInfo[0].textContent =
    '$Pc ' + (playerInfo.balance || 0).toLocaleString('de-DE');
  betStatusInfo[1].textContent =
    '$Pc ' + (playerInfo.totalBet || 0).toLocaleString('de-DE');
  checkChipAvailable();
  const sumMain = BASE_ZONES.reduce(
    (acc, z) => acc + (betZoneInfo[z].bet || 0),
    0
  );
  if (sumMain <= 0 && dealBtn) dealBtn.classList.add('inactiveBtn');
  if (playerInfo.totalBet <= 0 && clearAllBtn)
    clearAllBtn.classList.add('inactiveBtn');
  updateUndoBtnState();
}

function snapshotRebet() {
  const Z = ['betZone1', 'betZone2', 'betZone3'];
  const hasAny = Z.some((z) => {
    const b = betZoneInfo[z] || {};
    return (
      (b.bet || 0) +
        (b.pairsBet || 0) +
        (b.plus21Bet || 0) +
        (b.royalBet || 0) +
        (b.superSevenBet || 0) >
      0
    );
  });
  if (!hasAny) {
    rebetSnapshot = null;
    return;
  }

  const denomsFrom = (arr) =>
    (arr || []).map((c) => Number(c.dataset?.value || 0)).filter(Boolean);
  const totals = Z.reduce((a, z) => {
    const b = betZoneInfo[z] || {};
    a[z] = {
      bet: b.bet || 0,
      pairsBet: b.pairsBet || 0,
      plus21Bet: b.plus21Bet || 0,
      royalBet: b.royalBet || 0,
      superSevenBet: b.superSevenBet || 0,
    };
    return a;
  }, {});
  const pick = (a) => [0, 1, 2].map((i) => denomsFrom(a[i]));
  const denoms = {
    main: pick(zoneChips),
    pair: pick(zonePairsChips),
    plus: pick(zonePlus21Chips),
    royal: pick(zoneRoyalChips),
    super7: pick(zoneSuperSevenChips),
  };
  const required =
    Object.values(totals).reduce(
      (s, t) =>
        s + t.bet + t.pairsBet + t.plus21Bet + t.royalBet + t.superSevenBet,
      0
    ) || 0;

  rebetSnapshot = {
    balanceAtDeal: playerInfo.balance,
    totals,
    denoms,
    required,
    ts: Date.now(),
  };
}

function rebet() {
  if (typeof gameStart !== 'undefined' && gameStart) {
    notification('FINISH THE ROUND FIRST');
    return;
  }
  if (!rebetSnapshot || rebetSnapshot.required <= 0) {
    notification('NO PREVIOUS BETS');
    return;
  }
  const need =
    REBET_CHECK_BY === 'balanceAtDeal'
      ? rebetSnapshot.balanceAtDeal
      : rebetSnapshot.required;
  if (playerInfo.balance < need) {
    notification('NOT ENOUGH MONEY');
    return;
  }

  // --- NEW: посчитаем, сколько фишек будет добавлено ---
  const countChipsToAdd = () => {
    const TYPES_TO_ADD = ['main', 'pair', 'plus', 'royal', 'super7'];
    let total = 0;
    for (let i = 0; i < 3; i++) {
      for (const t of TYPES_TO_ADD) {
        const ds = rebetSnapshot?.denoms?.[t]?.[i] || [];
        total += ds.length;
      }
    }
    return total;
  };
  const chipsWillBeAdded = countChipsToAdd();
  // ------------------------------------------------------

  const Z = ['betZone1', 'betZone2', 'betZone3'],
    TYPES = ['main', 'pair', 'plus', 'royal', 'super7', 'insurance', 'split'];

  const currentTotal = Z.reduce((acc, z) => {
    const b = betZoneInfo[z] || {};
    return (
      acc +
      (b.bet || 0) +
      (b.pairsBet || 0) +
      (b.plus21Bet || 0) +
      (b.royalBet || 0) +
      (b.superSevenBet || 0)
    );
  }, 0);

  if (currentTotal > 0) {
    playerInfo.balance += currentTotal;
    playerInfo.totalBet = Math.max(
      0,
      (playerInfo.totalBet || 0) - currentTotal
    );
  }

  for (let i = 0; i < 3; i++) {
    TYPES.forEach((t) => {
      try {
        normalizeZone(i, t, 0);
      } catch (_) {}
    });
  }

  Z.forEach((z) => {
    if (!betZoneInfo[z]) return;
    Object.assign(betZoneInfo[z], {
      bet: 0,
      pairsBet: 0,
      plus21Bet: 0,
      royalBet: 0,
      superSevenBet: 0,
      status: false,
    });
  });

  const setUIValue = (sel, idx, val) => {
    const els = document.querySelectorAll(sel);
    if (els && els[idx]) {
      els[idx].textContent = val.toLocaleString('de-DE') + ' $Pc';
      els[idx].style.opacity = val > 0 ? 1 : 0;
    }
  };

  const typeMap = {
    main: { prop: 'bet', ui: '.mainInfo' },
    pair: { prop: 'pairsBet', ui: '.pairInfo' },
    plus: { prop: 'plus21Bet', ui: '.plus21Info' },
    royal: { prop: 'royalBet', ui: '.royalInfo' },
    super7: { prop: 'superSevenBet', ui: '.superSevenInfo' },
  };

  Z.forEach((z, i) => {
    const t = rebetSnapshot.totals[z];
    if (!t) return;
    Object.entries(typeMap).forEach(([type, cfg]) => {
      const total = t[cfg.prop] || 0;
      if (total > 0) {
        betZoneInfo[z][cfg.prop] = total;
        if (type === 'main') betZoneInfo[z].status = true;
        const ds = rebetSnapshot.denoms[type]?.[i] || [];
        ds.forEach((v) => createChip(v, i, type));
        setUIValue(cfg.ui, i, total);
        ds.forEach((v) =>
          betHistory.push({ betName: z, type, value: v, timestamp: Date.now() })
        );
      } else {
        setUIValue(cfg.ui, i, 0);
      }
    });
  });

  const toCharge = rebetSnapshot.required;
  if (lastBalance === null) lastBalance = playerInfo.balance;
  playerInfo.balance -= toCharge;
  playerInfo.totalBet += toCharge;

  if (betStatusInfo && betStatusInfo.length >= 2) {
    betStatusInfo[0].textContent =
      '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
    betStatusInfo[1].textContent =
      '$Pc ' + playerInfo.totalBet.toLocaleString('de-DE');
  }
  if (dealBtn) dealBtn.classList.remove('inactiveBtn');
  if (clearAllBtn) clearAllBtn.classList.remove('inactiveBtn');

  // --- NEW: звук в зависимости от количества добавленных фишек ---
  if (chipsWillBeAdded === 1) {
    playSound('chipPut');
  } else if (chipsWillBeAdded > 1) {
    playSound('addChips');
  }
  // ---------------------------------------------------------------
}

function resetForNewRoundUI() {
  clearTable();
  deck = createDeck(currentDecks);
  Object.keys(betZoneInfo).forEach((z) => {
    if (z === 'dealerZone') return;
    const bz = betZoneInfo[z];
    Object.assign(bz, {
      score: 0,
      suitCards: [],
      suitCardsScore: [],
      status: false,
      bet: 0,
      insuranceBet: 0,
      pairsBet: 0,
      plus21Bet: 0,
      royalBet: 0,
      superSevenBet: 0,
    });
    if (bz.cardScore) {
      const cs = bz.cardScore;
      cs.textContent = '';
      cs.style.opacity = 0;
      cs.style.animation = 'none';
      cs.style.left = '';
    }
    if (bz.scoreZone) {
      const sz = bz.scoreZone;
      sz.textContent = '';
      sz.style.opacity = 0;
      sz.style.left = '';
    }
  });
  const dz = betZoneInfo.dealerZone;
  dz.score = 0;
  dz.suitCards = [];
  dz.suitCardsScore = [];
  if (dz.cardScore) {
    dz.cardScore.textContent = '';
    dz.cardScore.style.opacity = 0;
  }

  [
    zoneChips,
    zonePairsChips,
    zoneSplitChips,
    zonePlus21Chips,
    zoneRoyalChips,
    zoneSuperSevenChips,
    zoneInsuranceChips,
    zoneSurrenderChips,
  ].forEach((g) =>
    g.forEach((a) => {
      a.forEach((c) => c && c.remove && c.remove());
      a.length = 0;
    })
  );

  document
    .querySelectorAll('.pairInfo, .plus21Info, .royalInfo, .superSevenInfo')
    .forEach((el) => {
      el.textContent = '';
      el.style.boxShadow = 'none';
      el.style.opacity = 0;
    });
  document.querySelectorAll('.betNotif').forEach((el) => el.remove());

  showStandardButtons();
  dealBtn.classList.add('inactiveBtn');
  clearAllBtn.classList.add('inactiveBtn');
  undoBtn.classList.add('inactiveBtn');
}

function enableZonesAndRefreshChips() {
  tableZones.forEach((el) => {
    el.style.pointerEvents = 'all';
  });
  chips.forEach((el) => {
    el.style.pointerEvents = 'all';
  });
  checkChipAvailable();
}

if (sfxSlider) {
  sfxVolume = Math.max(0, Math.min(1, Number(sfxSlider.value) || 0.5));
  sfxSlider.addEventListener('input', () => {
    sfxVolume = Math.max(0, Math.min(1, Number(sfxSlider.value) || 0));
  });
}
//
function playSound(soundName) {
  const audio = new Audio(`src/sfx/effects/${soundName}.mp3`);
  audio.volume = sfxVolume; // <-- ключевая строка
  audio.currentTime = 0;
  audio.play();
}

function updateTimer() {
  let duration = music.duration;
  let remainingTime = duration - music.currentTime;
  let minutes = Math.floor(remainingTime / 60);
  let seconds = Math.floor(remainingTime % 60);
  minutes = isNaN(minutes) ? '00' : minutes < 10 ? '0' + minutes : minutes;
  seconds = isNaN(seconds) ? '00' : seconds < 10 ? '0' + seconds : seconds;
  document.querySelector('#nowPlaying').textContent = songName[musicNumber];
  document.querySelector('#musicTimer').textContent = minutes + ':' + seconds;
  if (minutes == 0 && seconds == 1) musicChange('next');
}
music.addEventListener('timeupdate', updateTimer);

if (musicVol) {
  music.volume = musicVol.value;
  musicVol.addEventListener('input', () => (music.volume = musicVol.value));
}
musicPauseBtn.onmouseover = () =>
  (musicPauseBtn.style.color = musicStatusColor);
musicPauseBtn.onmouseleave = () => (musicPauseBtn.style.color = 'black');

function musicPause() {
  const isPlaying = musicStatus;
  musicStatus = !isPlaying;
  musicStatus ? music.play() : music.pause();
  document.querySelector('#vinyl').style.animationPlayState = musicStatus
    ? 'running'
    : 'paused';
  musicPauseBtn.className = musicStatus
    ? 'fa-solid fa-pause'
    : 'fa-solid fa-play';
  musicPauseBtn.style.fontSize = musicStatus ? '2vh' : '1.8vh';
  musicPauseBtn.style.color = musicStatus ? 'red' : '#08ff21';
  musicStatusColor = musicPauseBtn.style.color;
}

function musicChange(prevNext) {
  const updateMusic = (num) => {
    music.pause();
    music = new Audio(`src/sfx/music/music${num}.mp3`);
    if (musicVol) music.volume = musicVol.value;
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

dealBtn.addEventListener('click', deal);
clearAllBtn.addEventListener('click', clearBets);
hitBtn.addEventListener('click', hit);
standBtn.addEventListener('click', stand);
splitBtn.addEventListener('click', split);
doubleBtn.addEventListener('click', double);
surrenderBtn.addEventListener('click', surrender);
insuranceBtn.addEventListener('click', insurance);
noInsuranceBtn.addEventListener('click', stand);
evenMoneyBtn.addEventListener('click', evenMoney);
undoBtn.addEventListener('click', undoLastBet);
pausePlayBtn.addEventListener('click', musicPause);
undoBtn.addEventListener('click', undoLastBet);

declineEvenMoneyBtn.addEventListener('click', () => {
  evenMoneyBtn.style.display = 'none';
  declineEvenMoneyBtn.style.display = 'none';
  stand();
});
chips.forEach((chip, i) => {
  chip.addEventListener('click', () => chipSelect(chipValues[i], i));
});

groups.forEach(({ arr, type }) => {
  arr.forEach((el, i) => {
    el.addEventListener('click', () => {
      placeBet(`betZone${i + 1}`, type);
    });
  });
});

newGameBtn.addEventListener('click', () => {
  if (playerInfo.balance == 0) {
    playerInfo.balance = (() => { const p = new URLSearchParams(window.location.search); const b = parseInt(p.get("balance"), 10); return isNaN(b) ? 10000000 : b; })();
    notification('NO BALANCE | PLAYER BALANCE RESET TO 1000');
    betStatusInfo[0].textContent =
      '$Pc ' + playerInfo.balance.toLocaleString('de-DE');
  }
  hidePostRoundButtons();
  resetForNewRoundUI();
  enableZonesAndRefreshChips();
});

rebetBtn.addEventListener('click', () => {
  const need =
    REBET_CHECK_BY === 'balanceAtDeal'
      ? rebetSnapshot.balanceAtDeal
      : rebetSnapshot.required;
  if (playerInfo.balance < need) {
    notification('NOT ENOUGH MONEY');
    return;
  }
  hidePostRoundButtons();
  resetForNewRoundUI();
  showStandardButtons();
  rebet();
  updateUndoBtnState();
  enableZonesAndRefreshChips();
});

rebetDealBtn.addEventListener('click', () => {
  if (!rebetSnapshot || rebetSnapshot.required <= 0) {
    notification('NO PREVIOUS BETS');
    return;
  }
  const need =
    REBET_CHECK_BY === 'balanceAtDeal'
      ? rebetSnapshot.balanceAtDeal
      : rebetSnapshot.required;
  if (playerInfo.balance < need) {
    notification('NOT ENOUGH MONEY');
    return;
  }
  hidePostRoundButtons();
  resetForNewRoundUI();
  rebet();
  hideStandardButtons();
  setTimeout(deal, 1000);
});

closeWindow.forEach((btn) =>
  btn.addEventListener('click', () => {
    helpWindow?.style && (helpWindow.style.display = 'none');
    settingsWindow?.style && (settingsWindow.style.display = 'none');
  })
);

settingsBtn.addEventListener('click', () => {
  settingsWindow.style.display = 'block';
  helpWindow.style.display = 'none';
});

helpBtn.addEventListener('click', () => {
  helpWindow.style.display = 'block';
  settingsWindow.style.display = 'none';
  requestAnimationFrame(() => {
    scrollArea.scrollTop = 0;
  });
});

playBtn.addEventListener('click', async () => {
  loadingScreen.remove();
  game.style.opacity = '1';
  music.play();
});

musicChangeBtn[0].addEventListener('click', () => musicChange('prev'));
musicChangeBtn[1].addEventListener('click', () => musicChange('next'));

document.addEventListener(
  'wheel',
  function (e) {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  },
  { passive: false }
);

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
    e.preventDefault();
  }
  if (e.ctrlKey && e.key === '0') {
    e.preventDefault();
  }
});

document.addEventListener('contextmenu', function (e) {
  e.preventDefault();
});


window.addEventListener('message', function(e) {
  if (!e.data || typeof e.data !== 'object') return;
  if (e.data.type === 'balance:update' && typeof e.data.balance === 'number') {
    playerInfo.balance = e.data.balance;
    const balEl = document.querySelector('.balanceInfo');
    if (balEl) balEl.textContent = playerInfo.balance.toLocaleString('de-DE') + ' $Pc';
    if (betStatusInfo && betStatusInfo[0]) betStatusInfo[0].textContent = playerInfo.balance.toLocaleString('de-DE') + ' $Pc';
  }
});