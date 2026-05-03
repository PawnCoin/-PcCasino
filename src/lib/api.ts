const API_BASE = '/api';

type SessionExpiredHandler = () => void;
let _onSessionExpired: SessionExpiredHandler | null = null;

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  _onSessionExpired = handler;
}

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
  if (res.status === 401 && path !== '/auth/me' && path !== '/auth/login' && path !== '/auth/register') {
    const hasToken = !!localStorage.getItem('pcasino_token');
    if (hasToken && _onSessionExpired) _onSessionExpired();
  }
  if (!res.ok) {
    const err = new Error(data.error || `API error ${res.status}`) as any;
    err.status = res.status;
    throw err;
  }
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
    displayName: string;
    bio: string;
    socialTwitter: string;
    socialInstagram: string;
    socialTelegram: string;
    socialDiscord: string;
    publicStatsVisible: boolean;
    publicSocialsVisible: boolean;
  }>) => apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),

  uploadAvatar: (file: File) => {
    const token = localStorage.getItem('pcasino_token');
    return fetch('/api/auth/profile/avatar', {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': file.type,
      },
      body: file,
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || `Upload failed ${res.status}`);
      return data;
    });
  },

  getFavoriteGames: () => apiFetch('/auth/profile/favorite-games'),

  getPublicProfile: (username: string) => apiFetch(`/auth/profile/public/${encodeURIComponent(username)}`),

  getPublicProfileById: (userId: number) => apiFetch(`/auth/profile/public/by-id/${userId}`),

  selfExclude: (days?: number) =>
    apiFetch('/auth/self-exclude', { method: 'POST', body: JSON.stringify({ days }) }),
};

// Payments
export const paymentsApi = {
  getDepositAddress: () => apiFetch('/payments/address'),

  initiateDeposit: (amount: number) =>
    apiFetch('/deposit/initiate', { method: 'POST', body: JSON.stringify({ amount }) }),

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

  getThreshold: () => apiFetch('/wallet-threshold'),
};

// Admin payments
export const adminPaymentsApi = {
  listDeposits: () => apiFetch('/payments/admin/deposits'),
  listWithdrawals: () => apiFetch('/payments/admin/withdrawals'),
  approveDeposit: (id: number) => apiFetch(`/payments/deposit/${id}/approve`, { method: 'POST' }),
  rejectDeposit: (id: number, note?: string) =>
    apiFetch(`/payments/deposit/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  approveWithdraw: (id: number) =>
    apiFetch(`/payments/withdraw/${id}/approve`, { method: 'POST' }),
  markWithdrawSent: (id: number, txHash?: string) =>
    apiFetch(`/payments/withdraw/${id}/mark-sent`, { method: 'POST', body: JSON.stringify({ txHash }) }),
  rejectWithdraw: (id: number, note?: string) =>
    apiFetch(`/payments/withdraw/${id}/reject`, { method: 'POST', body: JSON.stringify({ note }) }),
  payoutHealth: () => apiFetch('/payments/admin/payouts/health'),
  resetPayoutBreaker: () => apiFetch('/payments/admin/payouts/reset-breaker', { method: 'POST' }),
  retryPayout: (id: number) => apiFetch(`/payments/admin/payouts/${id}/retry`, { method: 'POST' }),
};

// VIP
export const vipApi = {
  getCashbackHistory: () => apiFetch('/vip/cashback-history'),
};

// Friends & Messaging
export const friendsApi = {
  sendRequest: (userId: number) =>
    apiFetch('/friends/request', { method: 'POST', body: JSON.stringify({ userId }) }),

  acceptRequest: (friendshipId: number) =>
    apiFetch(`/friends/${friendshipId}/accept`, { method: 'POST' }),

  removeOrDecline: (friendshipId: number) =>
    apiFetch(`/friends/${friendshipId}`, { method: 'DELETE' }),

  blockUser: (userId: number) =>
    apiFetch(`/friends/${userId}/block`, { method: 'POST' }),

  getFriends: () => apiFetch('/friends'),

  getPendingRequests: () => apiFetch('/friends/requests'),

  getEncountered: () => apiFetch('/friends/encountered'),

  sendMessage: (userId: number, content: string) =>
    apiFetch(`/friends/messages/${userId}`, { method: 'POST', body: JSON.stringify({ content }) }),

  getConversation: (userId: number, params?: { limit?: number; offset?: number }) => {
    const qs = params ? new URLSearchParams(params as any).toString() : '';
    return apiFetch(`/friends/messages/${userId}${qs ? `?${qs}` : ''}`);
  },

  getUnreadCount: () => apiFetch('/friends/messages/unread-count'),
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
