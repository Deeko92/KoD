# KoD — Dungeon Defense Card Game
## Game Design Document (Concept Draft v0.1)

> This document is a cleaned-up and organized version of the original concept
> brain-dump. It captures every design decision, rationale, rejected idea, and
> open question as stated. Next steps after this document: stat math /
> progression curves, then a playable prototype.

---

## 1. Concept / Elevator Pitch

You are the **master of a dungeon**, and you must defend it from waves of
adventurers trying to loot it. Your dungeon contains a **Treasury** with a set
pool of Health Points — if the adventurers break through your defenses and
destroy the Treasury, the run is over.

You defend using a hand/deck of **mob cards**. Combat is quick and tactile
(drag or flick a card at an adventurer to attack). Runs are structured as a
series of **days**, each with waves of adventurers that grow in number and
strength as the run goes on.

The meta-progression is heavily inspired by **Balatro**: survive the required
number of days in a dungeon to unlock a **Hard Mode** with rule sets and
restrictions, and beating that (under certain parameters) unlocks the next
dungeon, and so on. This keeps runs fresh over time.

**Session length target:** waves should take roughly **5–10 minutes**, so the
game can be played in short bursts (mobile-first).

---

## 2. Core Entities & Stats

### Mob cards and adventurers

Every mob card and every adventurer has three main stats:

- **Attack (ATK)**
- **Defense (DEF)**
- **Health Points (HP)**

### Stat variance on recruits

The same mob type can be recruited with **different stat rolls**. One goblin
you recruit might be tanky (higher HP/DEF, low ATK); the same mob recruited
the next day might have higher ATK but lower DEF/HP. Not every card is the
same, so players have to strategize around what they actually have.

> **Explicit decision:** an earlier idea to classify mobs into
> **Tank / DPS / Support** roles (support mobs providing buffs/debuffs) is
> **crossed off the list for now**. Stat variance replaces it.

### Special abilities

Basic play starts with just the three stats. As the player progresses into
later dungeons, **special abilities** are introduced on both mobs and
adventurers — things the player has to strategize around. Examples floated:

- A chance for a card to **attack twice**.
- An ability that **paralyzes an adventurer for a turn**.

Abilities can also potentially be **unlocked on mobs by leveling them up**
(see Kill/XP in §5).

### The Treasury

- The Treasury has its own HP pool. It is the **loss condition**.
- **The Treasury can never be healed.** It is the thing you are defending;
  damage to it is permanent for the run.

---

## 3. Combat System — the "bread and butter"

Combat is where the core of the game lives; it is how players advance.

### Basic flow (early game)

1. The player **drags or flicks** the mob card they want to attack with at
   the adventurer.
2. The mob attacks the adventurer.
3. If the adventurer **survives**, it **attacks back**.
4. If the mob survives the counterattack, it returns to play (hand or discard
   pile — see the open question in §6).
5. If the mob **dies, that card is gone forever** (permadeath).

Early waves are **one adventurer at a time**, so players can get acclimated
to the battle system and the flow of the game.

### Permadeath — and why it should be part of strategy

A dead mob card never comes back, so players have to be strategic about the
fights they pick. However, **losing mobs should not be very punishing** — it
should almost be part of the strategy: throwing a weak mob at an enemy to
shave off some health, sacrificing it as **frontline fodder** so a stronger
mob can finish the job.

### Overkill damage bleeds through to the Treasury

If an adventurer's attack kills a mob with damage left over, the **remaining
damage hits the Treasury**.

**Worked example (from the original notes):**

- An adventurer has 5 HP left and **5 ATK**.
- The defending mob has **2 HP** and can absorb 3 damage total.
- The adventurer deals 3 damage to kill the mob (HP to zero), and the
  **remaining 2 damage goes to the Treasury**. Treasury loses 2 HP.

### Letting an adventurer through

The player has the option to **deliberately let an adventurer pass through**
to the Treasury instead of fighting it. Use case: the player is low on mobs
and a boss is coming — let a weak adventurer through to hit the Treasury so
the player's mobs can be saved for the boss fight at the end of the wave.

> **Rule:** any adventurer let through to the Treasury is **not** present at
> the end of the day, so it is **not available** for the recruit / kill /
> loot choice (§5).

### Later-game combat

Further into a run / in later dungeons:

- **Multi-enemy battles:** 2–3 adventurers attacking at once, so the player
  must choose targets strategically.
- **AoE attacks** and similar tools enter the picture.
- Adventurers gain **special abilities** the player has to play around.

---

## 4. Day & Wave Structure

- A run is made up of **days**. Each day has one or more **waves** of
  adventurers.
- **Early game:** one wave of monsters per day, one adventurer at a time.
- **As the run progresses:** more waves per day, more adventurers per wave,
  and stronger adventurers and bosses.
- Difficulty scales with days survived — the longer the run goes, the
  stronger the adventurers the player faces.

### Mid-day rests (idea, still forming)

With multiple waves per day, there may be a **rest between waves** where the
player can quickly choose to recruit / loot / kill the adventurers they've
defeated so far — or keep the wave going to the end. The intent: if a player
heads into a big wave, they shouldn't be caught with only a few mobs to
defend with.

---

## 5. End-of-Day Economy: Recruit / Kill / Loot

At the end of the day (after however many waves there are), the player is
presented with each adventurer they defeated in the dungeon that day, and
chooses **one action per defeated adventurer**:

| Action | Effect |
|---|---|
| **Recruit** | The adventurer joins your hand/deck as a mob to defend the dungeon with from the next day onward. |
| **Kill** | Grants **experience points**, put toward leveling up your mobs — increasing stats and possibly unlocking special abilities. |
| **Loot** | Grants **gold**, spent on healing mobs, drawing a mob to recruit, or possibly other action items. |

### Rare adventurers

There should be **rare adventurers** that show up at the dungeon — ones
players get excited about finally facing and defeating so they can recruit
them for their team.

### Gold — what it's for (and what it's not)

Gold can be spent on:

- **Healing mobs** at the end of the round (mobs can be healed; the Treasury
  cannot).
- **Drawing a mob to recruit.**
- Possibly other action items (TBD).

> **Explicit decision:** an idea where looting grants **gear** to equip on
> mobs to increase their stats was considered and **rejected for now** — that
> system felt like it would be too complicated.
>
> **Balance intent:** gold should **not** simply let you purchase mobs
> outright later on — that would let looting bypass the recruiting decision.

### The balance tension (why one action per card matters)

The whole point of the choice is that you **can't recruit everybody, kill
everybody, or loot everybody** — you need a balance:

- If you never recruit, your run grinds to a standstill with only a few mobs
  left to fight with each day (remember: dead mobs are gone forever, and
  adventurers you defeat disappear at day's end if unused). Once you kill or
  loot, you'll eventually have to recruit — or risk running a day with very
  few mobs.
- If you could recruit everyone, there'd be no tension at all.

### Limiting the actions: energy/AP or gold? (open design question)

In the beginning there aren't many adventurers per wave, so players will have
enough capacity to recruit/kill/loot everything they face. But as waves get
longer and adventurers get stronger, the player should **not** be able to
recruit 20 different adventurers. Two candidate systems:

1. **Energy / action point system** at the end of the round that caps how
   many end-of-day actions can be taken.
2. **Gold as the action currency:** killing adventurers during the day earns
   gold, and gold is what's **spent** to perform loot / recruit / kill
   actions at day's end. Looting then gives a chance at *more* gold,
   increasing your economy for the next day.

---

## 6. Hand & Deck

- The player **starts with 5 basic mobs**; the starting hand size for the
  starter dungeon is **5**.
- There is a **deck size limit** and a **hand size limit**. As the player
  progresses to other dungeons, deck size and hand size become part of the
  **rule sets / restrictions** that make later dungeons more difficult and
  challenging.

### Open question: fixed hand vs. deck + discard

Two models under consideration:

1. **Fixed hand:** the player chooses the 5 mobs they go into the day with
   before it starts, and surviving mobs return to hand after attacking.
2. **Deck + discard pile (currently favored):** the player has a *deck* of
   mobs they draw from. When a mob attacks and survives (e.g., it hit an
   adventurer, the adventurer counterattacked, and the mob lived), instead of
   returning to the hand to be played again immediately, it goes into a
   **discard pile**. Players therefore cycle through their whole deck over
   the course of a wave instead of relying on the same few cards.

---

## 7. Progression & Meta (Balatro-inspired)

The inspiration is Balatro's loop — beat the ante, beat the boss, and unlock
a new deck if you clear it under certain parameters. Here, **dungeons** play
that role:

- The **starter dungeon** is very basic — it exists for players to get
  acclimated to the gameplay and the flow of the game.
- **Survive a set number of days** in a dungeon to unlock that dungeon's
  **Hard Mode**, which comes with a rule set and restrictions.
- Meeting Hard Mode's parameters unlocks a **second dungeon**, and so on.
- As dungeons progress, the game introduces: special abilities on mobs and
  adventurers, tougher monsters and bosses, **multi-combatant battles**
  (e.g., 3 mobs vs. 3 adventurers at once), and deck/hand size restrictions.

---

## 8. Design Pillars & Balance Goals

The recurring principles behind the decisions above:

1. **Short sessions.** ~5–10 minute waves; playable in bursts on mobile.
2. **Combat is the core.** The battle system is the bread and butter; it's
   how players advance.
3. **Losing mobs is strategy, not punishment.** Permadeath is real, but
   sacrificing fodder to chip an enemy down should be a legitimate play.
4. **Recruit / Kill / Loot must stay in tension.** No single choice should
   dominate; the economy exists to force trade-offs. Gold must not become a
   backdoor around recruiting.
5. **The Treasury is sacred.** It can never be healed — every point of damage
   it takes is a permanent cost for the run.
6. **Difficulty ramps with days survived**, and meta-difficulty ramps through
   dungeon unlocks with rule restrictions.

---

## 9. Open Questions

Consolidated list of everything still undecided:

- **Hand model:** fixed hand of 5 chosen per day vs. deck + discard cycling
  (currently leaning deck + discard). (§6)
- **End-of-day action limit:** energy/AP system vs. gold-as-currency for
  recruit/kill/loot. (§5)
- **Mid-day rests:** exact mechanics of resting between waves and when
  mid-day recruit/loot/kill choices resolve. (§4)
- **Special ability design:** which abilities exist, and how mobs unlock
  them (leveling vs. rarity vs. dungeon progression). (§2, §5)
- **Other gold sinks:** what else gold can be spent on beyond healing and
  drawing recruits. (§5)
- **Stat & scaling math:** base stats for mobs and adventurers, how they
  progress and get stronger over days/dungeons — explicitly the next work
  item after this document. (§10)

---

## 10. Roadmap / Next Steps

1. **Game design document** — this file (iterate as decisions land).
2. **The math** — stat curves for mobs and adventurers: base stats, how they
   progress, and how enemies get stronger over days and dungeons.
3. **Prototype.**

### Tech stack (undecided)

Constraints and direction:

- Very limited access to desktop computers, so the prototype must be **easily
  deployable and testable on mobile**.
- Likely path: a **web build** — hosted through GitHub (e.g., GitHub Pages)
  or, if needed, a purchased domain — that can be **wrapped into a native
  app later on**.
