import express from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get all custom links for the authenticated user
 * GET /api/custom-links
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const links = await db.all(
      `SELECT id, from_node as "from", to_node as "to", forward_cost as forwardCost,
              reverse_cost as reverseCost, created_at as createdAt
       FROM custom_links WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({ customLinks: links });
  } catch (error) {
    console.error('Get custom links error:', error);
    res.status(500).json({
      error: 'Failed to get custom links',
      message: error.message
    });
  }
});

/**
 * Create a new custom link
 * POST /api/custom-links
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { from, to, forwardCost, reverseCost } = req.body;

    // Validation
    if (!from || !to) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'From and to nodes are required'
      });
    }

    if (from === to) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Cannot create a link from a node to itself'
      });
    }

    const fwdCost = parseInt(forwardCost) || 10;
    const revCost = parseInt(reverseCost) || 10;

    if (fwdCost < 1 || revCost < 1) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Costs must be positive integers'
      });
    }

    const db = getDatabase();

    // Check for duplicate link
    const existing = await db.get(
      `SELECT id FROM custom_links
       WHERE user_id = ? AND ((from_node = ? AND to_node = ?) OR (from_node = ? AND to_node = ?))`,
      [req.user.id, from, to, to, from]
    );

    if (existing) {
      return res.status(409).json({
        error: 'Link already exists',
        message: 'A custom link between these nodes already exists'
      });
    }

    // Generate unique ID
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await db.run(
      `INSERT INTO custom_links (id, user_id, from_node, to_node, forward_cost, reverse_cost)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, from, to, fwdCost, revCost]
    );

    // Get the created link
    const link = await db.get(
      `SELECT id, from_node as "from", to_node as "to", forward_cost as forwardCost,
              reverse_cost as reverseCost, created_at as createdAt
       FROM custom_links WHERE id = ?`,
      [id]
    );

    res.status(201).json({
      message: 'Custom link created successfully',
      customLink: link
    });
  } catch (error) {
    console.error('Create custom link error:', error);
    res.status(500).json({
      error: 'Failed to create custom link',
      message: error.message
    });
  }
});

/**
 * Update a custom link
 * PUT /api/custom-links/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { forwardCost, reverseCost } = req.body;

    const fwdCost = parseInt(forwardCost);
    const revCost = parseInt(reverseCost);

    if (isNaN(fwdCost) || isNaN(revCost) || fwdCost < 1 || revCost < 1) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Costs must be positive integers'
      });
    }

    const db = getDatabase();

    // Check ownership
    const existing = await db.get(
      'SELECT id FROM custom_links WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({
        error: 'Link not found',
        message: 'Custom link not found or you do not have access'
      });
    }

    await db.run(
      'UPDATE custom_links SET forward_cost = ?, reverse_cost = ? WHERE id = ?',
      [fwdCost, revCost, id]
    );

    const link = await db.get(
      `SELECT id, from_node as "from", to_node as "to", forward_cost as forwardCost,
              reverse_cost as reverseCost, created_at as createdAt
       FROM custom_links WHERE id = ?`,
      [id]
    );

    res.json({
      message: 'Custom link updated successfully',
      customLink: link
    });
  } catch (error) {
    console.error('Update custom link error:', error);
    res.status(500).json({
      error: 'Failed to update custom link',
      message: error.message
    });
  }
});

/**
 * Delete a custom link
 * DELETE /api/custom-links/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.run(
      'DELETE FROM custom_links WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Link not found',
        message: 'Custom link not found or you do not have access'
      });
    }

    res.json({
      message: 'Custom link deleted successfully',
      id
    });
  } catch (error) {
    console.error('Delete custom link error:', error);
    res.status(500).json({
      error: 'Failed to delete custom link',
      message: error.message
    });
  }
});

/**
 * Delete all custom links for the user
 * DELETE /api/custom-links
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const result = await db.run(
      'DELETE FROM custom_links WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      message: 'All custom links deleted successfully',
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('Delete all custom links error:', error);
    res.status(500).json({
      error: 'Failed to delete custom links',
      message: error.message
    });
  }
});

/**
 * Bulk import custom links
 * POST /api/custom-links/bulk
 */
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { links } = req.body;

    if (!Array.isArray(links)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Links must be an array'
      });
    }

    const db = getDatabase();
    const results = [];

    for (const link of links) {
      const { from, to, forwardCost, reverseCost } = link;

      if (!from || !to || from === to) {
        results.push({ from, to, success: false, error: 'Invalid nodes' });
        continue;
      }

      const fwdCost = parseInt(forwardCost) || 10;
      const revCost = parseInt(reverseCost) || 10;

      try {
        // Check for existing link
        const existing = await db.get(
          `SELECT id FROM custom_links
           WHERE user_id = ? AND ((from_node = ? AND to_node = ?) OR (from_node = ? AND to_node = ?))`,
          [req.user.id, from, to, to, from]
        );

        if (existing) {
          results.push({ from, to, success: false, error: 'Link already exists' });
          continue;
        }

        const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await db.run(
          `INSERT INTO custom_links (id, user_id, from_node, to_node, forward_cost, reverse_cost)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [id, req.user.id, from, to, fwdCost, revCost]
        );

        results.push({ from, to, success: true, id });
      } catch (error) {
        results.push({ from, to, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      message: `Imported ${successCount} of ${links.length} links`,
      results
    });
  } catch (error) {
    console.error('Bulk import custom links error:', error);
    res.status(500).json({
      error: 'Failed to import custom links',
      message: error.message
    });
  }
});

export default router;
