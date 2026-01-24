// Shared types for Game State Integration (GSI)

export type DotaGameState = 
  | 'DOTA_GAMERULES_STATE_INIT'
  | 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD'
  | 'DOTA_GAMERULES_STATE_HERO_SELECTION'
  | 'DOTA_GAMERULES_STATE_STRATEGY_TIME'
  | 'DOTA_GAMERULES_STATE_PRE_GAME'
  | 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS'
  | 'DOTA_GAMERULES_STATE_POST_GAME'
  | 'DOTA_GAMERULES_STATE_DISCONNECT';

export interface GameState {
  clock_time: number;
  game_time: number;
  paused: boolean;
  game_state: DotaGameState;
  winner: number;
}

export type GSIConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Raw GSI data structure from Dota 2
export interface RawGSIData {
  map?: {
    clock_time?: number;
    game_time?: number;
    paused?: boolean;
    game_state?: string;
    winner?: number;
  };
  clock_time?: number;
  game_time?: number;
  paused?: boolean;
  game_state?: string;
  winner?: number;
  [key: string]: any; // Allow other GSI fields
}
