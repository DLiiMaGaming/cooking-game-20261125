// Dapur Senja — kitchen layout, timing and tuning constants.
// One job: every number the rest of the game shares lives here.
export const VIEW = { width: 1280, height: 720 };
export const SHIFT_SECONDS = 150;
export const RUSH_SECONDS_LEFT = 45;
export const CHEF_SPEED = 285;
export const CHEF_RADIUS = 22;
export const INTERACT_REACH = 52;
export const MAX_ORDERS = 4;
export const MAX_PLATE = 3;
export const STEP = 1 / 60;

// The floor the chef walks on; stations sit around its edges.
export const FLOOR = { x: 170, y: 104, width: 1090, height: 600 };

// Pantry bins run down the left wall: one bin per ingredient.
export const PANTRY = { x: 22, width: 132, firstY: 122, height: 62, gap: 24 };
export const PANTRY_BIN_ORDER = ['nasi', 'mie', 'ayam', 'telur', 'sayur', 'sambal'];

// Work stations, in play order: chop, then cook, then plate, then serve.
export const BOARD = { x: 300, y: 250, width: 190, height: 104, label: 'TALENAN' };
export const STOVE = { x: 640, y: 250, width: 270, height: 104, label: 'KOMPOR' };
export const PLATE = { x: 450, y: 560, width: 380, height: 96, label: 'PIRING SAJI' };
export const TRASH = { x: 860, y: 560, width: 110, height: 96, label: 'SAMPAH' };
export const WINDOW = { x: 1050, y: 140, width: 208, height: 170, label: 'JENDELA SAJI' };

// Seconds of patience a fresh order carries, and how often new ones arrive.
export const ORDER = {
  patience: 32,
  patienceRush: 22,
  spawnEvery: 14,
  spawnEveryRush: 9,
  firstSpawnAt: 2,
};

export const SCORE = {
  expiredPenalty: 25,
  tipPerSecondLeft: 6,
  comboStep: 0.1,
  comboCap: 2,
};

// Deterministic random numbers: the same seed always deals the same shift.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
