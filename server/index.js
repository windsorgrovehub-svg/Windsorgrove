const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();
const db = require('./db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'windsor_secret_key_2026';

// Serve the frontend static files from the parent directory
const FRONTEND_DIR = path.resolve(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Access restricted to authorized administrators only.' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, phone_number, password, invite_code } = req.body;
  if (!invite_code) return res.status(400).json({ error: 'An invitation code is required to register.' });
  try {
    // Validate invite code
    const codeRes = await db.query('SELECT * FROM invite_codes WHERE code = $1 AND used = false', [invite_code.toUpperCase()]);
    if (codeRes.rows.length === 0) return res.status(400).json({ error: 'Invalid or already used invitation code.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name, email, phone_number, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, balance, is_admin',
      [name, email, phone_number || null, hashedPassword]
    );
    const user = result.rows[0];

    // Mark invite code as used
    await db.query('UPDATE invite_codes SET used = true, used_by_user_id = $1 WHERE code = $2', [user.id, invite_code.toUpperCase()]);

    // Add Welcome Bonus Transaction
    await db.query(
      'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4)',
      [user.id, 'bonus', 100.00, 'Circle Recruitment Bonus']
    );

    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'User already exists or database error' });
  }
});

// Validate invite code (pre-check before form submit)
app.post('/api/auth/validate-invite', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ valid: false, error: 'No code provided.' });
  try {
    const result = await db.query('SELECT id FROM invite_codes WHERE code = $1 AND used = false', [code.toUpperCase()]);
    if (result.rows.length > 0) return res.json({ valid: true });
    return res.status(400).json({ valid: false, error: 'Invalid or already used invitation code.' });
  } catch (err) {
    res.status(500).json({ valid: false, error: 'Server error.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valPass = await bcrypt.compare(password, user.password_hash);
    if (!valPass) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, email: user.email, is_admin: user.is_admin }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, balance: user.balance, is_admin: user.is_admin } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const result = await db.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found. Please check your email and try again.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await db.query('UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3', [resetToken, resetExpires, user.id]);

    const resetLink = `http://localhost:8181/reset-password.html?token=${resetToken}`;

    // Send email using Nodemailer
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Windsor Grove" <noreply@windsorgrove.com>',
      to: user.email,
      subject: 'Reset your Windsor Grove Password',
      html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #c5a059, #8b6a2f); color: #fff; border-radius: 12px; font-weight: 800; font-size: 18px; line-height: 48px; margin: 0 auto;">WG</div>
              <h2 style="color: #c5a059; letter-spacing: 0.1em; margin-top: 15px;">WINDSOR GROVE</h2>
            </div>
            <p style="font-size: 16px;">Hello ${user.name},</p>
            <p style="font-size: 16px; line-height: 1.5;">We received a request to reset your password. Click the button below to choose a new one:</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetLink}" style="background: #0f172a; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #64748b;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="text-align: center; font-size: 12px; color: #94a3b8;">&copy; ${new Date().getFullYear()} Windsor Grove Hub. All rights reserved.</p>
          </div>
        `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[Email Sent] Password reset link sent to ${user.email}: ${resetLink}`);
      res.json({ message: 'A password reset link has been sent to your email.' });
    } catch (mailErr) {
      console.error('SMTP Delivery error:', mailErr);
      // Fallback for demo testing when SMTP is not configured
      console.log(`[SMTP FAULT FALLBACK] To complete reset: ${resetLink}`);
      res.json({ message: 'A password reset link has been sent. Check your inbox.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing required fields.' });

  try {
    const result = await db.query('SELECT id, reset_expires FROM users WHERE reset_token = $1', [token]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ error: 'Invalid or expired token.' });

    // Check if token expired
    if (new Date() > new Date(user.reset_expires)) {
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Your password has been successfully reset. You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete password reset.' });
  }
});

// --- HOTEL ROUTES ---
app.get('/api/hotels', async (req, res) => {
  const { city, country, search } = req.query;
  try {
    let query = 'SELECT * FROM hotels WHERE 1=1';
    const params = [];
    if (city) { params.push(`%${city}%`); query += ` AND city ILIKE $${params.length}`; }
    if (country && country !== 'All') { params.push(country); query += ` AND country = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND name ILIKE $${params.length}`; }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

app.get('/api/hotels/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM hotels WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch hotel' });
  }
});

// --- USER & MISSION ROUTES ---
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, phone_number, balance, commission_total FROM users WHERE id = $1', [req.user.id]);
    const txs = await db.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ user: result.rows[0], transactions: txs.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { phone_number, email, old_password, new_password } = req.body;
  try {
    if (phone_number !== undefined) {
      await db.query('UPDATE users SET phone_number = $1 WHERE id = $2', [phone_number, req.user.id]);
    }
    if (email !== undefined) {
      await db.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);
    }
    
    if (new_password) {
      if (!old_password) return res.status(400).json({ error: 'Current password is required.' });
      const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      const match = await bcrypt.compare(old_password, userRes.rows[0].password_hash);
      if (!match) return res.status(400).json({ error: 'Incorrect current password.' });

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, req.user.id]);
    }

    const result = await db.query('SELECT id, name, email, phone_number, balance, commission_total FROM users WHERE id = $1', [req.user.id]);
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/read', authenticateToken, async (req, res) => {
  const { id } = req.body;
  try {
    if (id) {
       await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    } else {
       await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

app.post('/api/missions/rate', authenticateToken, async (req, res) => {
  const { hotelId, ratings, review, comments } = req.body; 
  try {
    const hotelResult = await db.query('SELECT * FROM hotels WHERE id = $1', [hotelId]);
    const hotel = hotelResult.rows[0];
    if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

    // --- TWO-STAGE DAILY MISSION SYSTEM ---
    // Trial = 30 tasks (exhausts $100 bonus, no commission)
    // Paid day = 66 tasks split into Stage 1 (33) + Stage 2 (33)
    // Stage 2 requires admin unlock via support
    const STAGE_1_LIMIT = 33;
    const DAILY_TOTAL = 66;

    // Check if user already completed full paid set TODAY
    const todayDone = await db.query(
      "SELECT id FROM transactions WHERE user_id = $1 AND type = 'commission' AND note LIKE 'Mission Complete:%' AND note NOT LIKE '%(Trial)' AND created_at::date = CURRENT_DATE",
      [req.user.id]
    );
    if (todayDone.rows.length > 0) {
      return res.status(400).json({ error: 'You have already completed your daily mission set. Come back tomorrow!' });
    }

    // Check trial status
    const trialCheck = await db.query(
      "SELECT id FROM transactions WHERE user_id = $1 AND type = 'trial_fee'",
      [req.user.id]
    );
    const isTrialDone = trialCheck.rows.length > 0;

    // Count how many pending_commissions exist (current cycle progress)
    const completedRes = await db.query(
      "SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'pending_commission'",
      [req.user.id]
    );
    const completedCount = parseInt(completedRes.rows[0].count);

    // Determine mission target
    const missionTarget = !isTrialDone ? 30 : DAILY_TOTAL;

    // If on paid cycle and user has hit Stage 1 limit (33), check for stage 2 unlock
    if (isTrialDone && completedCount >= STAGE_1_LIMIT) {
      const unlockCheck = await db.query(
        "SELECT id FROM mission_stage_unlocks WHERE user_id = $1 AND unlocked_date = CURRENT_DATE",
        [req.user.id]
      );
      if (unlockCheck.rows.length === 0) {
        return res.status(403).json({ 
          error: 'stage2_locked',
          message: 'You have completed Stage 1 (33/33). Please contact Support to unlock Stage 2 and continue earning commissions.'
        });
      }
    }

    // Check if user already rated this hotel
    const alreadyRated = await db.query(
      "SELECT id FROM transactions WHERE user_id = $1 AND note = $2 AND type IN ('pending_commission', 'commission')",
      [req.user.id, `Expert Intelligence Fee: ${hotel.name}`]
    );
    if (alreadyRated.rows.length > 0) {
      return res.status(400).json({ error: 'You have already completed this mission.' });
    }

    // Calculate Average Rating
    let avgRating = 0;
    if (ratings && typeof ratings === 'object') {
        const { service=5, condition=5, amenities=5, value=5, overall } = ratings;
        avgRating = overall || (service + condition + amenities + value) / 4;
    } else {
        avgRating = 5;
    }
    
    const commission = (hotel.commission_rate * (avgRating / 5));
    const fmt = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

    const txNote = `Expert Intelligence Fee: ${hotel.name}`;
    const tx = await db.query(
      'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, 'pending_commission', commission, txNote]
    );

    // Check paid sets count
    const paidSetsQuery = await db.query(
      "SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'commission' AND note LIKE 'Mission Complete:%' AND note NOT LIKE '%(Trial)'",
      [req.user.id]
    );
    const paidSetsCount = parseInt(paidSetsQuery.rows[0].count);

    if (isTrialDone && paidSetsCount >= 5) {
      return res.status(400).json({ error: 'You have exhausted your maximum weekly task limits (5 sets).' });
    }

    let allCompleted = false;
    let totalCredited = 0;

    // If user has completed the target number of missions
    if (completedCount >= missionTarget) {
      allCompleted = true;

      // Sum all pending commissions
      const pendingSum = await db.query(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'pending_commission'",
        [req.user.id]
      );
      totalCredited = parseFloat(pendingSum.rows[0].total);

      // Enforce the progressive payout rule literally (66 = 30, 132 = 60, etc.)
      const scaledPayout = (missionTarget / 66) * 30; 
      if (scaledPayout >= 30) {
         totalCredited = scaledPayout;
      }

      // Delete all individual pending_commission records
      await db.query(
        "DELETE FROM transactions WHERE user_id = $1 AND type = 'pending_commission'",
        [req.user.id]
      );

      if (!isTrialDone) {
        // FIRST SET: No commission credited — trial bonus was the reward
        const bonusRes = await db.query(
          "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'signup_bonus'",
          [req.user.id]
        );
        let bonusAmount = parseFloat(bonusRes.rows[0].total);
        if (bonusAmount <= 0) bonusAmount = 100;

        // Exhaust the trial bonus
        await db.query(
          'UPDATE users SET balance = balance - $1 WHERE id = $2',
          [bonusAmount, req.user.id]
        );
        
        // Ensure Ledger explicitly deducts visually
        await db.query(
          'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4)',
          [req.user.id, 'trial_fee', -bonusAmount, `Mission Complete: ${missionTarget} Assignments Verified (Trial)`]
        );

        totalCredited = 0;

        await db.query(
          'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
          [req.user.id, 'commission_earned', `🎉 First mission set complete! Your ${fmt(bonusAmount)} trial bonus has been used. From your next set, all commissions will be credited directly.`, true]
        );
      } else {
        // SUBSEQUENT SETS: Credit commission normally
        await db.query(
          'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4)',
          [req.user.id, 'commission', totalCredited, `Mission Complete: ${missionTarget} Assignments Verified`]
        );

        await db.query(
          'UPDATE users SET balance = balance + $1, commission_total = commission_total + $1 WHERE id = $2',
          [totalCredited, req.user.id]
        );

        await db.query(
          'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
          [req.user.id, 'commission_earned', `🎉 All ${missionTarget} missions completed! ${fmt(totalCredited)} total commission has been credited to your account.`, true]
        );
      }
    } else {
      // Notify progress — pending
      await db.query(
        'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'commission_earned', `Mission ${completedCount}/${missionTarget} complete. ${fmt(commission)} earned for ${hotel.name} — pending until all missions are done.`, false]
      );
    }

    res.json({ 
      success: true, 
      commission, 
      transaction: tx.rows[0],
      all_completed: allCompleted,
      total_credited: totalCredited,
      completed: completedCount,
      total: missionTarget
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Mission submission failed' });
  }
});

// --- MISSION PROGRESS ---
app.get('/api/user/mission-progress', authenticateToken, async (req, res) => {
  try {
    const STAGE_1_LIMIT = 33;
    const DAILY_TOTAL = 66;

    const trialCheck = await db.query(
      "SELECT id FROM transactions WHERE user_id = $1 AND type = 'trial_fee'",
      [req.user.id]
    );
    const isTrialDone = trialCheck.rows.length > 0;

    const paidSetsQuery = await db.query(
      "SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'commission' AND note LIKE 'Mission Complete:%' AND note NOT LIKE '%(Trial)'",
      [req.user.id]
    );
    const paidSetsCount = parseInt(paidSetsQuery.rows[0].count);

    const missionTarget = !isTrialDone ? 30 : DAILY_TOTAL;

    // Check if user already completed a full PAID set TODAY
    const todayComplete = await db.query(
      "SELECT id FROM transactions WHERE user_id = $1 AND type = 'commission' AND note LIKE 'Mission Complete:%' AND note NOT LIKE '%(Trial)' AND created_at::date = CURRENT_DATE",
      [req.user.id]
    );
    const alreadyDoneToday = todayComplete.rows.length > 0;

    const completedRes = await db.query(
      "SELECT COUNT(*) FROM transactions WHERE user_id = $1 AND type = 'pending_commission'",
      [req.user.id]
    );
    const completedCount = alreadyDoneToday ? missionTarget : parseInt(completedRes.rows[0].count);

    const pendingSum = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = $1 AND type = 'pending_commission'",
      [req.user.id]
    );
    const pendingTotal = parseFloat(pendingSum.rows[0].total);

    // Check stage 2 unlock for today
    const stage2Unlock = await db.query(
      "SELECT id FROM mission_stage_unlocks WHERE user_id = $1 AND unlocked_date = CURRENT_DATE",
      [req.user.id]
    );
    const stage2Unlocked = stage2Unlock.rows.length > 0;

    // Determine current stage
    let currentStage = 1;
    if (isTrialDone && completedCount >= STAGE_1_LIMIT) currentStage = 2;

    const completedHotels = await db.query(
      "SELECT note FROM transactions WHERE user_id = $1 AND type = 'pending_commission'",
      [req.user.id]
    );
    const completedHotelNames = completedHotels.rows.map(r => r.note.replace('Expert Intelligence Fee: ', ''));

    res.json({
      completed: completedCount,
      total: missionTarget,
      pending_total: pendingTotal,
      completed_hotels: completedHotelNames,
      all_done: alreadyDoneToday,
      is_trial: !isTrialDone,
      stage: currentStage,
      stage2_unlocked: stage2Unlocked,
      stage1_limit: STAGE_1_LIMIT
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mission progress' });
  }
});

// --- ADMIN: UNLOCK STAGE 2 FOR A USER ---
app.post('/api/admin/unlock-stage2', authenticateToken, async (req, res) => {
  try {
    // Only admins can call this
    const adminCheck = await db.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!adminCheck.rows[0] || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    await db.query(
      `INSERT INTO mission_stage_unlocks (user_id, unlocked_date, unlocked_by)
       VALUES ($1, CURRENT_DATE, $2)
       ON CONFLICT (user_id, unlocked_date) DO NOTHING`,
      [userId, req.user.id]
    );

    // Notify the user
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [userId, 'system', '🔓 Stage 2 has been unlocked by support! You can now continue your remaining 33 missions.', true]
    );

    res.json({ success: true, message: `Stage 2 unlocked for user ${userId} today.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to unlock stage 2.' });
  }
});

// --- MISSION HOTELS (Randomized daily subset per user) ---
app.get('/api/user/mission-hotels', authenticateToken, async (req, res) => {
  try {
    // Generate a fixed daily seed for this user
    const seed = `${req.user.id}-${new Date().toISOString().slice(0, 10)}`;
    const result = await db.query(
      'SELECT id, name, city, country, image, price, commission_rate FROM hotels ORDER BY md5(id || $1) LIMIT 400',
      [seed]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch mission hotels' });
  }
});

// --- WITHDRAWAL REQUEST (creates pending_requests record) ---
app.post('/api/user/withdraw', authenticateToken, async (req, res) => {
  const { amount, method, destination_details } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount.' });
  }
  try {
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const currentBalance = parseFloat(user.balance);
    const withdrawAmount = parseFloat(amount);

    if (withdrawAmount > currentBalance) {
      return res.status(400).json({ error: 'Insufficient balance. You cannot withdraw more than your available funds.' });
    }

    // Store as PENDING — admin must approve before balance changes
    await db.query(
      `INSERT INTO pending_requests (user_id, type, amount, method, destination_details, status)
       VALUES ($1, 'withdrawal', $2, $3, $4, 'pending')`,
      [req.user.id, withdrawAmount, method || 'Bank Transfer', JSON.stringify(destination_details || {})]
    );

    // Notify user request is under review
    const fmtUSD = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'withdrawal_pending', `Withdrawal request of ${fmtUSD(withdrawAmount)} via ${method || 'Bank Transfer'} is under review.`, false]
    );

    res.json({ success: true, message: 'Withdrawal request submitted. Pending admin approval.', current_balance: currentBalance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Withdrawal request failed. Please try again.' });
  }
});

// --- DEPOSIT REQUEST (creates pending_requests record) ---
app.post('/api/user/request-deposit', authenticateToken, async (req, res) => {
  const { amount, source_type, source_details } = req.body;
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }
  try {
    await db.query(
      `INSERT INTO pending_requests (user_id, type, amount, method, destination_details, status)
       VALUES ($1, 'deposit', $2, $3, $4, 'pending')`,
      [req.user.id, parseFloat(amount), source_type || 'Bank Transfer', JSON.stringify(source_details || {})]
    );

    const fmtUSD = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'deposit_pending', `Deposit request of ${fmtUSD(parseFloat(amount))} via ${source_type || 'Bank Transfer'} is under review.`, false]
    );

    res.json({ success: true, message: 'Deposit request submitted. Pending admin approval.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deposit request failed. Please try again.' });
  }
});

// Legacy funding source link (kept for compatibility)
app.post('/api/user/funding-source', authenticateToken, async (req, res) => {
  const { source_type } = req.body;
  if (!source_type) return res.status(400).json({ error: 'Source type is required.' });
  try {
    const fmt = t => t.charAt(0).toUpperCase() + t.slice(1);
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'funding_linked', `Funding source linked: ${fmt(source_type)}. You are now set up to receive payouts.`, false]
    );
    res.json({ success: true, message: 'Funding source linked successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to link funding source.' });
  }
});

// --- CHAT ROUTES ---
app.get('/api/chats', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const { guest_id } = req.query;

  try {
    if (token) {
      const user = jwt.verify(token, JWT_SECRET);
      const result = await db.query('SELECT * FROM chats WHERE user_id = $1 ORDER BY timestamp ASC', [user.id]);
      return res.json(result.rows);
    } else if (guest_id) {
      const result = await db.query('SELECT * FROM chats WHERE guest_id = $1 ORDER BY timestamp ASC', [guest_id]);
      return res.json(result.rows);
    }
    res.json([]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.post('/api/chats', async (req, res) => {
  const { text, isFirst, guest_id, guest_name, sender: requestedSender } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  try {
    let userId = null;
    let gid = guest_id;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* Invalid token, proceed as guest if gid exists */ }
    }

    // If a guest_name was provided, upsert into guest_sessions for admin display
    if (gid && guest_name) {
      await db.query(
        `INSERT INTO guest_sessions (guest_id, name) VALUES ($1, $2)
         ON CONFLICT (guest_id) DO UPDATE SET name = EXCLUDED.name`,
        [gid, guest_name]
      );
    }

    // Allow explicit sender override (e.g. 'agent' for Maya auto-replies),
    // but only trust 'agent' — everything else defaults to 'you'.
    const sender = requestedSender === 'agent' ? 'agent' : 'you';

    const result = await db.query(
      'INSERT INTO chats (user_id, guest_id, sender, text) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, gid, sender, text]
    );

    if (isFirst && sender !== 'agent') {
      await db.query(
        'INSERT INTO notifications (user_id, guest_id, type, preview, is_alert) VALUES ($1, $2, $3, $4, $5)',
        [userId, gid, 'chat_engagement', text, true]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Message sending failed' });
  }
});

// --- ADMIN ROUTES (SIMULATED) ---
app.post('/api/admin/hotels', authenticateToken, isAdmin, async (req, res) => {
  const { name, city, country, price, commission_rate, category, image } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO hotels (name, city, country, price, commission_rate, category, image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, city, country, price, commission_rate, category, image]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create property' });
  }
});

app.put('/api/admin/hotels/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, city, country, price, commission_rate, category, image } = req.body;
  try {
    const result = await db.query(
      'UPDATE hotels SET name = $1, city = $2, country = $3, price = $4, commission_rate = $5, category = $6, image = $7 WHERE id = $8 RETURNING *',
      [name, city, country, price, commission_rate, category, image, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update property' });
  }
});

app.delete('/api/admin/hotels/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM hotels WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// --- ADMIN: USER LEDGER MANAGEMENT ---
// List all users with balances
app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.balance,
        COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = u.id AND amount > 0), 0) as total_credits,
        COALESCE((SELECT SUM(ABS(amount)) FROM transactions WHERE user_id = u.id AND amount < 0), 0) as total_debits,
        (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as tx_count,
        u.created_at
      FROM users u
      WHERE u.is_admin = false
      ORDER BY u.name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Credit a user (deposit / fund approval)
app.post('/api/admin/credit', authenticateToken, isAdmin, async (req, res) => {
  const { user_id, amount, note } = req.body;
  if (!user_id || !amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid user_id and positive amount are required.' });
  }
  try {
    const creditAmount = parseFloat(amount);
    // Update balance
    await db.query('UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [creditAmount, user_id]);
    // Record transaction
    const tx = await db.query(
      'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, 'admin_credit', creditAmount, note || 'Admin credit applied']
    );
    // Notify user
    const fmtUSD = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [user_id, 'deposit_approved', `Deposit of ${fmtUSD(creditAmount)} has been approved and credited to your account.`, true]
    );
    // Get updated balance
    const updated = await db.query('SELECT balance FROM users WHERE id = $1', [user_id]);
    res.json({ success: true, transaction: tx.rows[0], new_balance: parseFloat(updated.rows[0].balance) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Credit operation failed.' });
  }
});

// Debit a user (withdrawal approval)
app.post('/api/admin/debit', authenticateToken, isAdmin, async (req, res) => {
  const { user_id, amount, note } = req.body;
  if (!user_id || !amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Valid user_id and positive amount are required.' });
  }
  try {
    const debitAmount = parseFloat(amount);
    // Verify sufficient balance
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    const currentBalance = parseFloat(userRes.rows[0].balance) || 0;
    if (debitAmount > currentBalance) {
      return res.status(400).json({ error: `Insufficient balance. User has ${currentBalance.toFixed(2)} available.` });
    }
    // Update balance
    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [debitAmount, user_id]);
    // Record transaction
    const tx = await db.query(
      'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, 'admin_debit', -debitAmount, note || 'Admin debit applied']
    );
    // Notify user
    const fmtUSD = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [user_id, 'withdrawal_approved', `Withdrawal of ${fmtUSD(debitAmount)} has been approved and dispatched.`, true]
    );
    // Get updated balance
    const updated = await db.query('SELECT balance FROM users WHERE id = $1', [user_id]);
    res.json({ success: true, transaction: tx.rows[0], new_balance: parseFloat(updated.rows[0].balance) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Debit operation failed.' });
  }
});

app.get('/api/admin/notifications', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT n.*, u.name as user_name FROM notifications n JOIN users u ON n.user_id = u.id ORDER BY n.created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Admin fetch failed' });
  }
});

app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const usersCount = await db.query('SELECT COUNT(*) FROM users WHERE is_admin = false');
    const missions = await db.query("SELECT COUNT(*) FROM transactions WHERE type='commission' AND created_at > now() - interval '1 hour'");
    
    const chats = await db.query(`
      SELECT 
        COALESCE(u.name, 'Guest: ' || LEFT(c.guest_id, 8)) as name,
        (SELECT text FROM chats WHERE (user_id = c.user_id OR guest_id = c.guest_id) ORDER BY timestamp DESC LIMIT 1) as last_msg
      FROM (SELECT DISTINCT user_id, guest_id FROM chats) c
      LEFT JOIN users u ON c.user_id = u.id
      ORDER BY (SELECT timestamp FROM chats WHERE (user_id = c.user_id OR guest_id = c.guest_id) ORDER BY timestamp DESC LIMIT 1) DESC
      LIMIT 3
    `);

    const recentEvents = await db.query(`
      (SELECT 'signup' as type, name, created_at FROM users WHERE is_admin = false ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT 'commission' as type, u.name, t.created_at FROM transactions t JOIN users u ON t.user_id = u.id WHERE t.type='commission' ORDER BY t.created_at DESC LIMIT 5)
      ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      total_experts: parseInt(usersCount.rows[0].count),
      mission_volume: parseInt(missions.rows[0].count),
      active_chats: chats.rows,
      recent_events: recentEvents.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats fetch failed' });
  }
});

app.post('/api/admin/clear-alerts', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_alert = false');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Admin cleanup failed' });
  }
});

// --- ADMIN: PENDING REQUESTS (withdrawals & deposits) ---
app.get('/api/admin/pending-requests', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Ensure pending_requests table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS pending_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        method VARCHAR(100),
        destination_details JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    const result = await db.query(`
      SELECT pr.*, u.name as user_name, u.email as user_email, u.balance as user_balance
      FROM pending_requests pr
      JOIN users u ON pr.user_id = u.id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
});

app.post('/api/admin/approve-request', authenticateToken, isAdmin, async (req, res) => {
  const { request_id, admin_note } = req.body;
  if (!request_id) return res.status(400).json({ error: 'request_id required.' });
  try {
    const reqRes = await db.query('SELECT * FROM pending_requests WHERE id = $1', [request_id]);
    const pr = reqRes.rows[0];
    if (!pr) return res.status(404).json({ error: 'Request not found.' });
    if (pr.status !== 'pending') return res.status(400).json({ error: `Request already ${pr.status}.` });

    const fmtUSD = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    const amount = parseFloat(pr.amount);

    if (pr.type === 'withdrawal') {
      // Deduct balance
      const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [pr.user_id]);
      const currentBal = parseFloat(userRes.rows[0].balance);
      if (amount > currentBal) return res.status(400).json({ error: `Insufficient balance (${fmtUSD(currentBal)} available).` });

      await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, pr.user_id]);
      await db.query(
        'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4)',
        [pr.user_id, 'admin_debit', -amount, admin_note || `Withdrawal approved via ${pr.method}`]
      );
      await db.query(
        'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
        [pr.user_id, 'withdrawal_approved', `Withdrawal of ${fmtUSD(amount)} via ${pr.method} has been approved and dispatched.`, true]
      );
    } else if (pr.type === 'deposit') {
      // Credit balance
      await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, pr.user_id]);
      await db.query(
        'INSERT INTO transactions (user_id, type, amount, note) VALUES ($1, $2, $3, $4)',
        [pr.user_id, 'admin_credit', amount, admin_note || `Deposit approved via ${pr.method}`]
      );
      await db.query(
        'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
        [pr.user_id, 'deposit_approved', `Deposit of ${fmtUSD(amount)} via ${pr.method} has been approved and credited.`, true]
      );
    }

    await db.query(
      'UPDATE pending_requests SET status = $1, admin_note = $2, resolved_at = NOW() WHERE id = $3',
      ['approved', admin_note || null, request_id]
    );

    const updated = await db.query('SELECT balance FROM users WHERE id = $1', [pr.user_id]);
    res.json({ success: true, new_balance: parseFloat(updated.rows[0].balance) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Approval failed.' });
  }
});

app.post('/api/admin/reject-request', authenticateToken, isAdmin, async (req, res) => {
  const { request_id, admin_note } = req.body;
  if (!request_id) return res.status(400).json({ error: 'request_id required.' });
  try {
    const reqRes = await db.query('SELECT * FROM pending_requests WHERE id = $1', [request_id]);
    const pr = reqRes.rows[0];
    if (!pr) return res.status(404).json({ error: 'Request not found.' });
    if (pr.status !== 'pending') return res.status(400).json({ error: `Request already ${pr.status}.` });

    await db.query(
      'UPDATE pending_requests SET status = $1, admin_note = $2, resolved_at = NOW() WHERE id = $3',
      ['rejected', admin_note || null, request_id]
    );

    const fmtUSD = v => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    await db.query(
      'INSERT INTO notifications (user_id, type, preview, is_alert) VALUES ($1, $2, $3, $4)',
      [pr.user_id, `${pr.type}_rejected`, `Your ${pr.type} request of ${fmtUSD(parseFloat(pr.amount))} was not approved. ${admin_note || ''}`, true]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Rejection failed.' });
  }
});


// All open conversations (one summary row per user/guest)
app.get('/api/admin/conversations', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(CAST(c.user_id AS VARCHAR), c.guest_id) as conversation_id,
        c.user_id, c.guest_id,
        COALESCE(u.name, gs.name, 'Guest: ' || LEFT(c.guest_id, 8)) as user_name, 
        u.email,
        (SELECT text FROM chats WHERE (user_id = c.user_id OR guest_id = c.guest_id) ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT sender FROM chats WHERE (user_id = c.user_id OR guest_id = c.guest_id) ORDER BY timestamp DESC LIMIT 1) as last_sender,
        (SELECT timestamp FROM chats WHERE (user_id = c.user_id OR guest_id = c.guest_id) ORDER BY timestamp DESC LIMIT 1) as last_ts,
        (SELECT COUNT(*) FROM chats WHERE (user_id = c.user_id OR guest_id = c.guest_id)) as message_count
      FROM (SELECT DISTINCT user_id, guest_id FROM chats) c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN guest_sessions gs ON c.guest_id = gs.guest_id
      ORDER BY last_ts DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Full thread for a specific user or guest
app.get('/api/admin/conversations/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const isNumeric = /^\d+$/.test(id);
  try {
    let result;
    if (isNumeric) {
      result = await db.query(
        'SELECT c.*, u.name as user_name FROM chats c LEFT JOIN users u ON c.user_id = u.id WHERE c.user_id = $1 OR c.guest_id = $2 ORDER BY c.timestamp ASC',
        [id, id]
      );
    } else {
      result = await db.query(
        'SELECT c.*, NULL as user_name FROM chats c WHERE c.guest_id = $1 ORDER BY c.timestamp ASC',
        [id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Admin sends a reply into a user or guest thread
app.post('/api/admin/conversations/:id/reply', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const isNumeric = /^\d+$/.test(id);
  try {
    let result;
    if (isNumeric) {
      result = await db.query(
        'INSERT INTO chats (user_id, sender, text) VALUES ($1, $2, $3) RETURNING *',
        [id, 'agent', text]
      );
    } else {
      result = await db.query(
        'INSERT INTO chats (guest_id, sender, text) VALUES ($1, $2, $3) RETURNING *',
        [id, 'agent', text]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Reply failed' });
  }
});

// Admin ends a chat — deletes all messages for that conversation
app.delete('/api/admin/conversations/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const isNumeric = /^\d+$/.test(id);
  try {
    if (isNumeric) {
      await db.query('DELETE FROM chats WHERE user_id = $1', [id]);
    } else {
      await db.query('DELETE FROM chats WHERE guest_id = $1', [id]);
      await db.query('DELETE FROM guest_sessions WHERE guest_id = $1', [id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to end chat' });
  }
});

// Admin deletes a single message by its DB id
app.delete('/api/admin/messages/:msgId', authenticateToken, isAdmin, async (req, res) => {
  const { msgId } = req.params;
  try {
    const result = await db.query('DELETE FROM chats WHERE id = $1 RETURNING id', [msgId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Admin bulk-deletes messages by an array of ids
app.delete('/api/admin/messages', authenticateToken, isAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  try {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    await db.query(`DELETE FROM chats WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// --- ADMIN: PLATFORM SETTINGS ---
// Public read (for withdrawal page fee display)
app.get('/api/settings', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM platform_settings');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.get('/api/admin/settings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM platform_settings');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.put('/api/admin/settings', authenticateToken, isAdmin, async (req, res) => {
  const { withdrawal_fee_type, withdrawal_fee_value } = req.body;
  try {
    if (withdrawal_fee_type !== undefined) {
      await db.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ('withdrawal_fee_type', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [withdrawal_fee_type]
      );
    }
    if (withdrawal_fee_value !== undefined) {
      await db.query(
        `INSERT INTO platform_settings (key, value, updated_at) VALUES ('withdrawal_fee_value', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [String(withdrawal_fee_value)]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

app.get('/api/admin/invite-codes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ic.*, u.name as used_by_name FROM invite_codes ic
       LEFT JOIN users u ON ic.used_by_user_id = u.id
       ORDER BY ic.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invite codes' });
  }
});

app.post('/api/admin/invite-codes', authenticateToken, isAdmin, async (req, res) => {
  const { code, label } = req.body;
  const finalCode = (code || Math.random().toString(36).substring(2, 10)).toUpperCase();
  try {
    const result = await db.query(
      'INSERT INTO invite_codes (code, label) VALUES ($1, $2) RETURNING *',
      [finalCode, label || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Code already exists or database error' });
  }
});

app.delete('/api/admin/invite-codes/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM invite_codes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// --- SERVER STARTUP ---
(async () => {
  try {
    // Ensure pending_requests table exists before any route fires
    await db.query(`
      CREATE TABLE IF NOT EXISTS pending_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(20) NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        method VARCHAR(100),
        destination_details JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);
    // Ensure guest_sessions table exists for storing guest names
    await db.query(`
      CREATE TABLE IF NOT EXISTS guest_sessions (
        guest_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Ensure platform_settings table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Seed defaults if not set
    await db.query(`
      INSERT INTO platform_settings (key, value) VALUES ('withdrawal_fee_type', 'fixed'), ('withdrawal_fee_value', '0')
      ON CONFLICT (key) DO NOTHING
    `);
    // Ensure mission_stage_unlocks table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS mission_stage_unlocks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        unlocked_date DATE NOT NULL DEFAULT CURRENT_DATE,
        unlocked_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, unlocked_date)
      )
    `);
    console.log('\u2713 pending_requests table ready');
    console.log('\u2713 guest_sessions table ready');
    console.log('\u2713 platform_settings table ready');
    console.log('\u2713 mission_stage_unlocks table ready');
  } catch (err) {
    console.error('DB init error:', err.message);
  }

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log(`Windsor Grove API running on http://localhost:${PORT}`);
    });
  }
})();

module.exports = app;
