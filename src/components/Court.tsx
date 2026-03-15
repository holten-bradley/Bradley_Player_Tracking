import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getGame,
  updateGame,
  appendEvent,
  removeLastEvent,
} from '../services/gameService';
import type { Game, GameStatus, Player, EventType, EventResult } from '../types/game';
import {
  OFFENSIVE_ACTION_TREE,
  DEFENSIVE_ACTION_TREE,
  LIVE_ACTION_TREE,
  LIVE_DEFENSIVE_ACTION_TREE,
  getLeaf,
  type ActionNode,
  type ActionLeaf,
} from '../lib/actionMenu';
import { courtConfig } from '../config/courtConfig';
import { Toast } from './Toast';

const VIEWBOX = 100;

function pct(n: number): number {
  return n * VIEWBOX;
}

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

const POSITION_SPOTS = courtConfig.players.map((p) => ({
  position: p.id,
  x: p.x * VIEWBOX,
  y: p.y * VIEWBOX,
}));

function CourtSvg({ courtMode }: { courtMode: 'offense' | 'defense' }) {
  const { features } = courtConfig.court;
  const b = features.basket;
  const bY = courtMode === 'offense' ? b.radius : 1 - b.radius;
  const p = features.paint;
  const t = features.three_point_line;

  const paintLeft = p.center_x - p.width / 2;
  const paintRight = p.center_x + p.width / 2;
  const paintTop = courtMode === 'offense' ? 0 : 1 - p.height;
  const paintBottom = courtMode === 'offense' ? p.height : 1;

  // Distance from circle center to baseline: offense baseline y=0 → center_y; defense baseline y=1 → mirrored center at (1 - center_y) so distance = center_y. Same either way.
  const cySq = t.center_y * t.center_y;
  const rSq = t.radius * t.radius;
  const dx = cySq <= rSq ? Math.sqrt(rSq - cySq) : 0;
  const leftX = t.center_x - dx;
  const rightX = t.center_x + dx;
  const arcRadiusPct = t.radius * VIEWBOX;

  return (
    <svg
      className="court-svg"
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="court-floor-offense" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e4a6e" />
          <stop offset="40%" stopColor="#163a58" />
          <stop offset="100%" stopColor="#0c2238" />
        </linearGradient>
        <linearGradient id="court-floor-defense" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#5c2a22" />
          <stop offset="40%" stopColor="#3d1c16" />
          <stop offset="100%" stopColor="#1e0e08" />
        </linearGradient>
      </defs>
      {/* Floor fill (blue offense / red defense) */}
      <rect
        x={0}
        y={0}
        width={VIEWBOX}
        height={VIEWBOX}
        className="court-floor"
        fill={courtMode === 'offense' ? 'url(#court-floor-offense)' : 'url(#court-floor-defense)'}
      />

      {/* Baseline (top of half-court, under basket) */}
      <line x1={0} y1={0} x2={VIEWBOX} y2={0} className="court-line court-line-baseline" strokeWidth="1" />
      {/* Sideline left */}
      <line x1={0} y1={0} x2={0} y2={VIEWBOX} className="court-line court-line-sideline-left" strokeWidth="1" />
      {/* Sideline right */}
      <line x1={VIEWBOX} y1={0} x2={VIEWBOX} y2={VIEWBOX} className="court-line court-line-sideline-right" strokeWidth="1" />
      {/* Half-court line (bottom of view) */}
      <line x1={0} y1={VIEWBOX} x2={VIEWBOX} y2={VIEWBOX} className="court-line court-line-halfcourt" strokeWidth="1" />
      {/* Half-court circle (semi-circle at center of half-court line) */}
      <path
        className="court-line court-line-halfcourt-circle"
        d={`M ${pct(0.25)} ${courtMode === 'offense' ? VIEWBOX : 0} A ${pct(0.25)} ${pct(0.25)} 0 0 ${courtMode === 'offense' ? 1 : 0} ${pct(0.75)} ${courtMode === 'offense' ? VIEWBOX : 0}`}
        fill="none"
        strokeWidth="0.7"
      />

      {/* Paint (the key) – rectangle anchored to baseline/ half-court line*/}
      <rect
        x={pct(paintLeft)}
        y={pct(paintTop)}
        width={pct(p.width)}
        height={pct(p.height)}
        className="court-paint"
        fill="none"
        strokeWidth="0.8"
      />
      {/* Free-throw line (top of paint) */}
      <line
        x1={pct(paintLeft)}
        y1={pct(courtMode === 'offense' ? paintBottom : paintTop)}
        x2={pct(paintRight)}
        y2={pct(courtMode === 'offense' ? paintBottom : paintTop)}
        className="court-line court-line-freethrow"
        strokeWidth="0.7"
      />
      {/* Free-throw circle (dashed semi-circle from free-throw line) */}
      <path
        className="court-line court-line-ft-circle"
        d={`M ${pct(paintLeft)} ${pct(courtMode === 'offense' ? paintBottom : paintTop)} A ${pct(p.width / 2)} ${pct(p.width / 2)} 0 0 ${courtMode === 'offense' ? 1 : 0} ${pct(paintRight)} ${pct(courtMode === 'offense' ? paintBottom : paintTop)}`}
        fill="none"
        strokeWidth="0.5"
        strokeDasharray="2 1.5"
      />
      {/* Block mark left */}
      <line
        x1={pct(paintLeft + 0.04)}
        y1={pct(paintTop + p.height / 2)}
        x2={pct(paintLeft + 0.08)}
        y2={pct(paintTop + p.height / 2)}
        className="court-line court-line-block-left"
        strokeWidth="0.6"
      />
      {/* Block mark right */}
      <line
        x1={pct(paintRight - 0.08)}
        y1={pct(paintTop + p.height / 2)}
        x2={pct(paintRight - 0.04)}
        y2={pct(paintTop + p.height / 2)}
        className="court-line court-line-block-right"
        strokeWidth="0.6"
      />

      {/* Three-point line (arc + baseline segments to corners) */}
      <path
        className="court-line court-line-three-pt"
        d={`M 0 ${courtMode === 'offense' ? 0 : VIEWBOX} L ${pct(leftX)} ${courtMode === 'offense' ? 0 : VIEWBOX} A ${arcRadiusPct} ${arcRadiusPct} 0 0 ${courtMode === 'offense' ? 0 : 1} ${pct(rightX)} ${courtMode === 'offense' ? 0 : VIEWBOX} L ${VIEWBOX} ${courtMode === 'offense' ? 0 : VIEWBOX}`}
        fill="none"
        strokeWidth="0.8"
      />

      {/* Restricted area arc (small semi-circle under basket) */}
      <path
        className="court-line court-line-restricted"
        d={`M ${pct(b.x - (b.radius * 2))} ${courtMode === 'offense' ? pct(bY + b.radius) : pct(bY - b.radius)} A ${pct(b.radius)} ${pct(b.radius)} 0 0 ${courtMode === 'offense' ? 0 : 1} ${pct(b.x + (b.radius * 2))} ${courtMode === 'offense' ? pct(bY + b.radius) : pct(bY - b.radius)}`}
        fill="none"
        strokeWidth="0.6"
      />
      {/* Basket (hoop circle) */}
      <circle
        cx={pct(b.x)}
        cy={pct(bY)}
        r={pct(b.radius)}
        className="court-basket"
        fill="black"
        strokeWidth="1"
      />
    </svg>
  );
}

function matchPosition(playerPos: string | undefined, slot: string): boolean {
  if (!playerPos) return false;
  const u = playerPos.toUpperCase();
  const slotMap: Record<string, string[]> = {
    PG: ['PG', 'POINT GUARD', 'G'],
    SG: ['SG', 'SHOOTING GUARD', 'G'],
    SF: ['SF', 'SMALL FORWARD', 'F'],
    PF: ['PF', 'POWER FORWARD', 'F'],
    C: ['C', 'CENTER'],
  };
  const aliases = slotMap[slot] ?? [];
  return aliases.some((a) => u === a || u.includes(a));
}

function assignPlayersToSlots(players: Player[]): (Player | null)[] {
  const slots: (Player | null)[] = [null, null, null, null, null];
  const used = new Set<string>();
  for (let i = 0; i < POSITION_SPOTS.length; i++) {
    const slotPos = POSITION_SPOTS[i].position;
    const p = players.find(
      (x) => matchPosition(x.position, slotPos) && !used.has(x.id)
    );
    if (p) {
      slots[i] = p;
      used.add(p.id);
    }
  }
  // Fill remaining slots with unused players in order
  for (const p of players) {
    if (used.has(p.id)) continue;
    const idx = slots.findIndex((s) => s === null);
    if (idx >= 0) {
      slots[idx] = p;
      used.add(p.id);
    }
  }
  return slots;
}

export type TrackingMode = 'replay' | 'live';

interface CourtProps {
  game: Game;
  trackingMode: TrackingMode;
  onBack: () => void;
  onGameUpdated: (game: Game) => void;
}

export function Court({ game: initialGame, trackingMode, onBack, onGameUpdated }: CourtProps) {
  const [game, setGame] = useState(initialGame);
  const [status, setStatus] = useState<GameStatus>(initialGame.status ?? 'Warmup');
  const [isOffense, setIsOffense] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    slotIndex: number;
    stack: (ActionNode | ActionLeaf)[];
    player: Player;
  } | null>(null);
  const [shotPrompt, setShotPrompt] = useState<{
    player: Player;
    type: EventType;
    label: string;
    shotValue?: 2 | 3;
  } | null>(null);
  const [foulPromptOpen, setFoulPromptOpen] = useState(false);
  const [foulPlayerId, setFoulPlayerId] = useState<string>('');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const refreshGame = useCallback(async () => {
    const g = await getGame(game.id);
    if (g) {
      setGame(g);
      onGameUpdated(g);
    }
  }, [game.id, onGameUpdated]);

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
      setToast('Last event undone');
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast('Nothing to undo');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleFoulShotMakeMiss = async (result: EventResult) => {
    if (!foulPlayerId) {
      setToast('Select a player');
      setTimeout(() => setToast(null), 2000);
      return;
    }
    const period = STATUS_TO_PERIOD[status];
    try {
      await appendEvent({
        gameId: game.id,
        type: 'ATTEMPTED_FT',
        result,
        primaryPlayerId: foulPlayerId,
        period,
      });
      await refreshGame();
      const player = game.ourTeam.players.find((p) => p.id === foulPlayerId);
      setToast(
        player
          ? `FT ${result === 'MADE' ? 'make' : 'miss'} — #${player.jerseyNumber} ${player.name}`
          : `FT ${result === 'MADE' ? 'make' : 'miss'}`
      );
      setTimeout(() => setToast(null), 2500);
      setFoulPromptOpen(false);
      setFoulPlayerId('');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Failed to log free throw');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const confirmAction = useCallback(
    async (player: Player, leaf: ActionLeaf) => {
      const period = STATUS_TO_PERIOD[status];
      try {
        await appendEvent({
          gameId: game.id,
          type: leaf.type,
          result: leaf.result,
          shotValue: leaf.shotValue,
          primaryPlayerId: player.id,
          period,
        });
        await refreshGame();
        const label = leaf.result ? `${leaf.label} (${leaf.result})` : leaf.label;
        setToast(`#${player.jerseyNumber} — ${label}`);
        setTimeout(() => setToast(null), 2500);
      } catch (e) {
        setToast(e instanceof Error ? e.message : 'Failed to log');
        setTimeout(() => setToast(null), 2000);
      }
    },
    [game.id, status, refreshGame]
  );

  const openMenu = useCallback(
    (player: Player, slotIndex: number, isOffenseMode: boolean) => {
      const root =
        trackingMode === 'live'
          ? isOffenseMode
            ? LIVE_ACTION_TREE
            : LIVE_DEFENSIVE_ACTION_TREE
          : isOffenseMode
            ? OFFENSIVE_ACTION_TREE
            : DEFENSIVE_ACTION_TREE;
      setMenu({
        slotIndex,
        stack: [root],
        player,
      });
    },
    [trackingMode]
  );

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  const confirmShotResult = useCallback(
    async (result: EventResult) => {
      if (!shotPrompt) return;
      const period = STATUS_TO_PERIOD[status];
      try {
        await appendEvent({
          gameId: game.id,
          type: shotPrompt.type,
          result,
          shotValue: shotPrompt.shotValue,
          primaryPlayerId: shotPrompt.player.id,
          period,
        });
        await refreshGame();
        setToast(`#${shotPrompt.player.jerseyNumber} — ${shotPrompt.label} (${result})`);
        setTimeout(() => setToast(null), 2500);
        if (result === 'MADE') {
          setIsOffense(false);
        } else if (result === 'SHOT_MADE') {
          setIsOffense(true);
        }
      } catch (e) {
        setToast(e instanceof Error ? e.message : 'Failed to log');
        setTimeout(() => setToast(null), 2000);
      }
      setShotPrompt(null);
    },
    [shotPrompt, game.id, status, refreshGame]
  );

  const onMenuLeafSelect = (leaf: ActionLeaf) => {
    if (!menu) return;
    const isShotInLive =
      trackingMode === 'live' &&
      (leaf.type === 'ATTEMPTED_2' || leaf.type === 'ATTEMPTED_3' || (leaf.type === 'SHOT_ON' && leaf.shotValue != null));
    if (isShotInLive) {
      setShotPrompt({
        player: menu.player,
        type: leaf.type,
        label: leaf.label,
        shotValue: leaf.shotValue,
      });
      closeMenu();
      return;
    }
    if (trackingMode === 'live' && leaf.type === 'TURNOVER') {
      confirmAction(menu.player, leaf);
      closeMenu();
      setIsOffense(true);
      return;
    }
    confirmAction(menu.player, leaf);
    closeMenu();
  };

  const onMenuNodeSelect = (node: ActionNode) => {
    if (!menu) return;
    setMenu({
      ...menu,
      stack: [...menu.stack, node],
    });
  };

  const onMenuBack = () => {
    if (!menu || menu.stack.length <= 1) {
      closeMenu();
      return;
    }
    setMenu({
      ...menu,
      stack: menu.stack.slice(0, -1),
    });
  };

  // Cancel menu when pointer is released outside the action menu
  useEffect(() => {
    if (menu === null) return;
    const onPointerUp = (e: PointerEvent) => {
      const target = e.target as Node & { closest?: (s: string) => Element | null };
      if (menuRef.current?.contains(target)) return;
      if (target?.closest?.('.action-menu')) return;
      closeMenu();
    };
    document.addEventListener('pointerup', onPointerUp);
    return () => document.removeEventListener('pointerup', onPointerUp);
  }, [menu, closeMenu]);

  const currentMenuNode = menu?.stack[menu.stack.length - 1];
  const menuChildren: (ActionNode | ActionLeaf)[] =
    currentMenuNode && 'children' in currentMenuNode && Array.isArray((currentMenuNode as ActionNode).children)
      ? (currentMenuNode as ActionNode).children
      : [];
  const showBack = menu && menu.stack.length > 1;

  const slotPlayers = assignPlayersToSlots(game.ourTeam.players);
  const courtMode = isOffense ? 'offense' : 'defense';

  return (
    <section className="court-screen" aria-label="Track game">
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
          <label className="toggle-row">
            <span className="label-text">Court</span>
            <button
              type="button"
              className={`court-mode ${courtMode}`}
              onClick={() => setIsOffense((o) => !o)}
              aria-pressed={isOffense}
              aria-label={isOffense ? 'Offense (switch to defense)' : 'Defense (switch to offense)'}
            >
              <span className="mode-offense">Offense</span>
              <span className="mode-defense">Defense</span>
            </button>
          </label>
          <button
            type="button"
            className="undo-btn"
            onClick={() => {
              setFoulPromptOpen(true);
              if (!foulPlayerId && game.ourTeam.players[0]) {
                setFoulPlayerId(game.ourTeam.players[0].id);
              }
            }}
          >
            Foul shots
          </button>
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

      <Toast message={toast} />

      {shotPrompt && (
        <div className="shot-prompt-overlay" role="dialog" aria-label="Shot result">
          <p className="shot-prompt-title">Complete or Incomplete?</p>
          <div className="shot-prompt-buttons">
            <button
              type="button"
              className="menu-item leaf"
              onClick={() =>
                confirmShotResult(
                  shotPrompt.type === 'SHOT_ON' ? 'SHOT_MADE' : 'MADE'
                )
              }
            >
              Complete
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() =>
                confirmShotResult(
                  shotPrompt.type === 'SHOT_ON' ? 'SHOT_MISSED' : 'MISSED'
                )
              }
            >
              Incomplete
            </button>
          </div>
        </div>
      )}

      {foulPromptOpen && (
        <div className="shot-prompt-overlay" role="dialog" aria-label="Foul shots">
          <p className="shot-prompt-title">Foul shots</p>
          <div className="shot-prompt-body">
            <label>
              <span className="label-text">Shooter</span>
              <select
                value={foulPlayerId}
                onChange={(e) => setFoulPlayerId(e.target.value)}
                aria-label="Foul shooter"
              >
                <option value="">— Select —</option>
                {game.ourTeam.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jerseyNumber} {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="shot-prompt-buttons">
            <button
              type="button"
              className="menu-item leaf"
              onClick={() => handleFoulShotMakeMiss('MADE')}
            >
              Make
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => handleFoulShotMakeMiss('MISSED')}
            >
              Miss
            </button>
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                setFoulPromptOpen(false);
                setFoulPlayerId('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`halfcourt-wrapper ${courtMode}`}>
        <div className="halfcourt">
          <CourtSvg courtMode={courtMode} />
          {POSITION_SPOTS.map((spot, i) => {
            const player = slotPlayers[i];
            const slotPos = POSITION_SPOTS[i].position;
            const isMenuOpen = menu !== null;
            return (
              <button
                key={slotPos}
                type="button"
                className="player-slot"
                style={{
                  left: `${spot.x}%`,
                  top: `${courtMode === 'offense' ? spot.y : 100 - spot.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (player && !isMenuOpen) openMenu(player, i, isOffense);
                }}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={player ? `Player ${player.jerseyNumber} ${player.name || ''}` : `Empty ${slotPos}`}
                disabled={!player || isMenuOpen}
              >
                {player ? (
                  <>
                    <span className="jersey">{player.jerseyNumber}</span>
                    {player.name && (
                      <span className="name-slot">{player.name}</span>
                    )}
                  </>
                ) : (
                  <span className="empty-slot">—</span>
                )}
              </button>
            );
          })}
        {menu && currentMenuNode && (() => {
          const spot = POSITION_SPOTS[menu.slotIndex];
          const anchorX = spot.x;
          const anchorY = courtMode === 'offense' ? spot.y : 100 - spot.y;
          const n = menuChildren.length;
          const radiusPct = 45; // % of menu container radius for option buttons
          return (
            <div
              ref={menuRef}
              className="action-menu action-menu-around-player"
              style={{
                left: `${anchorX}%`,
                top: `${anchorY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              role="menu"
              aria-label="Action"
            >
              {showBack && (
                <button
                  type="button"
                  key="menu-back"
                  className="menu-item menu-back action-menu-center"
                  onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onMenuBack(); }}
                >
                  ← Back
                </button>
              )}
              {n > 0 ? (
                menuChildren.map((item, idx) => {
                  const angle = (idx / n) * 2 * Math.PI - Math.PI / 2;
                  const left = 50 + radiusPct * Math.cos(angle);
                  const top = 50 + radiusPct * Math.sin(angle);
                  const leaf = getLeaf(item);
                  if (leaf) {
                    return (
                      <button
                        key={`${leaf.label}-${leaf.type}-${idx}`}
                        type="button"
                        role="menuitem"
                        className="menu-item leaf"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onMenuLeafSelect(leaf); }}
                      >
                        {leaf.label}
                      </button>
                    );
                  }
                  const node = item as ActionNode;
                  return (
                    <button
                      key={`node-${node.label}-${idx}`}
                      type="button"
                      role="menuitem"
                      className="menu-item"
                      style={{
                        left: `${left}%`,
                        top: `${top}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onMenuNodeSelect(node); }}
                    >
                      {node.label} →
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item leaf action-menu-center"
                  onPointerUp={(e) => { e.preventDefault(); e.stopPropagation(); onMenuLeafSelect(currentMenuNode as ActionLeaf); }}
                >
                  {(currentMenuNode as ActionLeaf).label}
                </button>
              )}
            </div>
          );
        })()}
        </div>
      </div>
    </section>
  );
}
