// NOVA BAY — the story: 8 missions from homecoming to the final job.
// One job: what Mara has to do, in order, and when each job is done.
import * as THREE from 'three';
import { MISSIONS, WANTED } from './config.js';
import { makeCarMesh } from './vehicles.js';
import { makePedMesh } from './pedestrians.js';

function rivalMesh(scene, rng) {
  const g = makePedMesh(rng);
  g.traverse((o) => {
    if (o.isMesh && o.material && o.geometry && o.geometry.type === 'CylinderGeometry') {
      o.material = new THREE.MeshStandardMaterial({ color: 0x8a1f2d, roughness: 0.85 });
    }
  });
  scene.add(g);
  return g;
}

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.rng = game.rng;
    this.index = 0;
    this.state = null;
    this.rivals = [];
    this.raceRivals = [];
    this.timer = 0;
    this.startMission(0);
  }

  get current() {
    return MISSIONS[this.index];
  }

  get done() {
    return this.index >= MISSIONS.length;
  }

  startMission(i) {
    this.index = i;
    const g = this.game;
    this.clearRivals();
    this.timer = 0;
    const m = MISSIONS[i];
    if (!m) return;
    g.toast(`MISSION ${i + 1}/8 — ${m.title}`, this.briefing(i));
    switch (m.id) {
      case 'homecoming':
        g.setMarker(g.spawns.marina.x, g.spawns.marina.z, 'NADIA');
        this.state = { type: 'reach', x: g.spawns.marina.x, z: g.spawns.marina.z, r: 6 };
        break;
      case 'hotwheels': {
        // Park a sports car near the plaza for the player to take.
        const car = g.spawnParkedCar('sports', 0xe01e2b, 40, 40);
        g.setMarker(40, 40, 'STEAL IT');
        this.state = { type: 'steal', car, delivered: false };
        break;
      }
      case 'ghostheat':
        g.police.addHeat(45);
        g.toast('ALARM TRIPPED', 'The garage alarm is screaming. Lose the cops — get your heat to zero.');
        this.state = { type: 'loseheat' };
        break;
      case 'deadline':
        this.timer = 100;
        g.setMarker(g.spawns.airport.x, g.spawns.airport.z, 'HANGAR');
        this.state = { type: 'timed', x: g.spawns.airport.x, z: g.spawns.airport.z, r: 8 };
        break;
      case 'streetkings': {
        const cps = [[200, 200], [200, -200], [-200, -200], [-200, 200]];
        this.state = { type: 'race', checkpoints: cps, cp: 0, rivals: [] };
        for (let k = 0; k < 2; k++) {
          const mesh = makeCarMesh(k === 0 ? 'coupe' : 'sedan', k === 0 ? 0x1f8a4f : 0x8a2f6b);
          mesh.position.set(30 + k * 6, 0, 230);
          this.scene.add(mesh);
          this.raceRivals.push({ mesh, cp: 0, speed: 0 });
        }
        g.setMarker(200, 200, 'CHECKPOINT 1/4');
        break;
      }
      case 'dockside':
        for (let k = 0; k < 6; k++) {
          const mesh = rivalMesh(this.scene, this.rng);
          mesh.position.set(285 + this.rng.range(-12, 12), 0, 90 + this.rng.range(0, 140));
          this.rivals.push({ mesh, hp: 50, alive: true, shootTimer: 1 + this.rng.next() });
        }
        g.setMarker(289, 150, 'CLEAR THE DOCKS');
        this.state = { type: 'eliminate', total: 6 };
        break;
      case 'aurora':
        g.setMarker(g.spawns.casino.x, g.spawns.casino.z, 'THE AURORA');
        this.state = { type: 'vault', x: g.spawns.casino.x, z: g.spawns.casino.z, r: 8, grabbed: false };
        break;
      case 'king': {
        for (let k = 0; k < 8; k++) {
          const mesh = rivalMesh(this.scene, this.rng);
          mesh.position.set(-60 + this.rng.range(-40, 40), 0, -330 + this.rng.range(-15, 15));
          this.rivals.push({ mesh, hp: 50, alive: true, shootTimer: 1 + this.rng.next() });
        }
        const boss = rivalMesh(this.scene, this.rng);
        boss.scale.setScalar(1.25);
        boss.position.set(-40, 0, -330);
        this.rivals.push({ mesh: boss, hp: 220, alive: true, shootTimer: 1, boss: true });
        g.setMarker(-40, -330, 'DAMON KROSS');
        this.state = { type: 'eliminate', total: 9 };
        break;
      }
      default:
        break;
    }
    g.setMissionText(m.title, this.briefing(i));
  }

  briefing(i) {
    return [
      'Mara Voss is back in Nova Bay after five years. Nadia Reyes is waiting at the marina — go see her.',
      'Nadia needs a fast car. Steal the red sports coupe by the plaza and bring it to the garage on Foundry Row.',
      'The garage alarm went off and the NBPD is coming. Get your wanted level down to zero.',
      'A package has to reach the airport hangar in 100 seconds. Drive like the rent is due.',
      'The Street Kings run tonight. Beat both rivals through all 4 checkpoints.',
      'The Glass Kings hold the docks. Clear all six of them out.',
      'The Aurora casino vault holds $1,500. Grab it — and expect every cop in the city.',
      'Damon Kross, the Glass King, is at the airport. Finish this.',
    ][i];
  }

  clearRivals() {
    for (const r of this.rivals) this.scene.remove(r.mesh);
    this.rivals = [];
    for (const r of this.raceRivals) this.scene.remove(r.mesh);
    this.raceRivals = [];
  }

  complete() {
    const g = this.game;
    const m = this.current;
    g.player.cash += m.reward;
    g.audio.missionDone();
    g.toast('MISSION COMPLETE', `${m.title} — +$${m.reward}`);
    g.clearMarker();
    g.saveGame();
    this.index += 1;
    if (this.index < MISSIONS.length) {
      this.startMission(this.index);
    } else {
      g.onGameComplete();
    }
  }

  fail(reason) {
    const g = this.game;
    g.toast('MISSION FAILED', reason);
    this.startMission(this.index);
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const pos = p.inCar ? p.inCar.mesh.position : p.pos;
    const s = this.state;
    if (!s || this.done) return;
    if (s.type === 'timed') {
      this.timer -= dt;
      g.setTimerText(Math.max(0, Math.ceil(this.timer)));
      if (this.timer <= 0) {
        this.fail('Too slow — the package missed its flight.');
        return;
      }
    }
    switch (s.type) {
      case 'reach':
      case 'timed':
      case 'vault': {
        const d = Math.hypot(pos.x - s.x, pos.z - s.z);
        if (d < s.r) {
          if (s.type === 'vault' && !s.grabbed) {
            s.grabbed = true;
            p.cash += 1500;
            g.police.addHeat(80);
            g.toast('VAULT CRACKED', 'You took the Aurora vault — $1,500! Now lose the cops and reach the safehouse.');
            g.setMarker(g.spawns.safehouse.x, g.spawns.safehouse.z, 'SAFEHOUSE');
            s.x = g.spawns.safehouse.x;
            s.z = g.spawns.safehouse.z;
            s.r = 8;
            g.setMissionText('THE AURORA JOB', 'Vault cracked. Reach the safehouse in Old Town.');
          } else if (s.type !== 'vault') {
            this.complete();
          }
        }
        break;
      }
      case 'steal': {
        if (!s.delivered && p.inCar === s.car) {
          s.delivered = true;
          g.setMarker(g.spawns.garage.x, g.spawns.garage.z, 'GARAGE');
          g.setMissionText('HOT WHEELS', 'Now deliver the coupe to the garage on Foundry Row.');
        }
        if (s.delivered && p.inCar === s.car) {
          const d = Math.hypot(pos.x - g.spawns.garage.x, pos.z - g.spawns.garage.z);
          if (d < 9) this.complete();
        }
        break;
      }
      case 'loseheat': {
        if (g.police.heat <= 0.5) this.complete();
        break;
      }
      case 'race': {
        const cps = s.checkpoints;
        const target = cps[s.cp];
        const d = Math.hypot(pos.x - target[0], pos.z - target[1]);
        if (d < 12) {
          s.cp += 1;
          if (s.cp >= cps.length) {
            // Player must finish ahead of both rivals.
            const rivalsDone = this.raceRivals.filter((r) => r.cp >= cps.length).length;
            if (rivalsDone === 0) this.complete();
            else this.fail('A rival beat you to the line. Run it back.');
            return;
          }
          g.setMarker(cps[s.cp][0], cps[s.cp][1], `CHECKPOINT ${s.cp + 1}/4`);
        }
        // Rival cars follow the checkpoints.
        for (const r of this.raceRivals) {
          if (r.cp >= cps.length) continue;
          const t = cps[r.cp];
          const dx = t[0] - r.mesh.position.x;
          const dz = t[1] - r.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 12) {
            r.cp += 1;
            continue;
          }
          const heading = Math.atan2(dx, dz);
          r.mesh.rotation.y = heading;
          r.speed = Math.min(24, r.speed + 8 * dt);
          r.mesh.position.x += Math.sin(heading) * r.speed * dt;
          r.mesh.position.z += Math.cos(heading) * r.speed * dt;
        }
        break;
      }
      case 'eliminate': {
        // Rivals shoot back.
        for (const r of this.rivals) {
          if (!r.alive) continue;
          const dx = pos.x - r.mesh.position.x;
          const dz = pos.z - r.mesh.position.z;
          const dist = Math.hypot(dx, dz);
          r.mesh.rotation.y = Math.atan2(dx, dz);
          r.shootTimer -= dt;
          if (dist < 30 && r.shootTimer <= 0) {
            r.shootTimer = 1.4 + this.rng.next();
            if (this.rng.next() < 0.4) p.damage(r.boss ? 12 : 7);
          }
        }
        const left = this.rivals.filter((r) => r.alive).length;
        if (left === 0) this.complete();
        break;
      }
      default:
        break;
    }
  }

  // Called by combat when a shot hits a rival.
  hitRival(rival, point) {
    rival.hp -= 34;
    if (rival.hp <= 0 && rival.alive) {
      rival.alive = false;
      rival.mesh.rotation.x = -Math.PI / 2;
      rival.mesh.position.y = 0.4;
      this.game.police.addHeat(10);
      const left = this.rivals.filter((r) => r.alive).length;
      if (this.state && this.state.type === 'eliminate') {
        this.game.toast('RIVAL DOWN', `${left} left.`);
      }
      void point;
    }
  }
}
