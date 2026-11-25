// Dapur Senja — the entry point: loop, screens, sounds and screenshot modes.
// One job: wire input, world, sound and rendering together and run the frame loop.
import { VIEW } from './config.js';
import { Input } from './input.js';
import { Sounds } from './audio.js';
import { World, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';
import { drawWorld } from './render.js';
import { selfTest, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const world = new World();
const sounds = new Sounds();
const input = new Input(canvas, world);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const selfTestMode = params.get('selftest') === '1';

// The screenshot scenes stage a real game before the first frame is drawn.
let staged = null;
if (shotName) {
  staged = stageShot(shotName, world);
} else if (selfTestMode) {
  const result = selfTest(world);
  const pre = document.createElement('pre');
  pre.id = 'selftest';
  pre.textContent = JSON.stringify(result);
  document.body.appendChild(pre);
  document.title = `SELFTEST ${JSON.stringify(result)}`;
  world.reset(7);
}

input.onStart = () => {
  sounds.ensure();
  sounds.pickup();
  world.start();
};
input.onRestart = () => {
  sounds.ensure();
  world.reset(Date.now() % 2147483647);
  world.start();
};
input.onPause = () => {
  if (world.screen === SCREEN_PLAY) world.paused = !world.paused;
};
input.onMute = () => {
  sounds.muted = !sounds.muted;
  world.muted = sounds.muted;
  world.say(sounds.muted ? 'Suara mati.' : 'Suara hidup.');
};

// Sound cues follow the world: a chop sizzle while working, a chime when a dish is ready.
let lastCarryingStep = 0;
let lastServed = 0;
let lastExpired = 0;
function soundCues() {
  if (world.carrying && world.workStation && world.nearStation(world.workStation)) {
    if (Math.random() < 0.1) {
      if (world.workStation === 'board') sounds.chop();
      else sounds.sizzle();
    }
  }
  if (world.carrying && world.carrying.step !== lastCarryingStep) sounds.ready();
  lastCarryingStep = world.carrying ? world.carrying.step : 0;
  if (world.served !== lastServed) sounds.serve();
  lastServed = world.served;
  if (world.expired !== lastExpired) sounds.bad();
  lastExpired = world.expired;
}

let lastTime = performance.now();
let time = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  time += dt;
  if (!shotName && !selfTestMode) {
    if (world.screen === SCREEN_PLAY) world.step(dt, input.takeStep());
    soundCues();
  }
  drawWorld(ctx, world, time);
  requestAnimationFrame(frame);
}

// Expose the world for the headless playtest; the game itself never reads this.
window.__dapur = { world, stageShot, selfTest };
requestAnimationFrame(frame);
