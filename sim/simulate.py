"""Balance simulator for KoD (dungeon defense card game).

Plays full 10-day runs with a simple greedy bot and reports win rate,
treasury damage, mob attrition, and economy stats. Used to validate the
numbers in docs/MATH.md — if you change a constant there, change it here
and re-run:

    python3 sim/simulate.py            # 2000 runs, summary stats
    python3 sim/simulate.py --verbose  # one run, day-by-day log
"""

import argparse
import math
import random
import statistics
from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# Tuning constants — keep in sync with docs/MATH.md
# ---------------------------------------------------------------------------

RUN_DAYS = 10
TREASURY_HP = 30
HAND_SIZE = 5

# Stat budget: ATK costs 2 pts, DEF costs 2 pts, HP costs 1 pt.
ATK_COST = 2
DEF_COST = 2
HP_COST = 1

# Enemy scaling
BASE_BUDGET = 10          # day-1 adventurer budget
GROWTH = 1.135            # per-day budget multiplier
BOSS_MULT = 1.6           # boss budget = day budget * BOSS_MULT
BOSS_DAYS = {5, 10}

# Adventurers per day (bosses added on BOSS_DAYS on top of these)
ADVENTURERS_PER_DAY = [2, 2, 3, 3, 3, 4, 4, 5, 5, 3]

# Stat-share ranges for rolled adventurers (fraction of budget)
ATK_SHARE = (0.20, 0.35)      # adventurers: HP-heavy raiders, weak counters
DEF_SHARE = (0.00, 0.10)
MOB_ATK_SHARE = (0.35, 0.50)  # starting mobs: attackers by design
BOSS_SHARES = (0.25, 0.05)  # fixed ATK/DEF share for bosses, rest HP

# Player start
START_MOBS = 5
START_BUDGET = 12

# Economy
def ap_for_day(d):        # end-of-day action points
    return 2 if d <= 3 else (3 if d <= 6 else 4)

def xp_for_kill(budget):
    return math.ceil(budget / 5)

def gold_for_loot(budget):
    return math.ceil(budget / 3)

HEAL_RATE = 2             # HP healed per 1 gold
NIGHT_REGEN = 2           # free HP every mob recovers overnight
DRAW_COST = 10            # gold to draw a fresh recruit of the current day
LEVEL_XP_COST = lambda new_level: 2 + new_level   # XP to reach new_level
LEVEL_ATK, LEVEL_HP = 1, 2                        # gains per level

# ---------------------------------------------------------------------------


@dataclass(eq=False)  # identity equality — twin mobs with equal stats are still distinct cards
class Unit:
    atk: int
    dfn: int
    max_hp: int
    hp: int
    level: int = 1

    @property
    def budget(self):
        return self.atk * ATK_COST + self.dfn * DEF_COST + self.max_hp * HP_COST


def roll_unit(budget, rng, atk_share=None, def_share=None):
    a = atk_share if atk_share is not None else rng.uniform(*ATK_SHARE)
    f = def_share if def_share is not None else rng.uniform(*DEF_SHARE)
    atk = max(1, round(a * budget / ATK_COST))
    dfn = max(0, round(f * budget / DEF_COST))
    hp = max(1, budget - atk * ATK_COST - dfn * DEF_COST)
    return Unit(atk=atk, dfn=dfn, max_hp=hp, hp=hp)


def day_budget(d):
    return round(BASE_BUDGET * GROWTH ** (d - 1))


def dmg(attacker, defender):
    return max(1, attacker.atk - defender.dfn)


@dataclass
class RunState:
    rng: random.Random
    treasury: int = TREASURY_HP
    team: list = field(default_factory=list)   # all living mobs
    gold: int = 0
    xp: int = 0
    verbose: bool = False
    # stats
    mobs_lost: int = 0
    recruits: int = 0
    kills: int = 0
    loots: int = 0

    def log(self, msg):
        if self.verbose:
            print(msg)


def fight_wave(state, adventurers, day):
    """One-at-a-time queue of adventurers vs the player's deck+hand."""
    rng = state.rng
    deck = state.team[:]
    rng.shuffle(deck)
    hand, discard, defeated = [], [], []

    def refill():
        nonlocal deck
        while len(hand) < HAND_SIZE and (deck or discard):
            if not deck:
                deck = discard[:]
                discard.clear()
                rng.shuffle(deck)
            hand.append(deck.pop())

    for adv in adventurers:
        refill()
        while adv.hp > 0:
            if not hand and not deck and not discard:
                # nothing left to defend with — adventurer hits the treasury
                state.treasury -= adv.atk
                state.log(f"  let through (no mobs): treasury -{adv.atk}")
                break
            refill()
            # pick attacker
            killers = [m for m in hand if dmg(m, adv) >= adv.hp]
            if killers:
                m = min(killers, key=lambda m: m.budget)
            else:
                survivors = [m for m in hand if m.hp > dmg(adv, m)]
                if survivors:
                    m = max(survivors, key=lambda m: dmg(m, adv))
                else:
                    m = min(hand, key=lambda m: m.budget)  # fodder
            hand.remove(m)
            adv.hp -= dmg(m, adv)
            if adv.hp <= 0:
                defeated.append(adv)
                hand.append(m)
                break
            counter = dmg(adv, m)
            if counter >= m.hp:
                bleed = counter - m.hp
                if bleed:
                    state.treasury -= bleed
                state.team.remove(m)
                state.mobs_lost += 1
                state.log(f"  mob died (bleed {bleed})")
            else:
                m.hp -= counter
                discard.append(m)
            if state.treasury <= 0:
                return defeated
    return defeated


def end_of_day(state, defeated, day):
    rng = state.rng
    # 0. free overnight rest happens as the end-of-day screen opens, so all
    #    decisions below see post-regen HP (canonical; matches web/js/game.js)
    for m in state.team:
        m.hp = min(m.max_hp, m.hp + NIGHT_REGEN)
    # 1. spend AP on defeated adventurers, biggest first
    ap = ap_for_day(day)
    target_size = min(8, 5 + (day >= 3) + (day >= 5) + (day >= 7))
    for adv in sorted(defeated, key=lambda a: a.budget, reverse=True):
        if ap <= 0:
            break
        ap -= 1
        missing = sum(m.max_hp - m.hp for m in state.team)
        if len(state.team) < target_size:
            adv.hp = adv.max_hp
            state.team.append(adv)
            state.recruits += 1
        elif state.gold * HEAL_RATE < missing:
            state.gold += gold_for_loot(adv.budget)
            state.loots += 1
        else:
            state.xp += xp_for_kill(adv.budget)
            state.kills += 1
    # 2. emergency draw if the team collapsed
    while len(state.team) < 3 and state.gold >= DRAW_COST:
        state.gold -= DRAW_COST
        state.team.append(roll_unit(day_budget(day), rng))
        state.recruits += 1
    # 3. paid healing (most-damaged first)
    for m in sorted(state.team, key=lambda m: m.max_hp - m.hp, reverse=True):
        need_gold = math.ceil((m.max_hp - m.hp) / HEAL_RATE)
        spend = min(need_gold, state.gold)
        m.hp = min(m.max_hp, m.hp + spend * HEAL_RATE)
        state.gold -= spend
    # 4. level up the strongest mob while XP lasts
    while state.team:
        m = max(state.team, key=lambda m: m.budget)
        cost = LEVEL_XP_COST(m.level + 1)
        if state.xp < cost:
            break
        state.xp -= cost
        m.level += 1
        m.atk += LEVEL_ATK
        m.max_hp += LEVEL_HP
        m.hp += LEVEL_HP


def play_run(seed, verbose=False):
    rng = random.Random(seed)
    state = RunState(rng=rng, verbose=verbose)
    state.team = [roll_unit(START_BUDGET, rng,
                        atk_share=rng.uniform(*MOB_ATK_SHARE))
              for _ in range(START_MOBS)]

    for day in range(1, RUN_DAYS + 1):
        b = day_budget(day)
        advs = [roll_unit(b, rng) for _ in range(ADVENTURERS_PER_DAY[day - 1])]
        if day in BOSS_DAYS:
            advs.append(roll_unit(round(b * BOSS_MULT), rng,
                                  atk_share=BOSS_SHARES[0],
                                  def_share=BOSS_SHARES[1]))
        state.log(f"Day {day}: {len(advs)} adventurers (budget {b}), "
                  f"team {len(state.team)}, treasury {state.treasury}")
        defeated = fight_wave(state, advs, day)
        if state.treasury <= 0:
            return False, day, state
        end_of_day(state, defeated, day)
        if not state.team and state.gold < DRAW_COST:
            return False, day, state
    return True, RUN_DAYS, state


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--runs", type=int, default=2000)
    p.add_argument("--verbose", action="store_true")
    args = p.parse_args()

    if args.verbose:
        won, day, s = play_run(seed=1, verbose=True)
        print(f"\n{'WON' if won else f'LOST on day {day}'} — "
              f"treasury {s.treasury}, mobs lost {s.mobs_lost}, "
              f"recruits {s.recruits}, kills {s.kills}, loots {s.loots}")
        return

    wins, loss_days, treasuries, lost, rec = 0, [], [], [], []
    for i in range(args.runs):
        won, day, s = play_run(seed=i)
        if won:
            wins += 1
            treasuries.append(s.treasury)
        else:
            loss_days.append(day)
        lost.append(s.mobs_lost)
        rec.append(s.recruits)

    print(f"runs: {args.runs}")
    print(f"win rate: {wins / args.runs:.1%}")
    if treasuries:
        print(f"avg treasury left on win: {statistics.mean(treasuries):.1f} / {TREASURY_HP}")
    if loss_days:
        print(f"avg loss day: {statistics.mean(loss_days):.1f}  "
              f"(distribution: {sorted(set(loss_days), key=loss_days.count)[-3:]})")
    print(f"avg mobs lost per run: {statistics.mean(lost):.1f}")
    print(f"avg recruits per run: {statistics.mean(rec):.1f}")


if __name__ == "__main__":
    main()
