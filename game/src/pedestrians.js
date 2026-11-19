// NOVA BAY — pedestrians: walkers on the sidewalks who flee gunfire.
// One job: make the city feel alive on foot.
import * as THREE from 'three';

const SHIRTS = [0xd85a5a, 0x5a8ad8, 0x5ad88a, 0xd8c25a, 0x9a5ad8, 0xd88a5a, 0x5ad8c2, 0xe8e8e8];
const PANTS = [0x2a2d34, 0x3a4a6b, 0x5a4632, 0x4a4a4a];

export function makePedMesh(rng) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshStandardMaterial({ color: SHIRTS[Math.floor(rng.next() * SHIRTS.length)], roughness: 0.9 });
  const pants = new THREE.MeshStandardMaterial({ color: PANTS[Math.floor(rng.next() * PANTS.length)], roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: [0xe8b98a, 0xc98a5a, 0x8a5a3a, 0xf0d0b0][Math.floor(rng.next() * 4)], roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.9, 8), shirt);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
  head.position.y = 1.75;
  head.castShadow = true;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), pants);
  legL.position.set(-0.14, 0.3, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.14;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), shirt);
  armL.position.set(-0.42, 1.1, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.42;
  group.add(armR);
  group.userData = { legL, legR, armL, armR, walkPhase: rng.next() * 6 };
  return group;
}

export class Pedestrian {
  constructor(scene, rng, roadLines) {
    this.rng = rng;
    this.mesh = makePedMesh(rng);
    scene.add(this.mesh);
    this.axis = rng.next() < 0.5 ? 'x' : 'z';
    this.line = rng.pick(roadLines);
    this.lane = rng.next() < 0.5 ? 9.5 : -9.5;
    this.dir = rng.next() < 0.5 ? 1 : -1;
    this.pos = rng.range(-360, 360);
    this.speed = rng.range(1.2, 2.2);
    this.fleeing = 0;
    this.syncMesh();
  }

  syncMesh() {
    if (this.axis === 'x') {
      this.mesh.position.set(this.pos, 0, this.line + this.lane);
      this.mesh.rotation.y = this.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      this.mesh.position.set(this.line + this.lane, 0, this.pos);
      this.mesh.rotation.y = this.dir > 0 ? 0 : Math.PI;
    }
  }

  fleeFrom(x, z) {
    const dx = this.mesh.position.x - x;
    const dz = this.mesh.position.z - z;
    if (Math.hypot(dx, dz) < 25) {
      this.fleeing = 3;
      this.dir = Math.abs(dx) > Math.abs(dz) ? Math.sign(dx) || 1 : Math.sign(dz) || 1;
      if (Math.abs(dx) > Math.abs(dz)) {
        this.axis = 'x';
        this.pos = this.mesh.position.x;
        this.line = this.mesh.position.z - this.lane;
      } else {
        this.axis = 'z';
        this.pos = this.mesh.position.z;
        this.line = this.mesh.position.x - this.lane;
      }
    }
  }

  update(dt, roadLines, playerPos) {
    if (this.fleeing > 0) this.fleeing -= dt;
    const speed = this.fleeing > 0 ? 5.5 : this.speed;
    this.pos += speed * this.dir * dt;
    if (Math.abs(this.pos) > 365) {
      this.pos = -365 * this.dir;
      this.line = this.rng.pick(roadLines);
    }
    // Turn at a crossing sometimes.
    for (const cross of roadLines) {
      if (Math.abs(this.pos - cross) < speed * dt + 0.5 && this.rng.next() < 0.12) {
        const oldLine = this.line;
        this.axis = this.axis === 'x' ? 'z' : 'x';
        this.line = cross;
        this.pos = oldLine;
        this.dir = this.rng.next() < 0.5 ? 1 : -1;
        break;
      }
    }
    // Walk-cycle swing.
    const u = this.mesh.userData;
    u.walkPhase += dt * speed * 3.2;
    const swing = Math.sin(u.walkPhase) * 0.5;
    u.legL.rotation.x = swing;
    u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7;
    u.armR.rotation.x = swing * 0.7;
    this.syncMesh();
    void playerPos;
  }
}
