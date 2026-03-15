import { useState, useEffect } from 'react';
import { getActiveGame } from './services/gameService';
import type { Game } from './types/game';
import { Menu } from './components/Menu';
import { CreateGame } from './components/CreateGame';
import { Roster } from './components/Roster';
import { Court } from './components/Court';
import { LogTracking } from './components/LogTracking';
import { BoxScore } from './components/BoxScore';

type View =
  | 'menu'
  | 'create'
  | 'roster'
  | 'courtReplay'
  | 'courtLive'
  | 'courtLog'
  | 'boxScore';

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [view, setView] = useState<View>('menu');

  useEffect(() => {
    getActiveGame().then((g) => {
      setGame(g ?? null);
    });
  }, []);

  const navigate = (v: View) => setView(v);

  return (
    <div className="app">
      {view === 'menu' && (
        <div className="app-menu-center">
          <header className="app-header">
            <h1>Basketball Tracker</h1>
            <Menu game={game} onNavigate={navigate} />
          </header>
          {!game && (
            <p className="welcome">
              Create a game, add your roster, then track events on the court.
            </p>
          )}
        </div>
      )}

      {view === 'create' && (
        <div className="app-menu-center">
          <CreateGame
            onCreated={(g) => {
              setGame(g);
              setView('roster');
            }}
            onBack={() => setView('menu')}
          />
        </div>
      )}

      {view === 'roster' && game && (
        <div className="app-menu-center">
          <Roster
            game={game}
            onBack={() => setView('menu')}
            onRosterUpdated={setGame}
          />
        </div>
      )}

      {view === 'courtReplay' && game && (
        <Court
          game={game}
          trackingMode="replay"
          onBack={() => setView('menu')}
          onGameUpdated={setGame}
        />
      )}

      {view === 'courtLive' && game && (
        <Court
          game={game}
          trackingMode="live"
          onBack={() => setView('menu')}
          onGameUpdated={setGame}
        />
      )}

      {view === 'courtLog' && game && (
        <LogTracking
          game={game}
          onBack={() => setView('menu')}
          onGameUpdated={setGame}
        />
      )}

      {view === 'boxScore' && game && (
        <BoxScore game={game} onBack={() => setView('menu')} />
      )}
    </div>
  );
}

export default App;
