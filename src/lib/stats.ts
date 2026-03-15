import type { Event, EventType, ShotValue } from '../types/game';

export interface DerivedReboundsAndAssists {
  rebounds: Record<string, number>;
  assists: Record<string, number>;
}

function isOurShot(type: EventType): boolean {
  return type === 'ATTEMPTED_2' || type === 'ATTEMPTED_3' || type === 'ATTEMPTED_FT';
}

function isOpponentShot(type: EventType): boolean {
  return type === 'SHOT_ON';
}

/**
 * Derive rebounds and assists from the raw event stream.
 *
 * Rules (MVP approximation):
 * - Rebounds:
 *   - Our missed shot (ATTEMPTED_* with MISSED):
 *     - If the next shot event is also ours, credit an offensive rebound to the original shooter.
 *     - If the next shot event is a SHOT_ON (opponent), treat it as a defensive rebound by the opponent (not tracked per-player here).
 *   - Opponent missed shot (SHOT_ON + SHOT_MISSED):
 *     - If the next shot event is ours, credit a defensive rebound to our next shooter.
 * - Assists:
 *   - PASS with result COMPLETE on offense:
 *     - Look at the very next offensive event.
 *     - If it is a made shot (ATTEMPTED_* with MADE), credit a derived assist to the passer.
 */
export function deriveReboundsAndAssists(events: Event[]): DerivedReboundsAndAssists {
  const rebounds: Record<string, number> = {};
  const assists: Record<string, number> = {};

  const inc = (map: Record<string, number>, playerId: string) => {
    map[playerId] = (map[playerId] ?? 0) + 1;
  };

  // Work on a copy to avoid accidental mutation assumptions about order
  const ordered = [...events];

  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];

    // --- Assists: PASS COMPLETE -> next offensive made shot ---
    if (e.type === 'PASS' && e.result === 'COMPLETE') {
      const passerId = e.primaryPlayerId;
      // Look ahead to the very next offensive event
      for (let j = i + 1; j < ordered.length; j++) {
        const next = ordered[j];
        if (!isOurShot(next.type)) {
          // Skip anything that isn't our shot attempt; once we hit an opponent shot or other action, stop.
          if (isOpponentShot(next.type)) break;
          continue;
        }
        // Next offensive event is a shot attempt
        if (next.result === 'MADE') {
          inc(assists, passerId);
        }
        break;
      }
    }

    // --- Rebounds: our missed shot ---
    if (isOurShot(e.type) && e.result === 'MISSED') {
      for (let j = i + 1; j < ordered.length; j++) {
        const next = ordered[j];
        if (isOurShot(next.type)) {
          // Offensive rebound to original shooter
          inc(rebounds, e.primaryPlayerId);
          break;
        }
        if (isOpponentShot(next.type)) {
          // Defensive rebound by opponent (not tracked per-player yet)
          break;
        }
      }
    }

    // --- Rebounds: opponent missed shot ---
    if (isOpponentShot(e.type) && e.result === 'SHOT_MISSED') {
      for (let j = i + 1; j < ordered.length; j++) {
        const next = ordered[j];
        if (isOpponentShot(next.type)) {
          // Offensive rebound by opponent; ignore for our per-player stats
          break;
        }
        if (isOurShot(next.type)) {
          // Defensive rebound to our next shooter
          inc(rebounds, next.primaryPlayerId);
          break;
        }
      }
    }
  }

  return { rebounds, assists };
}

