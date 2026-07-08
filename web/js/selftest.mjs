// Engine smoke test — plays full runs headlessly with greedy-bot choices
// (mirrors sim/simulate.py's bot). Run with: node web/js/selftest.mjs
import { CONFIG } from './config.js';
import { damage, budgetOf } from './units.js';
import * as G from './game.js';

function botAttack(state) {
  const adv = state.current;
  const killers = state.hand.filter((m) => damage(m, adv) >= adv.hp);
  if (killers.length) {
    return killers.reduce((a, b) => (budgetOf(a) <= budgetOf(b) ? a : b));
  }
  const survivors = state.hand.filter((m) => m.hp > damage(adv, m));
  if (survivors.length) {
    return survivors.reduce((a, b) => (damage(a, adv) >= damage(b, adv) ? a : b));
  }
  return state.hand.reduce((a, b) => (budgetOf(a) <= budgetOf(b) ? a : b));
}

function botEndOfDay(state) {
  const target = Math.min(8, 5 + (state.day >= 3) + (state.day >= 5) + (state.day >= 7));
  const sorted = [...state.defeated].sort((a, b) => budgetOf(b) - budgetOf(a));
  for (const adv of sorted) {
    if (state.ap <= 0) break;
    const missing = state.team.reduce((s, m) => s + (m.maxHp - m.hp), 0);
    if (state.team.length < target) G.chooseAction(state, adv.id, 'recruit');
    else if (state.gold * CONFIG.HEAL_RATE < missing) G.chooseAction(state, adv.id, 'loot');
    else G.chooseAction(state, adv.id, 'kill');
  }
  while (state.team.length < 3 && state.gold >= CONFIG.DRAW_COST) G.emergencyDraw(state);
  const wounded = () => state.team.filter((m) => m.hp < m.maxHp)
    .sort((a, b) => (b.maxHp - b.hp) - (a.maxHp - a.hp));
  let w;
  while (state.gold >= 1 && (w = wounded()).length) G.healMob(state, w[0].id);
  for (;;) {
    const strongest = state.team.reduce((a, b) => (budgetOf(a) >= budgetOf(b) ? a : b), state.team[0]);
    if (!strongest || !G.levelUp(state, strongest.id)) break;
  }
}

function playRun(seed) {
  const state = G.newRun(seed);
  let guard = 0;
  while (state.phase === 'combat' || state.phase === 'endday') {
    if (++guard > 5000) throw new Error(`run stuck (seed ${seed}, day ${state.day}, phase ${state.phase})`);
    if (state.phase === 'combat') {
      if (!state.hand.length) throw new Error(`combat with empty hand (seed ${seed})`);
      G.attack(state, botAttack(state).id);
    } else {
      botEndOfDay(state);
      G.nextDay(state);
    }
  }
  return state;
}

// --- deterministic rule checks ------------------------------------------------

// Worked example from docs/MATH.md §2: adventurer 2/0/9 vs mob 3/0/6.
{
  const s = G.newRun(1);
  const mob = { id: 900, name: 'T', emoji: 'x', atk: 3, def: 0, maxHp: 6, hp: 6, level: 1 };
  const adv = { id: 901, name: 'A', emoji: 'y', atk: 2, def: 0, maxHp: 9, hp: 9, level: 1 };
  s.team = [mob]; s.hand = [mob]; s.deck = []; s.discard = [];
  s.current = adv; s.queue = [{ ...adv, id: 902 }]; s.defeated = [];
  G.attack(s, 900); // 9 -> 6, counter 2: mob 6 -> 4, goes to discard then back to hand
  if (adv.hp !== 6 || mob.hp !== 4) throw new Error('worked example step 1 failed');
  G.attack(s, 900); // 6 -> 3, counter: mob 4 -> 2
  G.attack(s, 900); // 3 -> 0 dead, no counter
  if (adv.hp !== 0 || mob.hp !== 2 || s.defeated.length !== 1) {
    throw new Error('worked example failed: kill blow must draw no counter');
  }
  console.log('worked example (MATH.md §2): OK');
}

// Overkill bleed: counter 5 vs mob on 2 HP -> mob dies, treasury -3.
{
  const s = G.newRun(2);
  const mob = { id: 910, name: 'T', emoji: 'x', atk: 1, def: 0, maxHp: 2, hp: 2, level: 1 };
  const spare = { id: 912, name: 'S', emoji: 'x', atk: 1, def: 0, maxHp: 9, hp: 9, level: 1 };
  const adv = { id: 911, name: 'A', emoji: 'y', atk: 5, def: 0, maxHp: 30, hp: 30, level: 1 };
  s.team = [mob, spare]; s.hand = [mob, spare]; s.deck = []; s.discard = [];
  s.current = adv; s.queue = []; s.defeated = [];
  const t0 = s.treasury;
  G.attack(s, 910);
  if (s.team.length !== 1 || s.treasury !== t0 - 3) throw new Error('overkill bleed failed');
  console.log('overkill bleed: OK');
}

// Save/load round-trip mid-run.
{
  const s = G.newRun(3);
  G.attack(s, s.hand[0].id);
  const restored = G.deserialize(G.serialize(s));
  if (restored.day !== s.day || restored.treasury !== s.treasury
      || restored.hand.length !== s.hand.length
      || restored.team.length !== s.team.length) {
    throw new Error('save/load round-trip failed');
  }
  G.attack(restored, restored.hand[0].id); // must not throw
  console.log('save/load round-trip: OK');
}

// --- full-run statistics -------------------------------------------------------

const N = 500;
let wins = 0, lossDays = [], mobsLost = 0;
for (let i = 0; i < N; i++) {
  const s = playRun(i);
  if (s.phase === 'won') wins++;
  else lossDays.push(s.day);
  mobsLost += s.stats.mobsLost;
}
const wr = wins / N;
console.log(`bot runs: ${N}, win rate ${(wr * 100).toFixed(1)}%, avg mobs lost ${(mobsLost / N).toFixed(1)}`);
if (wr < 0.3 || wr > 0.8) {
  throw new Error(`win rate ${(wr * 100).toFixed(1)}% is outside the 30-80% sanity band — engine likely diverges from the Python sim`);
}
console.log('selftest: ALL OK');
