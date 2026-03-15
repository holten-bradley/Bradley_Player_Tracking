import { useState } from 'react';
import { createGame } from '../services/gameService';
import type { Game } from '../types/game';

interface CreateGameProps {
  onCreated: (game: Game) => void;
  onBack: () => void;
}

export function CreateGame({ onCreated, onBack }: CreateGameProps) {
  const [homeName, setHomeName] = useState('');
  const [awayName, setAwayName] = useState('');
  const [trackHome, setTrackHome] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!homeName.trim() || !awayName.trim()) {
      setError('Enter both team names.');
      return;
    }
    setSubmitting(true);
    try {
      const ourTeamName = trackHome ? homeName.trim() : awayName.trim();
      const opponentTeamName = trackHome ? awayName.trim() : homeName.trim();
      const game = await createGame({ ourTeamName, opponentTeamName });
      onCreated(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create game');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="create-game" aria-labelledby="create-game-heading">
      <h1 id="create-game-heading">Create game</h1>
      <button type="button" className="link back" onClick={onBack}>
        ← Menu
      </button>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="home-name">Home team</label>
          <input
            id="home-name"
            type="text"
            value={homeName}
            onChange={(e) => setHomeName(e.target.value)}
            placeholder="Team name"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="away-name">Away team</label>
          <input
            id="away-name"
            type="text"
            value={awayName}
            onChange={(e) => setAwayName(e.target.value)}
            placeholder="Team name"
            autoComplete="off"
          />
        </div>
        <fieldset className="field track-who">
          <legend>Track which team?</legend>
          <label className="radio">
            <input
              type="radio"
              name="track"
              checked={trackHome}
              onChange={() => setTrackHome(true)}
            />
            Home
          </label>
          <label className="radio">
            <input
              type="radio"
              name="track"
              checked={!trackHome}
              onChange={() => setTrackHome(false)}
            />
            Away
          </label>
        </fieldset>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create game'}
          </button>
        </div>
      </form>
    </section>
  );
}
