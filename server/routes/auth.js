import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase, createSession, revokeSession, revokeAllUserSessions, getUserSessions, addPasswordToHistory, isPasswordInHistory } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateEmail, validatePassword, validateUsername } from '../utils/validation.js';

const router = express.Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username, email, and password are required'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    // Validate username
    if (!validateUsername(username)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Username must be 3-30 characters, alphanumeric with underscores/hyphens'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Validation error',
        message: passwordValidation.message
      });
    }

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: 'Email or username is already registered'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, fullName || null]
    );

    // Add password to history
    await addPasswordToHistory(result.lastID, passwordHash);

    // Log audit event
    await db.run(
      'INSERT INTO audit_log (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [result.lastID, 'USER_REGISTERED', req.ip, req.get('user-agent')]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.lastID, username, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Create session tracking
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    await createSession(result.lastID, tokenHash, expiresAt.toISOString(), req.ip, req.get('user-agent'));

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.lastID,
        username,
        email,
        fullName: fullName || null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

/**
 * Login user
 * POST /api/auth/login
 * Supports login with either email or username
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = email || username;

    // Validation
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email/username and password are required'
      });
    }

    const db = getDatabase();

    // Find user by email or username - include login tracking fields
    const user = await db.get(
      'SELECT id, username, email, password_hash, full_name, role, is_active, login_count, login_count_since_pwd_change, must_change_password FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Log failed login attempt
      await db.run(
        'INSERT INTO audit_log (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'LOGIN_FAILED', req.ip, req.get('user-agent'), 'Invalid password']
      );

      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if user must change password
    if (user.must_change_password === 1) {
      return res.status(403).json({
        error: 'Password change required',
        message: 'You must change your password before logging in',
        mustChangePassword: true
      });
    }

    // Check login count limit (10 logins max before password change required)
    const MAX_LOGINS_BEFORE_PASSWORD_CHANGE = 10;
    const currentLoginCountSincePwdChange = user.login_count_since_pwd_change || 0;

    if (currentLoginCountSincePwdChange >= MAX_LOGINS_BEFORE_PASSWORD_CHANGE) {
      // Set must_change_password flag
      await db.run(
        'UPDATE users SET must_change_password = 1 WHERE id = ?',
        [user.id]
      );

      // Log the enforcement
      await db.run(
        'INSERT INTO audit_log (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
        [user.id, 'PASSWORD_CHANGE_REQUIRED', req.ip, req.get('user-agent'), 'Max login count reached']
      );

      return res.status(403).json({
        error: 'Password change required',
        message: `You have reached the maximum number of logins (${MAX_LOGINS_BEFORE_PASSWORD_CHANGE}). Please change your password to continue.`,
        mustChangePassword: true,
        loginCount: currentLoginCountSincePwdChange
      });
    }

    // Increment login counters
    const newLoginCount = (user.login_count || 0) + 1;
    const newLoginCountSincePwdChange = currentLoginCountSincePwdChange + 1;

    await db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_count = ?, login_count_since_pwd_change = ? WHERE id = ?',
      [newLoginCount, newLoginCountSincePwdChange, user.id]
    );

    // Log successful login
    await db.run(
      'INSERT INTO audit_log (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN_SUCCESS', req.ip, req.get('user-agent')]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Create session tracking
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    await createSession(user.id, tokenHash, expiresAt.toISOString(), req.ip, req.get('user-agent'));

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        loginCount: newLoginCount,
        loginCountSincePwdChange: newLoginCountSincePwdChange,
        loginsRemaining: MAX_LOGINS_BEFORE_PASSWORD_CHANGE - newLoginCountSincePwdChange
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * Verify token and get user info
 * GET /api/auth/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    
    const user = await db.get(
      'SELECT id, username, email, full_name, role, created_at, last_login, login_count, login_count_since_pwd_change, must_change_password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Calculate logins remaining before password change required
    const MAX_LOGINS_BEFORE_PASSWORD_CHANGE = 10;
    const loginCountSincePwdChange = user.login_count_since_pwd_change || 0;
    const loginsRemaining = MAX_LOGINS_BEFORE_PASSWORD_CHANGE - loginCountSincePwdChange;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        loginCount: user.login_count,
        loginCountSincePwdChange: loginCountSincePwdChange,
        loginsRemaining: loginsRemaining,
        mustChangePassword: user.must_change_password === 1
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user information'
    });
  }
});

/**
 * Logout (optional - mainly for client-side token removal)
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    
    // Revoke session if token provided
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      await revokeSession(tokenHash);
    }
    
    // Log logout event
    await db.run(
      'INSERT INTO audit_log (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [req.user.id, 'LOGOUT', req.ip, req.get('user-agent')]
    );

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

/**
 * Change password
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Current password and new password are required'
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Validation error',
        message: passwordValidation.message
      });
    }

    const db = getDatabase();

    // Get user's current password hash
    const user = await db.get(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Check if new password was used recently
    const isInHistory = await isPasswordInHistory(req.user.id, newPassword);
    if (isInHistory) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'You cannot reuse one of your last 5 passwords. Please choose a different password.'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Add new password to history
    await addPasswordToHistory(req.user.id, newPasswordHash);

    // Update password and reset login counters
    await db.run(
      `UPDATE users SET 
        password_hash = ?, 
        password_changed_at = CURRENT_TIMESTAMP,
        login_count_since_pwd_change = 0,
        must_change_password = 0,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [newPasswordHash, req.user.id]
    );

    // Revoke all existing sessions (force re-login)
    const revokedCount = await revokeAllUserSessions(req.user.id);

    // Log password change
    await db.run(
      'INSERT INTO audit_log (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'PASSWORD_CHANGED', req.ip, req.get('user-agent'), `User changed password, ${revokedCount} sessions revoked, login counter reset`]
    );

    res.json({ 
      message: 'Password changed successfully. Please login again.',
      loginCountReset: true,
      sessionsRevoked: revokedCount
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password'
    });
  }
});

/**
 * Get active sessions for current user
 * GET /api/auth/sessions
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await getUserSessions(req.user.id);
    res.json({ sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions'
    });
  }
});

/**
 * Revoke all sessions (force logout from all devices)
 * POST /api/auth/revoke-all-sessions
 */
router.post('/revoke-all-sessions', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const revokedCount = await revokeAllUserSessions(req.user.id);
    
    // Log the action
    await db.run(
      'INSERT INTO audit_log (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'ALL_SESSIONS_REVOKED', req.ip, req.get('user-agent'), `Revoked ${revokedCount} sessions`]
    );

    res.json({ 
      message: 'All sessions revoked successfully',
      revokedCount 
    });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    res.status(500).json({
      error: 'Failed to revoke sessions'
    });
  }
});

export default router;
