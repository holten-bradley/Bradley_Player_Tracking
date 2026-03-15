import type { Game } from '../types/game';

type CourtView = 'courtReplay' | 'courtLive' | 'courtLog';

interface MenuProps {
  game: Game | null;
  onNavigate: (view: 'menu' | 'create' | 'roster' | CourtView | 'boxScore') => void;
}

export function Menu({ game, onNavigate }: MenuProps) {
  return (
    <nav className="menu" role="navigation">
      <ul>
        <li>
          <button type="button" onClick={() => onNavigate('create')}>
            {game ? 'New game' : 'Create game'}
          </button>
        </li>
        {game && (
          <>
            <li>
              <button type="button" onClick={() => onNavigate('roster')}>
                Roster — {game.ourTeam.name}
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('courtReplay')}>
                Replay tracking (beta)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('courtLive')}>
                Live tracking
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('courtLog')}>
                Log tracking (beta)
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('boxScore')}>
                Box score
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
