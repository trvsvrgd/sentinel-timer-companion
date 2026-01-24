// Timeout and cleanup utilities

import { healthMonitor } from './healthMonitor';

/**
 * Creates a timeout that's automatically tracked and cleaned up
 */
export function createTrackedTimeout(
  callback: () => void,
  delay: number
): NodeJS.Timeout {
  const timeoutId = setTimeout(() => {
    healthMonitor.untrackTimer(timeoutId);
    callback();
  }, delay);
  
  healthMonitor.trackTimer(timeoutId);
  return timeoutId;
}

/**
 * Creates an interval that's automatically tracked and cleaned up
 */
export function createTrackedInterval(
  callback: () => void,
  delay: number
): NodeJS.Timeout {
  const intervalId = setInterval(callback, delay);
  healthMonitor.trackTimer(intervalId);
  return intervalId;
}

/**
 * Clears a tracked timeout
 */
export function clearTrackedTimeout(timeoutId: NodeJS.Timeout | null | undefined) {
  if (timeoutId) {
    clearTimeout(timeoutId);
    healthMonitor.untrackTimer(timeoutId);
  }
}

/**
 * Clears a tracked interval
 */
export function clearTrackedInterval(intervalId: NodeJS.Timeout | null | undefined) {
  if (intervalId) {
    clearInterval(intervalId);
    healthMonitor.untrackTimer(intervalId);
  }
}

/**
 * Creates a promise that rejects after a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = createTrackedTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);
      
      promise.finally(() => {
        clearTrackedTimeout(timeoutId);
      });
    }),
  ]);
}

/**
 * Creates a safe async function wrapper with timeout and error handling
 */
export function withSafeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    timeout?: number;
    onError?: (error: Error) => void;
    defaultValue?: Awaited<ReturnType<T>>;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      if (options.timeout) {
        return await withTimeout(
          fn(...args) as Promise<Awaited<ReturnType<T>>>,
          options.timeout
        );
      }
      return await fn(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      options.onError?.(err);
      
      if (options.defaultValue !== undefined) {
        return options.defaultValue;
      }
      
      throw err;
    }
  }) as T;
}
