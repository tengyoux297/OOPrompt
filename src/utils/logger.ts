/**
 * Centralized logging utility
 * Can be configured to disable logs in production builds
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // Special logger for verbose debugging (can be disabled separately)
  verbose: (...args: unknown[]) => {
    if (isDevelopment && import.meta.env.VITE_VERBOSE_LOGS === 'true') {
      console.log('[VERBOSE]', ...args);
    }
  }
};
