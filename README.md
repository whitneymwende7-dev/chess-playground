# Chess Playground

A playable chess game built for a portfolio "playground" — visitors can play
locally against a friend or against a computer opponent with four scaled
difficulty levels, each with its own background theme. Wins against the
computer are logged to a Hall of Fame.

## Structure
- `client/index.html` — the whole frontend: board rendering, move validation
  (via chess.js), the difficulty-scaled computer opponent, theming, and the
  Hall of Fame UI. Currently self-contained and runs by just opening the file
  or serving it statically.
- `server/` — Express backend. Hosts:
  - `POST /api/coach` — sends the current position to Claude and returns
    plain-language commentary on the position.
  - `GET /api/scores` / `POST /api/scores` — shared Hall of Fame, backed by
    Prisma + SQLite locally (swap to MySQL for deployment — see
    `server/prisma/schema.prisma`).
  - `GET /api/health` — quick check the server's alive.

## Status
- [x] Step 1 — project scaffold + backend deps
- [x] Step 2 — playable board, 4 difficulty levels, themed backgrounds,
      Hall of Fame (currently browser-local via localStorage)
- [x] Step 3 — Express backend: `/api/coach` (Claude) + `/api/scores` (Prisma)
- [ ] Step 4 — connect frontend to backend: real commentary + shared scores
      instead of localStorage
- [ ] Step 5 — env vars review, error handling polish, deploy notes
      (Railway/Render)

## Running the client right now
Just open `client/index.html` in a browser — no build step needed yet.
It still uses localStorage for the Hall of Fame until Step 4 wires it to
the server.

## Running the server
```
cd server
cp .env.example .env      # then fill in ANTHROPIC_API_KEY
npm install
npx prisma migrate dev --name init   # creates the local SQLite database
npm run dev
```
Server runs on `http://localhost:3001` by default. Test it's alive:
```
curl http://localhost:3001/api/health
```
