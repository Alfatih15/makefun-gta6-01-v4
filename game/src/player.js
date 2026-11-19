// NOVA BAY — the player on foot: movement, camera, entering cars.
// One job: Mara Voss, her body, her health and her wallet.
import * as THREE from 'three';
import { PLAYER } from './config.js';

export function makePlayerMesh() {
  const group = new THREE.Group();
  const jacket = new THREE.MeshStandardMaterial({ color: 0x8a1f2d, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x1f2a3a, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.95, 8), jacket);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 10, 8), skin);
  head.position.y = 1.78;
  head.castShadow = true;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }));
  hair.position.y = 1.84;
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.62, 0.19), pants);
  legL.position.set(-0.15, 0.31, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.15;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.58, 0.15), jacket);
  armL.position.set(-0.44, 1.1, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.44;
  group.add(armR);
  // A pistol in the right hand, visible when armed.
  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.42), new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0.7 }));
  gun.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.1), new THREE.MeshStandardMaterial({ color: 0x14161c }));
  grip.position.set(0, -0.12, -0.12);
  gun.add(grip);
  gun.position.set(0.44, 0.85, 0.25);
  gun.visible = false;
  group.add(gun);
  group.userData = { legL, legR, armL, armR, gun, walkPhase: 0 };
  return group;
}

export class Player {
  constructor(scene) {
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);
    this.pos = new THREE.Vector3(-229, 0, 340);
    this.yaw = 0; // facing direction
    this.camYaw = 0;
    this.camPitch = 0.35;
    this.health = PLAYER.maxHealth;
    this.cash = PLAYER.startCash;
    this.ammo = PLAYER.startAmmo;
    this.mag = PLAYER.magSize;
    this.inCar = null;
    this.armed = true;
    this.reloadTimer = 0;
    this.hurtTimer = 0;
    this.mesh.position.copy(this.pos);
  }

  // Move on foot. Returns distance moved.
  walk(dt, axes, mouse, colliders) {
    this.camYaw -= mouse.dx * 0.0028;
    this.camPitch = Math.max(-0.15, Math.min(1.1, this.camPitch + mouse.dy * 0.0022));
    const sprint = axes.sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const speed = Math.hypot(axes.x, axes.y) > 0 ? sprint : 0;
    const sin = Math.sin(this.camYaw);
    const cos = Math.cos(this.camYaw);
    // Forward is -Z rotated by camYaw; strafe is perpendicular.
    const fx = -sin;
    const fz = -cos;
    const rx = -cos;
    const rz = sin;
    let mx = fx * axes.y + rx * axes.x;
    let mz = fz * axes.y + rz * axes.x;
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len;
      mz /= len;
      this.yaw = Math.atan2(mx, mz);
      const nx = this.pos.x + mx * speed * dt;
      const nz = this.pos.z + mz * speed * dt;
      if (!this.hitsBuilding(nx, this.pos.z, colliders)) this.pos.x = nx;
      if (!this.hitsBuilding(this.pos.x, nz, colliders)) this.pos.z = nz;
      const u = this.mesh.userData;
      u.walkPhase += dt * speed * 1.6;
      const swing = Math.sin(u.walkPhase) * 0.55;
      u.legL.rotation.x = swing;
      u.legR.rotation.x = -swing;
      u.armL.rotation.x = -swing * 0.7;
      u.armR.rotation.x = swing * 0.7;
    } else {
      const u = this.mesh.userData;
      u.legL.rotation.x *= 0.8;
      u.legR.rotation.x *= 0.8;
      u.armL.rotation.x *= 0.8;
      u.armR.rotation.x *= 0.8;
    }
    this.pos.x = Math.max(-382, Math.min(382, this.pos.x));
    this.pos.z = Math.max(-382, Math.min(390, this.pos.z));
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    this.mesh.userData.gun.visible = this.armed;
    if (this.reloadTimer > 0) this.reloadTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    return speed * dt;
  }

  hitsBuilding(x, z, colliders) {
    for (const c of colliders) {
      if (x > c.x0 - PLAYER.radius && x < c.x1 + PLAYER.radius && z > c.z0 - PLAYER.radius && z < c.z1 + PLAYER.radius) return true;
    }
    return false;
  }

  damage(amount) {
    if (this.hurtTimer > 0) return;
    this.health -= amount;
    this.hurtTimer = 0.4;
  }

  heal(amount) {
    this.health = Math.min(PLAYER.maxHealth, this.health + amount);
  }

  reload() {
    if (this.reloadTimer > 0 || this.mag === PLAYER.magSize || this.ammo <= 0) return false;
    const need = PLAYER.magSize - this.mag;
    const take = Math.min(need, this.ammo);
    this.mag += take;
    this.ammo -= take;
    this.reloadTimer = 1.1;
    return true;
  }
}
