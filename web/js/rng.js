// Seeded RNG (mulberry32) so runs are reproducible: ?seed=42 replays a run.
// State is a single uint32, so it serializes into save games.

export function makeRng(state) {
  return { s: state >>> 0 };
}

export function next(rng) {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function uniform(rng, lo, hi) {
  return lo + (hi - lo) * next(rng);
}

export function randInt(rng, lo, hi) { // inclusive
  return lo + Math.floor(next(rng) * (hi - lo + 1));
}

export function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next(rng) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
