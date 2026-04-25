import { Router } from 'express';
import { createHash } from 'crypto';
import { query } from './db.js';
import { requireAuth } from './auth-routes.js';
import { isDemoMode } from './demo-mode.js';

const router = Router();

// In-memory OTP store: { [userId]: { otp, phone, expiresAt } }
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// GET /api/kyc/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT kyc_status, phone_number, phone_verified, email_verified, real_transactions_unlocked FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

    const latestSub = await query(
      `SELECT id, status, rejection_reason, submitted_at, reviewed_at
       FROM kyc_submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [req.user.id]
    );

    const demo = isDemoMode();
    res.json({
      kycStatus: user.kyc_status || 'unverified',
      phoneVerified: user.phone_verified || false,
      phoneNumber: user.phone_number || null,
      emailVerified: user.email_verified || false,
      demoMode: demo,
      realTransactionsUnlocked: demo ? false : (user.real_transactions_unlocked || false),
      latestSubmission: latestSub.rows[0] || null,
    });
  } catch (err) {
    console.error('[KYC status]', err.message);
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
});

// POST /api/kyc/phone/send-otp
router.post('/phone/send-otp', requireAuth, async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber || phoneNumber.trim().length < 7) {
    return res.status(400).json({ error: 'Valid phone number required' });
  }
  const normalized = phoneNumber.trim().replace(/\s+/g, '');
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  otpStore.set(req.user.id, { otp, phone: normalized, expiresAt });

  // OTP is sent to user's phone only — not logged to avoid PII/auth leakage

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_FROM) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_FROM;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authHeader },
        body: new URLSearchParams({ From: from, To: normalized, Body: `Your $Pc Casino verification code is: ${otp}. Valid for 10 minutes.` }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (smsErr) {
      console.error('[KYC OTP Twilio]', smsErr.message);
    }
  }

  res.json({ success: true, message: 'OTP sent to your phone number.' });
});

// POST /api/kyc/phone/verify
router.post('/phone/verify', requireAuth, async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP required' });

  const entry = otpStore.get(req.user.id);
  if (!entry) return res.status(400).json({ error: 'No OTP sent. Please request a new code.' });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(req.user.id);
    return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
  }
  if (entry.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
  }

  otpStore.delete(req.user.id);

  try {
    await query(
      'UPDATE users SET phone_number = $1, phone_verified = TRUE WHERE id = $2',
      [entry.phone, req.user.id]
    );
    res.json({ success: true, message: 'Phone number verified.' });
  } catch (err) {
    console.error('[KYC phone verify]', err.message);
    res.status(500).json({ error: 'Phone verification failed' });
  }
});

// POST /api/kyc/submit — enforce email+phone verified, persist actual document data
router.post('/submit', requireAuth, async (req, res) => {
  const { idDocumentData, selfieData } = req.body;

  if (!idDocumentData || !selfieData) {
    return res.status(400).json({ error: 'ID document and selfie are required.' });
  }

  // Validate they are base64 data URIs or base64 strings
  const idIsValid = typeof idDocumentData === 'string' && idDocumentData.length > 100;
  const selfieIsValid = typeof selfieData === 'string' && selfieData.length > 100;
  if (!idIsValid || !selfieIsValid) {
    return res.status(400).json({ error: 'Document images must be valid base64-encoded data.' });
  }

  try {
    const userResult = await query(
      'SELECT phone_verified, email_verified, kyc_status FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];

    // Enforce mandatory step order: email must be verified first
    if (!user.email_verified) {
      return res.status(400).json({ error: 'Email verification required before submitting KYC documents.' });
    }

    if (!user.phone_verified) {
      return res.status(400).json({ error: 'Phone verification required before submitting KYC documents.' });
    }

    if (user.kyc_status === 'approved') {
      return res.status(400).json({ error: 'Your KYC is already approved.' });
    }

    // Generate stable reference IDs for audit trail
    const idDocRef = `kyc_id_${req.user.id}_${Date.now()}`;
    const selfieRef = `kyc_selfie_${req.user.id}_${Date.now()}`;

    // Compute a SHA-256 fingerprint of the id document for cross-profile identity matching
    // This allows admins to detect if the same physical document was submitted across multiple accounts
    const rawIdData = idDocumentData.includes(',') ? idDocumentData.split(',')[1] : idDocumentData;
    const documentFingerprint = createHash('sha256').update(rawIdData.slice(0, 4096)).digest('hex');

    // Check if this document fingerprint has been used by another user (identity linking detection)
    const duplicateCheck = await query(
      `SELECT ks.user_id, u.username FROM kyc_submissions ks
       JOIN users u ON u.id = ks.user_id
       WHERE ks.document_fingerprint = $1 AND ks.user_id != $2 AND ks.status IN ('approved', 'pending')
       LIMIT 5`,
      [documentFingerprint, req.user.id]
    );
    const linkedProfiles = duplicateCheck.rows;

    // Supersede any previous pending submission for this user
    await query(
      `UPDATE kyc_submissions SET status = 'superseded' WHERE user_id = $1 AND status = 'pending'`,
      [req.user.id]
    );

    // Persist actual document data + fingerprint for identity deduplication
    const result = await query(
      `INSERT INTO kyc_submissions
         (user_id, status, id_document_path, selfie_path, id_document_data, selfie_data, document_fingerprint)
       VALUES ($1, 'pending', $2, $3, $4, $5, $6) RETURNING id, status, submitted_at`,
      [req.user.id, idDocRef, selfieRef, idDocumentData, selfieData, documentFingerprint]
    );

    await query(`UPDATE users SET kyc_status = 'pending' WHERE id = $1`, [req.user.id]);

    const linkedNote = linkedProfiles.length > 0
      ? ` ⚠️ IDENTITY MATCH DETECTED: Same document fingerprint found on account(s): ${linkedProfiles.map(p => `${p.username}(${p.user_id})`).join(', ')}`
      : '';

    const admins = await query('SELECT id FROM users WHERE is_admin = TRUE');
    for (const admin of admins.rows) {
      await query(
        "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'kyc', 'New KYC Submission', $2)",
        [admin.id, `User ${req.user.username} (ID: ${req.user.id}) submitted KYC documents for review.${linkedNote}`]
      ).catch(() => {});
    }

    res.json({
      success: true,
      submission: result.rows[0],
      message: 'KYC documents submitted for review.',
      linkedProfiles: linkedProfiles.length > 0 ? linkedProfiles.map(p => ({ userId: p.user_id, username: p.username })) : [],
    });
  } catch (err) {
    console.error('[KYC submit]', err.message);
    res.status(500).json({ error: 'KYC submission failed' });
  }
});

// ---- Admin KYC endpoints — mounted on a separate router ----
// Accessible at BOTH /api/kyc/admin/... AND /api/admin/kyc/... (see server/index.js)

export const adminKycRouter = Router();

function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// GET /queue
adminKycRouter.get('/queue', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT ks.id, ks.user_id, ks.status, ks.id_document_path, ks.selfie_path,
              ks.submitted_at, ks.rejection_reason, ks.document_fingerprint,
              u.username, u.email, u.phone_number, u.phone_verified, u.email_verified
       FROM kyc_submissions ks
       JOIN users u ON u.id = ks.user_id
       WHERE ks.status = 'pending'
       ORDER BY ks.submitted_at ASC`
    );

    // For each submission, check if document fingerprint matches other accounts
    const rows = result.rows;
    for (const row of rows) {
      if (row.document_fingerprint) {
        const linked = await query(
          `SELECT ks2.user_id, u2.username FROM kyc_submissions ks2
           JOIN users u2 ON u2.id = ks2.user_id
           WHERE ks2.document_fingerprint = $1 AND ks2.user_id != $2 AND ks2.status IN ('approved', 'pending', 'rejected')
           LIMIT 5`,
          [row.document_fingerprint, row.user_id]
        );
        row.linked_profiles = linked.rows;
      } else {
        row.linked_profiles = [];
      }
    }

    res.json({ queue: rows });
  } catch (err) {
    console.error('[Admin KYC queue]', err.message);
    res.status(500).json({ error: 'Failed to fetch KYC queue' });
  }
});

// GET /all
adminKycRouter.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await query(
      `SELECT ks.id, ks.user_id, ks.status, ks.id_document_path, ks.selfie_path,
              ks.submitted_at, ks.reviewed_at, ks.rejection_reason,
              u.username, u.email, u.phone_number, u.phone_verified, u.email_verified
       FROM kyc_submissions ks
       JOIN users u ON u.id = ks.user_id
       ORDER BY ks.submitted_at DESC
       LIMIT 200`
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KYC submissions' });
  }
});

// GET /:id/document/:type — retrieve stored document data URI for admin preview
adminKycRouter.get('/:id/document/:type', requireAuth, requireAdmin, async (req, res) => {
  const { type } = req.params;
  if (!['id', 'selfie'].includes(type)) return res.status(400).json({ error: 'Invalid document type' });
  try {
    const col = type === 'id' ? 'id_document_data' : 'selfie_data';
    const result = await query(`SELECT ${col} FROM kyc_submissions WHERE id = $1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Submission not found' });
    const data = result.rows[0][col];
    if (!data) return res.status(404).json({ error: 'Document not found' });
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /:id/approve
adminKycRouter.post('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const { force } = req.body; // Admin can set force=true to approve despite identity conflict
  try {
    const sub = await query('SELECT * FROM kyc_submissions WHERE id = $1', [req.params.id]);
    if (!sub.rows.length) return res.status(404).json({ error: 'Submission not found' });
    const s = sub.rows[0];
    if (s.status !== 'pending') return res.status(400).json({ error: 'Submission already processed' });

    // Identity-link enforcement: block approval if same document fingerprint is already approved on another account
    if (s.document_fingerprint && !force) {
      const alreadyApproved = await query(
        `SELECT ks.user_id, u.username FROM kyc_submissions ks
         JOIN users u ON u.id = ks.user_id
         WHERE ks.document_fingerprint = $1 AND ks.user_id != $2 AND ks.status = 'approved'
         LIMIT 3`,
        [s.document_fingerprint, s.user_id]
      );
      if (alreadyApproved.rows.length > 0) {
        return res.status(409).json({
          error: 'IDENTITY CONFLICT: This document is already approved on another account.',
          conflictingAccounts: alreadyApproved.rows.map(r => ({ userId: r.user_id, username: r.username })),
          code: 'IDENTITY_CONFLICT',
          hint: 'Pass force=true in body to override this check and approve anyway.',
        });
      }
    }

    await query(
      `UPDATE kyc_submissions SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1 WHERE id = $2`,
      [req.user.id, s.id]
    );
    await query(`UPDATE users SET kyc_status = 'approved' WHERE id = $1`, [s.user_id]);

    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'kyc', 'KYC Approved! ✅', $2)",
      [s.user_id, 'Your identity has been verified! Your KYC status is now VERIFIED. You can now proceed to link your wallet for full access.']
    ).catch(() => {});

    res.json({ success: true, message: 'KYC submission approved.' });
  } catch (err) {
    console.error('[Admin KYC approve]', err.message);
    res.status(500).json({ error: 'Approval failed' });
  }
});

// POST /:id/reject
adminKycRouter.post('/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

  try {
    const sub = await query('SELECT * FROM kyc_submissions WHERE id = $1', [req.params.id]);
    if (!sub.rows.length) return res.status(404).json({ error: 'Submission not found' });
    const s = sub.rows[0];
    if (s.status !== 'pending') return res.status(400).json({ error: 'Submission already processed' });

    await query(
      `UPDATE kyc_submissions SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3`,
      [reason, req.user.id, s.id]
    );
    await query(`UPDATE users SET kyc_status = 'rejected' WHERE id = $1`, [s.user_id]);

    await query(
      "INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'kyc', 'KYC Rejected', $2)",
      [s.user_id, `Your KYC submission was rejected. Reason: ${reason}. Please resubmit with corrected documents.`]
    ).catch(() => {});

    res.json({ success: true, message: 'KYC submission rejected.' });
  } catch (err) {
    console.error('[Admin KYC reject]', err.message);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

// Mount admin sub-router under /admin on the main router for /api/kyc/admin/... paths
router.use('/admin', adminKycRouter);

export default router;
