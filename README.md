# KoD — Keeper of Dungeons

A roguelike dungeon-defense card game: adventurers raid your dungeon in
daily waves, you defend the Treasury with a deck of mob cards, and at the
end of each day you choose what to do with the fallen — **recruit** them,
**kill** them for XP, or **loot** them for gold.

| Doc | What's in it |
|---|---|
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | Full design document |
| [`docs/MATH.md`](docs/MATH.md) | Balance math, stat curves, economy — simulation-validated |
| [`sim/simulate.py`](sim/simulate.py) | Balance simulator (`python3 sim/simulate.py`) |
| [`web/`](web/) | Playable prototype (vanilla JS, no build step) |

## Play the prototype

**Hosted (after enabling Pages):** once this is merged to `main`, go to
repo **Settings → Pages → Source: GitHub Actions** (one-time). Every push
to `main` then deploys automatically and the game is live at
`https://deeko92.github.io/KoD/` — open it on your phone and add it to
your home screen.

**Locally:** any static file server works, e.g.

```bash
python3 -m http.server 8000 --directory web
# then open http://localhost:8000
```

Useful bits for playtesting:

- `?seed=42` in the URL replays the exact same run (the seed is also shown
  on the game-over screen — screenshot it when reporting weird runs).
- A run in progress is auto-saved to the browser, so refreshing or
  switching apps won't lose it.

## Engine self-test

The game rules live in DOM-free modules (`web/js/game.js`), verified
against the Python simulator by a headless bot:

```bash
node web/js/selftest.mjs
```

It checks the worked combat example from `docs/MATH.md`, overkill bleed,
save/load round-trips, and that the bot win rate lands in the same band as
`sim/simulate.py` (~50%).
