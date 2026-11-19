// NOVA BAY — canvas-painted textures: building facades, roads, ground
// and neon signs. One job: every surface the city shows is drawn here,
// so the game ships no image files.
import * as THREE from 'three';

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function facadeTexture(base, litRatio, rng) {
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const cols = 6;
    const rows = 12;
    const cw = w / cols;
    const ch = h / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const lit = rng.next() < litRatio;
        g.fillStyle = lit ? (rng.next() < 0.6 ? '#ffd88a' : '#9fd8ff') : '#1c2433';
        g.fillRect(x * cw + 3, y * ch + 4, cw - 6, ch - 8);
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, w, 10);
  });
}

export function roadTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#2a2d34';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#f5d76e';
    g.fillRect(w / 2 - 2, 0, 4, 40);
    g.fillRect(w / 2 - 2, 64, 4, 40);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  });
}

export function groundTexture(base, speckle) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = speckle;
    for (let i = 0; i < 220; i++) {
      g.globalAlpha = 0.12 + Math.random() * 0.2;
      g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    g.globalAlpha = 1;
  });
}

export function neonTexture(text, color, sub) {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = '#0a0a14';
    g.fillRect(0, 0, w, h);
    g.font = 'bold 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 26;
    g.fillStyle = color;
    g.fillText(text, w / 2, sub ? h / 2 - 18 : h / 2);
    if (sub) {
      g.font = 'bold 26px system-ui, sans-serif';
      g.shadowBlur = 12;
      g.fillStyle = '#ffffff';
      g.fillText(sub, w / 2, h / 2 + 34);
    }
  });
}

export function waterTexture() {
  const t = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#1a5f8a';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.25)';
    g.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      const y = 10 + i * 15;
      g.moveTo(0, y);
      g.bezierCurveTo(30, y - 6, 70, y + 6, 128, y);
      g.stroke();
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(24, 8);
  return t;
}
