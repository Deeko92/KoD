// Unit creation: budget → rolled stats. Ports roll_unit/day_budget from sim/simulate.py.

import { CONFIG, dayBudget } from './config.js';
import { uniform, randInt } from './rng.js';

const MOB_LOOKS = [
  ['Goblin', '👺'], ['Skeleton', '💀'], ['Slime', '🟢'],
  ['Bat', '🦇'], ['Imp', '😈'], ['Rat', '🐀'], ['Spider', '🕷️'],
];

const ADV_LOOKS = [
  ['Squire', '⚔️'], ['Rogue', '🗡️'], ['Archer', '🏹'],
  ['Knight', '🛡️'], ['Cleric', '✨'], ['Barbarian', '🪓'], ['Mage', '🔮'],
];

let nextId = 1;
export function resetIds(n = 1) { nextId = n; }
export function peekNextId() { return nextId; }

export function rollUnit(rng, budget, opts = {}) {
  const aShare = opts.atkShare ?? uniform(rng, ...CONFIG.ADV_ATK_SHARE);
  const dShare = opts.defShare ?? uniform(rng, ...CONFIG.ADV_DEF_SHARE);
  const atk = Math.max(1, Math.round((aShare * budget) / CONFIG.ATK_COST));
  const def = Math.max(0, Math.round((dShare * budget) / CONFIG.DEF_COST));
  const hp = Math.max(1, budget - atk * CONFIG.ATK_COST - def * CONFIG.DEF_COST);
  const looks = opts.looks ?? ADV_LOOKS[randInt(rng, 0, ADV_LOOKS.length - 1)];
  return {
    id: nextId++,
    name: opts.name ?? looks[0],
    emoji: opts.emoji ?? looks[1],
    atk, def, maxHp: hp, hp,
    level: 1,
    isBoss: !!opts.isBoss,
  };
}

export function rollStartingMob(rng) {
  const looks = MOB_LOOKS[randInt(rng, 0, MOB_LOOKS.length - 1)];
  return rollUnit(rng, CONFIG.START_BUDGET, {
    atkShare: uniform(rng, ...CONFIG.MOB_ATK_SHARE),
    looks,
  });
}

export function rollAdventurer(rng, day) {
  return rollUnit(rng, dayBudget(day));
}

export function rollBoss(rng, day) {
  const budget = Math.round(dayBudget(day) * CONFIG.BOSS_MULT);
  return rollUnit(rng, budget, {
    atkShare: CONFIG.BOSS_ATK_SHARE,
    defShare: CONFIG.BOSS_DEF_SHARE,
    name: day >= CONFIG.RUN_DAYS ? 'Legendary Hero' : 'Hero',
    emoji: day >= CONFIG.RUN_DAYS ? '👑' : '🦸',
    isBoss: true,
  });
}

export function damage(attacker, defender) {
  return Math.max(1, attacker.atk - defender.def);
}

export function budgetOf(u) {
  return u.atk * CONFIG.ATK_COST + u.def * CONFIG.DEF_COST + u.maxHp * CONFIG.HP_COST;
}
