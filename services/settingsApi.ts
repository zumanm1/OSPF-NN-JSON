/**
 * Settings API Service
 * Handles communication with the backend for user settings, custom links, and scenarios
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9081/api';

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

// Helper for API requests with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// Settings API
// ============================================

export interface UserSettings {
  visual_config?: {
    showHull: boolean;
    hullPadding: number;
    hullFontSize: number;
    nodeFontSize: number;
    nodeSize: number;
    linkWidth: number;
  };
  physics_config?: {
    gravitationalConstant: number;
    springLength: number;
    springConstant: number;
  };
  active_countries?: Record<string, boolean>;
}

export async function getAllSettings(): Promise<UserSettings> {
  const data = await apiRequest<{ settings: UserSettings }>('/settings');
  return data.settings;
}

export async function getSetting<K extends keyof UserSettings>(key: K): Promise<UserSettings[K] | null> {
  try {
    const data = await apiRequest<{ value: UserSettings[K] }>(`/settings/${key}`);
    return data.value;
  } catch {
    return null;
  }
}

export async function saveSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): Promise<void> {
  await apiRequest(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value })
  });
}

export async function saveAllSettings(settings: Partial<UserSettings>): Promise<void> {
  await apiRequest('/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings })
  });
}

export async function deleteSetting(key: keyof UserSettings): Promise<void> {
  await apiRequest(`/settings/${key}`, { method: 'DELETE' });
}

// ============================================
// Custom Links API
// ============================================

export interface CustomLink {
  id: string;
  from: string;
  to: string;
  forwardCost: number;
  reverseCost: number;
  createdAt: string;
}

export async function getCustomLinks(): Promise<CustomLink[]> {
  const data = await apiRequest<{ customLinks: CustomLink[] }>('/custom-links');
  return data.customLinks;
}

export async function createCustomLink(link: {
  from: string;
  to: string;
  forwardCost: number;
  reverseCost: number;
}): Promise<CustomLink> {
  const data = await apiRequest<{ customLink: CustomLink }>('/custom-links', {
    method: 'POST',
    body: JSON.stringify(link)
  });
  return data.customLink;
}

export async function updateCustomLink(
  id: string,
  updates: { forwardCost: number; reverseCost: number }
): Promise<CustomLink> {
  const data = await apiRequest<{ customLink: CustomLink }>(`/custom-links/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return data.customLink;
}

export async function deleteCustomLink(id: string): Promise<void> {
  await apiRequest(`/custom-links/${id}`, { method: 'DELETE' });
}

export async function deleteAllCustomLinks(): Promise<number> {
  const data = await apiRequest<{ deletedCount: number }>('/custom-links', { method: 'DELETE' });
  return data.deletedCount;
}

export async function bulkImportCustomLinks(links: Array<{
  from: string;
  to: string;
  forwardCost: number;
  reverseCost: number;
}>): Promise<{ successCount: number; results: Array<{ from: string; to: string; success: boolean; error?: string }> }> {
  const data = await apiRequest<{
    results: Array<{ from: string; to: string; success: boolean; error?: string }>
  }>('/custom-links/bulk', {
    method: 'POST',
    body: JSON.stringify({ links })
  });
  return {
    successCount: data.results.filter(r => r.success).length,
    results: data.results
  };
}

// ============================================
// Failure Scenarios API
// ============================================

export interface FailureScenario {
  id: string;
  name: string;
  description?: string;
  failedNodes: string[];
  failedEdges: string[];
  mode: 'single' | 'multi' | 'cascade';
  createdAt: string;
  updatedAt: string;
}

export async function getScenarios(): Promise<FailureScenario[]> {
  const data = await apiRequest<{ scenarios: FailureScenario[] }>('/scenarios');
  return data.scenarios;
}

export async function getScenario(id: string): Promise<FailureScenario | null> {
  try {
    const data = await apiRequest<{ scenario: FailureScenario }>(`/scenarios/${id}`);
    return data.scenario;
  } catch {
    return null;
  }
}

export async function createScenario(scenario: Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<FailureScenario> {
  const data = await apiRequest<{ scenario: FailureScenario }>('/scenarios', {
    method: 'POST',
    body: JSON.stringify(scenario)
  });
  return data.scenario;
}

export async function updateScenario(
  id: string,
  updates: Partial<Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<FailureScenario> {
  const data = await apiRequest<{ scenario: FailureScenario }>(`/scenarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
  return data.scenario;
}

export async function deleteScenario(id: string): Promise<void> {
  await apiRequest(`/scenarios/${id}`, { method: 'DELETE' });
}

export async function deleteAllScenarios(): Promise<number> {
  const data = await apiRequest<{ deletedCount: number }>('/scenarios', { method: 'DELETE' });
  return data.deletedCount;
}

export async function duplicateScenario(id: string, newName?: string): Promise<FailureScenario> {
  const data = await apiRequest<{ scenario: FailureScenario }>(`/scenarios/${id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ newName })
  });
  return data.scenario;
}

export async function searchScenarios(query: string): Promise<FailureScenario[]> {
  const data = await apiRequest<{ scenarios: FailureScenario[] }>(`/scenarios/search?q=${encodeURIComponent(query)}`);
  return data.scenarios;
}

export async function exportScenarios(): Promise<FailureScenario[]> {
  return apiRequest<FailureScenario[]>('/scenarios/export');
}

export async function importScenarios(scenarios: Array<Omit<FailureScenario, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
  successCount: number;
  results: Array<{ name: string; success: boolean; error?: string }>
}> {
  const data = await apiRequest<{
    results: Array<{ name: string; success: boolean; error?: string }>
  }>('/scenarios/import', {
    method: 'POST',
    body: JSON.stringify({ scenarios })
  });
  return {
    successCount: data.results.filter(r => r.success).length,
    results: data.results
  };
}

// ============================================
// Migration Helper - Move localStorage to DB
// ============================================

export async function migrateLocalStorageToDatabase(): Promise<{
  settings: boolean;
  customLinks: boolean;
  scenarios: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const results = {
    settings: false,
    customLinks: false,
    scenarios: false,
    errors
  };

  try {
    // Migrate visual config
    const visualConfig = localStorage.getItem('ospf_visual_config');
    if (visualConfig) {
      try {
        await saveSetting('visual_config', JSON.parse(visualConfig));
        localStorage.removeItem('ospf_visual_config');
      } catch (e) {
        errors.push(`visual_config: ${e}`);
      }
    }

    // Migrate physics config
    const physicsConfig = localStorage.getItem('ospf_physics_config');
    if (physicsConfig) {
      try {
        await saveSetting('physics_config', JSON.parse(physicsConfig));
        localStorage.removeItem('ospf_physics_config');
      } catch (e) {
        errors.push(`physics_config: ${e}`);
      }
    }

    // Migrate active countries
    const activeCountries = localStorage.getItem('ospf_active_countries');
    if (activeCountries) {
      try {
        await saveSetting('active_countries', JSON.parse(activeCountries));
        localStorage.removeItem('ospf_active_countries');
      } catch (e) {
        errors.push(`active_countries: ${e}`);
      }
    }

    results.settings = true;
  } catch (e) {
    errors.push(`Settings migration failed: ${e}`);
  }

  try {
    // Migrate custom links
    const customLinks = localStorage.getItem('ospf_custom_links');
    if (customLinks) {
      const links = JSON.parse(customLinks);
      if (Array.isArray(links) && links.length > 0) {
        await bulkImportCustomLinks(links.map((l: any) => ({
          from: l.from,
          to: l.to,
          forwardCost: l.forwardCost,
          reverseCost: l.reverseCost
        })));
        localStorage.removeItem('ospf_custom_links');
      }
    }
    results.customLinks = true;
  } catch (e) {
    errors.push(`Custom links migration failed: ${e}`);
  }

  try {
    // Migrate failure scenarios
    const scenarios = localStorage.getItem('ospf-failure-scenarios');
    if (scenarios) {
      const parsed = JSON.parse(scenarios);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await importScenarios(parsed.map((s: any) => ({
          name: s.name,
          description: s.description,
          failedNodes: s.failedNodes,
          failedEdges: s.failedEdges,
          mode: s.mode
        })));
        localStorage.removeItem('ospf-failure-scenarios');
      }
    }
    results.scenarios = true;
  } catch (e) {
    errors.push(`Scenarios migration failed: ${e}`);
  }

  return results;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('authToken');
}
