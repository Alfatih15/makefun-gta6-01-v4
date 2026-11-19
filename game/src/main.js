// NOVA BAY — boot, the game loop, day/night, weather and game states.
// One job: wire every system together and paint the frame.
//
// ?seed=N fixes the world. ?shot=cover|shootout|race|aerial (with &seed=N)
// stages that scene instead of the title screen and sets window.__shotReady.
import * as THREE from 'three';
import { WORLD, PLAYER, WANTED, MISSIONS } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { buildCity } from './city.js';
import { makeCarMesh, TrafficCar, DriveCar } from './vehicles.js';
import { Pedestrian } from './pedestrians.js';
import { Player } from './player.js';
import { Police } from './police.js';
import { Combat } from './combat.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { setupShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
scene.fog = new THREE.Fog(0x87b5e0, 120, 700);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 1500);
camera.position.set(-180, 40, 420);

const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -420;
sun.shadow.camera.right = 420;
sun.shadow.camera.top = 420;
sun.shadow.camera.bottom = -420;
sun.shadow.camera.far = 1200;
scene.add(sun);
scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x3a5a3a, 0.9);
scene.add(hemi);

// ---- World ---------------------------------------------------------------
const rng = makeRng(seed);
const city = buildCity(scene, rng);
const input = new Input(canvas);
const audio = new AudioEngine();
const hud = new HUD();
const player = new Player(scene);
const police = new Police(scene, rng);
const combat = new Combat(scene, rng);
const traffic = [];
for (let i = 0; i < 24; i++) traffic.push(new TrafficCar(scene, rng, city.roadLines));
const peds = [];
for (let i = 0; i < 44; i++) peds.push(new Pedestrian(scene, rng, city.roadLines));
const parked = []; // DriveCar instances the player can steal
const parkedTypes = ['sedan', 'coupe', 'sports', 'taxi', 'van', 'sedan', 'coupe', 'taxi', 'sports', 'sedan', 'van', 'coupe'];
for (let i = 0; i < 12; i++) {
  const type = parkedTypes[i];
  const spec = { sedan: 0, coupe: 0, sports: 0, taxi: 0, van: 0 }[type];
  void spec;
  const color = type === 'taxi' ? 0xf5c518 : [0x8a2f2f, 0x2f4d8a, 0xd8a017, 0x3a6b4f, 0xe01e2b][i % 5];
  const line = city.roadLines[Math.floor(rng.next() * city.roadLines.length)];
  const along = rng.range(-340, 340);
  const mesh = makeCarMesh(type, color);
  const side = rng.next() < 0.5;
  if (side) {
    mesh.position.set(line + 5.5, 0, along);
    mesh.rotation.y = Math.PI / 2;
  } else {
    mesh.position.set(along, 0, line + 5.5);
    mesh.rotation.y = 0;
  }
  scene.add(mesh);
  const car = new DriveCar(mesh, type);
  car.parked = true;
  parked.push(car);
}

// ---- Game state ------------------------------------------------------------
const game = {
  scene, camera, rng, city, player, police, combat, traffic, peds, parked,
  audio, hud, input,
  spawns: city.spawns,
  state: 'title', // title | playing | paused | busted | complete
  timeOfDay: 9.0,
  marker: null,
  shotExtras: [],
  fare: null,
  rainTimer: 200,
  raining: false,
  shotHooks: null,
  shotElapsed: 0,
  clock: 0,
};

// Marker beacon.
const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false });
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 60, 12, 1, true), beaconMat);
beacon.visible = false;
scene.add(beacon);
const beaconRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 4, 24), new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
beaconRing.rotation.x = -Math.PI / 2;
beaconRing.visible = false;
scene.add(beaconRing);

game.setMarker = (x, z, label) => {
  game.marker = { x, z, label };
  beacon.position.set(x, 30, z);
  beacon.visible = true;
  beaconRing.position.set(x, 0.1, z);
  beaconRing.visible = true;
};
game.clearMarker = () => {
  game.marker = null;
  beacon.visible = false;
  beaconRing.visible = false;
};
game.setMissionText = (title, text) => {
  hud.setMission(title, text);
  hud.setTimer(0);
};
game.setTimerText = (s) => hud.setTimer(s);
game.toast = (title, text) => hud.toast(title, text);
game.saveGame = () => {
  saveGame({
    cash: player.cash, mission: game.missions.index,
    x: player.pos.x, z: player.pos.z, time: game.timeOfDay,
    stashes: combat.stashesFound(),
  });
};
game.onGameComplete = () => {
  game.state = 'complete';
  hud.showComplete(player.cash);
  audio.missionDone();
  clearSave();
};
game.spawnParkedCar = (type, color, x, z) => {
  const mesh = makeCarMesh(type, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
  const car = new DriveCar(mesh, type);
  car.parked = true;
  car.missionCar = true;
  parked.push(car);
  return car;
};
game.giveCar = (type, color, x, z, heading) => {
  if (player.inCar) scene.remove(player.inCar.mesh);
  const mesh = makeCarMesh(type, color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  const car = new DriveCar(mesh, type);
  car.heading = heading;
  player.inCar = car;
  player.pos.set(x, 0, z);
  player.mesh.visible = false;
  return car;
};

// The mission manager calls game.setMarker/toast/... from its constructor,
// so it is created only after those helpers exist above.
game.missions = new MissionManager(game);

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of parked) {
    const d = Math.hypot(car.mesh.position.x - player.pos.x, car.mesh.position.z - player.pos.z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

function enterCar(car) {
  const idx = parked.indexOf(car);
  if (idx >= 0) parked.splice(idx, 1);
  player.inCar = car;
  player.mesh.visible = false;
  car.parked = false;
  car.heading = car.mesh.rotation.y;
  car.speed = 0;
  if (!car.owned) {
    car.owned = true;
    if (car.type === 'taxi') {
      startFare();
    } else {
      police.addHeat(WANTED.stealCar);
      hud.toast('CAR STOLEN', 'The NBPD is on its way — wanted level up.');
    }
  }
  audio.blip(440, 0.1);
}

function exitCar() {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  player.mesh.visible = true;
  const hx = Math.sin(car.heading);
  const hz = Math.cos(car.heading);
  player.pos.set(car.mesh.position.x - hz * 2.5, 0, car.mesh.position.z + hx * 2.5);
  player.yaw = car.heading;
  player.camYaw = car.heading + Math.PI;
  parked.push(car);
  car.parked = true;
  if (game.fare) {
    game.fare = null;
    game.clearMarker();
    hud.toast('FARE LOST', 'You left the taxi — the passenger walked away.');
  }
}

function startFare() {
  const dest = { x: (Math.floor(rng.next() * 9) - 4) * 74 - 37, z: (Math.floor(rng.next() * 9) - 4) * 74 - 37 };
  const reward = 60 + Math.floor(rng.next() * 60);
  game.fare = { ...dest, reward };
  game.setMarker(dest.x, dest.z, 'DROP-OFF');
  hud.toast('TAXI FARE', `Take the passenger to the marker — $${reward} on arrival.`);
}

function shoot() {
  if (player.mag <= 0) {
    player.reload();
    return;
  }
  if (player.reloadTimer > 0) return;
  player.mag -= 1;
  const origin = player.pos.clone().add(new THREE.Vector3(0, 1.55, 0));
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const targets = [];
  for (const r of game.missions.rivals) if (r.alive) targets.push({ mesh: r.mesh, kind: 'rival', ref: r });
  for (const c of police.cops) targets.push({ mesh: c.mesh, kind: 'cop', ref: c });
  for (const p of peds) if (!p.dead) targets.push({ mesh: p.mesh, kind: 'ped', ref: p });
  for (const it of police.interceptors) targets.push({ mesh: it.mesh, kind: 'interceptor', ref: it });
  combat.shoot(origin, dir, targets, (target) => {
    if (target.kind === 'rival') {
      game.missions.hitRival(target.ref);
    } else if (target.kind === 'cop') {
      target.ref.hp -= 34;
      if (target.ref.hp <= 0) {
        const i = police.cops.indexOf(target.ref);
        if (i >= 0) {
          scene.remove(target.ref.mesh);
          police.cops.splice(i, 1);
        }
        police.addHeat(WANTED.killCop);
      }
    } else if (target.kind === 'ped') {
      const ped = target.ref;
      ped.dead = true;
      ped.mesh.rotation.x = -Math.PI / 2;
      ped.mesh.position.y = 0.4;
      police.addHeat(WANTED.killPed);
    } else if (target.kind === 'interceptor') {
      target.ref.health -= 34;
      if (target.ref.health <= 0) {
        const i = police.interceptors.indexOf(target.ref);
        if (i >= 0) {
          scene.remove(target.ref.mesh);
          police.interceptors.splice(i, 1);
        }
      }
    }
  });
  police.addHeat(WANTED.shoot);
  for (const p of peds) p.fleeFrom(player.pos.x, player.pos.z);
  audio.shot();
}

function bustPlayer() {
  if (game.state !== 'playing') return;
  game.state = 'busted';
  audio.busted();
  police.heat = 0;
  hud.showBusted();
  document.exitPointerLock?.();
}

function updateDayNight() {
  const t = game.timeOfDay;
  const dayF = t > 6 && t < 18.5 ? Math.sin(((t - 6) / 12.5) * Math.PI) : 0;
  const duskF = t >= 17 && t <= 19.5 ? 1 - Math.abs(t - 18.25) / 1.25 : 0;
  const sky = new THREE.Color(PALETTE_DAY);
  if (duskF > 0) sky.lerp(new THREE.Color(0xff9a5c), duskF * 0.8);
  if (dayF <= 0) sky.lerp(new THREE.Color(0x0b1026), 1);
  else sky.lerp(new THREE.Color(0x87b5e0), 0.4);
  scene.background = sky;
  scene.fog.color.copy(sky);
  const a = ((t - 6) / 12) * Math.PI;
  sun.position.set(Math.cos(a) * 500, Math.max(40, Math.sin(a) * 420), 260);
  sun.target.position.set(0, 0, 0);
  sun.color.setHex(duskF > 0.4 ? 0xffb36b : 0xfff2d8);
  sun.intensity = dayF > 0 ? 1.4 + dayF * 1.1 : 0.25;
  hemi.intensity = dayF > 0 ? 0.6 + dayF * 0.5 : 0.25;
  const night = dayF <= 0 ? 1 : 0;
  for (const lamp of city.lamps) lamp.bulbMat.emissiveIntensity = night ? 1.8 : 0.15;
  if (city.animated.lighthouseBeam) city.animated.lighthouseBeam.intensity = night ? 500 : 0;
  // Traffic lights cycle.
  for (const tl of city.animated.trafficLights) {
    tl.timer -= 0.016;
    if (tl.timer <= 0) {
      tl.state = tl.state === 1 ? 0 : 1;
      tl.timer = tl.state === 1 ? 7 : 5;
      tl.mat.emissive.setHex(tl.state === 1 ? 0x00ff44 : 0xff2222);
    }
  }
  // Ferris wheel turns.
  if (city.animated.ferris) city.animated.ferris.rotation.z += 0.016 * 0.15;
}

const PALETTE_DAY = 0x87b5e0;

// Rain: a points cloud around the camera.
const rainGeo = new THREE.BufferGeometry();
{
  const N = 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rng.next() - 0.5) * 120;
    pos[i * 3 + 1] = rng.next() * 60;
    pos[i * 3 + 2] = (rng.next() - 0.5) * 120;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccee, size: 0.35, transparent: true, opacity: 0.5 }));
rain.visible = false;
scene.add(rain);

function updateRain(dt) {
  game.rainTimer -= dt;
  if (game.rainTimer <= 0) {
    game.raining = !game.raining && rng.next() < 0.3;
    if (game.raining) game.rainTimer = 25;
    else game.rainTimer = 180 + rng.next() * 120;
    rain.visible = game.raining;
  }
  if (game.raining) {
    const pos = rainGeo.attributes.position;
    const cx = camera.position.x;
    const cz = camera.position.z;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 42;
      if (y < 0) {
        y = 55;
        pos.setX(i, cx + (rng.next() - 0.5) * 120);
        pos.setZ(i, cz + (rng.next() - 0.5) * 120);
      }
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    rain.position.set(0, 0, 0);
  }
}

function updateCamera(dt) {
  if (player.inCar) {
    const car = player.inCar;
    const h = car.heading;
    const tx = car.mesh.position.x - Math.sin(h) * 12;
    const tz = car.mesh.position.z - Math.cos(h) * 12;
    const ty = 5.2;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 4);
    camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 4);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 4);
    camera.lookAt(car.mesh.position.x + Math.sin(h) * 10, 2, car.mesh.position.z + Math.cos(h) * 10);
  } else {
    const d = 7.5 * Math.cos(player.camPitch);
    const h = 2 + 7.5 * Math.sin(player.camPitch);
    const tx = player.pos.x + Math.sin(player.camYaw) * d;
    const tz = player.pos.z + Math.cos(player.camYaw) * d;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 10);
    camera.position.y += (h - camera.position.y) * Math.min(1, dt * 10);
    camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 10);
    camera.lookAt(player.pos.x, player.pos.y + 1.6, player.pos.z);
  }
}

function update(dt) {
  game.clock += dt;
  game.timeOfDay = (game.timeOfDay + dt / 300) % 24; // 1 game hour per 5 min
  updateDayNight();
  updateRain(dt);
  const mouse = input.consumeMouse();
  const axes = input.moveAxes();
  axes.sprint = input.down('ShiftLeft') || input.down('ShiftRight');
  const clicked = input.consumeClick();

  if (player.inCar) {
    const car = player.inCar;
    car.update(dt, axes, city.colliders, traffic, () => audio.crash());
    audio.setEngine(Math.abs(car.speed) / car.spec.top);
    if (car.health <= 0) {
      const pos = car.mesh.position.clone();
      scene.remove(car.mesh);
      player.inCar = null;
      player.mesh.visible = true;
      player.pos.set(pos.x + 3, 0, pos.z + 3);
      player.damage(15);
      police.addHeat(10);
      audio.crash();
      hud.toast('CAR DESTROYED', 'Your ride is scrap. Keep moving on foot.');
    }
    if (game.fare) {
      const d = Math.hypot(car.mesh.position.x - game.fare.x, car.mesh.position.z - game.fare.z);
      if (d < 9) {
        player.cash += game.fare.reward;
        hud.toast('FARE PAID', `+$${game.fare.reward} — nice driving.`);
        audio.pickup();
        game.fare = null;
        game.clearMarker();
      }
    }
  } else {
    player.walk(dt, { x: axes.x, y: axes.y, sprint: axes.sprint }, mouse, city.colliders);
    audio.setEngine(0);
    if (clicked && player.armed) shoot();
  }
  if (input.down('KeyR')) player.reload();
  if (input.down('KeyE') && !game._eHeld) {
    game._eHeld = true;
    if (player.inCar) exitCar();
    else {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
    }
  }
  if (!input.down('KeyE')) game._eHeld = false;
  if (input.down('KeyM')) audio.muted = !audio.muted;
  if (game._pauseEdge) {
    game.state = 'paused';
    hud.showPause();
    document.exitPointerLock?.();
  }

  const playerPos = player.inCar ? player.inCar.mesh.position : player.pos;
  const stars = police.update(dt, playerPos, player, city.colliders, bustPlayer);
  for (const t of traffic) t.update(dt, traffic, city.animated.trafficLights);
  for (const p of peds) {
    if (!p.dead) p.update(dt, city.roadLines, playerPos);
  }
  combat.update(dt, playerPos, player, (kind) => {
    audio.pickup();
    if (kind === 'stash') hud.toast('HIDDEN STASH', `+$100 — ${combat.stashesFound()}/10 found.`);
    else hud.toast(kind === 'health' ? 'HEALTH +50' : 'AMMO +24', '');
  });
  game.missions.update(dt);

  // HUD.
  hud.setCash(player.cash);
  hud.setStars(stars);
  hud.setHeat(police.heat);
  hud.setClock(game.timeOfDay, (game.timeOfDay % 1) * 60);
  hud.setDistrict(playerPos.x, playerPos.z);
  hud.setHealth(player.health);
  hud.setAmmo(player.mag, player.ammo);
  hud.setSpeed(player.inCar ? Math.abs(player.inCar.speed) * 3.6 : 0);
  hud.drawMinimap(game);
  hud.update(dt);
  if (player.health <= 0) bustPlayer();
  if (player.health < 30) hud.hurtFlash();
  updateCamera(dt);
}

// ---- Menus -----------------------------------------------------------------
const saved = loadGame();
hud.showMenu('NOVA BAY', 'Mara Voss is home. The city owes her — take it back.', saved ? 'CONTINUE' : 'START ENGINE');
document.getElementById('menu-btn').addEventListener('click', () => {
  audio.ensure();
  hud.hideMenu();
  input.consumeClick(); // the menu click must not become a shot on frame one
  if (saved && game.state === 'title') {
    player.cash = saved.cash ?? PLAYER.startCash;
    player.pos.set(saved.x ?? -229, 0, saved.z ?? 340);
    game.timeOfDay = saved.time ?? 9;
    // Rebuild mission progress: resume at the saved mission (0 is already running).
    if ((saved.mission ?? 0) > 0) game.missions.startMission(Math.min(saved.mission, MISSIONS.length - 1));
  }
  game.state = 'playing';
});
document.getElementById('menu-new').addEventListener('click', () => {
  audio.ensure();
  clearSave();
  hud.hideMenu();
  input.consumeClick();
  game.state = 'playing';
});
document.getElementById('pause-resume').addEventListener('click', () => {
  hud.hidePause();
  input.consumeClick(); // the RESUME click must not become a shot
  game.state = 'playing';
});
document.getElementById('pause-restart').addEventListener('click', () => {
  hud.hidePause();
  location.reload();
});
document.getElementById('busted-retry').addEventListener('click', () => {
  hud.hideBusted();
  input.consumeClick();
  player.health = PLAYER.maxHealth;
  player.pos.set(-229, 0, 340);
  player.camYaw = 0;
  police.heat = 0;
  game.missions.startMission(game.missions.index);
  game.state = 'playing';
});
document.getElementById('complete-again').addEventListener('click', () => location.reload());

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- Shot mode / main loop --------------------------------------------------
window.__game = game;
// Read-only debug handle for the headless play-test (no gameplay effect).
window.__debug = { player, parked, police, traffic, peds, camera, missions: game.missions };
window.__shotReady = false;
let last = performance.now();
let shotReadyAt = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (shotName) {
    if (!game.shotHooks) {
      game.state = 'playing';
      hud.hideMenu();
      hud.el.toast.classList.remove('show');
      hud.toastTimer = 0;
      game.shotHooks = setupShot(game, shotName);
      game.shotElapsed = 0;
    }
    game.shotElapsed += dt;
    // World keeps moving (traffic, peds, police) but the player stays staged.
    const playerPos = player.inCar ? player.inCar.mesh.position : player.pos;
    police.update(dt, playerPos, player, city.colliders, () => {});
    for (const t of traffic) t.update(dt, traffic, city.animated.trafficLights);
    for (const p of peds) if (!p.dead) p.update(dt, city.roadLines, playerPos);
    updateDayNight();
    for (const hook of game.shotHooks) hook();
    hud.setCash(player.cash);
    hud.setStars(police.stars);
    hud.setHeat(police.heat);
    hud.setClock(game.timeOfDay, (game.timeOfDay % 1) * 60);
    hud.setDistrict(playerPos.x, playerPos.z);
    hud.setHealth(player.health);
    hud.setAmmo(player.mag, player.ammo);
    hud.setSpeed(player.inCar ? Math.abs(player.inCar.speed) * 3.6 : 0);
    hud.drawMinimap(game);
    hud.update(dt);
    renderer.render(scene, camera);
    if (game.shotElapsed > 2.5 && !window.__shotReady) {
      window.__shotReady = true;
      shotReadyAt = now;
    }
    void shotReadyAt;
    return;
  }
  // P / Esc toggles pause on the key-down EDGE (not the level): update()
  // only runs while playing, so both edges live here.
  const pauseKey = input.down('KeyP') || input.down('Escape');
  game._pauseEdge = pauseKey && !game._pauseKeyWasDown;
  game._pauseKeyWasDown = pauseKey;
  if (game.state === 'paused' && game._pauseEdge) {
    hud.hidePause();
    game.state = 'playing';
    game._pauseEdge = false; // the same press must not re-pause instantly
  }
  if (game.state === 'playing') update(dt);
  else if (game.state === 'title') {
    // Slow orbit over the city behind the title menu.
    const t = now / 1000 * 0.03;
    camera.position.set(Math.cos(t) * 320, 150, Math.sin(t) * 320);
    camera.lookAt(0, 0, 0);
    updateDayNight();
    for (const tr of traffic) tr.update(dt, traffic, city.animated.trafficLights);
    for (const p of peds) if (!p.dead) p.update(dt, city.roadLines, player.pos);
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
