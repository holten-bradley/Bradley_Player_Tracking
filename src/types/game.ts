/**
 * Shared types for the basketball tracker.
 * Serialization-friendly for localStorage and future REST API.
 *
 * Data model: activeGameId → Game (ourTeamId, opponentTeamId) → Team[] → Player[]
 * A game has two teams. Teams have many players. Teams can have many games.
 */

// ---- Event type (action category) ----
export const EVENT_TYPES = {
  PASS: 'PASS',
  DRIBBLE: 'DRIBBLE',
  ATTEMPTED_2: 'ATTEMPTED_2',
  ATTEMPTED_3: 'ATTEMPTED_3',
  ATTEMPTED_FT: 'ATTEMPTED_FT',
  INFERRED_ASSIST: 'INFERRED_ASSIST',
  TURNOVER: 'TURNOVER',
  // Defensive
  REBOUND: 'REBOUND',
  STEAL: 'STEAL',
  BLOCK: 'BLOCK',
  FOUL: 'FOUL',
  SHOT_ON: 'SHOT_ON',
  PASS_ON: 'PASS_ON',
  DRIBBLED_ON: 'DRIBBLED_ON',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

// ---- Event result (outcome for that action) ----
export const EVENT_RESULTS = {
  MADE: 'MADE',
  MISSED: 'MISSED',
  OFF: 'OFF',
  DEF: 'DEF',
  COMPLETE: 'COMPLETE',
  TURNOVER: 'TURNOVER',
  PASS: 'PASS',
  SHOT: 'SHOT',
  // Defensive
  SHOT_MADE: 'SHOT_MADE',
  SHOT_MISSED: 'SHOT_MISSED',
  PASS_COMPLETED: 'PASS_COMPLETED',
  PASS_INCOMPLETE: 'PASS_INCOMPLETE',
  FORCED_PASS: 'FORCED_PASS',
  FORCED_TURNOVER: 'FORCED_TURNOVER',
  ALLOWED_CONTINUED: 'ALLOWED_CONTINUED',
} as const;

export type EventResult = (typeof EVENT_RESULTS)[keyof typeof EVENT_RESULTS];

// ---- Entities ----

export interface Player {
  id: string;
  teamId: string;
  jerseyNumber: string;
  name: string;
  position?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

/** 2 or 3 for shot attempts; used with SHOT_ON to derive opponent points. */
export type ShotValue = 2 | 3;

export interface Event {
  id: string;
  gameId: string;
  type: EventType;
  result?: EventResult;
  /** Points value for this shot (2 or 3); used when type is SHOT_ON to derive opponent score. */
  shotValue?: ShotValue;
  /**
   * Optional metadata for derived assists.
   * When present, indicates which teammate's pass led directly to this made shot.
   */
  assistPlayerId?: string;
  isDerivedAssist?: boolean;
  primaryPlayerId: string;
  period?: number;
  timestamp?: number;
}

export type GameStatus =
  | 'Warmup'
  | '1st quarter'
  | '2nd quarter'
  | '3rd quarter'
  | '4th quarter'
  | 'Overtime'
  | 'Final';

/** Hydrated game: two full teams with players. */
export interface Game {
  id: string;
  ourTeamId: string;
  opponentTeamId: string;
  ourTeam: Team;
  opponentTeam: Team;
  events: Event[];
  createdAt?: number;
  status?: GameStatus;
}

/** Game as stored: only team ids and events. */
export interface StoredGame {
  id: string;
  ourTeamId: string;
  opponentTeamId: string;
  events: Event[];
  createdAt?: number;
  status?: GameStatus;
}

/** Team as stored: playerIds only; players in separate keys. */
export interface StoredTeam {
  id: string;
  name: string;
  playerIds: string[];
}

// ---- Create/update payloads (for service and future API) ----

export interface CreateGameInput {
  ourTeamName: string;
  ourTeamJerseyColor?: string;
  opponentTeamName: string;
  opponentJerseyColor?: string;
  createdAt?: number;
}

export interface AddPlayerInput {
  teamId: string;
  jerseyNumber: string;
  name: string;
  position?: string;
  photoUrl?: string;
}

export interface UpdatePlayerInput {
  playerId: string;
  jerseyNumber?: string;
  name?: string;
  position?: string;
}

export interface AppendEventInput {
  gameId: string;
  type: EventType;
  result?: EventResult;
  /** 2 or 3 for SHOT_ON events so we can derive opponent points. */
  shotValue?: ShotValue;
  /** Optional assist metadata for future explicit logging. */
  assistPlayerId?: string;
  isDerivedAssist?: boolean;
  primaryPlayerId: string;
  period?: number;
  timestamp?: number;
}
