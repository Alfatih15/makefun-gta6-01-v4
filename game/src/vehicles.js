// NOVA BAY — cars: meshes, traffic AI, parked cars and driving physics.
// One job: everything with four wheels.
import * as THREE from 'three';
import { CAR } from './config.js';

export function makeCarMesh(type, colorHex) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.35, metalness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.1, metalness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.9 });
  const size = type === 'truck' ? { w: 2.6, l: 7.5, h: 1.6, cab: 2.2 }
    : type === 'van' ? { w: 2.4, l: 5.6, h: 2.0, cab: 2.6 }
    : type === 'sports' ? { w: 2.0, l: 4.6, h: 0.9, cab: 1.4 }
    : { w: 2.1, l: 4.8, h: 1.1, cab: 1.8 };
  const body = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.l), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(size.w * 0.85, 0.75, size.cab), glassMat);
  cabin.position.set(0, size.h + 0.3, type === 'truck' ? size.l / 2 - 1.2 : -0.3);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-size.w / 2, size.l / 2 - 1], [size.w / 2, size.l / 2 - 1], [-size.w / 2, -size.l / 2 + 1], [size.w / 2, -size.l / 2 + 1]]) {
    const wheel = new THREE.Mesh(wheelGeo, darkMat);
    wheel.position.set(wx, 0.42, wz);
    wheel.castShadow = true;
    group.add(wheel);
  }
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c8, emissiveIntensity: 1.6 });
  for (const sx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), headMat);
    head.position.set(sx, 0.85, size.l / 2 + 0.03);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 1.2 }));
    tail.position.set(sx, 0.85, -size.l / 2 - 0.03);
    group.add(tail);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x2244ff, emissiveIntensity: 2 }));
    bar.position.set(0, size.h + 0.75, -0.3);
    group.add(bar);
    group.userData.lightBar = bar;
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.4), new THREE.MeshStandardMaterial({ color: 0xf5c518, emissive: 0xf5c518, emissiveIntensity: 0.8 }));
    sign.position.set(0, size.h + 0.75, -0.3);
    group.add(sign);
  }
  group.userData.size = size;
  return group;
}

// A traffic car driving the grid: one axis, one lane, turns at crossings.
export class TrafficCar {
  constructor(scene, rng, roadLines) {
    this.rng = rng;
    this.crossLines = roadLines;
    this.type = rng.pick(['sedan', 'sedan', 'coupe', 'van', 'taxi', 'truck']);
    const spec = CAR[this.type];
    this.color = rng.pick(spec.colors);
    this.mesh = makeCarMesh(this.type, this.color);
    scene.add(this.mesh);
    this.axis = rng.chance(0.5) ? 'x' : 'z';
    this.line = rng.pick(roadLines);
    this.dir = rng.chance(0.5) ? 1 : -1;
    this.speed = rng.range(8, 13);
    this.pos = rng.range(-360, 360);
    this.stopped = false;
    this.syncMesh();
  }

  syncMesh() {
    // Right-hand traffic: lane offset follows the direction of travel.
    if (this.axis === 'x') {
      this.mesh.position.set(this.pos, 0, this.line + 3.5 * this.dir);
      this.mesh.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      this.mesh.position.set(this.line - 3.5 * this.dir, 0, this.pos);
      this.mesh.rotation.y = this.dir > 0 ? 0 : Math.PI;
    }
  }

  update(dt, others, trafficLights) {
    // Stop for a red light or a car ahead.
    let want = this.speed;
    for (const tl of trafficLights) {
      if (tl.state === 0) {
        const d = this.axis === 'x' ? Math.abs(this.mesh.position.z - tl.z) : Math.abs(this.mesh.position.x - tl.x);
        const along = this.axis === 'x' ? this.pos - tl.x : this.pos - tl.z;
        if (d < 12 && along * this.dir > -14 && along * this.dir < 0) want = 0;
      }
    }
    for (const o of others) {
      if (o === this) continue;
      const dx = o.mesh.position.x - this.mesh.position.x;
      const dz = o.mesh.position.z - this.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 9) {
        const ahead = this.axis === 'x' ? dx * this.dir : dz * this.dir;
        if (ahead > 0 && ahead < 9 && Math.abs(this.axis === 'x' ? dz : dx) < 4) want = 0;
      }
    }
    this.speed += (want - this.speed) * Math.min(1, dt * 2);
    this.pos += this.speed * this.dir * dt;
    if (Math.abs(this.pos) > 368) this.pos = -368 * this.dir;
    // At a crossing, sometimes turn onto the other axis.
    for (const cross of this.crossLines) {
      if (Math.abs(this.pos - cross) < this.speed * dt + 0.6 && this.rng.chance(0.25)) {
        const oldPos = this.pos;
        const oldLine = this.line;
        this.axis = this.axis === 'x' ? 'z' : 'x';
        this.line = cross;
        this.pos = oldLine;
        this.dir = this.rng.chance(0.5) ? 1 : -1;
        void oldPos;
        break;
      }
    }
    this.syncMesh();
  }
}

// Player-driven car physics: arcade handling with building collision.
export class DriveCar {
  constructor(mesh, type) {
    this.mesh = mesh;
    this.type = type;
    this.spec = CAR[type];
    this.speed = 0;
    this.heading = 0;
    this.health = 100;
    this.smoke = null;
  }

  update(dt, axes, colliders, traffic, onCrash) {
    const accel = axes.y * this.spec.accel;
    this.speed += accel * dt;
    if (axes.y === 0) this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    if (axes.y < 0 && this.speed > 0.5) this.speed -= 22 * dt; // brake
    this.speed = Math.max(-10, Math.min(this.spec.top, this.speed));
    const steer = axes.x * this.spec.steer * Math.min(1, Math.abs(this.speed) / 8) * (this.speed >= 0 ? 1 : -1);
    this.heading -= steer * dt * (this.speed >= 0 ? 1 : -1) * Math.sign(this.speed || 1);
    const nx = this.mesh.position.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.mesh.position.z + Math.cos(this.heading) * this.speed * dt;
    // Building collision: slide along the wall, lose speed.
    let hit = false;
    for (const c of colliders) {
      if (nx > c.x0 - 1.4 && nx < c.x1 + 1.4 && nz > c.z0 - 1.4 && nz < c.z1 + 1.4) {
        hit = true;
        break;
      }
    }
    if (hit) {
      if (Math.abs(this.speed) > 8) {
        this.health -= Math.abs(this.speed) * 0.8;
        if (onCrash) onCrash();
      }
      this.speed *= -0.25;
    } else {
      this.mesh.position.x = nx;
      this.mesh.position.z = nz;
    }
    // Bump traffic cars.
    for (const t of traffic) {
      const dx = t.mesh.position.x - this.mesh.position.x;
      const dz = t.mesh.position.z - this.mesh.position.z;
      if (Math.hypot(dx, dz) < 4.5 && Math.abs(this.speed) > 4) {
        t.pos += Math.sign(this.speed) * 3;
        this.speed *= 0.7;
        this.health -= 2;
        if (onCrash) onCrash();
      }
    }
    this.mesh.position.x = Math.max(-380, Math.min(380, this.mesh.position.x));
    this.mesh.position.z = Math.max(-380, Math.min(388, this.mesh.position.z));
    this.mesh.rotation.y = this.heading;
    return hit;
  }
}
