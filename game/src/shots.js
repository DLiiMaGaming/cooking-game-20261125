// Dapur Senja — the screenshot scenes behind ?shot=start|play|rush|end.
// One job: play the real rules forward from a fresh world with a simple autopilot,
// so each frame is what a short game really looks like and the same seed gives the same frame.
import { PANTRY_BIN_ORDER, SHIFT_SECONDS } from './config.js';
import { isReady, nextStep } from './recipes.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, World, matchingOrder, pantryBinRect,
} from './world.js';

const START_SECONDS = 5;
const END_LIMIT_SECONDS = 200;
const SAMPLE = 1 / 30;
const ARRIVE = 14;

// Fixed stand points: one clear spot per station, just outside its counter,
// so the autopilot always has an approach that is not blocked by another counter.
const STAND = {
  board: { x: 395, y: 392 },
  stove: { x: 775, y: 392 },
  plate: { x: 640, y: 682 },
  trash: { x: 915, y: 682 },
  window: { x: 1154, y: 336 },
};

// Pick the order the plate can actually finish: no wasted plate items first,
// then the fewest missing ingredients, then the most patience left.
function chooseOrder(world) {
  const plateIds = world.plate.map((item) => item.id);
  let best = null;
  let bestKey = null;
  for (const order of world.orders) {
    const needIds = Object.keys(order.recipeNeeds);
    const wasted = plateIds.filter((id) => !needIds.includes(id)).length;
    const missing = needIds.filter((id) => !plateIds.includes(id)).length;
    const key = [wasted, missing, -order.patience];
    if (bestKey === null
      || key[0] < bestKey[0]
      || (key[0] === bestKey[0] && key[1] < bestKey[1])
      || (key[0] === bestKey[0] && key[1] === bestKey[1] && key[2] < bestKey[2])) {
      best = order;
      bestKey = key;
    }
  }
  return best;
}

// The autopilot's one decision per step: where to walk, and whether to press E.
export function autopilot(world) {
  const chef = world.chef;
  const step = { moveX: 0, moveY: 0, interact: false };
  if (world.screen !== SCREEN_PLAY) return step;

  let point = null;
  let station = null;
  let binIndex = -1;

  const served = matchingOrder(world.plate, world.orders);
  if (served) {
    station = 'window';
  } else if (world.plate.length >= 3) {
    station = 'trash';
  } else if (world.orders.length > 0) {
    const order = chooseOrder(world);
    const plateIds = world.plate.map((item) => item.id);
    const needIds = Object.keys(order.recipeNeeds);
    const wasted = plateIds.filter((id) => !needIds.includes(id)).length;
    const missing = needIds.filter((id) => !plateIds.includes(id));
    if (wasted > 0) {
      // The plate holds food this order cannot use: bin the carried item first,
      // then the plate itself.
      station = 'trash';
    } else if (missing.length === 0) {
      // Plate holds the full set but matches nothing: bin it and start over.
      station = 'trash';
    } else if (world.carrying) {
      const item = world.carrying;
      if (!missing.includes(item.id)) {
        station = 'trash';
      } else if (isReady(item)) {
        station = 'plate';
      } else {
        station = nextStep(item) === 'chop' ? 'board' : 'stove';
      }
    } else {
      binIndex = PANTRY_BIN_ORDER.indexOf(missing[0]);
    }
  } else {
    point = { x: 620, y: 470 };
  }

  if (station) point = { ...STAND[station] };
  else if (binIndex >= 0) {
    const rect = pantryBinRect(binIndex);
    point = { x: 192, y: rect.y + rect.height / 2 };
  }
  if (!point) return step;

  // Arrived means close enough to work the station: the chef stops a body-radius
  // short of the counter, so nearness — not distance to the counter's edge — decides.
  if (station === 'board' || station === 'stove') {
    if (world.nearStation(station)) return step;
  } else if (station) {
    if (world.nearStation(station)) {
      step.interact = true;
      return step;
    }
  } else if (binIndex >= 0) {
    if (world.near(pantryBinRect(binIndex))) {
      step.interact = true;
      return step;
    }
  }

  const dx = point.x - chef.x;
  const dy = point.y - chef.y;
  const dist = Math.hypot(dx, dy);
  if (dist > ARRIVE) {
    step.moveX = dx / dist;
    step.moveY = dy / dist;
  }
  return step;
}

// Run the autopilot in small chunks until the plate holds a dish mid-assembly
// (two ingredients down, the chef working on the next), or the cap is hit.
function runUntilPlated(world, maxSeconds) {
  const cap = Math.round(maxSeconds / SAMPLE);
  for (let i = 0; i < cap; i += 1) {
    if (world.screen === SCREEN_OVER) break;
    world.step(SAMPLE, autopilot(world));
    if (world.plate.length >= 2 && world.carrying && !isReady(world.carrying)) {
      // One more stretch at the work station so the frame also shows chopping or cooking.
      for (let j = 0; j < Math.round(6 / SAMPLE); j += 1) {
        world.step(SAMPLE, autopilot(world));
        if (world.workProgress > 0.15) break;
      }
      break;
    }
  }
}

function runFor(world, seconds) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen === SCREEN_OVER) break;
    world.step(SAMPLE, autopilot(world));
  }
}

/**
 * Set `world` to the named scene (start, play, rush or end) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset(7);
  if (name === 'start') {
    for (let i = 0; i < START_SECONDS / SAMPLE; i += 1) world.step(SAMPLE, { moveX: 0, moveY: 0, interact: false });
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.start();
  if (name === 'rush') {
    world.elapsed = SHIFT_SECONDS - 40;
    world.timeLeft = 40;
    world.rushAnnounced = true;
    while (world.orders.length < 4) world.spawnOrder();
    runUntilPlated(world, 40);
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'end') {
    runFor(world, END_LIMIT_SECONDS);
    return { screen: SCREEN_OVER, best: world.score };
  }
  runUntilPlated(world, 120);
  return { screen: SCREEN_PLAY, best: world.score };
}

// A full shift played by the autopilot, for the headless self-test (?selftest=1).
export function selfTest(world) {
  const errors = [];
  const onError = (event) => errors.push(String(event.message || event.error || 'error'));
  window.addEventListener('error', onError);
  world.reset(7);
  world.start();
  let steps = 0;
  while (world.screen !== SCREEN_OVER && steps < 12000) {
    world.step(SAMPLE, autopilot(world));
    steps += 1;
  }
  window.removeEventListener('error', onError);
  return {
    screen: world.screen,
    score: world.score,
    served: world.served,
    expired: world.expired,
    bestCombo: world.bestCombo,
    steps,
    errors,
  };
}
