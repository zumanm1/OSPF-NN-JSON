import express from 'express';
import { getDatabase } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Valid scenario modes
const VALID_MODES = ['single', 'multi', 'cascade'];

/**
 * Get all failure scenarios for the authenticated user
 * GET /api/scenarios
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const scenarios = await db.all(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios WHERE user_id = ? ORDER BY updated_at DESC`,
      [req.user.id]
    );

    // Parse JSON fields
    const parsed = scenarios.map(s => ({
      ...s,
      failedNodes: JSON.parse(s.failedNodes),
      failedEdges: JSON.parse(s.failedEdges)
    }));

    res.json({ scenarios: parsed });
  } catch (error) {
    console.error('Get scenarios error:', error);
    res.status(500).json({
      error: 'Failed to get scenarios',
      message: error.message
    });
  }
});

/**
 * Get a specific scenario by ID
 * GET /api/scenarios/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const scenario = await db.get(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (!scenario) {
      return res.status(404).json({
        error: 'Scenario not found',
        message: 'Scenario not found or you do not have access'
      });
    }

    res.json({
      scenario: {
        ...scenario,
        failedNodes: JSON.parse(scenario.failedNodes),
        failedEdges: JSON.parse(scenario.failedEdges)
      }
    });
  } catch (error) {
    console.error('Get scenario error:', error);
    res.status(500).json({
      error: 'Failed to get scenario',
      message: error.message
    });
  }
});

/**
 * Create a new failure scenario
 * POST /api/scenarios
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, failedNodes, failedEdges, mode } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name is required'
      });
    }

    if (!Array.isArray(failedNodes) || !Array.isArray(failedEdges)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'failedNodes and failedEdges must be arrays'
      });
    }

    if (!VALID_MODES.includes(mode)) {
      return res.status(400).json({
        error: 'Validation error',
        message: `mode must be one of: ${VALID_MODES.join(', ')}`
      });
    }

    const db = getDatabase();

    // Generate unique ID
    const id = `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await db.run(
      `INSERT INTO failure_scenarios (id, user_id, name, description, failed_nodes, failed_edges, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, name.trim(), description || null, JSON.stringify(failedNodes), JSON.stringify(failedEdges), mode]
    );

    // Get the created scenario
    const scenario = await db.get(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios WHERE id = ?`,
      [id]
    );

    res.status(201).json({
      message: 'Scenario created successfully',
      scenario: {
        ...scenario,
        failedNodes: JSON.parse(scenario.failedNodes),
        failedEdges: JSON.parse(scenario.failedEdges)
      }
    });
  } catch (error) {
    console.error('Create scenario error:', error);
    res.status(500).json({
      error: 'Failed to create scenario',
      message: error.message
    });
  }
});

/**
 * Update a scenario
 * PUT /api/scenarios/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, failedNodes, failedEdges, mode } = req.body;

    const db = getDatabase();

    // Check ownership
    const existing = await db.get(
      'SELECT id FROM failure_scenarios WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({
        error: 'Scenario not found',
        message: 'Scenario not found or you do not have access'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Name cannot be empty'
        });
      }
      updates.push('name = ?');
      values.push(name.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (failedNodes !== undefined) {
      if (!Array.isArray(failedNodes)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'failedNodes must be an array'
        });
      }
      updates.push('failed_nodes = ?');
      values.push(JSON.stringify(failedNodes));
    }

    if (failedEdges !== undefined) {
      if (!Array.isArray(failedEdges)) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'failedEdges must be an array'
        });
      }
      updates.push('failed_edges = ?');
      values.push(JSON.stringify(failedEdges));
    }

    if (mode !== undefined) {
      if (!VALID_MODES.includes(mode)) {
        return res.status(400).json({
          error: 'Validation error',
          message: `mode must be one of: ${VALID_MODES.join(', ')}`
        });
      }
      updates.push('mode = ?');
      values.push(mode);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(
      `UPDATE failure_scenarios SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const scenario = await db.get(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios WHERE id = ?`,
      [id]
    );

    res.json({
      message: 'Scenario updated successfully',
      scenario: {
        ...scenario,
        failedNodes: JSON.parse(scenario.failedNodes),
        failedEdges: JSON.parse(scenario.failedEdges)
      }
    });
  } catch (error) {
    console.error('Update scenario error:', error);
    res.status(500).json({
      error: 'Failed to update scenario',
      message: error.message
    });
  }
});

/**
 * Delete a scenario
 * DELETE /api/scenarios/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.run(
      'DELETE FROM failure_scenarios WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Scenario not found',
        message: 'Scenario not found or you do not have access'
      });
    }

    res.json({
      message: 'Scenario deleted successfully',
      id
    });
  } catch (error) {
    console.error('Delete scenario error:', error);
    res.status(500).json({
      error: 'Failed to delete scenario',
      message: error.message
    });
  }
});

/**
 * Delete all scenarios for the user
 * DELETE /api/scenarios
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const result = await db.run(
      'DELETE FROM failure_scenarios WHERE user_id = ?',
      [req.user.id]
    );

    res.json({
      message: 'All scenarios deleted successfully',
      deletedCount: result.changes
    });
  } catch (error) {
    console.error('Delete all scenarios error:', error);
    res.status(500).json({
      error: 'Failed to delete scenarios',
      message: error.message
    });
  }
});

/**
 * Duplicate a scenario
 * POST /api/scenarios/:id/duplicate
 */
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    const db = getDatabase();

    const original = await db.get(
      `SELECT name, description, failed_nodes, failed_edges, mode
       FROM failure_scenarios WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );

    if (!original) {
      return res.status(404).json({
        error: 'Scenario not found',
        message: 'Scenario not found or you do not have access'
      });
    }

    const newId = `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = newName || `${original.name} (Copy)`;

    await db.run(
      `INSERT INTO failure_scenarios (id, user_id, name, description, failed_nodes, failed_edges, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, req.user.id, name, original.description, original.failed_nodes, original.failed_edges, original.mode]
    );

    const scenario = await db.get(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios WHERE id = ?`,
      [newId]
    );

    res.status(201).json({
      message: 'Scenario duplicated successfully',
      scenario: {
        ...scenario,
        failedNodes: JSON.parse(scenario.failedNodes),
        failedEdges: JSON.parse(scenario.failedEdges)
      }
    });
  } catch (error) {
    console.error('Duplicate scenario error:', error);
    res.status(500).json({
      error: 'Failed to duplicate scenario',
      message: error.message
    });
  }
});

/**
 * Search scenarios
 * GET /api/scenarios/search?q=query
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Search query is required'
      });
    }

    const db = getDatabase();
    const searchTerm = `%${q.trim().toLowerCase()}%`;

    const scenarios = await db.all(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios
       WHERE user_id = ? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)
       ORDER BY updated_at DESC`,
      [req.user.id, searchTerm, searchTerm]
    );

    const parsed = scenarios.map(s => ({
      ...s,
      failedNodes: JSON.parse(s.failedNodes),
      failedEdges: JSON.parse(s.failedEdges)
    }));

    res.json({ scenarios: parsed, query: q });
  } catch (error) {
    console.error('Search scenarios error:', error);
    res.status(500).json({
      error: 'Failed to search scenarios',
      message: error.message
    });
  }
});

/**
 * Export all scenarios as JSON
 * GET /api/scenarios/export
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();

    const scenarios = await db.all(
      `SELECT id, name, description, failed_nodes as failedNodes, failed_edges as failedEdges,
              mode, created_at as createdAt, updated_at as updatedAt
       FROM failure_scenarios WHERE user_id = ? ORDER BY created_at ASC`,
      [req.user.id]
    );

    const parsed = scenarios.map(s => ({
      ...s,
      failedNodes: JSON.parse(s.failedNodes),
      failedEdges: JSON.parse(s.failedEdges)
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="failure-scenarios.json"');
    res.json(parsed);
  } catch (error) {
    console.error('Export scenarios error:', error);
    res.status(500).json({
      error: 'Failed to export scenarios',
      message: error.message
    });
  }
});

/**
 * Import scenarios from JSON
 * POST /api/scenarios/import
 */
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { scenarios } = req.body;

    if (!Array.isArray(scenarios)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'scenarios must be an array'
      });
    }

    const db = getDatabase();
    const results = [];

    for (const s of scenarios) {
      const { name, description, failedNodes, failedEdges, mode } = s;

      if (!name || !Array.isArray(failedNodes) || !Array.isArray(failedEdges) || !VALID_MODES.includes(mode)) {
        results.push({ name: name || 'Unknown', success: false, error: 'Invalid scenario format' });
        continue;
      }

      try {
        const id = `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await db.run(
          `INSERT INTO failure_scenarios (id, user_id, name, description, failed_nodes, failed_edges, mode)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, req.user.id, name, description || null, JSON.stringify(failedNodes), JSON.stringify(failedEdges), mode]
        );

        results.push({ name, success: true, id });
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      message: `Imported ${successCount} of ${scenarios.length} scenarios`,
      results
    });
  } catch (error) {
    console.error('Import scenarios error:', error);
    res.status(500).json({
      error: 'Failed to import scenarios',
      message: error.message
    });
  }
});

export default router;
