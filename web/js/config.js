// Balance constants — mirrors sim/simulate.py and docs/MATH.md.
// Change a number there, validate with the simulator, then update here.

export const CONFIG = {
  RUN_DAYS: 10,
  TREASURY_HP: 30,
  HAND_SIZE: 5,

  // Stat budget prices: budget = 2*ATK + 2*DEF + HP
  ATK_COST: 2,
  DEF_COST: 2,
  HP_COST: 1,

  // Enemy scaling
  BASE_BUDGET: 10,
  GROWTH: 1.135,
  BOSS_MULT: 1.6,
  BOSS_DAYS: [5, 10],
  ADVENTURERS_PER_DAY: [2, 2, 3, 3, 3, 4, 4, 5, 5, 3],

  // Stat-share ranges (fraction of budget spent on ATK / DEF, rest = HP)
  ADV_ATK_SHARE: [0.20, 0.35], // adventurers: HP-heavy raiders, weak counters
  ADV_DEF_SHARE: [0.00, 0.10],
  BOSS_ATK_SHARE: 0.25,
  BOSS_DEF_SHARE: 0.05,
  MOB_ATK_SHARE: [0.35, 0.50], // starting mobs: attackers by design

  // Player start
  START_MOBS: 5,
  START_BUDGET: 12,

  // Economy
  NIGHT_REGEN: 2,   // free HP every mob recovers overnight
  HEAL_RATE: 2,     // HP healed per 1 gold
  DRAW_COST: 10,    // gold for an emergency recruit at the current day's budget
  LEVEL_ATK: 1,     // gains per level
  LEVEL_HP: 2,
};

export function apForDay(d) {
  return d <= 3 ? 2 : d <= 6 ? 3 : 4;
}

export function xpForKill(budget) {
  return Math.ceil(budget / 5);
}

export function goldForLoot(budget) {
  return Math.ceil(budget / 3);
}

export function levelXpCost(newLevel) {
  return 2 + newLevel;
}

export function dayBudget(d) {
  return Math.round(CONFIG.BASE_BUDGET * Math.pow(CONFIG.GROWTH, d - 1));
}
