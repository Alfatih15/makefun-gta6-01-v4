// NOVA BAY — the wanted system: foot cops, interceptors, helicopter.
// One job: make the Nova Bay PD answer the player's heat.
import * as THREE from 'three';
import { WANTED } from './config.js';
import { makeCarMesh } from './vehicles.js';
import { makePedMesh } from './pedestrians.js';

function makeCopMesh(rng) {
  const g = makePedMesh(rng);
  // Recolour to navy uniform.
  g.traverse((o) => {
    if (o.isMesh && o.material && o.material.color) {
      if (o.geometry && o.geometry.type === 'CylinderGeometry') o.material = new THREE.MeshStandardMaterial({ color: 0x1f2a4a, roughness: 0.85 });
    }
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0x14161c }));
  cap.position.y = 1.98;
  g.add(cap);
  return g;
}

export class Police {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.heat = 0;
    this.lastCrime = -99;
    this.cops = []; // {mesh, hp, shootTimer, bustTimer}
    this.interceptors = []; // {mesh, heading, speed, health}
    this.heli = null; // {group, rotor, light}
    this.time = 0;
  }

  get stars() {
    return Math.min(5, Math.ceil(this.heat / WANTED.heatPerStar));
  }

  addHeat(amount) {
    this.heat = Math.min(WANTED.maxHeat, this.heat + amount);
    this.lastCrime = this.time;
  }

  update(dt, playerPos, player, colliders, onBusted) {
    this.time += dt;
    if (this.time - this.lastCrime > WANTED.decayDelay) {
      this.heat = Math.max(0, this.heat - WANTED.decayPerSec * dt);
    }
    const want = this.stars;
    // Foot cops: one per star, up to 5.
    while (this.cops.length < want) {
      const mesh = makeCopMesh(this.rng);
      const a = this.rng.next() * Math.PI * 2;
      mesh.position.set(playerPos.x + Math.cos(a) * 28, 0, playerPos.z + Math.sin(a) * 28);
      this.scene.add(mesh);
      this.cops.push({ mesh, hp: 40, shootTimer: 1, bustTimer: 0 });
    }
    while (this.cops.length > want && this.cops.length > 0) {
      const c = this.cops.pop();
      this.scene.remove(c.mesh);
    }
    for (const c of this.cops) {
      const dx = playerPos.x - c.mesh.position.x;
      const dz = playerPos.z - c.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const speed = dist > 14 ? 5.2 : 2.2;
      c.mesh.position.x += (dx / (dist || 1)) * speed * dt;
      c.mesh.position.z += (dz / (dist || 1)) * speed * dt;
      c.mesh.rotation.y = Math.atan2(dx, dz);
      c.shootTimer -= dt;
      if (dist < 26 && c.shootTimer <= 0) {
        c.shootTimer = 1.1 + this.rng.next() * 0.6;
        if (this.rng.next() < 0.45) player.damage(6 + this.stars);
      }
      if (dist < 1.6) {
        c.bustTimer += dt;
        if (c.bustTimer > 1.5) onBusted();
      } else {
        c.bustTimer = 0;
      }
    }
    // Interceptors from 2 stars.
    const wantCars = want >= 2 ? Math.min(3, want - 1) : 0;
    while (this.interceptors.length < wantCars) {
      const mesh = makeCarMesh('police', 0x14161c);
      const a = this.rng.next() * Math.PI * 2;
      mesh.position.set(playerPos.x + Math.cos(a) * 45, 0, playerPos.z + Math.sin(a) * 45);
      this.scene.add(mesh);
      this.interceptors.push({ mesh, heading: 0, speed: 0, health: 80 });
    }
    while (this.interceptors.length > wantCars && this.interceptors.length > 0) {
      const c = this.interceptors.pop();
      this.scene.remove(c.mesh);
    }
    for (const it of this.interceptors) {
      const dx = playerPos.x - it.mesh.position.x;
      const dz = playerPos.z - it.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      const targetHeading = Math.atan2(dx, dz);
      let dh = targetHeading - it.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      it.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, dh));
      it.speed = Math.min(30, it.speed + 12 * dt);
      if (dist < 5) it.speed = Math.max(6, it.speed - 20 * dt);
      it.mesh.position.x += Math.sin(it.heading) * it.speed * dt;
      it.mesh.position.z += Math.cos(it.heading) * it.speed * dt;
      it.mesh.rotation.y = it.heading;
      if (it.mesh.userData.lightBar) {
        it.mesh.userData.lightBar.material.emissive.setHex(Math.floor(this.time * 4) % 2 === 0 ? 0xff2222 : 0x2244ff);
      }
      if (dist < 3.4 && player.inCar) {
        player.inCar.health -= 6 * dt;
        it.speed *= 0.9;
      }
    }
    // Helicopter from 4 stars.
    if (want >= 4 && !this.heli) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.8, 2.2), new THREE.MeshStandardMaterial({ color: 0x1f2a4a, roughness: 0.5, metalness: 0.4 }));
      body.castShadow = true;
      group.add(body);
      const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111 }));
      rotor.position.y = 1.3;
      group.add(rotor);
      const spot = new THREE.SpotLight(0xfff2c8, 400, 90, 0.3, 0.6);
      spot.position.set(0, -1, 0);
      group.add(spot);
      group.add(spot.target);
      spot.target.position.set(0, -30, 0);
      this.scene.add(group);
      this.heli = { group, rotor, spot };
    }
    if (want < 4 && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
    if (this.heli) {
      const t = this.time * 0.5;
      this.heli.group.position.set(
        playerPos.x + Math.cos(t) * 18,
        42 + Math.sin(t * 0.7) * 3,
        playerPos.z + Math.sin(t) * 18,
      );
      this.heli.rotor.rotation.y += dt * 30;
      this.heli.spot.target.position.set(
        playerPos.x - this.heli.group.position.x,
        -42,
        playerPos.z - this.heli.group.position.z,
      );
    }
    return want;
  }
}
