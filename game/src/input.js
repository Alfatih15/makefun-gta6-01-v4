// NOVA BAY — keyboard, mouse and pointer input.
// One job: turn browser events into a plain state object the game reads.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
    this.locked = false;
    this.canvas = canvas;
    this.anyKey = false;
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      this.anyKey = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX || 0;
        this.mouseDY += e.movementY || 0;
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.clicked = true;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('click', () => {
      if (!this.locked && !document.pointerLockElement) {
        try {
          canvas.requestPointerLock();
        } catch {}
      }
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  // WASD / arrows as a -1..1 pair, relative to the camera.
  moveAxes() {
    let x = 0;
    let y = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y -= 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    return { x, y };
  }

  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  consumeAnyKey() {
    const k = this.anyKey;
    this.anyKey = false;
    return k;
  }
}
