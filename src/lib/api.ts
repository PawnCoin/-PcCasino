const API_BASE = '/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('pcasino_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

// Auth
export const authApi = {
  register: (body: { username: string; email: string; password: string; referralCode?: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string; totpCode?: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  social: (body: { provider: string; username: string; email?: string; socialId?: string; avatar?: string }) =>
    apiFetch('/auth/social', { method: 'POST', body: JSON.stringify(body) }),

  me: () => apiFetch('/auth/me'),

  logout: () => apiFetch('/auth/logout', { method: 'POST' }),

  setup2FA: () => apiFetch('/auth/2fa/setup', { method: 'POST' }),

  enable2FA: (code: string) => apiFetch('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) }),

  disable2FA: (code: string) => apiFetch('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ code }) }),

  updateProfile: (body: Partial<{
    avatar: string;
    withdrawAddress: string;
    walletAddress: string;
    dailyDepositLimit: number;
    dailyLossLimit: number;
  }>) => apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),

  selfExclude: (days?: number) =>
    apiFetch('/auth/self-exclude', { method: 'POST', body: JSON.stringify({ days }) }),
};

// Payments
export const paymentsApi = {
  getDepositAddress: () => apiFetch('/payments/address'),

  requestDeposit: (body: { amount: number; txHash?: string; fromAddress?: string; network?: string }) =>
    apiFetch('/payments/deposit/request', { method: 'POST', body: JSON.stringify(body) }),

  requestWithdraw: (body: { amount: number; toAddress: string; network?: string }) =>
    apiFetch('/payments/withdraw/request', { method: 'POST', body: JSON.stringify(body) }),

  recordTransaction: (body: { type: 'bet' | 'win'; amount: number; game?: string; description?: string }) =>
    apiFetch('/payments/transaction', { method: 'POST', body: JSON.stringify(body) }),

  getTransactions: (params?: { type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch(`/payments/transactions${qs ? `?${qs}` : ''}`);
  },
};

// Game
export const gameApi = {
  saveGameHistory: (body: {
    game: string;
    result: 'win' | 'loss';
    betAmount?: number;
    winAmount?: number;
    net: number;
    seedHash?: string;
    nonce?: number;
  }) => apiFetch('/game/history', { method: 'POST', body: JSON.stringify(body) }),

  getGameHistory: (params?: { game?: string; limit?: number }) => {
    const qs = new URLSearchParams(params as any).toString();
    return apiFetch(`/game/history${qs ? `?${qs}` : ''}`);
  },

  getNotifications: () => apiFetch('/game/notifications'),

  markNotificationsRead: (ids?: string[]) =>
    apiFetch('/game/notifications/read', { method: 'POST', body: JSON.stringify({ ids }) }),

  getTournaments: () => apiFetch('/game/tournaments'),

  registerTournament: (tournamentId: string) =>
    apiFetch(`/game/tournaments/${tournamentId}/register`, { method: 'POST' }),

  getReferral: () => apiFetch('/game/referral'),

  getLeaderboard: (period?: 'daily' | 'weekly' | 'alltime') => apiFetch(`/game/leaderboard/db${period ? `?period=${period}` : ''}`),

  recordWin: (body: { amount: number; game?: string }) =>
    apiFetch('/game/leaderboard/record-win', { method: 'POST', body: JSON.stringify(body) }),

  getExchangeRates: () => apiFetch('/game/exchange-rates'),

  getDailyBonus: () => apiFetch('/game/daily-bonus'),

  claimDailyBonus: () => apiFetch('/game/daily-bonus', { method: 'POST' }),

  getSportsEvents: () => apiFetch('/game/sports'),

  savePokerHand: (body: {
    holeCards: any[];
    communityCards: any[];
    actions: any[];
    pot: number;
    winner: 'player' | 'opponent';
    winnerName?: string;
    handName?: string;
    net: number;
    opponents?: any[];
  }) => apiFetch('/game/poker/hands', { method: 'POST', body: JSON.stringify(body) }),

  getPokerHands: () => apiFetch('/game/poker/hands'),

  getPokerHandById: (id: number) => apiFetch(`/game/poker/hands/${id}`),

  getPokerHandByToken: (token: string) => apiFetch(`/game/poker/hands/share/${token}`),
};

// KYC
export const kycApi = {
  getStatus: () => apiFetch('/kyc/status'),

  sendPhoneOtp: (phoneNumber: string) =>
    apiFetch('/kyc/phone/send-otp', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),

  verifyPhoneOtp: (otp: string) =>
    apiFetch('/kyc/phone/verify', { method: 'POST', body: JSON.stringify({ otp }) }),

  submitDocuments: (body: { idDocumentData: string; selfieData: string }) =>
    apiFetch('/kyc/submit', { method: 'POST', body: JSON.stringify(body) }),

  // Admin endpoints
  adminGetQueue: () => apiFetch('/kyc/admin/queue'),
  adminGetAll: () => apiFetch('/kyc/admin/all'),
  adminApprove: (id: number) => apiFetch(`/kyc/admin/${id}/approve`, { method: 'POST' }),
  adminReject: (id: number, reason: string) =>
    apiFetch(`/kyc/admin/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

// Wallets
export const walletApi = {
  list: () => apiFetch('/wallets'),

  add: (body: { walletAddress: string; chainLabel?: string; label?: string }) =>
    apiFetch('/wallets', { method: 'POST', body: JSON.stringify(body) }),

  remove: (id: number) => apiFetch(`/wallets/${id}`, { method: 'DELETE' }),

  setDefault: (id: number) => apiFetch(`/wallets/${id}/default`, { method: 'PATCH' }),

  verifyBalance: (id: number) =>
    apiFetch(`/wallets/${id}/verify-balance`, { method: 'POST' }),
};

// VIP
export const vipApi = {
  getCashbackHistory: () => apiFetch('/vip/cashback-history'),
};

// Jackpot
export const jackpotApi = {
  getAmount: () => apiFetch('/jackpot'),
  getHistory: () => apiFetch('/jackpot/history'),
};

export function setToken(token: string) {
  localStorage.setItem('pcasino_token', token);
}

export function clearToken() {
  localStorage.removeItem('pcasino_token');
}

export function getToken(): string | null {
  return localStorage.getItem('pcasino_token');
}
