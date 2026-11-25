// Dapur Senja — everything the player sees.
// One job: draw the kitchen, the chef, the food and the HUD on the canvas.
import {
  BOARD, FLOOR, PANTRY, PANTRY_BIN_ORDER, PLATE, SHIFT_SECONDS, STOVE, TRASH, VIEW, WINDOW,
} from './config.js';
import { INGREDIENTS, STEP_LABEL, ingredientState, isReady, nextStep, recipeById } from './recipes.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function pantryBinRect(index) {
  return {
    x: PANTRY.x, y: PANTRY.firstY + index * (PANTRY.height + PANTRY.gap),
    width: PANTRY.width, height: PANTRY.height,
  };
}

// One drawn icon per ingredient, readable at a glance: shape first, label under it.
// `state` tints it: raw is pale, chopped is cut in pieces, cooked is golden and steaming.
export function drawIngredientIcon(ctx, id, x, y, size, state) {
  const ing = INGREDIENTS[id];
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'cooked') {
    ctx.fillStyle = 'rgba(255,190,60,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, s + 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = ing.color;
  ctx.strokeStyle = ing.dark;
  ctx.lineWidth = 2;
  if (id === 'nasi') {
    ctx.beginPath(); ctx.arc(0, 4, s * 0.85, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 4, s * 0.85, s * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (id === 'mie') {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = ing.dark; ctx.lineWidth = 2.5;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, i * s * 0.35);
      ctx.quadraticCurveTo(0, i * s * 0.35 - 5, s * 0.55, i * s * 0.35);
      ctx.stroke();
    }
  } else if (id === 'ayam') {
    ctx.beginPath(); ctx.arc(-2, -2, s * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(16, 16); ctx.stroke();
    ctx.beginPath(); ctx.arc(18, 18, 4, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'telur') {
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.9, s * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2b705';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'sayur') {
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.ellipse(-6, -2, s * 0.55, s * 0.85, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7, -2, s * 0.55, s * 0.85, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ing.dark; ctx.stroke();
  } else if (id === 'sambal') {
    ctx.fillStyle = '#e4572e';
    ctx.beginPath(); ctx.moveTo(-s * 0.8, -s * 0.4);
    ctx.quadraticCurveTo(0, s * 0.9, s * 0.8, -s * 0.5);
    ctx.quadraticCurveTo(0, s * 0.1, -s * 0.8, -s * 0.4);
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f7d32'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s * 0.7, -s * 0.5); ctx.quadraticCurveTo(s * 1.1, -s * 1.1, s * 0.6, -s * 1.2); ctx.stroke();
  }
  if (state === 'raw') {
    ctx.strokeStyle = 'rgba(90,90,90,0.85)'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(0, 0, s + 4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  } else if (state === 'chopped') {
    ctx.strokeStyle = ing.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.5); ctx.lineTo(s * 0.5, s * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.5); ctx.lineTo(-s * 0.5, s * 0.5); ctx.stroke();
  }
  ctx.restore();
}

function drawLabel(ctx, text, x, y, size, color, weight) {
  ctx.fillStyle = color || '#fff8e7';
  ctx.font = `${weight || '700'} ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function drawStationBase(ctx, rect, fill, stroke, label) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 12);
  ctx.fill(); ctx.stroke();
  drawLabel(ctx, label, rect.x + rect.width / 2, rect.y + 16, 13, 'rgba(255,248,231,0.9)');
}

function drawOrderTicket(ctx, order, x, y, width, time) {
  const recipe = recipeById(order.recipeId);
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = frac < 0.35;
  ctx.save();
  ctx.fillStyle = urgent && Math.floor(time * 4) % 2 === 0 ? '#5a2320' : '#fff8e7';
  ctx.strokeStyle = recipe.color;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, width, 76, 10);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = urgent ? '#ffd9d0' : '#3a2a1a';
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(recipe.name, x + 10, y + 15);
  const needIds = Object.keys(recipe.needs);
  needIds.forEach((id, i) => {
    drawIngredientIcon(ctx, id, x + 24 + i * 44, y + 44, 30, recipe.needs[id]);
  });
  // Patience bar along the bottom of the ticket.
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  roundRect(ctx, x + 8, y + 64, width - 16, 7, 3);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#58b368' : frac > 0.25 ? '#f2b705' : '#e4572e';
  roundRect(ctx, x + 8, y + 64, (width - 16) * frac, 7, 3);
  ctx.fill();
  ctx.fillStyle = urgent ? '#ffd9d0' : '#3a2a1a';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(order.patience)}s`, x + width - 10, y + 15);
  ctx.restore();
}

function drawChef(ctx, world, time) {
  const chef = world.chef;
  const bob = chef.moving ? Math.sin(time * 14) * 3 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob * 0.3);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(0, 20, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body: white apron over a teal shirt.
  ctx.fillStyle = '#2a9d8f';
  roundRect(ctx, -17, -8, 34, 28, 10); ctx.fill();
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, -13, -2, 26, 22, 8); ctx.fill();
  ctx.fillStyle = '#e8a33d';
  ctx.fillRect(-13, 8, 26, 4);
  // Head and toque.
  ctx.fillStyle = '#f2c49b';
  ctx.beginPath(); ctx.arc(0, -20, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-7, -30, 7, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -33, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -30, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-13, -32, 26, 7);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath(); ctx.arc(chef.face * 4 - 4, -20, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chef.face * 4 + 4, -20, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // What the chef carries, floating above the toque, with its work ring.
  if (world.carrying) {
    const item = world.carrying;
    const cy = chef.y - 52 + bob * 0.3;
    ctx.save();
    ctx.fillStyle = 'rgba(20,16,12,0.65)';
    ctx.beginPath(); ctx.arc(chef.x, cy, 24, 0, Math.PI * 2); ctx.fill();
    drawIngredientIcon(ctx, item.id, chef.x, cy, 34, ingredientState(item));
    if (!isReady(item)) {
      const step = nextStep(item);
      ctx.strokeStyle = step === 'chop' ? '#7bc96f' : '#ff9f43';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(chef.x, cy, 29, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * world.workProgress);
      ctx.stroke();
      drawLabel(ctx, STEP_LABEL[step], chef.x, cy + 38, 10, '#fff3c4');
    } else {
      drawLabel(ctx, 'SIAP!', chef.x, cy + 38, 11, '#b8ff9e');
    }
    ctx.restore();
  }
}

export function drawWorld(ctx, world, time) {
  // Warm evening kitchen: terracotta walls, checker floor.
  ctx.fillStyle = '#3d2b20';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#4a3626';
  ctx.fillRect(0, 0, VIEW.width, 100);
  ctx.fillStyle = '#ffb703';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('DAPUR SENJA', 18, 26);
  ctx.fillStyle = '#ffd9a0';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('sizzle & serve', 18, 50);
  // String lights across the wall.
  for (let i = 0; i < 16; i += 1) {
    const lx = 200 + i * 66;
    const ly = 30 + Math.sin(i * 1.3) * 6;
    ctx.fillStyle = i % 3 === 0 ? '#ffd94d' : i % 3 === 1 ? '#ff9f43' : '#ff7b54';
    ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
  }
  // Checker floor.
  const tile = 64;
  for (let ty = 0; ty < Math.ceil(FLOOR.height / tile); ty += 1) {
    for (let tx = 0; tx < Math.ceil(FLOOR.width / tile); tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? '#8a5a3b' : '#7a4c31';
      ctx.fillRect(FLOOR.x + tx * tile, FLOOR.y + ty * tile, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(FLOOR.x, FLOOR.y, FLOOR.width, FLOOR.height);

  // Pantry bins down the left wall, each holding one raw ingredient.
  PANTRY_BIN_ORDER.forEach((id, i) => {
    const rect = pantryBinRect(i);
    const ing = INGREDIENTS[id];
    const near = world.screen === 'play' && world.near(rect) && !world.carrying;
    ctx.fillStyle = near ? '#6b4a2f' : '#5a3d27';
    ctx.strokeStyle = near ? '#ffd94d' : '#3d2b20';
    ctx.lineWidth = near ? 4 : 2;
    roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 10);
    ctx.fill(); ctx.stroke();
    drawIngredientIcon(ctx, id, rect.x + 30, rect.y + rect.height / 2, 36, 'raw');
    drawLabel(ctx, ing.name.toUpperCase(), rect.x + 82, rect.y + rect.height / 2, 14, '#fff3c4');
  });
  drawLabel(ctx, 'PANTRY — AMBIL BAHAN (E)', PANTRY.x + PANTRY.width / 2, 112, 11, '#ffd9a0');

  // Chopping board: knife marks and the green board glow while chopping.
  const chopping = world.workStation === 'board' && world.nearStation('board');
  drawStationBase(ctx, BOARD, chopping ? '#3f6b3a' : '#6b4a2f', '#3d2b20', BOARD.label);
  ctx.fillStyle = '#8a6d4b';
  roundRect(ctx, BOARD.x + 14, BOARD.y + 30, BOARD.width - 28, BOARD.height - 44, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(BOARD.x + 30 + i * 34, BOARD.y + 40);
    ctx.lineTo(BOARD.x + 44 + i * 34, BOARD.y + 78);
    ctx.stroke();
  }
  drawLabel(ctx, 'berdiri di sini untuk cincang', BOARD.x + BOARD.width / 2, BOARD.y + BOARD.height - 8, 10, '#d9c1a3', '500');

  // Stove: two burners, flames dancing when something cooks.
  const cooking = world.workStation === 'stove' && world.nearStation('stove');
  drawStationBase(ctx, STOVE, cooking ? '#7a3b2e' : '#4a4a55', '#2b2b33', STOVE.label);
  [0, 1].forEach((i) => {
    const bx = STOVE.x + 52 + i * 130;
    const by = STOVE.y + 58;
    ctx.fillStyle = '#22222a';
    ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bx, by, 30, 0, Math.PI * 2); ctx.stroke();
    if (cooking) {
      const flick = Math.sin(time * 18 + i * 2) * 5;
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by + 6);
      ctx.quadraticCurveTo(bx - 10, by - 22 - flick, bx, by - 30 - flick);
      ctx.quadraticCurveTo(bx + 10, by - 22 - flick, bx + 16, by + 6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(bx - 8, by + 6);
      ctx.quadraticCurveTo(bx, by - 14 - flick, bx + 8, by + 6);
      ctx.closePath(); ctx.fill();
    }
  });
  drawLabel(ctx, 'berdiri di sini untuk masak', STOVE.x + STOVE.width / 2, STOVE.y + STOVE.height - 8, 10, '#d9c1a3', '500');

  // Plating counter: the dish mid-assembly, one slot per ingredient.
  const serving = world.nearStation('plate');
  drawStationBase(ctx, PLATE, serving ? '#6b5a2f' : '#5a4a2f', '#3d2b20', PLATE.label);
  const plateX = PLATE.x + PLATE.width / 2;
  const plateY = PLATE.y + 58;
  ctx.fillStyle = '#fff8e7';
  ctx.beginPath(); ctx.ellipse(plateX, plateY, 150, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(plateX, plateY, 150, 30, 0, 0, Math.PI * 2); ctx.stroke();
  world.plate.forEach((item, i) => {
    drawIngredientIcon(ctx, item.id, plateX - 90 + i * 90, plateY - 6, 44, 'cooked');
    drawLabel(ctx, INGREDIENTS[item.id].name, plateX - 90 + i * 90, plateY + 24, 11, '#3a2a1a');
  });
  if (world.plate.length === 0) drawLabel(ctx, 'letakkan bahan siap di sini (E)', plateX, plateY - 2, 12, '#8a7a5a', '600');

  // Trash bin.
  drawStationBase(ctx, TRASH, '#5a2e2e', '#3d1f1f', TRASH.label);
  ctx.fillStyle = '#3d1f1f';
  roundRect(ctx, TRASH.x + 24, TRASH.y + 34, TRASH.width - 48, TRASH.height - 48, 8);
  ctx.fill();
  drawLabel(ctx, 'Q: buang', TRASH.x + TRASH.width / 2, TRASH.y + TRASH.height - 10, 10, '#e8a0a0', '600');

  // Serving window: warm light, the bell, and the ready-to-serve glow.
  const canServe = world.plate.length > 0 && world.orders.some((o) => {
    const recipe = recipeById(o.recipeId);
    const ids = world.plate.map((item) => item.id).sort();
    const needs = Object.keys(recipe.needs).sort();
    return ids.length === needs.length && ids.every((id, i) => id === needs[i]);
  });
  drawStationBase(ctx, WINDOW, canServe ? '#7a5a1d' : '#4a3626', '#ffd94d', WINDOW.label);
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath(); ctx.arc(WINDOW.x + WINDOW.width / 2, WINDOW.y + 62, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a1a';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAJI', WINDOW.x + WINDOW.width / 2, WINDOW.y + 64);
  drawLabel(ctx, canServe ? 'SIAP DISAJIKAN! (E)' : 'antar piring lengkap ke sini', WINDOW.x + WINDOW.width / 2, WINDOW.y + 118, 12, canServe ? '#ffd94d' : '#d9c1a3', '700');
  if (world.serveFlash > 0) {
    ctx.fillStyle = `rgba(255,80,60,${Math.min(1, world.serveFlash)})`;
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText('BELUM COCOK!', WINDOW.x + WINDOW.width / 2, WINDOW.y + 140);
  }

  // Particles (steam) and floating score popups.
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    drawLabel(ctx, f.text, f.x, f.y, 20, f.color, '800');
  }
  ctx.globalAlpha = 1;

  drawChef(ctx, world, time);

  // Order board: the tickets across the top of the kitchen.
  if (world.orders.length === 0 && world.screen === 'play') {
    drawLabel(ctx, 'Belum ada pesanan — siap-siap!', 420, 46, 14, '#fff3c4', '600');
  }
  world.orders.forEach((order, i) => {
    drawOrderTicket(ctx, order, 200 + i * 216, 10, 204, time);
  });

  // Timer, score and combo, top right.
  const timeLeft = Math.max(0, Math.ceil(world.timeLeft));
  const mm = Math.floor(timeLeft / 60);
  const ss = String(timeLeft % 60).padStart(2, '0');
  ctx.fillStyle = timeLeft <= 30 ? '#ff7b54' : '#fff8e7';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${mm}:${ss}`, 1262, 30);
  ctx.fillStyle = world.rush ? '#ff7b54' : '#ffd9a0';
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.fillText(world.rush ? 'RUSH HOUR' : 'SHIFT', 1262, 56);
  ctx.fillStyle = '#fff8e7';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText(`SKOR ${world.score}`, 1262, 78);
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(`Disajikan ${world.served}  ·  Kombo x${world.combo}`, 1262, 98);
  ctx.textAlign = 'center';

  // Hint line and messages at the bottom.
  ctx.fillStyle = 'rgba(20,16,12,0.75)';
  roundRect(ctx, 170, 688, 1090, 26, 8); ctx.fill();
  const hint = world.screen === 'play'
    ? 'WASD / panah: jalan   ·   E / klik: ambil, letak, saji   ·   Q: kosongkan piring   ·   P: jeda   ·   M: suara'
    : 'Klik atau tekan Enter untuk mulai';
  drawLabel(ctx, hint, 715, 701, 12, '#fff3c4', '600');
  if (world.messageTimer > 0 && world.message) {
    ctx.fillStyle = 'rgba(20,16,12,0.85)';
    const w = ctx.measureText(world.message).width + 36;
    roundRect(ctx, 640 - w / 2, 102, w, 34, 10); ctx.fill();
    drawLabel(ctx, world.message, 640, 119, 15, '#fff3c4', '700');
  }
  if (world.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    drawLabel(ctx, 'JEDA — tekan P untuk lanjut', 640, 360, 30, '#fff8e7', '800');
  }

  if (world.screen === 'title') drawTitle(ctx, time);
  if (world.screen === 'over') drawOver(ctx, world);
}

function drawTitle(ctx, time) {
  ctx.fillStyle = 'rgba(20,12,8,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fff8e7';
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DAPUR SENJA', 640, 200);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('sizzle & serve — masak, sajikan, kejar kombo', 640, 244);
  const lines = [
    'Pesanan masuk dari jendela saji. Ambil bahan di pantry,',
    'cincang di talenan, masak di kompor, susun di piring,',
    'lalu sajikan sebelum kesabaran pelanggan habis.',
    '5 resep · 6 bahan · 2 langkah olah · rush hour di 45 detik terakhir.',
  ];
  ctx.fillStyle = '#fff3c4';
  ctx.font = '600 18px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 300 + i * 30));
  ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? '#ffd94d' : '#fff8e7';
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.fillText('TEKAN ENTER ATAU KLIK UNTUK MULAI', 640, 470);
  ctx.fillStyle = '#d9c1a3';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('WASD / panah bergerak · E ambil & sajikan · Q kosongkan piring', 640, 510);
}

function drawOver(ctx, world) {
  ctx.fillStyle = 'rgba(20,12,8,0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#fff8e7';
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHIFT SELESAI!', 640, 190);
  const stars = '★'.repeat(world.stars) + '☆'.repeat(3 - world.stars);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.fillText(stars, 640, 260);
  ctx.fillStyle = '#fff8e7';
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.fillText(`Skor akhir: ${world.score}`, 640, 330);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = '#fff3c4';
  ctx.fillText(`Hidangan disajikan: ${world.served}   ·   Kombo terbaik: x${world.bestCombo}   ·   Pesanan hangus: ${world.expired}`, 640, 372);
  const verdict = world.stars === 3 ? 'Koki bintang tiga! Dapur Senja milikmu.'
    : world.stars === 2 ? 'Dapur panas, pelanggan senang. Sekali lagi?'
    : world.stars === 1 ? 'Shift pertama selesai — ulangi dan kejar bintangnya.'
    : 'Dapur masih berantakan — coba lagi, pelan-pelan.';
  ctx.fillText(verdict, 640, 410);
  ctx.fillStyle = '#ffd94d';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillText('TEKAN ENTER UNTUK MASAK LAGI', 640, 480);
}
