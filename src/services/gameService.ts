/**
 * Single data-access layer for games, teams, players, and events.
 * Enables search by game, team, and player. MVP: localStorage; later: swap to API.
 */

import { STORAGE_KEYS } from '../constants/storage';
import { generateId } from '../lib/id';
import type {
  Game,
  StoredGame,
  StoredTeam,
  Team,
  Player,
  Event,
  EventResult,
  CreateGameInput,
  AddPlayerInput,
  UpdatePlayerInput,
  AppendEventInput,
} from '../types/game';

// ---- List helpers (for getGames, getTeams) ----

function getGameIds(): string[] {
  const raw = localStorage.getItem(STORAGE_KEYS.games);
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function pushGameId(gameId: string): void {
  const ids = getGameIds();
  if (ids.includes(gameId)) return;
  localStorage.setItem(STORAGE_KEYS.games, JSON.stringify([...ids, gameId]));
}

function getTeamIds(): string[] {
  const raw = localStorage.getItem(STORAGE_KEYS.teams);
  if (raw === null) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function pushTeamId(teamId: string): void {
  const ids = getTeamIds();
  if (ids.includes(teamId)) return;
  localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify([...ids, teamId]));
}

// ---- Persistence helpers ----

function getActiveGameId(): string | null {
  const raw = localStorage.getItem(STORAGE_KEYS.activeGameId);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as string;
  } catch {
    return null;
  }
}

function setActiveGameId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEYS.activeGameId);
  } else {
    localStorage.setItem(STORAGE_KEYS.activeGameId, JSON.stringify(id));
  }
}

function getStoredGame(gameId: string): StoredGame | null {
  const raw = localStorage.getItem(STORAGE_KEYS.game(gameId));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as StoredGame;
  } catch {
    return null;
  }
}

function saveStoredGame(stored: StoredGame): void {
  localStorage.setItem(STORAGE_KEYS.game(stored.id), JSON.stringify(stored));
}

function getStoredTeam(teamId: string): StoredTeam | null {
  const raw = localStorage.getItem(STORAGE_KEYS.team(teamId));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as StoredTeam;
  } catch {
    return null;
  }
}

function saveStoredTeam(stored: StoredTeam): void {
  localStorage.setItem(STORAGE_KEYS.team(stored.id), JSON.stringify(stored));
}

function getPlayer(playerId: string): Player | null {
  const raw = localStorage.getItem(STORAGE_KEYS.player(playerId));
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as Player;
  } catch {
    return null;
  }
}

function savePlayer(player: Player): void {
  localStorage.setItem(
    STORAGE_KEYS.player(player.id),
    JSON.stringify(player)
  );
}

function removePlayerKey(playerId: string): void {
  localStorage.removeItem(STORAGE_KEYS.player(playerId));
}

/** Hydrate team: load StoredTeam + all players. */
function hydrateTeam(teamId: string): Team | null {
  const stored = getStoredTeam(teamId);
  if (!stored) return null;
  const players: Player[] = [];
  for (const pid of stored.playerIds) {
    const p = getPlayer(pid);
    if (p) players.push(p);
  }
  return {
    id: stored.id,
    name: stored.name,
    players,
  };
}

/** Hydrate game: load StoredGame + both teams with players. */
function hydrateGame(gameId: string): Game | null {
  const stored = getStoredGame(gameId);
  if (!stored) return null;
  const ourTeam = hydrateTeam(stored.ourTeamId);
  const opponentTeam = hydrateTeam(stored.opponentTeamId);
  if (!ourTeam || !opponentTeam) return null;
  return {
    id: stored.id,
    ourTeamId: stored.ourTeamId,
    opponentTeamId: stored.opponentTeamId,
    ourTeam,
    opponentTeam,
    events: stored.events,
    createdAt: stored.createdAt,
    status: stored.status,
  };
}

// ---- Public API: active game ----

export async function getActiveGameIdFromStorage(): Promise<string | null> {
  return getActiveGameId();
}

export async function getActiveGame(): Promise<Game | null> {
  const id = getActiveGameId();
  if (id === null) return null;
  return hydrateGame(id);
}

export async function setActiveGame(gameId: string): Promise<void> {
  const stored = getStoredGame(gameId);
  if (!stored) throw new Error(`Game not found: ${gameId}`);
  setActiveGameId(gameId);
}

// ---- Public API: games (search by game) ----

export async function getGame(gameId: string): Promise<Game | null> {
  return hydrateGame(gameId);
}

export async function getGames(): Promise<Game[]> {
  const ids = getGameIds();
  const games: Game[] = [];
  for (const id of ids) {
    const g = hydrateGame(id);
    if (g) games.push(g);
  }
  return games;
}

export async function getGamesForTeam(teamId: string): Promise<Game[]> {
  const all = await getGames();
  return all.filter(
    (g) => g.ourTeamId === teamId || g.opponentTeamId === teamId
  );
}

// ---- Public API: teams (search by team) ----

export async function getTeam(teamId: string): Promise<Team | null> {
  return hydrateTeam(teamId);
}

export async function getTeams(): Promise<Team[]> {
  const ids = getTeamIds();
  const teams: Team[] = [];
  for (const id of ids) {
    const t = hydrateTeam(id);
    if (t) teams.push(t);
  }
  return teams;
}

// ---- Public API: players (search by player) ----

export async function getPlayerById(playerId: string): Promise<Player | null> {
  return getPlayer(playerId);
}

export async function getPlayersForTeam(teamId: string): Promise<Player[]> {
  const team = await getTeam(teamId);
  return team?.players ?? [];
}

export async function getPlayersForGame(
  gameId: string
): Promise<{ ourTeam: Player[]; opponentTeam: Player[] }> {
  const game = await getGame(gameId);
  if (!game)
    return { ourTeam: [], opponentTeam: [] };
  return {
    ourTeam: game.ourTeam.players,
    opponentTeam: game.opponentTeam.players,
  };
}

// ---- Public API: create / update ----

export async function createGame(input: CreateGameInput): Promise<Game> {
  const ourTeamId = generateId();
  const opponentTeamId = generateId();
  const gameId = generateId();

  const ourStored: StoredTeam = {
    id: ourTeamId,
    name: input.ourTeamName,
    playerIds: [],
  };
  const opponentStored: StoredTeam = {
    id: opponentTeamId,
    name: input.opponentTeamName,
    playerIds: [],
  };
  saveStoredTeam(ourStored);
  saveStoredTeam(opponentStored);
  pushTeamId(ourTeamId);
  pushTeamId(opponentTeamId);

  const storedGame: StoredGame = {
    id: gameId,
    ourTeamId,
    opponentTeamId,
    events: [],
    createdAt: input.createdAt ?? Date.now(),
    status: 'Warmup',
  };
  saveStoredGame(storedGame);
  pushGameId(gameId);
  setActiveGameId(gameId);

  const game = hydrateGame(gameId);
  if (!game) throw new Error('Failed to hydrate created game');
  return game;
}

export async function updateGame(
  gameId: string,
  patch: Partial<Pick<StoredGame, 'ourTeamId' | 'opponentTeamId' | 'status'>>
): Promise<Game> {
  const stored = getStoredGame(gameId);
  if (!stored) throw new Error(`Game not found: ${gameId}`);
  const updated: StoredGame = { ...stored, ...patch };
  saveStoredGame(updated);
  const game = hydrateGame(gameId);
  if (!game) throw new Error('Failed to hydrate game');
  return game;
}

export async function addPlayer(input: AddPlayerInput): Promise<Player> {
  const stored = getStoredTeam(input.teamId);
  if (!stored) throw new Error(`Team not found: ${input.teamId}`);
  const team = hydrateTeam(input.teamId)!;
  const existing = team.players.some(
    (p) => p.jerseyNumber === input.jerseyNumber
  );
  if (existing) {
    throw new Error(`Jersey number ${input.jerseyNumber} already on roster`);
  }
  const player: Player = {
    id: generateId(),
    teamId: input.teamId,
    jerseyNumber: input.jerseyNumber,
    name: input.name,
    position: input.position,
  };
  savePlayer(player);
  const updatedStored: StoredTeam = {
    ...stored,
    playerIds: [...stored.playerIds, player.id],
  };
  saveStoredTeam(updatedStored);
  return player;
}

export async function updatePlayer(input: UpdatePlayerInput): Promise<Player> {
  const current = getPlayer(input.playerId);
  if (!current) throw new Error(`Player not found: ${input.playerId}`);
  const team = hydrateTeam(current.teamId);
  if (team && input.jerseyNumber !== undefined && input.jerseyNumber !== current.jerseyNumber) {
    const duplicate = team.players.some(
      (p) => p.id !== input.playerId && p.jerseyNumber === input.jerseyNumber
    );
    if (duplicate) {
      throw new Error(`Jersey number ${input.jerseyNumber} already on roster`);
    }
  }
  const updated: Player = {
    ...current,
    ...(input.jerseyNumber !== undefined && { jerseyNumber: input.jerseyNumber }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.position !== undefined && { position: input.position }),
  };
  savePlayer(updated);
  return updated;
}

export async function removePlayer(
  teamId: string,
  playerId: string
): Promise<void> {
  const stored = getStoredTeam(teamId);
  if (!stored) throw new Error(`Team not found: ${teamId}`);
  const playerIds = stored.playerIds.filter((id) => id !== playerId);
  if (playerIds.length === stored.playerIds.length) {
    throw new Error(`Player not found: ${playerId}`);
  }
  saveStoredTeam({ ...stored, playerIds });
  removePlayerKey(playerId);
}

// ---- Public API: events (still scoped to game) ----

export async function getEvents(gameId: string): Promise<Event[]> {
  const stored = getStoredGame(gameId);
  return stored?.events ?? [];
}

export async function appendEvent(input: AppendEventInput): Promise<Event> {
  const stored = getStoredGame(input.gameId);
  if (!stored) throw new Error(`Game not found: ${input.gameId}`);
  const ourTeam = getStoredTeam(stored.ourTeamId);
  if (!ourTeam?.playerIds.includes(input.primaryPlayerId)) {
    throw new Error(`Player ${input.primaryPlayerId} not on our team`);
  }
  const event: Event = {
    id: generateId(),
    gameId: input.gameId,
    type: input.type,
    result: input.result,
    shotValue: input.shotValue,
    primaryPlayerId: input.primaryPlayerId,
    period: input.period,
    timestamp: input.timestamp,
  };
  const updated: StoredGame = {
    ...stored,
    events: [...stored.events, event],
  };
  saveStoredGame(updated);
  return event;
}

export async function replaceLastEvent(
  gameId: string,
  input: Omit<AppendEventInput, 'gameId'>
): Promise<Event> {
  const stored = getStoredGame(gameId);
  if (!stored) throw new Error(`Game not found: ${gameId}`);
  if (stored.events.length === 0) throw new Error('No events to replace');
  const ourTeam = getStoredTeam(stored.ourTeamId);
  if (!ourTeam?.playerIds.includes(input.primaryPlayerId)) {
    throw new Error(`Player ${input.primaryPlayerId} not on our team`);
  }
  const newEvent: Event = {
    id: stored.events[stored.events.length - 1].id,
    gameId,
    type: input.type,
    result: input.result,
    shotValue: input.shotValue,
    primaryPlayerId: input.primaryPlayerId,
    period: input.period,
    timestamp: input.timestamp,
  };
  const events = [...stored.events];
  events[events.length - 1] = newEvent;
  saveStoredGame({ ...stored, events });
  return newEvent;
}

export async function removeLastEvent(gameId: string): Promise<void> {
  const stored = getStoredGame(gameId);
  if (!stored) throw new Error(`Game not found: ${gameId}`);
  if (stored.events.length === 0) throw new Error('No events to remove');
  const events = stored.events.slice(0, -1);
  saveStoredGame({ ...stored, events });
}

export async function updateEventResult(
  gameId: string,
  eventId: string,
  result: EventResult
): Promise<Event> {
  const stored = getStoredGame(gameId);
  if (!stored) throw new Error(`Game not found: ${gameId}`);
  const idx = stored.events.findIndex((e) => e.id === eventId);
  if (idx === -1) throw new Error(`Event not found: ${eventId}`);
  const events = [...stored.events];
  events[idx] = { ...events[idx], result };
  saveStoredGame({ ...stored, events });
  return events[idx];
}

// ---- Legacy alias for UI that still expects "our team" from game ----

export async function getOurTeam(gameId: string): Promise<Team | null> {
  const game = await getGame(gameId);
  return game?.ourTeam ?? null;
}
