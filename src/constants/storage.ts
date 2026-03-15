/**
 * localStorage key scheme for backend-ready swap.
 * All persistence goes through the game service; no direct use in UI.
 *
 * Index keys (games, teams) allow listing and search by game/team/player.
 */

const NAMESPACE = 'basketball_player_tracker';

export const STORAGE_KEYS = {
  activeGameId: `${NAMESPACE}/activeGameId`,
  /** List of all game ids (for getGames, search by game). */
  games: `${NAMESPACE}/games`,
  /** List of all team ids (for getTeams, search by team). */
  teams: `${NAMESPACE}/teams`,
  game: (gameId: string) => `${NAMESPACE}/game/${gameId}`,
  team: (teamId: string) => `${NAMESPACE}/team/${teamId}`,
  player: (playerId: string) => `${NAMESPACE}/player/${playerId}`,
} as const;
