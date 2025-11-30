/**
 * Persistent Storage Hook
 * Uses database for authenticated users, falls back to localStorage for guests
 *
 * This hook provides a unified interface that:
 * - For authenticated users: syncs with the backend database
 * - For unauthenticated users: uses localStorage (existing behavior)
 * - Supports automatic migration from localStorage to database on login
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as settingsApi from '../services/settingsApi';

type SettingKey = 'visual_config' | 'physics_config' | 'active_countries';

interface StorageState<T> {
  value: T;
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  lastSynced: Date | null;
}

interface StorageOptions {
  onError?: (error: Error) => void;
  debounceMs?: number;
  syncOnChange?: boolean;
}

/**
 * Hook for persistent storage that syncs with database when authenticated
 */
export function usePersistentStorage<T>(
  key: SettingKey,
  initialValue: T,
  options: StorageOptions = {}
): [T, (value: T | ((prev: T) => T)) => void, StorageState<T>] {
  const { isAuthenticated, token } = useAuth();
  const { onError, debounceMs = 1000, syncOnChange = true } = options;

  const [state, setState] = useState<StorageState<T>>({
    value: initialValue,
    isLoading: true,
    isSyncing: false,
    error: null,
    lastSynced: null
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingValueRef = useRef<T | null>(null);
  const mountedRef = useRef(true);

  // Local storage key (for fallback)
  const localStorageKey = `ospf_${key}`;

  // Load initial value
  useEffect(() => {
    mountedRef.current = true;

    async function loadValue() {
      try {
        if (isAuthenticated && token) {
          // Try to load from database
          const dbValue = await settingsApi.getSetting(key);
          if (mountedRef.current) {
            if (dbValue !== null) {
              setState(prev => ({
                ...prev,
                value: dbValue as T,
                isLoading: false,
                lastSynced: new Date()
              }));
            } else {
              // No value in DB, try localStorage and migrate
              const localValue = loadFromLocalStorage();
              if (localValue !== null) {
                // Migrate to database
                await settingsApi.saveSetting(key, localValue);
                localStorage.removeItem(localStorageKey);
              }
              setState(prev => ({
                ...prev,
                value: localValue ?? initialValue,
                isLoading: false,
                lastSynced: new Date()
              }));
            }
          }
        } else {
          // Not authenticated, use localStorage
          const localValue = loadFromLocalStorage();
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              value: localValue ?? initialValue,
              isLoading: false
            }));
          }
        }
      } catch (error) {
        console.error(`Error loading ${key}:`, error);
        // Fall back to localStorage
        const localValue = loadFromLocalStorage();
        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            value: localValue ?? initialValue,
            isLoading: false,
            error: error as Error
          }));
        }
        onError?.(error as Error);
      }
    }

    loadValue();

    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isAuthenticated, token, key]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): T | null => {
    try {
      const item = localStorage.getItem(localStorageKey);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }, [localStorageKey]);

  // Save to localStorage
  const saveToLocalStorage = useCallback((value: T) => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  }, [localStorageKey]);

  // Sync to database (debounced)
  const syncToDatabase = useCallback(async (value: T) => {
    if (!isAuthenticated || !token) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      await settingsApi.saveSetting(key, value as any);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: null,
          lastSynced: new Date()
        }));
      }
    } catch (error) {
      console.error(`Error syncing ${key} to database:`, error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          error: error as Error
        }));
      }
      onError?.(error as Error);
    }
  }, [isAuthenticated, token, key, onError]);

  // Set value with optional sync
  const setValue = useCallback((valueOrUpdater: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof valueOrUpdater === 'function'
        ? (valueOrUpdater as (prev: T) => T)(prev.value)
        : valueOrUpdater;

      // Always save to localStorage immediately (backup)
      saveToLocalStorage(newValue);

      // Schedule database sync if authenticated
      if (isAuthenticated && syncOnChange) {
        pendingValueRef.current = newValue;

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          if (pendingValueRef.current !== null) {
            syncToDatabase(pendingValueRef.current);
            pendingValueRef.current = null;
          }
        }, debounceMs);
      }

      return { ...prev, value: newValue };
    });
  }, [isAuthenticated, syncOnChange, debounceMs, saveToLocalStorage, syncToDatabase]);

  return [state.value, setValue, state];
}

/**
 * Hook for custom links that syncs with database
 */
export function useCustomLinks(initialLinks: settingsApi.CustomLink[] = []) {
  const { isAuthenticated, token } = useAuth();
  const [links, setLinks] = useState<settingsApi.CustomLink[]>(initialLinks);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load links on mount/auth change
  useEffect(() => {
    async function loadLinks() {
      setIsLoading(true);
      try {
        if (isAuthenticated && token) {
          const dbLinks = await settingsApi.getCustomLinks();
          setLinks(dbLinks);

          // Check for localStorage links to migrate
          const localLinks = localStorage.getItem('ospf_custom_links');
          if (localLinks) {
            const parsed = JSON.parse(localLinks);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await settingsApi.bulkImportCustomLinks(parsed);
              localStorage.removeItem('ospf_custom_links');
              // Reload from DB
              const updatedLinks = await settingsApi.getCustomLinks();
              setLinks(updatedLinks);
            }
          }
        } else {
          // Use localStorage
          const localLinks = localStorage.getItem('ospf_custom_links');
          setLinks(localLinks ? JSON.parse(localLinks) : []);
        }
      } catch (err) {
        setError(err as Error);
        // Fallback to localStorage
        const localLinks = localStorage.getItem('ospf_custom_links');
        setLinks(localLinks ? JSON.parse(localLinks) : []);
      } finally {
        setIsLoading(false);
      }
    }
    loadLinks();
  }, [isAuthenticated, token]);

  const addLink = useCallback(async (link: Omit<settingsApi.CustomLink, 'id' | 'createdAt'>) => {
    try {
      if (isAuthenticated) {
        const newLink = await settingsApi.createCustomLink(link);
        setLinks(prev => [...prev, newLink]);
        return newLink;
      } else {
        // localStorage fallback
        const newLink: settingsApi.CustomLink = {
          ...link,
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString()
        };
        setLinks(prev => {
          const updated = [...prev, newLink];
          localStorage.setItem('ospf_custom_links', JSON.stringify(updated));
          return updated;
        });
        return newLink;
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  const removeLink = useCallback(async (id: string) => {
    try {
      if (isAuthenticated) {
        await settingsApi.deleteCustomLink(id);
      }
      setLinks(prev => {
        const updated = prev.filter(l => l.id !== id);
        if (!isAuthenticated) {
          localStorage.setItem('ospf_custom_links', JSON.stringify(updated));
        }
        return updated;
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  const updateLink = useCallback(async (id: string, updates: { forwardCost: number; reverseCost: number }) => {
    try {
      if (isAuthenticated) {
        const updated = await settingsApi.updateCustomLink(id, updates);
        setLinks(prev => prev.map(l => l.id === id ? updated : l));
        return updated;
      } else {
        setLinks(prev => {
          const updated = prev.map(l => l.id === id ? { ...l, ...updates } : l);
          localStorage.setItem('ospf_custom_links', JSON.stringify(updated));
          return updated;
        });
        return links.find(l => l.id === id);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated, links]);

  const clearAllLinks = useCallback(async () => {
    try {
      if (isAuthenticated) {
        await settingsApi.deleteAllCustomLinks();
      } else {
        localStorage.removeItem('ospf_custom_links');
      }
      setLinks([]);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  return {
    links,
    isLoading,
    error,
    addLink,
    removeLink,
    updateLink,
    clearAllLinks,
    setLinks
  };
}

/**
 * Hook for failure scenarios that syncs with database
 */
export function useFailureScenarios() {
  const { isAuthenticated, token } = useAuth();
  const [scenarios, setScenarios] = useState<settingsApi.FailureScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load scenarios on mount/auth change
  useEffect(() => {
    async function loadScenarios() {
      setIsLoading(true);
      try {
        if (isAuthenticated && token) {
          const dbScenarios = await settingsApi.getScenarios();
          setScenarios(dbScenarios);

          // Check for localStorage scenarios to migrate
          const localScenarios = localStorage.getItem('ospf-failure-scenarios');
          if (localScenarios) {
            const parsed = JSON.parse(localScenarios);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await settingsApi.importScenarios(parsed);
              localStorage.removeItem('ospf-failure-scenarios');
              // Reload from DB
              const updated = await settingsApi.getScenarios();
              setScenarios(updated);
            }
          }
        } else {
          // Use localStorage
          const localScenarios = localStorage.getItem('ospf-failure-scenarios');
          setScenarios(localScenarios ? JSON.parse(localScenarios) : []);
        }
      } catch (err) {
        setError(err as Error);
        // Fallback to localStorage
        const localScenarios = localStorage.getItem('ospf-failure-scenarios');
        setScenarios(localScenarios ? JSON.parse(localScenarios) : []);
      } finally {
        setIsLoading(false);
      }
    }
    loadScenarios();
  }, [isAuthenticated, token]);

  const saveScenario = useCallback(async (
    scenario: Omit<settingsApi.FailureScenario, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    try {
      if (isAuthenticated) {
        const newScenario = await settingsApi.createScenario(scenario);
        setScenarios(prev => [...prev, newScenario]);
        return newScenario;
      } else {
        const newScenario: settingsApi.FailureScenario = {
          ...scenario,
          id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setScenarios(prev => {
          const updated = [...prev, newScenario];
          localStorage.setItem('ospf-failure-scenarios', JSON.stringify(updated));
          return updated;
        });
        return newScenario;
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  const deleteScenarioById = useCallback(async (id: string) => {
    try {
      if (isAuthenticated) {
        await settingsApi.deleteScenario(id);
      }
      setScenarios(prev => {
        const updated = prev.filter(s => s.id !== id);
        if (!isAuthenticated) {
          localStorage.setItem('ospf-failure-scenarios', JSON.stringify(updated));
        }
        return updated;
      });
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  const updateScenarioById = useCallback(async (
    id: string,
    updates: Partial<Omit<settingsApi.FailureScenario, 'id' | 'createdAt' | 'updatedAt'>>
  ) => {
    try {
      if (isAuthenticated) {
        const updated = await settingsApi.updateScenario(id, updates);
        setScenarios(prev => prev.map(s => s.id === id ? updated : s));
        return updated;
      } else {
        setScenarios(prev => {
          const updated = prev.map(s =>
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
          );
          localStorage.setItem('ospf-failure-scenarios', JSON.stringify(updated));
          return updated;
        });
        return scenarios.find(s => s.id === id);
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated, scenarios]);

  const duplicateScenarioById = useCallback(async (id: string, newName?: string) => {
    try {
      if (isAuthenticated) {
        const duplicated = await settingsApi.duplicateScenario(id, newName);
        setScenarios(prev => [...prev, duplicated]);
        return duplicated;
      } else {
        const original = scenarios.find(s => s.id === id);
        if (!original) throw new Error('Scenario not found');

        const duplicated: settingsApi.FailureScenario = {
          ...original,
          id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: newName || `${original.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setScenarios(prev => {
          const updated = [...prev, duplicated];
          localStorage.setItem('ospf-failure-scenarios', JSON.stringify(updated));
          return updated;
        });
        return duplicated;
      }
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated, scenarios]);

  const clearAllScenarios = useCallback(async () => {
    try {
      if (isAuthenticated) {
        await settingsApi.deleteAllScenarios();
      } else {
        localStorage.removeItem('ospf-failure-scenarios');
      }
      setScenarios([]);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [isAuthenticated]);

  return {
    scenarios,
    isLoading,
    error,
    saveScenario,
    deleteScenario: deleteScenarioById,
    updateScenario: updateScenarioById,
    duplicateScenario: duplicateScenarioById,
    clearAllScenarios,
    setScenarios
  };
}

export default usePersistentStorage;
