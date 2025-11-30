/**
 * Failure Scenario Persistence Service
 * B02-05: Scenario Persistence Service (P1, 2pts)
 *
 * Manage saving and loading failure test scenarios to localStorage
 */

import {
  FailureScenario,
  FailureScenarioTemplate,
  FAILURE_SCENARIOS_STORAGE_KEY,
  DEFAULT_SCENARIO_TEMPLATES
} from '../types/failureSimulation.types';

/**
 * Save a new failure scenario
 */
export function saveScenario(
  scenario: Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>
): FailureScenario {
  const scenarios = loadScenarios();

  const newScenario: FailureScenario = {
    ...scenario,
    id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  scenarios.push(newScenario);
  persistScenarios(scenarios);

  return newScenario;
}

/**
 * Update an existing scenario
 */
export function updateScenario(
  id: string,
  updates: Partial<Omit<FailureScenario, 'id' | 'createdAt'>>
): FailureScenario | null {
  const scenarios = loadScenarios();
  const index = scenarios.findIndex(s => s.id === id);

  if (index === -1) return null;

  scenarios[index] = {
    ...scenarios[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  persistScenarios(scenarios);
  return scenarios[index];
}

/**
 * Load all saved scenarios
 */
export function loadScenarios(): FailureScenario[] {
  try {
    const data = localStorage.getItem(FAILURE_SCENARIOS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load scenarios:', error);
    return [];
  }
}

/**
 * Load a specific scenario by ID
 */
export function loadScenarioById(id: string): FailureScenario | null {
  const scenarios = loadScenarios();
  return scenarios.find(s => s.id === id) || null;
}

/**
 * Delete a scenario by ID
 */
export function deleteScenario(id: string): boolean {
  const scenarios = loadScenarios();
  const filtered = scenarios.filter(s => s.id !== id);

  if (filtered.length === scenarios.length) {
    return false; // Nothing was deleted
  }

  persistScenarios(filtered);
  return true;
}

/**
 * Delete all scenarios
 */
export function deleteAllScenarios(): void {
  localStorage.removeItem(FAILURE_SCENARIOS_STORAGE_KEY);
}

/**
 * Export a scenario as JSON string
 */
export function exportScenario(id: string): string {
  const scenario = loadScenarioById(id);
  if (!scenario) {
    throw new Error(`Scenario ${id} not found`);
  }
  return JSON.stringify(scenario, null, 2);
}

/**
 * Export all scenarios as JSON
 */
export function exportAllScenarios(): string {
  const scenarios = loadScenarios();
  return JSON.stringify(scenarios, null, 2);
}

/**
 * Import a scenario from JSON string
 */
export function importScenario(json: string): FailureScenario {
  try {
    const imported = JSON.parse(json) as FailureScenario;

    // Validate required fields
    if (!imported.name || !imported.failedNodes || !imported.failedEdges) {
      throw new Error('Invalid scenario format: missing required fields');
    }

    // Generate new ID to avoid conflicts
    const scenario: FailureScenario = {
      ...imported,
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const scenarios = loadScenarios();
    scenarios.push(scenario);
    persistScenarios(scenarios);

    return scenario;
  } catch (error) {
    throw new Error(`Failed to import scenario: ${error}`);
  }
}

/**
 * Import multiple scenarios from JSON array
 */
export function importScenarios(json: string): FailureScenario[] {
  try {
    const imported = JSON.parse(json) as FailureScenario[];

    if (!Array.isArray(imported)) {
      throw new Error('Expected an array of scenarios');
    }

    const scenarios = loadScenarios();
    const newScenarios: FailureScenario[] = [];

    imported.forEach(s => {
      const scenario: FailureScenario = {
        ...s,
        id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      scenarios.push(scenario);
      newScenarios.push(scenario);
    });

    persistScenarios(scenarios);
    return newScenarios;
  } catch (error) {
    throw new Error(`Failed to import scenarios: ${error}`);
  }
}

/**
 * Get built-in scenario templates
 */
export function getScenarioTemplates(): FailureScenarioTemplate[] {
  return [...DEFAULT_SCENARIO_TEMPLATES];
}

/**
 * Create scenario from template
 */
export function createFromTemplate(
  template: FailureScenarioTemplate,
  overrides?: Partial<Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>>
): FailureScenario {
  return saveScenario({
    name: overrides?.name || template.name,
    description: overrides?.description || template.description,
    failedNodes: overrides?.failedNodes || template.failedNodes,
    failedEdges: overrides?.failedEdges || template.failedEdges,
    mode: overrides?.mode || template.mode
  });
}

/**
 * Duplicate an existing scenario
 */
export function duplicateScenario(id: string, newName?: string): FailureScenario | null {
  const original = loadScenarioById(id);
  if (!original) return null;

  return saveScenario({
    name: newName || `${original.name} (Copy)`,
    description: original.description,
    failedNodes: [...original.failedNodes],
    failedEdges: [...original.failedEdges],
    mode: original.mode
  });
}

/**
 * Search scenarios by name or description
 */
export function searchScenarios(query: string): FailureScenario[] {
  const scenarios = loadScenarios();
  const lowerQuery = query.toLowerCase();

  return scenarios.filter(s =>
    s.name.toLowerCase().includes(lowerQuery) ||
    (s.description?.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get scenarios sorted by most recent
 */
export function getRecentScenarios(limit: number = 5): FailureScenario[] {
  const scenarios = loadScenarios();
  return scenarios
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

/**
 * Get scenarios by mode
 */
export function getScenariosByMode(mode: 'single' | 'multi' | 'cascade'): FailureScenario[] {
  const scenarios = loadScenarios();
  return scenarios.filter(s => s.mode === mode);
}

/**
 * Check storage quota
 */
export function getStorageInfo(): {
  used: number;
  available: boolean;
  scenarioCount: number;
} {
  const scenarios = loadScenarios();
  const data = localStorage.getItem(FAILURE_SCENARIOS_STORAGE_KEY) || '';

  return {
    used: new Blob([data]).size,
    available: isLocalStorageAvailable(),
    scenarioCount: scenarios.length
  };
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist scenarios to localStorage
 */
function persistScenarios(scenarios: FailureScenario[]): void {
  try {
    localStorage.setItem(FAILURE_SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
  } catch (error) {
    // Handle quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Consider deleting old scenarios.');
      throw new Error('Storage quota exceeded. Please delete some scenarios.');
    }
    throw error;
  }
}

/**
 * Validate scenario data integrity
 */
export function validateScenario(scenario: unknown): scenario is FailureScenario {
  if (!scenario || typeof scenario !== 'object') return false;

  const s = scenario as Record<string, unknown>;

  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.createdAt === 'string' &&
    typeof s.updatedAt === 'string' &&
    Array.isArray(s.failedNodes) &&
    Array.isArray(s.failedEdges) &&
    ['single', 'multi', 'cascade'].includes(s.mode as string)
  );
}

/**
 * Clean up invalid scenarios from storage
 */
export function cleanupInvalidScenarios(): number {
  const scenarios = loadScenarios();
  const valid = scenarios.filter(validateScenario);
  const removed = scenarios.length - valid.length;

  if (removed > 0) {
    persistScenarios(valid);
  }

  return removed;
}
