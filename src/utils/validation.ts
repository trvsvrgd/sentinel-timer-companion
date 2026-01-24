// Security and validation utilities

import type { RawGSIData, GameState, DotaGameState } from '@/types/gsi';

// Valid Dota 2 game states
const VALID_GAME_STATES: readonly DotaGameState[] = [
  'DOTA_GAMERULES_STATE_INIT',
  'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD',
  'DOTA_GAMERULES_STATE_HERO_SELECTION',
  'DOTA_GAMERULES_STATE_STRATEGY_TIME',
  'DOTA_GAMERULES_STATE_PRE_GAME',
  'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
  'DOTA_GAMERULES_STATE_POST_GAME',
  'DOTA_GAMERULES_STATE_DISCONNECT',
] as const;

// Safe number ranges
const MAX_GAME_TIME = 3600 * 2; // 2 hours max
const MIN_GAME_TIME = -300; // Allow negative for pre-game
const MAX_CLOCK_TIME = 3600 * 2;
const MIN_CLOCK_TIME = -300;

/**
 * Sanitizes and validates a number within safe bounds
 */
export function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number = 0
): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Validates and sanitizes a game state string
 */
export function sanitizeGameState(value: unknown): DotaGameState {
  if (typeof value !== 'string') {
    return 'DOTA_GAMERULES_STATE_INIT';
  }
  return VALID_GAME_STATES.includes(value as DotaGameState)
    ? (value as DotaGameState)
    : 'DOTA_GAMERULES_STATE_INIT';
}

/**
 * Validates and sanitizes raw GSI data
 */
export function validateAndSanitizeGSIData(data: unknown): RawGSIData | null {
  // Reject non-objects
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  // Create a safe copy
  const sanitized: RawGSIData = {};

  // Validate map object if present
  if ('map' in data && data.map && typeof data.map === 'object' && !Array.isArray(data.map)) {
    const map = data.map as Record<string, unknown>;
    sanitized.map = {
      clock_time: sanitizeNumber(map.clock_time, MIN_CLOCK_TIME, MAX_CLOCK_TIME),
      game_time: sanitizeNumber(map.game_time, MIN_GAME_TIME, MAX_GAME_TIME),
      paused: typeof map.paused === 'boolean' ? map.paused : false,
      game_state: sanitizeGameState(map.game_state),
      winner: sanitizeNumber(map.winner, 0, 3, 0),
    };
  }

  // Validate top-level fields
  if ('clock_time' in data) {
    sanitized.clock_time = sanitizeNumber(data.clock_time, MIN_CLOCK_TIME, MAX_CLOCK_TIME);
  }
  if ('game_time' in data) {
    sanitized.game_time = sanitizeNumber(data.game_time, MIN_GAME_TIME, MAX_GAME_TIME);
  }
  if ('paused' in data) {
    sanitized.paused = typeof data.paused === 'boolean' ? data.paused : false;
  }
  if ('game_state' in data) {
    sanitized.game_state = sanitizeGameState(data.game_state);
  }
  if ('winner' in data) {
    sanitized.winner = sanitizeNumber(data.winner, 0, 3, 0);
  }

  // Only return if we have at least some valid data
  if (Object.keys(sanitized).length === 0 && (!sanitized.map || Object.keys(sanitized.map).length === 0)) {
    return null;
  }

  return sanitized;
}

/**
 * Validates that an object is a proper GameState
 */
export function validateGameState(state: unknown): state is GameState {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return false;
  }

  const s = state as Record<string, unknown>;

  return (
    typeof s.clock_time === 'number' &&
    typeof s.game_time === 'number' &&
    typeof s.paused === 'boolean' &&
    typeof s.game_state === 'string' &&
    VALID_GAME_STATES.includes(s.game_state as DotaGameState) &&
    typeof s.winner === 'number'
  );
}

/**
 * Deep clone with sanitization to prevent prototype pollution
 */
export function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => safeClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (cloned as Record<string, unknown>)[key] = safeClone((obj as Record<string, unknown>)[key]);
    }
  }

  return cloned;
}

/**
 * Validates IPC message structure
 */
export function validateIPCMessage(message: unknown): message is { type: string; data: unknown } {
  if (!message || typeof message !== 'object' || Array.isArray(message)) {
    return false;
  }

  const m = message as Record<string, unknown>;
  return typeof m.type === 'string' && 'data' in m;
}
