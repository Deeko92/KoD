// KoD game engine — pure state machine, no DOM. Mirrors sim/simulate.py rules:
// min-1 damage, kill blow draws no counter, survivors cycle through a discard
// pile, dead mobs are gone forever, counter overkill bleeds to the Treasury.

import { CONFIG, apForDay, xpForKill, goldForLoot, levelXpCost, dayBudget } from './config.js';
import { makeRng, shuffle } from './rng.js';
import {
  rollUnit, rollStartingMob, rollAdventurer, rollBoss,
  damage, budgetOf, resetIds, peekNextId,
} from './units.js';

export function newRun(seed) {
  resetIds();
  const rng = makeRng(seed);
  const state = {
    seed,
    rng,
    phase: 'combat', // combat | endday | won | lost
    day: 1,
    treasury: CONFIG.TREASURY_HP,
    gold: 0,
    xp: 0,
    team: [],
    deck: [],
    hand: [],
    discard: [],
    queue: [],
    current: null,
    advIndex: 0,
    advTotal: 0,
    defeated: [],
    letThroughIds: [],
    ap: 0,
    stats: { mobsLost: 0, recruits: 0, kills: 0, loots: 0 },
    log: [],
  };
  for (let i = 0; i < CONFIG.START_MOBS; i++) state.team.push(rollStartingMob(rng));
  startDay(state);
  return state;
}

function log(state, msg) {
  state.log.push(msg);
  if (state.log.length > 40) state.log.shift();
}

function startDay(state) {
  const n = CONFIG.ADVENTURERS_PER_DAY[state.day - 1];
  state.queue = [];
  for (let i = 0; i < n; i++) state.queue.push(rollAdventurer(state.rng, state.day));
  if (CONFIG.BOSS_DAYS.includes(state.day)) state.queue.push(rollBoss(state.rng, state.day));
  state.advTotal = state.queue.length;
  state.advIndex = 0;
  state.defeated = [];
  state.letThroughIds = [];
  state.deck = shuffle(state.rng, state.team.slice());
  state.hand = [];
  state.discard = [];
  refillHand(state);
  state.phase = 'combat';
  nextAdventurer(state);
}

function refillHand(state) {
  while (state.hand.length < CONFIG.HAND_SIZE && (state.deck.length || state.discard.length)) {
    if (!state.deck.length) {
      state.deck = shuffle(state.rng, state.discard.splice(0));
    }
    state.hand.push(state.deck.pop());
  }
}

function nextAdventurer(state) {
  if (!state.queue.length) {
    state.current = null;
    enterEndOfDay(state);
    return;
  }
  state.current = state.queue.shift();
  state.advIndex += 1;
  const a = state.current;
  log(state, `${a.emoji} ${a.name} approaches (${state.advIndex} of ${state.advTotal}).`);
}

function noMobsLeft(state) {
  return !state.hand.length && !state.deck.length && !state.discard.length;
}

function checkTreasury(state) {
  if (state.treasury <= 0) {
    state.treasury = 0;
    state.phase = 'lost';
    log(state, 'The Treasury has fallen!');
    return true;
  }
  return false;
}

// Player taps a mob in hand, then the adventurer. Resolves one exchange.
export function attack(state, mobId) {
  if (state.phase !== 'combat' || !state.current) return null;
  const mob = state.hand.find((m) => m.id === mobId);
  if (!mob) return null;
  const adv = state.current;
  const events = [];

  const dealt = damage(mob, adv);
  adv.hp -= dealt;
  events.push({ type: 'hit', target: 'adv', amount: dealt });
  log(state, `${mob.emoji} ${mob.name} hits ${adv.name} for ${dealt}.`);

  if (adv.hp <= 0) {
    adv.hp = 0;
    state.defeated.push(adv);
    events.push({ type: 'advDefeated' });
    log(state, `${adv.emoji} ${adv.name} is defeated!`);
    nextAdventurer(state);
    return events;
  }

  // Counterattack
  const counter = damage(adv, mob);
  if (counter >= mob.hp) {
    const bleed = counter - mob.hp;
    state.hand = state.hand.filter((m) => m.id !== mob.id);
    state.team = state.team.filter((m) => m.id !== mob.id);
    state.stats.mobsLost += 1;
    events.push({ type: 'mobDied', mobId: mob.id, bleed });
    log(state, `${adv.emoji} ${adv.name} counters for ${counter} — ${mob.emoji} ${mob.name} dies!`);
    if (bleed > 0) {
      state.treasury -= bleed;
      log(state, `${bleed} overkill damage bleeds through to the Treasury!`);
      if (checkTreasury(state)) return events;
    }
  } else {
    mob.hp -= counter;
    state.hand = state.hand.filter((m) => m.id !== mob.id);
    state.discard.push(mob);
    events.push({ type: 'counter', mobId: mob.id, amount: counter });
    log(state, `${adv.emoji} ${adv.name} counters for ${counter}; ${mob.emoji} ${mob.name} retreats to the discard pile.`);
  }
  refillHand(state);

  // Out of mobs: remaining adventurers raid the Treasury and leave.
  if (noMobsLeft(state)) {
    forceLetThroughAll(state, events);
  }
  return events;
}

function forceLetThroughAll(state, events) {
  const raiders = [state.current, ...state.queue.splice(0)].filter(Boolean);
  for (const adv of raiders) {
    state.treasury -= adv.atk;
    state.letThroughIds.push(adv.id);
    events.push({ type: 'raid', amount: adv.atk });
    log(state, `No mobs left! ${adv.emoji} ${adv.name} raids the Treasury for ${adv.atk} and escapes.`);
    if (checkTreasury(state)) return;
  }
  state.current = null;
  enterEndOfDay(state);
}

// Player deliberately lets the current adventurer through to the Treasury.
export function letThrough(state) {
  if (state.phase !== 'combat' || !state.current) return null;
  const adv = state.current;
  state.treasury -= adv.atk;
  state.letThroughIds.push(adv.id);
  log(state, `${adv.emoji} ${adv.name} is let through — raids the Treasury for ${adv.atk} and escapes.`);
  const events = [{ type: 'raid', amount: adv.atk }];
  if (checkTreasury(state)) return events;
  nextAdventurer(state);
  return events;
}

function enterEndOfDay(state) {
  state.phase = 'endday';
  state.ap = apForDay(state.day);
  // Free overnight rest for the whole team.
  for (const m of state.team) m.hp = Math.min(m.maxHp, m.hp + CONFIG.NIGHT_REGEN);
  log(state, `Day ${state.day} survived. Your mobs rest (+${CONFIG.NIGHT_REGEN} HP).`);
}

// --- End-of-day actions -----------------------------------------------------

export function chooseAction(state, advId, action) {
  if (state.phase !== 'endday' || state.ap <= 0) return false;
  const i = state.defeated.findIndex((a) => a.id === advId);
  if (i < 0) return false;
  const adv = state.defeated.splice(i, 1)[0];
  state.ap -= 1;
  const b = budgetOf(adv);
  if (action === 'recruit') {
    adv.hp = adv.maxHp;
    state.team.push(adv);
    state.stats.recruits += 1;
    log(state, `${adv.emoji} ${adv.name} joins your dungeon!`);
  } else if (action === 'kill') {
    const gained = xpForKill(b);
    state.xp += gained;
    state.stats.kills += 1;
    log(state, `${adv.emoji} ${adv.name} executed: +${gained} XP.`);
  } else if (action === 'loot') {
    const gained = goldForLoot(b);
    state.gold += gained;
    state.stats.loots += 1;
    log(state, `${adv.emoji} ${adv.name} looted: +${gained} gold.`);
  } else {
    return false;
  }
  return true;
}

export function healMob(state, mobId) {
  if (state.phase !== 'endday' || state.gold < 1) return false;
  const m = state.team.find((u) => u.id === mobId);
  if (!m || m.hp >= m.maxHp) return false;
  state.gold -= 1;
  m.hp = Math.min(m.maxHp, m.hp + CONFIG.HEAL_RATE);
  return true;
}

export function levelUp(state, mobId) {
  if (state.phase !== 'endday') return false;
  const m = state.team.find((u) => u.id === mobId);
  if (!m) return false;
  const cost = levelXpCost(m.level + 1);
  if (state.xp < cost) return false;
  state.xp -= cost;
  m.level += 1;
  m.atk += CONFIG.LEVEL_ATK;
  m.maxHp += CONFIG.LEVEL_HP;
  m.hp += CONFIG.LEVEL_HP;
  log(state, `${m.emoji} ${m.name} reaches level ${m.level} (+${CONFIG.LEVEL_ATK} ATK, +${CONFIG.LEVEL_HP} HP).`);
  return true;
}

export function emergencyDraw(state) {
  if (state.phase !== 'endday' || state.gold < CONFIG.DRAW_COST) return false;
  state.gold -= CONFIG.DRAW_COST;
  const mob = rollUnit(state.rng, dayBudget(state.day));
  state.team.push(mob);
  state.stats.recruits += 1;
  log(state, `${mob.emoji} ${mob.name} answers your call (−${CONFIG.DRAW_COST} gold).`);
  return true;
}

export function nextDay(state) {
  if (state.phase !== 'endday') return false;
  state.defeated = []; // unchosen adventurers vanish at day's end
  if (state.day >= CONFIG.RUN_DAYS) {
    state.phase = 'won';
    log(state, 'The dungeon stands! You win.');
    return true;
  }
  if (!state.team.length) {
    state.phase = 'lost';
    log(state, 'No mobs remain to defend the dungeon...');
    return true;
  }
  state.day += 1;
  startDay(state);
  return true;
}

// --- Save / load -------------------------------------------------------------

export function serialize(state) {
  const ids = (arr) => arr.map((u) => u.id);
  return JSON.stringify({
    ...state,
    rng: state.rng.s,
    nextId: peekNextId(),
    deck: ids(state.deck),
    hand: ids(state.hand),
    discard: ids(state.discard),
    // team / queue / current / defeated carry the actual unit objects
  });
}

export function deserialize(json) {
  const raw = JSON.parse(json);
  const state = { ...raw, rng: makeRng(raw.rng) };
  resetIds(raw.nextId);
  delete state.nextId;
  const byId = new Map(state.team.map((u) => [u.id, u]));
  state.deck = raw.deck.map((id) => byId.get(id)).filter(Boolean);
  state.hand = raw.hand.map((id) => byId.get(id)).filter(Boolean);
  state.discard = raw.discard.map((id) => byId.get(id)).filter(Boolean);
  return state;
}
