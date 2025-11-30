import express from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Valid setting keys that can be stored
const VALID_SETTING_KEYS = [
  'visual_config',      // Node size, font size, link width
  'physics_config',     // Graph physics settings
  'active_countries',   // Country filter toggles
];

/**
 * Get all settings for the authenticated user
 * GET /api/settings
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const settings = await db.all(
      'SELECT setting_key, setting_value, updated_at FROM user_settings WHERE user_id = ?',
      [req.user.id]
    );

    // Convert array to object for easier consumption
    const settingsObject = {};
    settings.forEach(s => {
      try {
        settingsObject[s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        settingsObject[s.setting_key] = s.setting_value;
      }
    });

    res.json({ settings: settingsObject });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Failed to get settings',
      message: error.message
    });
  }
});

/**
 * Get a specific setting
 * GET /api/settings/:key
 */
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;

    if (!VALID_SETTING_KEYS.includes(key)) {
      return res.status(400).json({
        error: 'Invalid setting key',
        message: `Valid keys are: ${VALID_SETTING_KEYS.join(', ')}`
      });
    }

    const db = getDatabase();

    const setting = await db.get(
      'SELECT setting_value, updated_at FROM user_settings WHERE user_id = ? AND setting_key = ?',
      [req.user.id, key]
    );

    if (!setting) {
      return res.status(404).json({
        error: 'Setting not found',
        message: `No setting found for key: ${key}`
      });
    }

    let value;
    try {
      value = JSON.parse(setting.setting_value);
    } catch {
      value = setting.setting_value;
    }

    res.json({
      key,
      value,
      updatedAt: setting.updated_at
    });
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({
      error: 'Failed to get setting',
      message: error.message
    });
  }
});

/**
 * Create or update a setting
 * PUT /api/settings/:key
 */
router.put('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!VALID_SETTING_KEYS.includes(key)) {
      return res.status(400).json({
        error: 'Invalid setting key',
        message: `Valid keys are: ${VALID_SETTING_KEYS.join(', ')}`
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Value is required'
      });
    }

    const db = getDatabase();
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Upsert: insert or update if exists
    await db.run(`
      INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, setting_key)
      DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
    `, [req.user.id, key, serializedValue]);

    res.json({
      message: 'Setting saved successfully',
      key,
      value
    });
  } catch (error) {
    console.error('Save setting error:', error);
    res.status(500).json({
      error: 'Failed to save setting',
      message: error.message
    });
  }
});

/**
 * Bulk update settings
 * PUT /api/settings
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Settings object is required'
      });
    }

    const db = getDatabase();
    const results = [];

    for (const [key, value] of Object.entries(settings)) {
      if (!VALID_SETTING_KEYS.includes(key)) {
        results.push({ key, success: false, error: 'Invalid key' });
        continue;
      }

      try {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

        await db.run(`
          INSERT INTO user_settings (user_id, setting_key, setting_value, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, setting_key)
          DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, key, serializedValue]);

        results.push({ key, success: true });
      } catch (error) {
        results.push({ key, success: false, error: error.message });
      }
    }

    res.json({
      message: 'Bulk update completed',
      results
    });
  } catch (error) {
    console.error('Bulk save settings error:', error);
    res.status(500).json({
      error: 'Failed to save settings',
      message: error.message
    });
  }
});

/**
 * Delete a setting
 * DELETE /api/settings/:key
 */
router.delete('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;

    if (!VALID_SETTING_KEYS.includes(key)) {
      return res.status(400).json({
        error: 'Invalid setting key',
        message: `Valid keys are: ${VALID_SETTING_KEYS.join(', ')}`
      });
    }

    const db = getDatabase();

    const result = await db.run(
      'DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?',
      [req.user.id, key]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Setting not found',
        message: `No setting found for key: ${key}`
      });
    }

    res.json({
      message: 'Setting deleted successfully',
      key
    });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({
      error: 'Failed to delete setting',
      message: error.message
    });
  }
});

export default router;
