/**
 * Debug utility for development-only logging
 * In production builds, these functions become no-ops
 */

const IS_DEV = import.meta.env.MODE === 'development';

export const debug = IS_DEV ? console.log.bind(console, '[DEBUG]') : () => {};
export const debugWarn = IS_DEV ? console.warn.bind(console, '[WARN]') : () => {};
export const debugError = IS_DEV ? console.error.bind(console, '[ERROR]') : () => {};

// Always log errors (even in production) but with less detail
export const logError = (message: string, error?: Error) => {
  if (IS_DEV) {
    console.error('[ERROR]', message, error);
  } else {
    // In production, just log the message
    console.error(message);
  }
};

// Performance timing utility (dev only)
export const timeStart = (label: string) => {
  if (IS_DEV) {
    console.time(`[PERF] ${label}`);
  }
};

export const timeEnd = (label: string) => {
  if (IS_DEV) {
    console.timeEnd(`[PERF] ${label}`);
  }
};
