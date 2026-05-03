// Centralized demo-mode flag. Default: ON (true).
// Set DEMO_MODE=false in environment to enable real-money transactions.
//
// While demo mode is ON:
//   - All deposit/withdraw API routes are blocked with code DEMO_MODE_ENABLED.
//   - /auth/me, /kyc/status, /wallets/.../verify-balance responses force
//     realTransactionsUnlocked=false and surface demoMode=true.
//   - Admin "Launch Reset" can wipe & reset all non-admin balances.

// Read DEMO_MODE once at module load so the flag is stable for the whole
// process lifetime (per spec). Operator must restart the server to flip it.
const DEMO_MODE_AT_BOOT = (() => {
  const v = (process.env.DEMO_MODE ?? 'true').toString().toLowerCase().trim();
  return v !== 'false' && v !== '0' && v !== 'off' && v !== 'no';
})();

export function isDemoMode() {
  return DEMO_MODE_AT_BOOT;
}

export const DEMO_MODE_ERROR = {
  status: 403,
  body: {
    error: 'Demo mode is active. Real-money deposits and withdrawals are disabled.',
    code: 'DEMO_MODE_ENABLED',
    demoMode: true,
  },
};

export function blockIfDemo(_req, res, next) {
  if (isDemoMode()) {
    return res.status(DEMO_MODE_ERROR.status).json(DEMO_MODE_ERROR.body);
  }
  next();
}
