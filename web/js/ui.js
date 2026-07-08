// Rendering + input. The only file that touches the DOM.

import { CONFIG, levelXpCost, xpForKill, goldForLoot } from './config.js';
import { damage, budgetOf } from './units.js';
import * as G from './game.js';

const app = document.getElementById('app');

let state = null;
let selectedMobId = null;
let armLetThrough = false;
let onChange = () => {};

export function bind(gameState, changed) {
  state = gameState;
  onChange = changed;
  selectedMobId = null;
  armLetThrough = false;
  render();
}

export function showTitle(hasSave, handlers) {
  app.innerHTML = `
    <div class="center-screen">
      <div class="big">🏰</div>
      <h1>Keeper of Dungeons</h1>
      <p>Adventurers are coming for your Treasury. Command your mobs, survive ${CONFIG.RUN_DAYS} days, and at day's end choose: recruit, kill, or loot the fallen.</p>
      <button class="primary" data-a="new">New Run</button>
      ${hasSave ? '<button data-a="continue">Continue Run</button>' : ''}
      <div class="seed-note">Tip: add ?seed=42 to the URL to replay the same run.</div>
    </div>`;
  app.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'new') handlers.newRun();
    if (a === 'continue') handlers.continueRun();
  };
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function hpBar(u) {
  const pct = Math.max(0, Math.round((u.hp / u.maxHp) * 100));
  return `<div class="bar hp ${pct <= 35 ? 'low' : ''}"><i style="width:${pct}%"></i></div>
          <div class="hp-num">${u.hp} / ${u.maxHp} HP</div>`;
}

function hud() {
  const t = state;
  return `
    <div class="hud">
      <span class="day">Day ${t.day} / ${CONFIG.RUN_DAYS}</span>
      <span class="res"><span>🪙 ${t.gold}</span><span>⭐ ${t.xp} XP</span></span>
    </div>
    <div class="treasury">
      <div class="label"><span>🏆 Treasury</span><span>${t.treasury} / ${CONFIG.TREASURY_HP}</span></div>
      <div class="bar"><i style="width:${Math.max(0, (t.treasury / CONFIG.TREASURY_HP) * 100)}%"></i></div>
    </div>`;
}

function mobCard(m, { selectable } = {}) {
  const sel = selectable && m.id === selectedMobId ? 'selected' : '';
  return `
    <div class="mob-card ${sel}" data-mob="${m.id}">
      <div class="face">${m.emoji}</div>
      <div class="name">${esc(m.name)}${m.level > 1 ? ` <span class="lvl">L${m.level}</span>` : ''}</div>
      <div class="stats"><span class="stat-atk">⚔${m.atk}</span><span class="stat-def">🛡${m.def}</span></div>
      ${hpBar(m)}
    </div>`;
}

function renderCombat() {
  const adv = state.current;
  const sel = state.hand.find((m) => m.id === selectedMobId);
  const preview = sel && adv
    ? `${sel.emoji} deals <b>${damage(sel, adv)}</b>${damage(sel, adv) >= adv.hp
        ? ' — finishing blow, no counter!'
        : ` · counter hits back for <b>${damage(adv, sel)}</b>${damage(adv, sel) >= sel.hp ? ' ☠️' : ''}`}`
    : 'Tap a mob, then tap the adventurer to attack.';
  const logLines = state.log.slice(-3);
  app.innerHTML = `
    ${hud()}
    <div class="arena">
      <div class="adv-card ${adv.isBoss ? 'boss' : ''}" id="advCard" data-adv="1">
        <div class="count">${state.advIndex} of ${state.advTotal}</div>
        <div class="face">${adv.emoji}</div>
        <div class="name">${esc(adv.name)}${adv.isBoss ? '<span class="boss-tag">BOSS</span>' : ''}</div>
        <div class="stats"><span class="stat-atk">⚔ ${adv.atk}</span><span class="stat-def">🛡 ${adv.def}</span></div>
        <div class="bar hp"><i style="width:${(adv.hp / adv.maxHp) * 100}%"></i></div>
        <div class="hp-num">${adv.hp} / ${adv.maxHp} HP</div>
      </div>
      <div class="preview">${preview}</div>
      <div class="log">${logLines.map((l, i) => `<div class="${i === logLines.length - 1 ? 'last' : ''}">${esc(l)}</div>`).join('')}</div>
      <div class="combat-actions">
        <button class="danger" data-a="letthrough">${armLetThrough ? `Confirm: Treasury −${adv.atk}` : 'Let Through 🏃'}</button>
      </div>
      <div class="pile-row"><span>Deck: ${state.deck.length}</span><span>Discard: ${state.discard.length}</span></div>
      <div class="hand">${state.hand.map((m) => mobCard(m, { selectable: true })).join('')}</div>
    </div>`;

  app.onclick = (e) => {
    const mobEl = e.target.closest('[data-mob]');
    if (mobEl) {
      const id = Number(mobEl.dataset.mob);
      selectedMobId = selectedMobId === id ? null : id;
      armLetThrough = false;
      render();
      return;
    }
    if (e.target.closest('[data-adv]') && selectedMobId != null) {
      const id = selectedMobId;
      selectedMobId = null;
      armLetThrough = false;
      G.attack(state, id);
      onChange();
      render(true);
      return;
    }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'letthrough') {
      if (!armLetThrough) {
        armLetThrough = true;
        render();
      } else {
        armLetThrough = false;
        G.letThrough(state);
        onChange();
        render();
      }
    }
  };
}

function renderEndDay() {
  const t = state;
  const lastDay = t.day >= CONFIG.RUN_DAYS;
  const defeatedRows = t.defeated.map((a) => {
    const b = budgetOf(a);
    const dis = t.ap <= 0 ? 'disabled' : '';
    return `
      <div class="choice-row">
        <div class="unit-line">
          <div class="top">${a.emoji} ${esc(a.name)}${a.isBoss ? ' 👑' : ''}</div>
          <div class="sub">⚔${a.atk} 🛡${a.def} ♥${a.maxHp}</div>
        </div>
        <div class="actions">
          <button data-a="recruit" data-id="${a.id}" ${dis}>Recruit</button>
          <button data-a="kill" data-id="${a.id}" ${dis}>Kill +${xpForKill(b)}⭐</button>
          <button data-a="loot" data-id="${a.id}" ${dis}>Loot +${goldForLoot(b)}🪙</button>
        </div>
      </div>`;
  }).join('');

  const teamRows = t.team.map((m) => {
    const healDis = t.gold < 1 || m.hp >= m.maxHp ? 'disabled' : '';
    const cost = levelXpCost(m.level + 1);
    const lvlDis = t.xp < cost ? 'disabled' : '';
    return `
      <div class="team-row">
        <div class="unit-line">
          <div class="top">${m.emoji} ${esc(m.name)}${m.level > 1 ? ` <span class="lvl">L${m.level}</span>` : ''}</div>
          <div class="sub">⚔${m.atk} 🛡${m.def} · ${m.hp}/${m.maxHp} HP</div>
        </div>
        <div class="actions">
          <button data-a="heal" data-id="${m.id}" ${healDis}>Heal +${CONFIG.HEAL_RATE} (1🪙)</button>
          <button data-a="level" data-id="${m.id}" ${lvlDis}>Lv up (${cost}⭐)</button>
        </div>
      </div>`;
  }).join('');

  app.innerHTML = `
    ${hud()}
    <div class="panel">
      <h2>Defeated adventurers <span class="hint">· ${t.ap} action point${t.ap === 1 ? '' : 's'} left · unchosen vanish at dawn</span></h2>
      ${defeatedRows || '<div class="sub" style="color:var(--dim);font-size:13px">None captured today.</div>'}
    </div>
    <div class="panel">
      <h2>Your mobs <span class="hint">· rested +${CONFIG.NIGHT_REGEN} HP overnight</span></h2>
      ${teamRows || '<div style="color:var(--dim);font-size:13px">Your dungeon stands empty...</div>'}
    </div>
    <div class="eod-footer">
      <button data-a="draw" ${t.gold < CONFIG.DRAW_COST ? 'disabled' : ''}>Summon a new mob (${CONFIG.DRAW_COST}🪙)</button>
      <button class="primary" data-a="next">${lastDay ? 'Claim victory 🏆' : `Begin day ${t.day + 1} ▶`}</button>
    </div>`;

  app.onclick = (e) => {
    const btn = e.target.closest('[data-a]');
    if (!btn || btn.disabled) return;
    const { a, id } = btn.dataset;
    if (a === 'recruit' || a === 'kill' || a === 'loot') G.chooseAction(state, Number(id), a);
    else if (a === 'heal') G.healMob(state, Number(id));
    else if (a === 'level') G.levelUp(state, Number(id));
    else if (a === 'draw') G.emergencyDraw(state);
    else if (a === 'next') G.nextDay(state);
    onChange();
    render();
  };
}

function renderEnd(won) {
  const s = state.stats;
  app.innerHTML = `
    <div class="center-screen">
      <div class="big">${won ? '🏆' : '💀'}</div>
      <h1>${won ? 'The dungeon stands!' : 'The Treasury has fallen'}</h1>
      <div class="stats-box">
        ${won ? `Treasury remaining: ${state.treasury} / ${CONFIG.TREASURY_HP}<br>` : `Fell on day ${state.day} of ${CONFIG.RUN_DAYS}<br>`}
        Mobs lost: ${s.mobsLost} · Recruited: ${s.recruits}<br>
        Executed: ${s.kills} · Looted: ${s.loots}
      </div>
      <button class="primary" data-a="new">New Run</button>
      <div class="seed-note">seed ${state.seed}</div>
    </div>`;
  app.onclick = (e) => {
    if (e.target.closest('[data-a]')?.dataset.a === 'new') window.dispatchEvent(new Event('kod-newrun'));
  };
}

export function render(withHitFx = false) {
  if (!state) return;
  if (state.phase === 'combat') {
    renderCombat();
    if (withHitFx) document.getElementById('advCard')?.classList.add('fx-hit');
  } else if (state.phase === 'endday') {
    renderEndDay();
  } else {
    renderEnd(state.phase === 'won');
  }
}
