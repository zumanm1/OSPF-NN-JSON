// Enhanced localStorage hook with error handling and quota management
import { useState, useEffect, useCallback } from 'react';

interface StorageOptions {
  onQuotaExceeded?: () => void;
  onError?: (error: Error) => void;
  compress?: boolean;
}

export function useLocalStorage<T>(
  key: string, 
  initialValue: T,
  options: StorageOptions = {}
): [T, (value: T | ((prev: T) => T)) => void, { error: Error | null, isQuotaExceeded: boolean }] {
  const [error, setError] = useState<Error | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      setError(error as Error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      // Allow value to be a function for setState pattern
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save to state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        const serialized = JSON.stringify(valueToStore);
        
        // Check size before writing (rough estimate)
        const sizeInBytes = new Blob([serialized]).size;
        const sizeInMB = sizeInBytes / (1024 * 1024);
        
        // Warn if approaching 5MB limit
        if (sizeInMB > 4.5) {
          console.warn(`⚠️ localStorage key "${key}" is ${sizeInMB.toFixed(2)}MB. Approaching 5MB quota.`);
        }
        
        try {
          window.localStorage.setItem(key, serialized);
          setError(null);
          setIsQuotaExceeded(false);
        } catch (e: any) {
          // Check if quota exceeded
          if (
            e.name === 'QuotaExceededError' ||
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            e.code === 22
          ) {
            setIsQuotaExceeded(true);
            console.error(`❌ localStorage quota exceeded for key "${key}"`);
            
            if (options.onQuotaExceeded) {
              options.onQuotaExceeded();
            } else {
              // Default behavior: alert user
              alert(
                `⚠️ Storage Quota Exceeded\n\n` +
                `Your browser's local storage is full (5MB limit).\n\n` +
                `Please:\n` +
                `1. Export your work to a file\n` +
                `2. Clear browser data\n` +
                `3. Import your work back\n\n` +
                `Your current changes may not be saved.`
              );
            }
          }
          
          const error = e as Error;
          setError(error);
          
          if (options.onError) {
            options.onError(error);
          }
          
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, options]);

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, { error, isQuotaExceeded }];
}

// Utility to check available localStorage space
export function getLocalStorageUsage(): { used: number; total: number; available: number; percentUsed: number } {
  let used = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }
  
  const total = 5 * 1024 * 1024; // 5MB typical limit
  const available = total - used;
  const percentUsed = (used / total) * 100;
  
  return { used, total, available, percentUsed };
}

// Utility to clear old data
export function clearOldestLocalStorageKey(): string | null {
  const keys = Object.keys(localStorage);
  if (keys.length === 0) return null;
  
  // Sort by value length (largest first) - rough approximation of "oldest"
  const sorted = keys.sort((a, b) => {
    const aSize = localStorage[a]?.length || 0;
    const bSize = localStorage[b]?.length || 0;
    return bSize - aSize;
  });
  
  const keyToRemove = sorted[0];
  localStorage.removeItem(keyToRemove);
  console.log(`Removed localStorage key: ${keyToRemove}`);
  return keyToRemove;
}
