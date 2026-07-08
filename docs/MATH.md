# KoD — Balance Math & Stat Curves (Starter Dungeon)

> Companion to `GAME_DESIGN.md` §10 roadmap item 2. Every number in this
> document was validated by simulation (`sim/simulate.py`), which plays full
> runs with a simple greedy bot. All constants live at the top of that file —
> change one, re-run, and check the win rate before adopting it.

---

## 0. Three foundational decisions (assumed — easy to change)

These were picked as recommended defaults; everything below depends on them,
but all are retunable:

| Decision | Choice | Why |
|---|---|---|
| Defense mechanic | **Flat reduction**: `damage = max(1, ATK − DEF)` | Readable on a card, mental math mid-fight, DEF never makes a unit invincible |
| Number scale | **Small integers** (starter mobs ~2 ATK / 7 HP, endgame ~30s) | Fast decisions in 5–10 min mobile sessions |
| Run length | **10 days**, mini-boss day 5, final boss day 10 | ~60–90 min winning run played in bursts; Balatro-like pacing |

---

## 1. The stat budget system

Every unit (mob or adventurer) is defined by a single **budget** number,
spent on stats at fixed prices:

| Stat | Cost per point |
|---|---|
| ATK | 2 |
| DEF | 2 |
| HP  | 1 |

`budget = 2·ATK + 2·DEF + HP`

This is the backbone of the whole system:

- **Difficulty scaling** = one curve (budget per day), not three.
- **Stat variance on recruits** (GDD §2) = same budget, different split. Two
  goblins are equally "fair" but play differently.
- **Content authoring** = to add a new adventurer type, pick a budget and a
  personality (ATK-heavy, tanky, balanced) — the math stays balanced.

### Rolling a unit from a budget

A unit rolls an **ATK share** and **DEF share** of its budget (rest goes to
HP):

| Unit type | ATK share | DEF share | Personality |
|---|---|---|---|
| Adventurers | 20–35% | 0–10% | HP-heavy raiders: big health bars, weak counterattacks |
| Bosses | 25% (fixed) | 5% (fixed) | Giant HP walls with scary-but-survivable hits |
| Player's 5 starting mobs | **35–50%** | 0–10% | Attackers by design — see §6 sensitivity note |

```
ATK = max(1, round(atk_share · budget / 2))
DEF = round(def_share · budget / 2)
HP  = budget − 2·ATK − 2·DEF     (always ≥ 1)
```

Recruited adventurers **keep the stats they were rolled with** (restored to
full HP on joining) — your army is literally yesterday's invaders.

---

## 2. Combat formulas

- **Damage**: `max(1, attacker ATK − defender DEF)` — minimum 1 so nothing
  is ever immune.
- **Hits to kill**: `ceil(target HP / damage per hit)`.
- **Counterattacks taken while killing something**: `hits − 1` (the killing
  blow draws no counter — this is the player's built-in edge for striking
  first, and why finishing blows matter tactically).
- **Overkill bleed**: when a counterattack kills a mob, `counter damage −
  mob's remaining HP` hits the Treasury (per GDD §3).
- **Let-through**: an adventurer sent to the Treasury deals its **ATK once**,
  takes its share of loot, and leaves the dungeon.

**Worked example (day 3):** adventurer 2/0/9 vs starting mob 3/0/6.
Mob deals 3 per hit → 3 hits to kill. Adventurer counters twice at 2 → mob
ends on 2 HP. One kill costs 4 HP of healing (2 gold) — sustainable, but
you can't tank everything forever.

---

## 3. Enemy scaling — the difficulty curve

```
day budget B(d) = round(10 · 1.135^(d−1))
boss budget     = round(B(d) · 1.6)
```

| Day | Budget | Typical adventurer (ATK/DEF/HP) | XP if killed | Gold if looted | Adventurers |
|---:|---:|---|---:|---:|---:|
| 1  | 10 | 1/0/8   | 2 | 4  | 2 |
| 2  | 11 | 2/0/7   | 3 | 4  | 2 |
| 3  | 13 | 2/0/9   | 3 | 5  | 3 |
| 4  | 15 | 2/0/11  | 3 | 5  | 3 |
| 5  | 17 | 2/0/13  | 4 | 6  | 3 + **BOSS** 3/1/19 (XP 6, gold 9) |
| 6  | 19 | 3/0/13  | 4 | 7  | 4 |
| 7  | 21 | 3/1/13  | 5 | 7  | 4 |
| 8  | 24 | 3/1/16  | 5 | 8  | 5 |
| 9  | 28 | 4/1/18  | 6 | 10 | 5 |
| 10 | 31 | 4/1/21  | 7 | 11 | 3 + **BOSS** 6/1/36 (XP 10, gold 17) |

("Typical" = mid-range roll; actual adventurers vary per §1.)

Waves ramp from 2 adventurers/day to 5 — the days 8–9 crunch right before
the final boss is where most losses happen (by design; see §7).

---

## 4. Player-side numbers

| Constant | Value | Notes |
|---|---|---|
| Starting mobs | 5 × budget 12 | ATK-leaning rolls, e.g. 3/0/6, 2/0/8, 2/1/6 |
| Hand size | 5 | Deck + discard cycling per GDD §6 |
| Treasury HP | **30** | Never healable. Winners average ~15 left — every point spent should feel real |
| Overnight regen | +2 HP per mob, free | "Mobs rest"; applied **when the end-of-day screen opens**, before recruit/kill/loot decisions — canonical ordering, see §6 finding 4 |
| Healing cost | 1 gold per 2 HP | The main gold sink |
| Emergency recruit draw | 10 gold | Draws a random mob at the current day's budget |

### XP & leveling (the Kill reward)

- Killing a defeated adventurer grants `XP = ceil(budget / 5)` (see table).
- Leveling a mob to level *L* costs `2 + L` XP and grants **+1 ATK, +2 HP**
  (a +4 budget swing per level — leveling a favorite mob keeps it relevant
  roughly one extra day per level).

### Gold (the Loot reward)

- Looting a defeated adventurer grants `gold = ceil(budget / 3)` (see table).
- Spent on healing (1g → 2 HP) and emergency recruit draws (10g).

### Action Points (the end-of-day limiter)

One AP per Recruit / Kill / Loot action, one action per defeated adventurer
(GDD §5). Chosen model: **AP caps the actions; gold is what Loot produces**
— the hybrid of the two options floated in the GDD.

| Days | AP per day | Adventurers per day | Tension |
|---|---:|---:|---|
| 1–3 | 2 | 2–3 | Process almost everything — tutorial pacing |
| 4–6 | 3 | 3–4 (+boss d5) | First real choices |
| 7–10 | 4 | 3–5 (+boss d10) | Must leave value on the table every day |

---

## 5. Why these numbers — the attrition identity

The run is won or lost on one comparison, per day:

> **damage sustained** (counters + bleed) vs **sustain capacity**
> (overnight regen + gold healing + recruits replacing the dead)

Adventurers are HP-heavy on purpose: their threat is *time* (more counters,
more chip damage across your team) rather than one-shots. The player's edge
comes from striking first, choosing matchups, finishing-blow timing, healing,
and recruiting yesterday's enemies. Because enemy budget grows 12%/day and
recruits lag one day, a recruit is born ~12% behind the curve — XP leveling
and stat-variance shopping (recruit the good rolls) close the gap. If the
player stops recruiting, attrition compounds within ~2 days — exactly the
"you must recruit or stall out" pressure the GDD asks for.

---

## 6. Simulation results & sensitivity

`sim/simulate.py`, greedy bot, 2000 seeded runs on the final constants
(cross-checked against the JS engine's headless bot in `web/js/selftest.mjs`,
which lands within ~1 point):

| Metric | Value | Target |
|---|---|---|
| Bot win rate | **49%** | 40–60% (humans play better; starter dungeon should land ~65–75% for a competent human) |
| Avg treasury on win | 12.5 / 30 | Wins should feel earned |
| Loss days | cluster at 8–10 | Losing late = tension, not frustration |
| Mobs lost per run | ~11 | Permadeath churn is real — matches "losing mobs is strategy" pillar |
| Recruits per run | ~10 | The army genuinely turns over |

**Sensitivity findings (handle these knobs with care):**

1. **ATK is the premium stat.** Shifting only the 5 starting mobs from
   ~27% to ~42% ATK share moved the bot win rate from 43% → 97%. Early ATK
   compounds: faster kills → fewer counters → cheaper healing → more
   XP/gold. If ATK ever feels dominant in playtests, raise its budget cost
   to 2.5–3 before touching anything else.
2. **The growth-rate cliff.** Bot win rate vs daily growth (canonical
   rules): 1.12 → 83%, 1.13 → 73%, **1.135 → 49%**, 1.14 → 19%, 1.15 → 6%.
   Tiny exponent changes are huge by day 10. This cliff is a gift for
   difficulty design: **Hard Mode ≈ growth 1.14–1.15** with no other
   changes needed.
3. Number-of-adventurers-per-day and overnight regen are gentler knobs
   (±10–20% win rate) — good for fine-tuning individual dungeons.
4. **Even rule *ordering* moves balance.** Applying overnight regen before
   vs after the recruit/kill/loot decisions changed the bot's loot-vs-kill
   choices enough to swing the win rate ~30 points (an XP-heavy strategy
   dominates once wounds look smaller). Canonical order, implemented in
   both the sim and the web prototype: **regen applies when the end-of-day
   screen opens**, so decisions always see true post-rest HP — and growth
   was re-tuned from 1.12 to 1.135 against the stronger resulting play.
   Lesson: re-run the simulator after *any* rule change, not just number
   changes.

---

## 7. Knobs for future dungeons & Hard Mode

Each dungeon/mode is just a constants profile:

| Knob | Starter | Hard Mode candidates |
|---|---|---|
| Growth rate | 1.135 | 1.14–1.15 |
| Boss multiplier | 1.6 | 1.8–2.0 |
| Treasury HP | 30 | 20–25 |
| Hand size | 5 | 4 |
| AP schedule | 2/3/4 | 2/2/3 |
| Overnight regen | 2 | 1 or 0 |
| Run length | 10 days | 12–15 days |

Special abilities (attack twice, paralyze, AoE) should be costed against the
budget system when they arrive — e.g., "20% chance to attack twice" ≈ +20%
effective ATK ≈ worth `0.2 · ATK · 2` budget points.

---

## 8. Re-running the simulation

```bash
python3 sim/simulate.py              # 2000 runs, summary stats
python3 sim/simulate.py --runs 500   # quicker check
python3 sim/simulate.py --verbose    # one run, day-by-day log
```

Workflow for any balance change: edit the constant in `sim/simulate.py`,
re-run, keep the bot win rate in the 40–60% band, then record the change in
this document.
