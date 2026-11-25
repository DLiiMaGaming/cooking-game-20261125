[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/DLiiMaGaming/cooking-game-20261125/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/DLiiMaGaming/cooking-game-20261125/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

# Dapur Senja — Sizzle & Serve

A complete original cooking game for the [best cooking game bounty](https://make.fun/c/best-cooking-game-20261125-0137) on make.fun. One chef, one warm evening kitchen, and a line of hungry customers: take orders from the board, fetch ingredients from the pantry, chop them on the board, cook them on the stove, build each dish on the plating counter, and serve it through the window before the customer's patience runs out.

## How to play

- **Move:** WASD or arrow keys (or click anywhere to walk there)
- **Interact (E or click):** pick up an ingredient, set a ready ingredient on the plate, serve a finished plate at the window, throw a wrong item in the trash
- **Q:** clear the plate
- **P:** pause · **M:** mute

Standing at the chopping board or the stove works the ingredient you carry — chopping and cooking run on their own while you stay put, and pause the moment you walk away. That is the whole game: plan your route through the kitchen, not your chores.

## The kitchen

- **5 recipes, 6 ingredients:** Nasi Goreng Senja, Mie Pedas Kilat, Ayam Bakar Madu, Sup Senja, Telur Dadar Senja — built from nasi, mie, ayam, telur, sayur and sambal, each with its own prep chain (chop, cook, or chop-then-cook).
- **Orders with patience:** up to 4 tickets on the board at once, each with a draining patience bar. Serve fast for a bigger tip; let one expire and the combo breaks.
- **Combos:** every dish served in a row raises the multiplier, up to x2.
- **Rush hour:** the last 45 seconds of the 150-second shift spawn orders faster with shorter patience.
- **Stars:** 4+ dishes for one star, 7+ for two, 10+ for three.

## Play it

No build step, no network: static files under `game/`. Serve them any way you like:

```sh
node serve.ts
# then open http://localhost:8080
```

Or open `game/index.html` through any static server. `?shot=start|play|rush|end` stages a deterministic scene (used for the screenshots), and `?selftest=1` plays a full shift with the built-in autopilot and prints the result.

## Layout

- `game/index.html` — the page, canvas only
- `game/src/main.js` — frame loop and wiring
- `game/src/world.js` — orders, chef, prep work, plating, serving, scoring
- `game/src/config.js` — layout, timing and tuning
- `game/src/recipes.js` — ingredients and recipes
- `game/src/render.js` — all drawing: kitchen, chef, food, HUD
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds, no files
- `game/src/shots.js` — deterministic screenshot scenes and the autopilot
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
