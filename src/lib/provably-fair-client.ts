/**
 * Client-side provably fair deck derivation.
 * Replicates the server's deriveOutcomes + Fisher-Yates algorithm using SubtleCrypto.
 * After a round is revealed, users can run this locally to verify the deck order.
 */

const CARD_SUITS = ['\u2660', '\u2665', '\u2666', '\u2663'] as const;
const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export interface VerifiableCard {
  suit: string;
  value: string;
}

/**
 * Compute HMAC-SHA256(key=serverSeed, data=clientSeed:nonce) and return float in [0,1).
 * Replicates server's deriveOutcomes(serverSeed, clientSeed, nonce, 1)[0].
 */
async function deriveFloat(serverSeed: string, clientSeed: string, nonceStr: string): Promise<number> {
  const enc = new TextEncoder();
  const keyData = enc.encode(serverSeed);
  const message = enc.encode(`${clientSeed}:${nonceStr}`);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, message);
  const bytes = new Uint8Array(sig);
  // Read first 4 bytes as big-endian uint32, divide by 2^32 for [0,1)
  const uint32 = (bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3]) >>> 0;
  return uint32 / 2 ** 32;
}

/**
 * Derive the full 52-card shuffled deck from seeds using Fisher-Yates.
 * Matches server's deriveGameResult('blackjack', serverSeed, clientSeed, nonce) exactly.
 * cards[0..3] = initial deal: player1, dealer1, player2, dealer2
 * cards[4..] = remaining deck for hits and dealer draws
 */
export async function deriveBlackjackDeck(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<VerifiableCard[]> {
  const deck: VerifiableCard[] = [];
  for (const suit of CARD_SUITS) {
    for (const value of CARD_VALUES) {
      deck.push({ suit, value });
    }
  }
  // Fisher-Yates: for i from 51 down to 1, pick j from [0..i] using HMAC float
  for (let i = deck.length - 1; i > 0; i--) {
    const f = await deriveFloat(serverSeed, clientSeed, `${nonce}:card${i}`);
    const j = Math.floor(f * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Derive roulette number from seeds.
 * Matches server's deriveGameResult('roulette', serverSeed, clientSeed, nonce).
 */
export async function deriveRouletteNumber(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<number> {
  const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  ];
  const f = await deriveFloat(serverSeed, clientSeed, String(nonce));
  return WHEEL_NUMBERS[Math.floor(f * WHEEL_NUMBERS.length)];
}

/**
 * Derive a 3×5 slots grid from seeds.
 * Matches server's deriveGameResult('slots', serverSeed, clientSeed, nonce) exactly.
 * Each cell uses nonce `${nonce}:${cellIndex}` for an independent HMAC-SHA256 call.
 */
export async function deriveSlotGrid(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<string[][]> {
  const SYMBOLS = ['cherry', 'lemon', 'orange', 'bell', 'star', 'gem', 'seven', 'slot-machine'];
  const WEIGHTS = [20, 18, 15, 12, 10, 8, 5, 2];
  const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);
  const ROWS = 3;
  const COLS = 5;

  const grid: string[][] = [[], [], []];
  for (let cell = 0; cell < ROWS * COLS; cell++) {
    const f = await deriveFloat(serverSeed, clientSeed, `${nonce}:${cell}`);
    let r = f * TOTAL_WEIGHT;
    let symbol = SYMBOLS[0];
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= WEIGHTS[i];
      if (r <= 0) { symbol = SYMBOLS[i]; break; }
    }
    grid[Math.floor(cell / COLS)].push(symbol);
  }
  return grid;
}

/**
 * Derive two dice from seeds.
 * Matches server's deriveGameResult('dice', serverSeed, clientSeed, nonce).
 */
export async function deriveDice(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<{ die1: number; die2: number; total: number }> {
  const f1 = await deriveFloat(serverSeed, clientSeed, `${nonce}:die1`);
  const f2 = await deriveFloat(serverSeed, clientSeed, `${nonce}:die2`);
  const die1 = Math.floor(f1 * 6) + 1;
  const die2 = Math.floor(f2 * 6) + 1;
  return { die1, die2, total: die1 + die2 };
}

/**
 * Verify a server seed matches its hash commitment.
 * Uses SubtleCrypto SHA-256 — runs entirely in the browser, no server call needed.
 */
export async function verifySeedHash(serverSeed: string, serverSeedHash: string): Promise<boolean> {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(serverSeed));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computed = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === serverSeedHash;
}
