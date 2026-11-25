// Dapur Senja — keyboard and mouse input.
// One job: turn keys and clicks into the { moveX, moveY, interact } the world steps with.
export class Input {
  constructor(canvas, world) {
    this.world = world;
    this.keys = new Set();
    this.interactQueued = false;
    this.trashQueued = false;
    this.onStart = null;
    this.onRestart = null;
    this.onPause = null;
    this.onMute = null;
    window.addEventListener('keydown', (event) => this.keyDown(event));
    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    canvas.addEventListener('pointerdown', (event) => this.pointerDown(event, canvas));
  }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
    if (event.repeat) return;
    this.keys.add(key);
    if (key === 'e' || key === ' ' || key === 'enter') {
      if (this.world.screen === 'title' && this.onStart) this.onStart();
      else if (this.world.screen === 'over' && this.onRestart) this.onRestart();
      else this.interactQueued = true;
    }
    if (key === 'q') this.trashQueued = true;
    if (key === 'p' && this.onPause) this.onPause();
    if (key === 'm' && this.onMute) this.onMute();
  }

  pointerDown(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const world = this.world;
    if (world.screen === 'title' && this.onStart) { this.onStart(); return; }
    if (world.screen === 'over' && this.onRestart) { this.onRestart(); return; }
    if (world.screen !== 'play' || world.paused) return;
    // A click on a station the chef already stands at works it; anywhere else, walk there.
    const nearSomething = world.near({ x: 22, y: 122, width: 132, height: 62 * 6 + 24 * 5 })
      || world.nearStation('board') || world.nearStation('stove') || world.nearStation('plate')
      || world.nearStation('trash') || world.nearStation('window');
    if (nearSomething) this.interactQueued = true;
    world.moveTarget = { x, y };
  }

  // The movement vector for this frame, from WASD or the arrow keys.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  // Consume the queued one-shot actions for this frame's step.
  takeStep() {
    const move = this.moveVector();
    const step = { moveX: move.x, moveY: move.y, interact: this.interactQueued };
    this.interactQueued = false;
    if (this.trashQueued) {
      this.world.clearPlate();
      this.trashQueued = false;
    }
    return step;
  }
}
