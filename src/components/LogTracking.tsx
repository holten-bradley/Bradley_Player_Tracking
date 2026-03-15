import { useState, useCallback, useEffect } from 'react';
import {
  getGame,
  updateGame,
  getEvents,
  appendEvent,
  removeLastEvent,
  updateEventResult,
} from '../services/gameService';
import type { Game, GameStatus, Player, Event, EventType, EventResult, ShotValue } from '../types/game';

const GAME_STATUS_OPTIONS: GameStatus[] = [
  'Warmup',
  '1st quarter',
  '2nd quarter',
  '3rd quarter',
  '4th quarter',
  'Overtime',
  'Final',
];

const STATUS_TO_PERIOD: Record<GameStatus, number | undefined> = {
  Warmup: undefined,
  '1st quarter': 1,
  '2nd quarter': 2,
  '3rd quarter': 3,
  '4th quarter': 4,
  Overtime: 5,
  Final: undefined,
};

/** Log-style add actions: Pass, Dribble pass, Dribble shot, Shot on 2pt/3pt. */
const LOG_ACTION_OPTIONS: {
  value: string;
  label: string;
  type: EventType;
  result?: EventResult;
  shotValue?: ShotValue;
}[] = [
  { value: 'PASS', label: 'Pass', type: 'PASS' },
  { value: 'DRIBBLE', label: 'Dribble pass', type: 'DRIBBLE', result: 'PASS' },
  { value: 'ATTEMPTED_2', label: 'Dribble shot', type: 'ATTEMPTED_2' },
  { value: 'SHOT_ON_2', label: 'Shot on (2pt)', type: 'SHOT_ON', shotValue: 2 },
  { value: 'SHOT_ON_3', label: 'Shot on (3pt)', type: 'SHOT_ON', shotValue: 3 },
];

/** Result options for confirming an event in the log, by type. Any event without a result can get one. */
function getResultOptionsForType(type: EventType): { result: EventResult; label: string }[] {
  switch (type) {
    case 'PASS':
      return [
        { result: 'COMPLETE', label: 'Complete' },
        { result: 'TURNOVER', label: 'Turnover' },
      ];
    case 'DRIBBLE':
      return [
        { result: 'COMPLETE', label: 'Complete' },
        { result: 'TURNOVER', label: 'Turnover' },
      ];
    case 'ATTEMPTED_2':
    case 'ATTEMPTED_3':
    case 'ATTEMPTED_FT':
      return [
        { result: 'MADE', label: 'Make' },
        { result: 'MISSED', label: 'Miss' },
      ];
    case 'SHOT_ON':
      return [
        { result: 'SHOT_MADE', label: 'Make' },
        { result: 'SHOT_MISSED', label: 'Miss' },
      ];
    case 'PASS_ON':
      return [
        { result: 'PASS_COMPLETED', label: 'Complete' },
        { result: 'PASS_INCOMPLETE', label: 'Incomplete' },
      ];
    case 'DRIBBLED_ON':
      return [
        { result: 'FORCED_TURNOVER', label: 'Forced turnover' },
        { result: 'FORCED_PASS', label: 'Forced pass' },
        { result: 'ALLOWED_CONTINUED', label: 'Allowed continued' },
      ];
    default:
      return [];
  }
}

const EVENT_TYPE_LABELS: Partial<Record<EventType, string>> = {
  PASS: 'Pass',
  DRIBBLE: 'Dribble pass',
  ATTEMPTED_2: 'Shot 2pt',
  ATTEMPTED_3: 'Shot 3pt',
  ATTEMPTED_FT: 'Free throw',
  SHOT_ON: 'Shot on',
  PASS_ON: 'Pass on',
  DRIBBLED_ON: 'Dribbled on',
  TURNOVER: 'Turnover',
  REBOUND: 'Rebound',
  STEAL: 'Steal',
  BLOCK: 'Block',
  FOUL: 'Foul',
  INFERRED_ASSIST: 'Assist',
};

function formatEventType(type: EventType, shotValue?: ShotValue): string {
  if (type === 'SHOT_ON' && shotValue != null) {
    return `Shot on (${shotValue}pt)`;
  }
  return EVENT_TYPE_LABELS[type] ?? type;
}

interface LogTrackingProps {
  game: Game;
  onBack: () => void;
  onGameUpdated: (game: Game) => void;
}

export function LogTracking({ game: initialGame, onBack, onGameUpdated }: LogTrackingProps) {
  const [game, setGame] = useState(initialGame);
  const [status, setStatus] = useState<GameStatus>(initialGame.status ?? 'Warmup');
  const [events, setEvents] = useState<Event[]>([]);
  const [addPlayerId, setAddPlayerId] = useState<string>('');
  const [addActionValue, setAddActionValue] = useState<string>('PASS');
  const [toast, setToast] = useState<string | null>(null);

  const selectedOption = LOG_ACTION_OPTIONS.find((o) => o.value === addActionValue) ?? LOG_ACTION_OPTIONS[0];

  const refreshGame = useCallback(async () => {
    const g = await getGame(game.id);
    if (g) {
      setGame(g);
      onGameUpdated(g);
    }
  }, [game.id, onGameUpdated]);

  const refreshEvents = useCallback(async () => {
    const list = await getEvents(game.id);
    setEvents(list);
  }, [game.id]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const handleStatusChange = async (s: GameStatus) => {
    setStatus(s);
    try {
      const updated = await updateGame(game.id, { status: s });
      setGame(updated);
      onGameUpdated(updated);
    } catch {
      setStatus(game.status ?? 'Warmup');
    }
  };

  const handleUndo = async () => {
    try {
      await removeLastEvent(game.id);
      await refreshGame();
      await refreshEvents();
      setToast('Last event undone');
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast('Nothing to undo');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleAddAction = async () => {
    if (!addPlayerId) {
      setToast('Select a player');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    const period = STATUS_TO_PERIOD[status];
    try {
      await appendEvent({
        gameId: game.id,
        type: selectedOption.type,
        shotValue: selectedOption.shotValue,
        primaryPlayerId: addPlayerId,
        period,
      });
      await refreshGame();
      await refreshEvents();
      setToast('Added to log');
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to add');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleSetResult = async (event: Event, result: EventResult) => {
    try {
      await updateEventResult(game.id, event.id, result);
      await refreshGame();
      await refreshEvents();
      setToast(`Result: ${result}`);
      setTimeout(() => setToast(null), 1500);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to update');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const playerById = (id: string): Player | undefined =>
    game.ourTeam.players.find((p) => p.id === id);

  return (
    <section className="court-screen log-tracking" aria-label="Log tracking">
      <header className="court-header">
        <button type="button" className="link back" onClick={onBack}>
          ← Menu
        </button>
        <div className="court-controls">
          <label>
            <span className="label-text">Period</span>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as GameStatus)}
              aria-label="Game period"
            >
              {GAME_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="undo-btn"
            onClick={handleUndo}
            aria-label="Undo last event"
          >
            Undo
          </button>
        </div>
      </header>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <div className="log-tracking-add">
        <h2 className="log-tracking-title">Add action</h2>
        <div className="log-tracking-add-row">
          <label>
            <span className="label-text">Player</span>
            <select
              value={addPlayerId}
              onChange={(e) => setAddPlayerId(e.target.value)}
              aria-label="Select player"
            >
              <option value="">— Select —</option>
              {game.ourTeam.players.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} {p.name || ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label-text">Action</span>
            <select
              value={addActionValue}
              onChange={(e) => setAddActionValue(e.target.value)}
              aria-label="Action type"
            >
              {LOG_ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="add-btn" onClick={handleAddAction}>
            Add to log
          </button>
        </div>
      </div>

      <div className="log-tracking-list-wrap">
        <h2 className="log-tracking-title">Event log</h2>
        <ul className="log-tracking-list" aria-label="Event log">
          {[...events].reverse().map((event) => {
            const player = playerById(event.primaryPlayerId);
            const resultOptions = getResultOptionsForType(event.type);
            const needsResult = resultOptions.length > 0 && event.result == null;
            return (
              <li key={event.id} className="log-tracking-row">
                <span className="log-tracking-player">
                  #{player?.jerseyNumber ?? '?'} {player?.name || ''}
                </span>
                <span className="log-tracking-type">{formatEventType(event.type, event.shotValue)}</span>
                {event.result != null ? (
                  <span className="log-tracking-result">{event.result}</span>
                ) : needsResult ? (
                  <span className="log-tracking-result-buttons">
                    {resultOptions.map(({ result, label }) => (
                      <button
                        key={result}
                        type="button"
                        className="menu-item leaf"
                        onClick={() => handleSetResult(event, result)}
                      >
                        {label}
                      </button>
                    ))}
                  </span>
                ) : (
                  <span className="log-tracking-result log-tracking-result-pending" aria-label="No result">
                    —
                  </span>
                )}
              </li>
            );
          })}
          {events.length === 0 && (
            <li className="log-tracking-empty">No events yet. Add an action above.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
