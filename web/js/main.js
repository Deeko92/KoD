// Entry point: seeds, save/load, screen wiring.

import * as G from './game.js';
import * as UI from './ui.js';

const SAVE_KEY = 'kod-save-v1';

let state = null;

function save() {
  try {
    if (state && (state.phase === 'combat' || state.phase === 'endday')) {
      localStorage.setItem(SAVE_KEY, G.serialize(state));
    } else {
      localStorage.removeItem(SAVE_KEY);
    }
  } catch { /* private mode etc. — play without saves */ }
}

function loadSave() {
  try {
    const json = localStorage.getItem(SAVE_KEY);
    return json ? G.deserialize(json) : null;
  } catch {
    return null;
  }
}

function pickSeed() {
  const p = new URLSearchParams(location.search).get('seed');
  if (p != null && !Number.isNaN(Number(p))) return Number(p) >>> 0;
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

function startNew() {
  state = G.newRun(pickSeed());
  save();
  UI.bind(state, save);
}

function showTitle() {
  UI.showTitle(!!loadSave(), {
    newRun: startNew,
    continueRun: () => {
      const loaded = loadSave();
      if (loaded) {
        state = loaded;
        UI.bind(state, save);
      } else {
        startNew();
      }
    },
  });
}

window.addEventListener('kod-newrun', startNew);
showTitle();
