import { useState } from 'react';
import { addPlayer, removePlayer, getGame } from '../services/gameService';
import type { Game, Player } from '../types/game';

interface RosterProps {
  game: Game;
  onBack: () => void;
  onRosterUpdated: (game: Game) => void;
}

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

export function Roster({ game, onBack, onRosterUpdated }: RosterProps) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const teamId = game.ourTeamId;
  const players = game.ourTeam.players;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!number.trim()) {
      setError('Jersey number is required.');
      return;
    }
    setSubmitting(true);
    try {
      await addPlayer({
        teamId,
        jerseyNumber: number.trim(),
        name: name.trim() || undefined,
        position: position.trim() || undefined,
      });
      const updated = await getGame(game.id);
      if (updated) onRosterUpdated(updated);
      setNumber('');
      setName('');
      setPosition('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add player');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(p: Player) {
    try {
      await removePlayer(teamId, p.id);
      const updated = await getGame(game.id);
      if (updated) onRosterUpdated(updated);
    } catch {
      // ignore
    }
  }

  return (
    <section className="roster" aria-labelledby="roster-heading">
      <h1 id="roster-heading">Roster — {game.ourTeam.name}</h1>
      <button type="button" className="link back" onClick={onBack}>
        ← Menu
      </button>

      <p className="hint">
        Number is required. Name and position are encouraged.
      </p>

      <form onSubmit={handleAdd} className="add-player">
        <div className="row">
          <div className="field small">
            <label htmlFor="roster-number">#</label>
            <input
              id="roster-number"
              type="text"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="0"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="roster-name">Name</label>
            <input
              id="roster-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
            />
          </div>
          <div className="field">
            <label htmlFor="roster-position">Position</label>
            <select
              id="roster-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              <option value="">—</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={submitting} className="add-btn">
            Add
          </button>
        </div>
      </form>
      {error && <p className="error" role="alert">{error}</p>}

      <ul className="player-list" aria-label="Players">
        {players.length === 0 ? (
          <li className="empty">No players yet. Add one above.</li>
        ) : (
          players.map((p) => (
            <li key={p.id} className="player-row">
              <span className="jersey">#{p.jerseyNumber}</span>
              <span className="name">{p.name || '—'}</span>
              <span className="position">{p.position || '—'}</span>
              <button
                type="button"
                className="remove"
                onClick={() => handleRemove(p)}
                aria-label={`Remove ${p.name || p.jerseyNumber}`}
              >
                Remove
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
