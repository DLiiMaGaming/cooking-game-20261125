// Dapur Senja — the kitchen's rules and state.
// One job: orders, the chef, prep work, plating, serving and scoring. No drawing here.
import {
  BOARD, CHEF_RADIUS, CHEF_SPEED, FLOOR, INTERACT_REACH, MAX_ORDERS, MAX_PLATE,
  ORDER, PANTRY, PANTRY_BIN_ORDER, PLATE, RUSH_SECONDS_LEFT, SCORE, SHIFT_SECONDS,
  STOVE, TRASH, WINDOW, mulberry32,
} from './config.js';
import { INGREDIENTS, RECIPES, ingredientState, isReady, nextStep, nextStepSeconds, recipeById } from './recipes.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function pantryBinRect(index) {
  return {
    x: PANTRY.x, y: PANTRY.firstY + index * (PANTRY.height + PANTRY.gap),
    width: PANTRY.width, height: PANTRY.height,
  };
}

export { pantryBinRect };

function rectOf(station) {
  if (station === 'board') return BOARD;
  if (station === 'stove') return STOVE;
  if (station === 'plate') return PLATE;
  if (station === 'trash') return TRASH;
  if (station === 'window') return WINDOW;
  return null;
}

function distanceToRect(x, y, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return Math.hypot(x - cx, y - cy);
}

function nearestPointOnRect(x, y, rect) {
  return {
    x: Math.max(rect.x, Math.min(x, rect.x + rect.width)),
    y: Math.max(rect.y, Math.min(y, rect.y + rect.height)),
  };
}

export function stationTargetPoint(station, chefX, chefY) {
  const rect = rectOf(station);
  if (!rect) return null;
  const p = nearestPointOnRect(chefX, chefY, rect);
  return p;
}

export function pantryBinTargetPoint(index, chefX, chefY) {
  const rect = pantryBinRect(index);
  return nearestPointOnRect(chefX, chefY, rect);
}

export function plateMatchesOrder(plate, order) {
  const recipe = recipeById(order.recipeId);
  const plateIds = plate.map((item) => item.id).sort();
  const needIds = Object.keys(recipe.needs).sort();
  return plateIds.length === needIds.length && plateIds.every((id, i) => id === needIds[i]);
}

export function matchingOrder(plate, orders) {
  if (plate.length === 0) return null;
  for (const order of orders) {
    if (plateMatchesOrder(plate, order)) return order;
  }
  return null;
}

export class World {
  constructor() {
    this.reset(7);
  }

  reset(seed) {
    this.rng = mulberry32(seed);
    this.screen = SCREEN_TITLE;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.score = 0;
    this.served = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.expired = 0;
    this.trashed = 0;
    this.chef = { x: 620, y: 470, face: 1, moving: false };
    this.moveTarget = null;
    this.carrying = null;
    this.workProgress = 0;
    this.plate = [];
    this.orders = [];
    this.spawnTimer = ORDER.firstSpawnAt;
    this.particles = [];
    this.floats = [];
    this.message = '';
    this.messageTimer = 0;
    this.paused = false;
    this.muted = false;
    this.serveFlash = 0;
    this.rushAnnounced = false;
    this.stars = 0;
  }

  get rush() {
    return this.timeLeft <= RUSH_SECONDS_LEFT && this.screen === SCREEN_PLAY;
  }

  get workStation() {
    if (!this.carrying || isReady(this.carrying)) return null;
    return nextStep(this.carrying) === 'chop' ? 'board' : 'stove';
  }

  start() {
    if (this.screen !== SCREEN_TITLE) return;
    this.screen = SCREEN_PLAY;
    this.spawnOrder();
  }

  spawnOrder() {
    if (this.orders.length >= MAX_ORDERS) return;
    const recipe = RECIPES[Math.floor(this.rng() * RECIPES.length)];
    const patience = this.rush ? ORDER.patienceRush : ORDER.patience;
    this.orders.push({ id: this.elapsed, recipeId: recipe.id, recipeNeeds: recipe.needs, patience, maxPatience: patience });
  }

  addFloat(x, y, text, color) {
    this.floats.push({ x, y, text, color: color || '#fff3c4', life: 1.2 });
  }

  addSteam(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: x + (this.rng() - 0.5) * 40, y: y + (this.rng() - 0.5) * 10,
        vx: (this.rng() - 0.5) * 12, vy: -26 - this.rng() * 22,
        life: 0.7 + this.rng() * 0.5, maxLife: 1.2, size: 3 + this.rng() * 4,
        color: color || 'rgba(255,255,255,0.75)',
      });
    }
  }

  say(text) {
    this.message = text;
    this.messageTimer = 2.2;
  }

  near(rect) {
    return distanceToRect(this.chef.x, this.chef.y, rect) <= INTERACT_REACH;
  }

  // True when the chef's circle at (x, y) would leave the floor or overlap a counter.
  collides(x, y) {
    if (x < FLOOR.x + CHEF_RADIUS || x > FLOOR.x + FLOOR.width - CHEF_RADIUS) return true;
    if (y < FLOOR.y + CHEF_RADIUS || y > FLOOR.y + FLOOR.height - CHEF_RADIUS) return true;
    for (const rect of [BOARD, STOVE, PLATE, TRASH, WINDOW]) {
      if (distanceToRect(x, y, rect) < CHEF_RADIUS) return true;
    }
    return false;
  }

  nearStation(station) {
    return this.near(rectOf(station));
  }

  // One E-press / click: pick up, place, serve, or bin what the chef carries.
  interact() {
    if (this.screen !== SCREEN_PLAY || this.paused) return;
    const chef = this.chef;
    // Pantry bins: take a raw ingredient when the hands are empty.
    for (let i = 0; i < PANTRY_BIN_ORDER.length; i += 1) {
      if (this.near(pantryBinRect(i))) {
        if (this.carrying) { this.say('Tangan penuh — antar dulu bahannya!'); return; }
        const id = PANTRY_BIN_ORDER[i];
        this.carrying = { id, step: 0, progress: 0 };
        this.workProgress = 0;
        this.addSteam(chef.x, chef.y - 20, 4, 'rgba(255,240,180,0.8)');
        return;
      }
    }
    // Serving window: hand over a finished plate.
    if (this.near(WINDOW)) {
      const order = matchingOrder(this.plate, this.orders);
      if (order) { this.serve(order); return; }
      this.serveFlash = 1;
      this.say(this.plate.length === 0 ? 'Piring masih kosong!' : 'Piring ini belum cocok dengan pesanan!');
      return;
    }
    // Plating counter: set a ready ingredient down. A carried ingredient that is
    // not ready yet falls through to the trash below: the plate's reach overlaps
    // the bin's, and a half-prepped ingredient belongs in the bin, not on the plate.
    if (this.near(PLATE)) {
      if (this.carrying && isReady(this.carrying)) {
        if (this.plate.length >= MAX_PLATE) { this.say('Piring penuh — sajikan atau buang!'); return; }
        if (this.plate.some((item) => item.id === this.carrying.id)) { this.say('Bahan itu sudah di piring!'); return; }
        this.plate.push(this.carrying);
        this.carrying = null;
        this.workProgress = 0;
        this.addSteam(chef.x, chef.y - 20, 4, 'rgba(180,255,180,0.8)');
        return;
      }
      if (this.carrying) {
        this.say('Bahan ini belum siap — olah dulu!');
      }
      // Hands empty: nothing to set down — fall through, so a nearby trash
      // bin can still clear a full plate that matches no order.
    }
    // Trash bin: throw away what the chef carries, or clear the plate.
    if (this.near(TRASH)) {
      if (this.carrying) {
        this.carrying = null;
        this.workProgress = 0;
        this.trashed += 1;
        this.say('Dibuang. Ambil bahan baru!');
        return;
      }
      if (this.plate.length > 0) {
        this.plate = [];
        this.trashed += 1;
        this.say('Piring dikosongkan.');
        return;
      }
    }
  }

  clearPlate() {
    if (this.screen !== SCREEN_PLAY || this.paused) return;
    if (this.near(PLATE) && this.plate.length > 0) {
      this.plate = [];
      this.trashed += 1;
      this.say('Piring dikosongkan.');
    }
  }

  serve(order) {
    const recipe = recipeById(order.recipeId);
    const tip = Math.round(order.patience * SCORE.tipPerSecondLeft);
    const mult = Math.min(1 + this.combo * SCORE.comboStep, SCORE.comboCap);
    const gained = Math.round((recipe.base + tip) * mult);
    this.score += gained;
    this.served += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.orders = this.orders.filter((o) => o !== order);
    this.plate = [];
    this.addFloat(WINDOW.x + WINDOW.width / 2, WINDOW.y - 8, `+${gained}`, '#ffd94d');
    this.addSteam(WINDOW.x + WINDOW.width / 2, WINDOW.y + 30, 10, 'rgba(255,217,77,0.9)');
    this.say(`${recipe.name} tersaji! +${gained}`);
  }

  finishShift() {
    this.screen = SCREEN_OVER;
    this.stars = this.served >= 10 ? 3 : this.served >= 7 ? 2 : this.served >= 4 ? 1 : 0;
  }

  // `input` is { moveX, moveY, interact } for this step; returns an event bitmask.
  step(dt, input) {
    let events = 0;
    if (this.screen !== SCREEN_PLAY || this.paused) return events;
    this.elapsed += dt;
    this.timeLeft = Math.max(0, SHIFT_SECONDS - this.elapsed);
    if (!this.rushAnnounced && this.timeLeft <= RUSH_SECONDS_LEFT) {
      this.rushAnnounced = true;
      this.say('RUSH HOUR! Pesanan makin cepat!');
      this.addFloat(640, 200, 'RUSH HOUR!', '#ff7b54');
    }
    if (this.messageTimer > 0) this.messageTimer -= dt;
    if (this.serveFlash > 0) this.serveFlash -= dt;

    // Move the chef: keys win over a click target. Each axis is tried on its own,
    // so the chef slides around a counter's corner instead of sticking to it.
    const chef = this.chef;
    let mx = input.moveX || 0;
    let my = input.moveY || 0;
    if (mx === 0 && my === 0 && this.moveTarget) {
      const dx = this.moveTarget.x - chef.x;
      const dy = this.moveTarget.y - chef.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) { this.moveTarget = null; } else { mx = dx / d; my = dy / d; }
    }
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      const dx = (mx / len) * CHEF_SPEED * dt;
      const dy = (my / len) * CHEF_SPEED * dt;
      if (!this.collides(chef.x + dx, chef.y)) chef.x += dx;
      if (!this.collides(chef.x, chef.y + dy)) chef.y += dy;
      chef.face = mx < 0 ? -1 : mx > 0 ? 1 : chef.face;
      chef.moving = true;
    } else {
      chef.moving = false;
    }

    // Work the station the chef stands at: chopping or cooking runs on its own
    // while the chef stays put, and pauses the moment they walk away.
    const station = this.workStation;
    if (station && this.nearStation(station)) {
      const item = this.carrying;
      this.workProgress += dt / nextStepSeconds(item);
      if (this.rng() < dt * 14) this.addSteam(chef.x, chef.y - 26, 1);
      if (this.workProgress >= 1) {
        item.step += 1;
        item.progress = 0;
        this.workProgress = 0;
        const state = ingredientState(item);
        this.addFloat(chef.x, chef.y - 44, state === 'cooked' ? 'MATANG!' : 'TERPOTONG!', '#b8ff9e');
        this.addSteam(chef.x, chef.y - 20, 8);
      }
    } else {
      this.workProgress = Math.max(0, this.workProgress - dt * 0.25);
    }

    if (input.interact) this.interact();

    // Orders: patience drains, the expired ones cost points and break the combo.
    for (const order of [...this.orders]) {
      order.patience -= dt;
      if (order.patience <= 0) {
        this.orders = this.orders.filter((o) => o !== order);
        this.expired += 1;
        this.combo = 0;
        this.score = Math.max(0, this.score - SCORE.expiredPenalty);
        this.addFloat(640, 130, `Pesanan hangus -${SCORE.expiredPenalty}`, '#ff7b54');
        this.say('Pesanan hangus! Kombo putus.');
      }
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnOrder();
      this.spawnTimer = this.rush ? ORDER.spawnEveryRush : ORDER.spawnEvery;
    }

    // Particles and floating score popups.
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.y -= 34 * dt;
      f.life -= dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    if (this.timeLeft <= 0) this.finishShift();
    return events;
  }
}
