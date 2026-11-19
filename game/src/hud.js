// NOVA BAY — the HUD: DOM readouts and the circular minimap canvas.
// One job: everything the player reads while playing.
import { districtNameAt } from './city.js';

export class HUD {
  constructor() {
    this.el = {};
    for (const id of ['cash', 'stars', 'clock', 'district', 'health-fill', 'health-num', 'ammo', 'speed', 'mission-title', 'mission-text', 'timer', 'toast-title', 'toast-text', 'toast', 'vignette', 'crosshair', 'heat-fill', 'menu-title', 'menu-sub', 'menu', 'menu-btn', 'pause-menu', 'complete-menu', 'busted-menu', 'save-note']) {
      this.el[id] = document.getElementById(id);
    }
    this.minimap = document.getElementById('minimap');
    this.mm = this.minimap.getContext('2d');
    this.toastTimer = 0;
  }

  setCash(n) {
    this.el.cash.textContent = `$${Math.floor(n)}`;
  }

  setStars(n) {
    this.el.stars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
    this.el.stars.style.color = n >= 4 ? '#ff4444' : n >= 2 ? '#ffb300' : '#ffffff';
  }

  setHeat(heat) {
    this.el['heat-fill'].style.width = `${heat}%`;
  }

  setClock(hours, minutes) {
    const hh = String(Math.floor(hours) % 24).padStart(2, '0');
    const mm = String(Math.floor(minutes)).padStart(2, '0');
    this.el.clock.textContent = `DAY 1 · ${hh}:${mm}`;
  }

  setDistrict(x, z) {
    this.el.district.textContent = districtNameAt(x, z);
  }

  setHealth(h) {
    this.el['health-fill'].style.width = `${Math.max(0, h)}%`;
    this.el['health-num'].textContent = Math.ceil(Math.max(0, h));
  }

  setAmmo(mag, reserve) {
    this.el.ammo.textContent = `AMMO ${mag} / ${reserve}`;
  }

  setSpeed(kmh) {
    this.el.speed.textContent = `${Math.round(kmh)} km/h`;
  }

  setMission(title, text) {
    this.el['mission-title'].textContent = title;
    this.el['mission-text'].textContent = text;
  }

  setTimer(seconds) {
    this.el.timer.textContent = seconds > 0 ? `⏱ ${seconds}s` : '';
  }

  toast(title, text) {
    this.el['toast-title'].textContent = title;
    this.el['toast-text'].textContent = text;
    this.el.toast.classList.add('show');
    this.toastTimer = 4;
  }

  update(dt) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
  }

  hurtFlash() {
    this.el.vignette.style.opacity = '0.7';
    setTimeout(() => { this.el.vignette.style.opacity = '0'; }, 180);
  }

  showMenu(title, sub, btn) {
    this.el['menu-title'].textContent = title;
    this.el['menu-sub'].textContent = sub;
    this.el['menu-btn'].textContent = btn;
    this.el.menu.classList.add('show');
  }

  hideMenu() {
    this.el.menu.classList.remove('show');
  }

  showPause() {
    this.el['pause-menu'].classList.add('show');
  }

  hidePause() {
    this.el['pause-menu'].classList.remove('show');
  }

  showBusted() {
    this.el['busted-menu'].classList.add('show');
  }

  hideBusted() {
    this.el['busted-menu'].classList.remove('show');
  }

  showComplete(cash) {
    document.getElementById('complete-cash').textContent = `Final cash: $${Math.floor(cash)}`;
    this.el['complete-menu'].classList.add('show');
  }

  // Top-down minimap: roads, blocks, player, cars, police, marker.
  drawMinimap(game) {
    const g = this.mm;
    const S = 200;
    const scale = S / 800;
    const toX = (x) => (x + 400) * scale;
    const toZ = (z) => (z + 400) * scale;
    g.clearRect(0, 0, S, S);
    g.fillStyle = 'rgba(10,16,26,0.85)';
    g.fillRect(0, 0, S, S);
    g.strokeStyle = '#3a4a6b';
    g.lineWidth = 5;
    for (const line of game.city.roadLines) {
      g.beginPath();
      g.moveTo(toX(line), 0);
      g.lineTo(toX(line), S);
      g.stroke();
      g.beginPath();
      g.moveTo(0, toZ(line));
      g.lineTo(S, toZ(line));
      g.stroke();
    }
    g.fillStyle = '#1a5f8a';
    g.fillRect(0, toZ(392), S, S - toZ(392));
    // Marker.
    if (game.marker) {
      g.fillStyle = '#ffd21f';
      g.beginPath();
      g.arc(toX(game.marker.x), toZ(game.marker.z), 6, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffd21f';
      g.beginPath();
      g.arc(toX(game.marker.x), toZ(game.marker.z), 10 + Math.sin(performance.now() / 200) * 3, 0, Math.PI * 2);
      g.stroke();
    }
    // Police.
    g.fillStyle = '#2244ff';
    for (const c of game.police.cops) {
      g.fillRect(toX(c.mesh.position.x) - 2, toZ(c.mesh.position.z) - 2, 4, 4);
    }
    for (const it of game.police.interceptors) {
      g.fillRect(toX(it.mesh.position.x) - 2, toZ(it.mesh.position.z) - 2, 4, 4);
    }
    // Player arrow.
    const px = game.player.inCar ? game.player.inCar.mesh.position.x : game.player.pos.x;
    const pz = game.player.inCar ? game.player.inCar.mesh.position.z : game.player.pos.z;
    const yaw = game.player.inCar ? game.player.inCar.heading : game.player.yaw;
    g.save();
    g.translate(toX(px), toZ(pz));
    g.rotate(Math.atan2(Math.sin(yaw), Math.cos(yaw)) + Math.PI);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -7);
    g.lineTo(5, 6);
    g.lineTo(-5, 6);
    g.closePath();
    g.fill();
    g.restore();
  }
}
