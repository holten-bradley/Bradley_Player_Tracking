# Basketball Player Tracking App — MVP Plan

## Tracking model: one team in a two-team game

We track **one team** (ours) in a two-team game. The opponent exists as the other side of the game but we do **not** maintain a full roster or per-player stats for them. All event logging and box score detail is **by our players only**, organized as:

- **Offensive logging** — Events where our player has the ball or creates offense: shots, dribbles, passes, inferred assists, turnovers, etc. Always assigned to one of our players.
- **Defensive logging** — Events where our player is acting on defense: stops, blowbys, rebounds, steals, blocks, fouls. Always assigned to one of our players.

This gives a **per-player view of what each player did** (offensive + defensive) instead of a chronological gameflow, and keeps the MVP focused and scoped.

---

## MVP Scope

| Feature | Description |
|--------|--------------|
| **Create game** | New game: our team name, opponent name, optional date/time, home/away/neutral. |
| **Roster** | One roster only — our team. Add/edit players (jersey #, name; position optional). Opponent = name only, optional roster. |
| **Event logging** | Log events **by our player**, split into **offensive** (shots, passes, dribbles, inferred assists, turnovers, FTs) and **defensive** (shots allowed, blowbys, stops, rebounds, steals, blocks, fouls). |
| **Box score view** | Per-player and team-total stats for **our team only** — offensive and defensive stats derived from the event log. |
| **Edit / Undo last event** | Remove or edit the most recently logged event and recalc stats. |

---

## 1. Create Game

- **Screen/flow:** “New game” creates a game and asks for:
  - **Our team name** (the team we’re tracking)
  - **Opponent name** (the other team; optional roster tracked)
  - (Optional) Date/time, venue, home/away/neutral
- **State:** One “current game.” Game has one tracked team (with roster) and one opponent (name only), plus an event log. Optional quarter, half, and overtime tracking

**Acceptance:** User can start a game and see it as the active game (our team + opponent name).

---

## 2. Roster (our team only)

- **Screen/flow:** For the active game, “Edit roster”:
  - **Our team’s roster only:** Add/remove players; each player: jersey number, name (required). Optional: position.
  - No opponent roster — opponent is just a label for the game.
- **State:** One team has a list of players. No duplicate jersey numbers. All events reference only these player ids.

**Acceptance:** Our team has at least one player; all logged events are assigned to our players.

---

## 3. Event Logging (offensive vs defensive by player)

Events are always **assigned to one of our players** and grouped conceptually as offensive or defensive so we get a clear “what did this player do?” view.

- **Offensive events** (our player with the ball / creating offense):
  - Pass
    - turnover
    - complete
  - Dribble
    - turnover
    - pass
    - shot
  - Shot
    - 3pt
      - make
      - miss
    - 2pt
      - make
      - miss
    - 1pt
      - make
      - miss
- **Defensive events** (our player on defense):
  - Rebound
    - offensive
    - defensive
  - Shot on
    - make
    - miss
  - Dribbled on
    - forced pass
    - allowed shot
  - Steal — our player
  - Block — our player
  - Foul — our player (personal)
- **UI:** Choose **our player**, then event type, then confirm. Possesion change button for rebounds and turnovers will trigger if the event selection is offensive or defensive options. Optional: period, timestamp for later.
- **State:** Events stored as an ordered list. Each event: primaryPlayerId (always one of our players), type, optional period/timestamp. No secondary player required for MVP.

**Acceptance:** User can log offensive and defensive events by our player; box score updates and reflects per-player offensive and defensive stats.

---

## 4. Box Score View (our team only)

- **Content:**
  - **Our team:** Totals for points, FGM–FGA (2pt/3pt), FTM–FTA, rebounds (O/D), assists, turnovers, steals, blocks, fouls.
  - **Per player (our roster):** Same stat categories — a **detailed view of what each player did** (offensive + defensive), not gameflow. Show all roster with nulls for unused.
- **Layout:** Classic box: rows = our players + team total, columns = stat categories. Single table (or offensive / defensive subsections if desired).
- **Updates:** Recalculated from the event log whenever the log or roster changes.

**Acceptance:** Box score matches the logged events and stays in sync after add/edit/undo; it answers “what did each of our players do?” not “what happened in order?”

---

## 5. Edit / Undo Last Event

- **Undo:** “Undo last event” removes the last event from the log. Box score recalculates.
- **Edit:** “Edit last event” opens the last event (same UI as logging: type, player(s)) and saves. Event list and box score update.
- **State:** Same event list; one operation at a time on the “last” event is enough for MVP.

**Acceptance:** Undo or edit last event and box score is correct; no duplicate or orphan stats.

---

## Suggested Data Model (MVP)

```text
Game
  id, createdAt?, status?
  ourTeam: Team          // the one team we track (full roster)
  opponentName: string   // other team; no roster
  events: [ Event ]

Team
  id, name
  players: [ Player ]

Player
  id, teamId, jerseyNumber, name, position?

Event
  id, gameId, type, period, optional timestamp
  primaryPlayerId         // always one of our team's players
  result                // e.g. REBOUND_OFF vs REBOUND_DEF, or future flagstipll
```

**Event types (by our player; offensive vs defensive for display/grouping):**  
- *Offensive:* `ATTEMPTED_2`, `ATTEMPTED_3`, `ATTEMPTED_FT`, `INFERRED_ASSIST`, `TURNOVER`  
- *Defensive:* `REBOUND`, `STEAL`, `BLOCK`, `FOUL`, `SHOT_ON`, `PASS_ON`

**result types (by our player; offensive vs defensive for display/grouping):**  
- *Offensive:* `MADE`, `MISSED`, `OFF`, `DEF`, `FORCED_PASS`, `ALLOWED_SHOT`, `COMPLETE`, `TURNOVER`, `PASS`, `SHOT`, 
- *Defensive:* `SHOT_MADE`, `SHOT_MISSED`, `PASS_COMPLETED`, `PASS_INCOMPLETE`
---

## Tech Stack

- **Frontend:** React + TypeScript, Vite.
- **State (MVP):** In-memory + **localStorage** with an organized key scheme and a single data-access layer (see below).
- **State (later):** Backend API; same types and service interface, implementation swaps to `fetch()`.
- **Styling:** CSS/Tailwind for layout (e.g. box score tables).
- **Mobile (iPad / iPhone):** Viewport and safe-area meta/CSS in place; use touch-friendly targets (e.g. min 44px) when building UI.

---

## Backend-ready architecture (keep localStorage organized)

Goal: build the app against a **data service** that looks like a future API. MVP uses localStorage under the hood; later we add a real backend and only change the service implementation.

### 1. Single data-access layer

- **API surface:** One module (e.g. `api/` or `services/gameService.ts`) that exposes:
  - `getActiveGame()`, `createGame(...)`, `updateGame(...)`
  - `getOurTeam(gameId)` (or `getRoster(gameId)`), `addPlayer(...)`, `updatePlayer(...)`, `removePlayer(...)`
  - `getEvents(gameId)`, `appendEvent(...)`, `replaceLastEvent(...)`, `removeLastEvent()`
- **Return types:** Use the same TypeScript types (Game, Team, Player, Event) for both localStorage and future REST. No “local-only” shapes in the UI.
- **React:** Components and state (e.g. context or hooks) call only this layer—never `localStorage` directly.

### 2. Organized localStorage keys

Use a small, consistent namespace so keys are predictable and easy to migrate or clear:

| Key | Content | Notes |
|-----|--------|--------|
| `basketball_tracker/activeGameId` | `string \| null` | ID of the current game (null if none). |
| `basketball_tracker/game/{id}` | `Game` (JSON) | Full game: teams, players, events. One key per game. |

Alternative: single key `basketball_tracker/state` with `{ activeGameId, games: Record<string, Game> }` if you prefer one read/write for the whole app. Either way, **all** persistence goes through the data layer so we can later replace it with API calls.

### 3. Types = future API contract

- Define **shared types** (e.g. `types/game.ts`) for Game, Team, Player, Event.
- Keep payloads **serialization-friendly** (no functions, no class instances). Same types can be used for:
  - localStorage (JSON parse/stringify)
  - Future REST request/response bodies
- When you add a backend, the API can accept/return these same shapes; the frontend service just switches from `localStorage` to `fetch(url, { ... })` and handles loading/error state.

### 4. Minimal “backend switch”

- **MVP:** `gameService.ts` reads/writes localStorage and returns Promises (or sync, but async is easier to swap).
- **Later:** New file (e.g. `gameService.api.ts`) with same function signatures, using `fetch` to your backend. App entry or a small config (e.g. `VITE_USE_API=true`) chooses which implementation to use. No changes in React components.

---

## Implementation Order

1. **Data layer** — Shared TypeScript types (Game with ourTeam + opponentName, Team, Player, Event). Data service with localStorage implementation and the key scheme above. No direct localStorage in UI.
2. **Create game + roster** — UI to create game (our team name + opponent name) and add/edit our team’s roster only.
3. **Event logging** — Log offensive and defensive events by our player; append to game’s event list.
4. **Box score** — Derive per-player and team stats (offensive + defensive) from events; render table for our team.
5. **Undo / Edit last event** — Service methods to replace/remove last event; box score recalculates.

---

## Out of Scope for MVP

- **Opponent roster or opponent stats** — we track one team only; opponent is a name/label.
- Multiple games list / game selector (one active game is enough).
- Play-by-play timeline / gameflow view (per-player offensive + defensive view is the focus).
- Substitutions and minutes (can add later).
- **Backend server** (add later for resume; architecture is ready).
- Auth or multi-device sync.
- Advanced foul logic (flagrant, technical) or possession tracking.

---

## Next Step

Implement **Step 4 (Box score)** — Derive per-player and team stats (offensive and defensive) from the event log; render a box score table for our team only. Rows = our players + team total; columns = stat categories (points, FGM–FGA 2pt/3pt, FTM–FTA, rebounds O/D, assists, turnovers, steals, blocks, fouls). Box score recalculates when events or roster change.
