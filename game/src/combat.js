// NOVA BAY — combat and side activities: pistol shots, tracers, damage,
// pickups, hidden cash stashes and taxi fares.
// One job: everything that pays or hurts outside the missions.
import * as THREE from 'three';
import { PLAYER, STASH_SPOTS } from './config.js';

export class Combat {
  constructor(scene, rng) {
    this.scene = scene;
    this.rng = rng;
    this.tracers = [];
    this.pickups = []; // {mesh, kind, taken}
    this.stashes = []; // {mesh, taken}
    this.tracerMat = new THREE.LineBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.9 });
    this.flash = new THREE.PointLight(0xffd21f, 0, 12);
    this.scene.add(this.flash);
    this.flashTimer = 0;
    this.spawnPickups();
    this.spawnStashes();
  }

  spawnPickups() {
    const spots = [
      [120, -120, 'health'], [-120, 120, 'health'], [260, 260, 'health'],
      [-260, -260, 'ammo'], [40, 260, 'ammo'], [-40, -260, 'ammo'],
      [300, -40, 'health'], [-300, 40, 'ammo'],
    ];
    for (const [x, z, kind] of spots) {
      const color = kind === 'health' ? 0x2fd85a : 0xffd21f;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }),
      );
      mesh.position.set(x, 1, z);
      mesh.rotation.y = Math.PI / 4;
      this.scene.add(mesh);
      this.pickups.push({ mesh, kind, taken: false });
    }
  }

  spawnStashes() {
    for (const [x, z] of STASH_SPOTS) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x2fd8c2, emissive: 0x2fd8c2, emissiveIntensity: 1.4 }),
      );
      mesh.position.set(x, 1.2, z);
      this.scene.add(mesh);
      this.stashes.push({ mesh, taken: false });
    }
  }

  // Hitscan shot from the player toward the camera aim point.
  shoot(origin, dir, targets, onHit) {
    const ray = new THREE.Raycaster(origin, dir, 0, 120);
    const meshes = targets.filter((t) => t.alive !== false).map((t) => t.mesh);
    const hits = ray.intersectObjects(meshes, true);
    let end;
    if (hits.length > 0) {
      const hit = hits[0];
      end = hit.point;
      let root = hit.object;
      while (root.parent && root.parent !== this.scene) root = root.parent;
      const target = targets.find((t) => t.mesh === root);
      if (target && onHit) onHit(target, hit.point);
    } else {
      end = origin.clone().add(dir.clone().multiplyScalar(90));
    }
    const geo = new THREE.BufferGeometry().setFromPoints([origin, end]);
    const line = new THREE.Line(geo, this.tracerMat.clone());
    this.scene.add(line);
    this.tracers.push({ line, life: 0.12 });
    this.flash.position.copy(origin);
    this.flash.intensity = 60;
    this.flashTimer = 0.06;
  }

  update(dt, playerPos, player, onPickup) {
    for (const t of this.tracers) t.life -= dt;
    this.tracers = this.tracers.filter((t) => {
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        return false;
      }
      t.line.material.opacity = t.life / 0.12;
      return true;
    });
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.intensity = 0;
    }
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 2;
      p.mesh.position.y = 1 + Math.sin(performance.now() / 400) * 0.15;
      if (Math.hypot(p.mesh.position.x - playerPos.x, p.mesh.position.z - playerPos.z) < 2) {
        p.taken = true;
        this.scene.remove(p.mesh);
        if (p.kind === 'health') player.heal(50);
        else player.ammo += 24;
        if (onPickup) onPickup(p.kind);
      }
    }
    for (const s of this.stashes) {
      if (s.taken) continue;
      s.mesh.rotation.y += dt;
      if (Math.hypot(s.mesh.position.x - playerPos.x, s.mesh.position.z - playerPos.z) < 2.2) {
        s.taken = true;
        this.scene.remove(s.mesh);
        player.cash += 100;
        if (onPickup) onPickup('stash');
      }
    }
  }

  stashesFound() {
    return this.stashes.filter((s) => s.taken).length;
  }
}
