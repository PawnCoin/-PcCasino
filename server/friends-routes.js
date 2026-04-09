import express from 'express';
import { query } from './db.js';
import { requireAuth, requireVip } from './auth-routes.js';

let _io = null;
export function setFriendsIO(io) { _io = io; }

const router = express.Router();

// Anti-cheat keyword filter for DMs
const GAME_KEYWORDS = [
  // Card names
  'ace', 'king', 'queen', 'jack', 'joker', 'spade', 'heart', 'club', 'diamond',
  // Poker actions
  'fold', 'raise', 'check', 'call', 'allin', 'all-in', 'bluff',
  // Hand rankings
  'flush', 'straight', 'fullhouse', 'full house', 'four of a kind', 'royal flush',
  'pair', 'trips', 'quads', 'nuts', 'broadway', 'wheel',
  // Bet amounts patterns — covered by regex
  // Roulette
  'roulette', 'red', 'black', 'zero', 'split', 'corner bet', 'straight up',
  // Dice / Craps
  'roll', 'snake eyes', 'boxcars', 'seven out', 'hardway', 'come out',
  // Blackjack
  'hit me', 'stand', 'double down', 'bust', 'blackjack', 'soft', 'split',
  // Slots
  'jackpot', 'scatter', 'wild symbol',
  // General cheating signals
  'my hand', 'your hand', 'i have', 'i got', 'hold', 'muck', 'show cards',
];

const BET_AMOUNT_PATTERN = /\b(\d{3,}[kmb]?|\d+\s*(chips|coins|$pc|pc|tokens?))\b/i;
const CARD_PATTERN = /\b(2|3|4|5|6|7|8|9|10|J|Q|K|A)\s*(of\s+)?(spades?|hearts?|clubs?|diamonds?)\b/i;

function runAntiCheatFilter(content) {
  const lower = content.toLowerCase();
  for (const kw of GAME_KEYWORDS) {
    if (lower.includes(kw)) {
      return { blocked: true, reason: `Message contains game-related keyword: "${kw}"` };
    }
  }
  if (CARD_PATTERN.test(content)) {
    return { blocked: true, reason: 'Message appears to contain card information' };
  }
  if (BET_AMOUNT_PATTERN.test(content)) {
    return { blocked: true, reason: 'Message appears to contain bet/chip amounts' };
  }
  return { blocked: false };
}

// ---- Rate limiting (in-memory, per user) ----
const messageCooldowns = new Map(); // userId -> [timestamps]
const RATE_WINDOW_MS = 30000; // 30 seconds
const RATE_MAX_MSGS = 10;

function checkRateLimit(userId) {
  const now = Date.now();
  const timestamps = (messageCooldowns.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX_MSGS) {
    return false;
  }
  timestamps.push(now);
  messageCooldowns.set(userId, timestamps);
  return true;
}

// Helper: get friendship record (either direction)
async function getFriendship(userId, otherId) {
  const result = await query(
    `SELECT * FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2)
        OR (requester_id = $2 AND addressee_id = $1)
     LIMIT 1`,
    [userId, otherId]
  );
  return result.rows[0] || null;
}

// ---- Friend Request ----
router.post('/request', requireAuth, requireVip, async (req, res) => {
  const requesterId = req.user.id;
  const { userId: addresseeId } = req.body;
  if (!addresseeId || parseInt(addresseeId) === requesterId) {
    return res.status(400).json({ error: 'Invalid target user' });
  }
  const target = parseInt(addresseeId);
  try {
    const existing = await getFriendship(requesterId, target);
    if (existing) {
      if (existing.status === 'blocked') return res.status(403).json({ error: 'Cannot send friend request' });
      if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
      if (existing.status === 'pending') return res.status(400).json({ error: 'Request already sent' });
    }
    await query(
      `INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'pending')
       ON CONFLICT (requester_id, addressee_id) DO NOTHING`,
      [requesterId, target]
    );

    // Notify addressee in real-time
    const requesterRow = await query('SELECT username, avatar FROM users WHERE id = $1', [requesterId]);
    if (_io) {
      _io.to(`user_${target}`).emit('friend:request', {
        requesterId,
        username: requesterRow.rows[0]?.username,
        avatar: requesterRow.rows[0]?.avatar,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[friends:request]', err.message);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ---- Accept Friend Request ----
router.post('/:id/accept', requireAuth, requireVip, async (req, res) => {
  const userId = req.user.id;
  const friendshipId = parseInt(req.params.id);
  try {
    const result = await query(
      `UPDATE friendships SET status = 'accepted', updated_at = NOW()
       WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
       RETURNING *`,
      [friendshipId, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Friend request not found' });
    res.json({ success: true, friendship: result.rows[0] });
  } catch (err) {
    console.error('[friends:accept]', err.message);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// ---- Decline / Unfriend / Cancel ----
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const friendshipId = parseInt(req.params.id);
  try {
    const result = await query(
      `DELETE FROM friendships
       WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)
       RETURNING id`,
      [friendshipId, userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Friendship not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[friends:delete]', err.message);
    res.status(500).json({ error: 'Failed to remove friendship' });
  }
});

// ---- Block User ----
router.post('/:userId/block', requireAuth, async (req, res) => {
  const blockerId = req.user.id;
  const targetId = parseInt(req.params.userId);
  if (isNaN(targetId) || targetId === blockerId) return res.status(400).json({ error: 'Invalid user' });
  try {
    // Remove any existing friendship first
    await query(
      `DELETE FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
      [blockerId, targetId]
    );
    // Insert block record
    await query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'blocked')
       ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'blocked', updated_at = NOW()`,
      [blockerId, targetId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[friends:block]', err.message);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// ---- List Friends ----
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT
         f.id,
         f.status,
         f.created_at,
         CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
         CASE WHEN f.requester_id = $1 THEN ua.username ELSE ur.username END AS friend_username,
         CASE WHEN f.requester_id = $1 THEN ua.avatar ELSE ur.avatar END AS friend_avatar,
         CASE WHEN f.requester_id = $1 THEN ua.vip_tier ELSE ur.vip_tier END AS friend_vip,
         CASE WHEN f.requester_id = $1 THEN ua.last_seen ELSE ur.last_seen END AS friend_last_seen,
         CASE WHEN f.requester_id = $1 THEN (
           SELECT game FROM game_history WHERE user_id = ua.id ORDER BY created_at DESC LIMIT 1
         ) ELSE (
           SELECT game FROM game_history WHERE user_id = ur.id ORDER BY created_at DESC LIMIT 1
         ) END AS favorite_game
       FROM friendships f
       JOIN users ur ON ur.id = f.requester_id
       JOIN users ua ON ua.id = f.addressee_id
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
       ORDER BY f.updated_at DESC`,
      [userId]
    );
    const friends = result.rows.map(r => ({
      id: r.id,
      friendId: r.friend_id,
      username: r.friend_username,
      avatar: r.friend_avatar,
      vipTier: r.friend_vip,
      favoriteGame: r.favorite_game || 'Casino',
      isOnline: r.friend_last_seen && (Date.now() - new Date(r.friend_last_seen).getTime()) < 5 * 60 * 1000,
      createdAt: r.created_at,
    }));
    res.json({ friends });
  } catch (err) {
    console.error('[friends:list]', err.message);
    res.status(500).json({ error: 'Failed to load friends' });
  }
});

// ---- Pending Incoming Requests ----
router.get('/requests', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT f.id, f.requester_id, f.created_at,
              u.username, u.avatar, u.vip_tier
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );
    res.json({ requests: result.rows.map(r => ({
      id: r.id,
      requesterId: r.requester_id,
      username: r.username,
      avatar: r.avatar,
      vipTier: r.vip_tier,
      createdAt: r.created_at,
    })) });
  } catch (err) {
    console.error('[friends:requests]', err.message);
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

// ---- Met In Games (recent encounters) ----
router.get('/encountered', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT DISTINCT ON (ge.other_user_id)
         ge.other_user_id AS user_id,
         ge.game_type,
         ge.encountered_at,
         u.username, u.avatar, u.vip_tier
       FROM game_encounters ge
       JOIN users u ON u.id = ge.other_user_id
       WHERE ge.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM friendships f
           WHERE f.status IN ('accepted','blocked')
             AND ((f.requester_id = $1 AND f.addressee_id = ge.other_user_id)
                  OR (f.requester_id = ge.other_user_id AND f.addressee_id = $1))
         )
       ORDER BY ge.other_user_id, ge.encountered_at DESC
       LIMIT 20`,
      [userId]
    );
    res.json({ encountered: result.rows.map(r => ({
      userId: r.user_id,
      username: r.username,
      avatar: r.avatar,
      vipTier: r.vip_tier,
      gameType: r.game_type,
      encounteredAt: r.encountered_at,
    })) });
  } catch (err) {
    console.error('[friends:encountered]', err.message);
    res.status(500).json({ error: 'Failed to load encounters' });
  }
});

// ---- Send DM ----
router.post('/messages/:userId', requireAuth, requireVip, async (req, res) => {
  const senderId = req.user.id;
  const recipientId = parseInt(req.params.userId);
  const { content } = req.body;

  if (isNaN(recipientId) || recipientId === senderId) return res.status(400).json({ error: 'Invalid recipient' });
  if (!content || typeof content !== 'string' || content.trim().length === 0) return res.status(400).json({ error: 'Message cannot be empty' });
  if (content.length > 500) return res.status(400).json({ error: 'Message too long (max 500 chars)' });

  try {
    // Check they are friends
    const friendship = await getFriendship(senderId, recipientId);
    if (!friendship || friendship.status !== 'accepted') {
      return res.status(403).json({ error: 'You can only message friends' });
    }

    // Check not blocked
    const blockedCheck = await query(
      `SELECT id FROM friendships WHERE status = 'blocked' AND requester_id = $1 AND addressee_id = $2`,
      [recipientId, senderId]
    );
    if (blockedCheck.rows.length) return res.status(403).json({ error: 'You cannot message this user' });

    // Rate limiting
    if (!checkRateLimit(senderId)) {
      return res.status(429).json({ error: 'Too many messages. Please slow down.' });
    }

    // Anti-cheat filter
    const filterResult = runAntiCheatFilter(content.trim());
    if (filterResult.blocked) {
      // Log flagged attempt but don't save
      await query(
        `INSERT INTO direct_messages (sender_id, recipient_id, content, is_flagged)
         VALUES ($1, $2, $3, TRUE)`,
        [senderId, recipientId, content.trim()]
      );
      return res.status(422).json({ error: 'Message blocked by anti-cheat filter', reason: filterResult.reason, flagged: true });
    }

    const result = await query(
      `INSERT INTO direct_messages (sender_id, recipient_id, content, is_read)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id, created_at`,
      [senderId, recipientId, content.trim()]
    );

    const senderRow = await query('SELECT username, avatar FROM users WHERE id = $1', [senderId]);
    const msg = {
      id: result.rows[0].id,
      senderId,
      senderUsername: senderRow.rows[0]?.username,
      senderAvatar: senderRow.rows[0]?.avatar,
      recipientId,
      content: content.trim(),
      createdAt: result.rows[0].created_at,
    };

    // Push to recipient in real-time
    if (_io) {
      _io.to(`user_${recipientId}`).emit('dm:new', msg);
      _io.to(`user_${recipientId}`).emit('dm:unread_count_changed');
    }

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('[messages:send]', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---- Get Conversation ----
router.get('/messages/:userId', requireAuth, async (req, res) => {
  const myId = req.user.id;
  const otherId = parseInt(req.params.userId);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  if (isNaN(otherId)) return res.status(400).json({ error: 'Invalid user' });

  try {
    // Mark messages as read
    await query(
      `UPDATE direct_messages SET is_read = TRUE
       WHERE sender_id = $1 AND recipient_id = $2 AND is_read = FALSE`,
      [otherId, myId]
    );

    const result = await query(
      `SELECT id, sender_id, recipient_id, content, is_flagged, is_read, created_at
       FROM direct_messages
       WHERE is_flagged = FALSE
         AND ((sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1))
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [myId, otherId, limit, offset]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (err) {
    console.error('[messages:get]', err.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// ---- Unread Message Count ----
router.get('/messages/unread-count', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM direct_messages
       WHERE recipient_id = $1 AND is_read = FALSE AND is_flagged = FALSE`,
      [userId]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('[messages:unread]', err.message);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;
