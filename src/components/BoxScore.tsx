import { useMemo } from 'react';
import type { Game, Player, Event } from '../types/game';
import { deriveReboundsAndAssists } from '../lib/stats';

export interface PlayerStats {
  player: Player;
  twoMade: number;
  twoAttempted: number;
  threeMade: number;
  threeAttempted: number;
  points: number;
  passComplete: number;
  passTurnover: number;
  rebounds: number;
  assists: number;
}

function deriveStats(events: Event[], players: Player[]): {
  playerStats: PlayerStats[];
  teamPoints: number;
  opponentPoints: number;
} {
  const { rebounds, assists } = deriveReboundsAndAssists(events);
  const byPlayer = new Map<string, PlayerStats>();
  for (const p of players) {
    byPlayer.set(p.id, {
      player: p,
      twoMade: 0,
      twoAttempted: 0,
      threeMade: 0,
      threeAttempted: 0,
      points: 0,
      passComplete: 0,
      passTurnover: 0,
      rebounds: 0,
      assists: 0,
    });
  }
  let teamPoints = 0;
  let opponentPoints = 0;
  for (const e of events) {
    const row = byPlayer.get(e.primaryPlayerId);
    if (row) {
      if (e.type === 'ATTEMPTED_2') {
        row.twoAttempted++;
        if (e.result === 'MADE') {
          row.twoMade++;
          row.points += 2;
          teamPoints += 2;
        }
      } else if (e.type === 'ATTEMPTED_3') {
        row.threeAttempted++;
        if (e.result === 'MADE') {
          row.threeMade++;
          row.points += 3;
          teamPoints += 3;
        }
      } else if (e.type === 'ATTEMPTED_FT') {
        if (e.result === 'MADE') {
          row.points += 1;
          teamPoints += 1;
        }
      } else if (e.type === 'PASS') {
        if (e.result === 'COMPLETE') row.passComplete++;
        else if (e.result === 'TURNOVER') row.passTurnover++;
      }
    }
    // Per-player rebounds and derived assists
    if (rebounds[e.primaryPlayerId]) {
      const r = byPlayer.get(e.primaryPlayerId);
      if (r) r.rebounds += rebounds[e.primaryPlayerId];
    }
    if (assists[e.primaryPlayerId]) {
      const a = byPlayer.get(e.primaryPlayerId);
      if (a) a.assists += assists[e.primaryPlayerId];
    }
    // Opponent score (points allowed): SHOT_ON + SHOT_MADE, using shotValue for 2pt vs 3pt
    if (e.type === 'SHOT_ON' && e.result === 'SHOT_MADE') {
      opponentPoints += e.shotValue === 3 ? 3 : 2;
    }
  }
  const playerStats = Array.from(byPlayer.values());
  return { playerStats, teamPoints, opponentPoints };
}

interface BoxScoreProps {
  game: Game;
  onBack: () => void;
}

export function BoxScore({ game, onBack }: BoxScoreProps) {
  const events = game.events ?? [];
  const { playerStats, teamPoints, opponentPoints } = useMemo(
    () => deriveStats(events, game.ourTeam.players),
    [events, game.ourTeam.players]
  );

  return (
    <div className="box-score-screen">
      <header className="box-score-header">
        <button type="button" className="link back" onClick={onBack}>
          ← Menu
        </button>
        <h1 className="box-score-title">Box Score</h1>
      </header>

      <div className="box-score-layout">
        <div className="box-score-derived-wrap">
          <div className="box-score-team-scores">
            <div className="box-score-team-score">
              {game.ourTeam.name}: <strong>{teamPoints}</strong> pts
            </div>
            <div className="box-score-team-score box-score-opponent">
              {game.opponentTeam.name} (pts allowed): <strong>{opponentPoints}</strong> pts
            </div>
          </div>
          <div className="box-score-table-wrap">
            <table className="box-score-table" aria-label="Box score by player">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>2PM</th>
                  <th>2PA</th>
                  <th>3PM</th>
                  <th>3PA</th>
                  <th>PTS</th>
                  <th>Pass</th>
                  <th>TO</th>
                  <th>REB</th>
                  <th>AST</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map(({ player, twoMade, twoAttempted, threeMade, threeAttempted, points, passComplete, passTurnover, rebounds, assists }) => (
                  <tr key={player.id}>
                    <td className="box-score-player-cell">
                      #{player.jerseyNumber} {player.name || '—'}
                    </td>
                    <td>{twoMade}</td>
                    <td>{twoAttempted}</td>
                    <td>{threeMade}</td>
                    <td>{threeAttempted}</td>
                    <td>{points}</td>
                    <td>{passComplete}</td>
                    <td>{passTurnover}</td>
                    <td>{rebounds}</td>
                    <td>{assists}</td>
                  </tr>
                ))}
                <tr className="box-score-total-row">
                  <td>Team</td>
                  <td>{playerStats.reduce((s, r) => s + r.twoMade, 0)}</td>
                  <td>{playerStats.reduce((s, r) => s + r.twoAttempted, 0)}</td>
                  <td>{playerStats.reduce((s, r) => s + r.threeMade, 0)}</td>
                  <td>{playerStats.reduce((s, r) => s + r.threeAttempted, 0)}</td>
                  <td>{teamPoints}</td>
                  <td>{playerStats.reduce((s, r) => s + r.passComplete, 0)}</td>
                  <td>{playerStats.reduce((s, r) => s + r.passTurnover, 0)}</td>
                  <td>{playerStats.reduce((s, r) => s + r.rebounds, 0)}</td>
                  <td>{playerStats.reduce((s, r) => s + r.assists, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
