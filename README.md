# Hogwarts Academy

A small reading room for the [Wizard World API](https://wizard-world-api.herokuapp.com/swagger/index.html):
the four houses, 300+ spells, and every recorded elixir — served live.

- **Zero runtime dependencies.** Node's built-in `http`, `fetch`, and `fs` do the work.
- **Typed at the edge.** `src/api.ts` models the API responses; the server proxies them.
- **No build step.** The page is plain HTML/CSS/JS, served straight from `public/`.

## Quick start

```bash
npm install
npm start
```

Open <http://localhost:4000>. `PORT=8080 npm start` to use another port.

## How it fits together

```
src/api.ts        Typed client for the Wizard World API
src/server.ts     Static server + /api proxy with a 5-minute cache
public/           The page: index.html, styles.css, app.js
src/main.ts       Original TypeScript practice module (run with npm run demo)
```

The browser never talks to the upstream API directly: it calls `/api/houses`,
`/api/spells`, and `/api/elixirs`, and the server fetches, caches, and returns
the JSON. That keeps the page fast and avoids CORS surprises.

## Endpoints

| Route | Upstream | Notes |
| --- | --- | --- |
| `GET /api/houses` | `/Houses` | All houses, founders, traits |
| `GET /api/spells` | `/Spells` | Supports `?name=` and `?type=` |
| `GET /api/elixirs` | `/Elixirs` | Supports `?name=` and `?difficulty=` |

## Features

- House cards with founder, animal, element, ghost, common room, heads, and traits.
- Spellbook search across name, incantation, effect, and type — press <kbd>/</kbd> to focus, <kbd>Esc</kbd> to clear.
- Apothecary filtered by difficulty, with side-effect warnings and ingredients.

## Scripts

```bash
npm start       # serve the site on http://localhost:4000
npm run demo    # the original TypeScript practice module
npm run typecheck
```

## TypeScript practice module

`src/main.ts` is kept as a practice exercise covering generics, utility types,
conditional types with `infer`, index signatures, type guards, and legacy
method decorators (`experimentalDecorators` is enabled in `tsconfig.json`).
