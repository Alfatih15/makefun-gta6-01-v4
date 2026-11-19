// NOVA BAY — screenshot scenes: stage the world for each of the 4
// screenshots (?shot=cover|shootout|race|aerial&seed=1), then tell the
// screenshot driver the frame is ready. One job: make every screenshot
// show several systems at once.
import * as THREE from 'three';
import { makeCarMesh } from './vehicles.js';
import { makePedMesh } from './pedestrians.js';

export function setupShot(game, name) {
  const g = game;
  const hooks = [];
  if (name === 'cover') {
    // Dusk chase down the Downtown avenue, heading west into the sunset:
    // yellow sports car, 3 interceptors flanking and behind, 4 stars.
    g.timeOfDay = 18.2;
    g.giveCar('sports', 0xffd21f, 60, -81, -Math.PI / 2);
    g.player.inCar.speed = 22;
    g.police.addHeat(80);
    g.hud.setMission('GHOST THE HEAT', 'Lose the cops — get your heat to zero.');
    hooks.push(() => {
      const car = g.player.inCar.mesh;
      g.player.health = 100;
      const bx = Math.sin(car.rotation.y);
      const bz = Math.cos(car.rotation.y);
      const rx = Math.cos(car.rotation.y);
      const rz = -Math.sin(car.rotation.y);
      const spots = [[6, 8], [6, -8], [10, 0]]; // [along, lateral]
      g.police.interceptors.forEach((it, i) => {
        const [along, lat] = spots[i % spots.length];
        it.mesh.position.set(car.position.x + bx * along + rx * lat, 0, car.position.z + bz * along + rz * lat);
        it.mesh.rotation.y = car.rotation.y;
        it.speed = 22;
      });
      g.camera.position.set(
        car.position.x - bx * 14 + rx * 3,
        5.5,
        car.position.z - bz * 14 + rz * 3,
      );
      g.camera.lookAt(car.position.x + bx * 12, 2, car.position.z + bz * 12);
    });
  } else if (name === 'shootout') {
    // Night at the docks: Mara on foot, pistol out, Glass Kings ahead.
    g.timeOfDay = 22.0;
    g.player.pos.set(300, 0, 200);
    g.player.yaw = Math.PI;
    g.player.camYaw = Math.PI;
    g.player.armed = true;
    for (let k = 0; k < 4; k++) {
      const mesh = makePedMesh(g.rng);
      mesh.traverse((o) => {
        if (o.isMesh && o.material && o.geometry && o.geometry.type === 'CylinderGeometry') {
          o.material = new THREE.MeshStandardMaterial({ color: 0x7a2fd0, roughness: 0.85 });
        }
      });
      mesh.position.set(288 + k * 8, 0, 190 - (k % 2) * 4);
      mesh.rotation.y = 0;
      g.scene.add(mesh);
      g.shotExtras.push(mesh);
    }
    // One rival down on the ground.
    const down = makePedMesh(g.rng);
    down.rotation.x = -Math.PI / 2;
    down.position.set(297, 0.4, 194);
    g.scene.add(down);
    g.shotExtras.push(down);
    // A tracer frozen mid-flight (bright cylinder, reads at night).
    const tracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 12, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd21f }),
    );
    tracer.rotation.x = Math.PI / 2 - 0.12;
    tracer.position.set(300, 1.5, 192);
    g.scene.add(tracer);
    g.shotExtras.push(tracer);
    g.police.addHeat(40);
    g.hud.setMission('DOCKSIDE SHOOTOUT', 'Clear the Glass Kings from the docks.');
    hooks.push(() => {
      g.player.health = 100;
      // Shot mode never runs player.update, so sync the mesh by hand.
      g.player.mesh.position.copy(g.player.pos);
      g.player.mesh.rotation.y = g.player.yaw;
      g.player.mesh.visible = true;
      if (g.player.mesh.userData.gun) g.player.mesh.userData.gun.visible = true;
      // Keep the chasing interceptors out of the frame for this shot.
      g.police.interceptors.forEach((it) => { it.mesh.visible = false; });
      g.camera.position.set(300, 4.0, 218);
      g.camera.lookAt(300, 1.0, 188);
    });
  } else if (name === 'race') {
    // Midday Street Kings race on the Foundry Row avenue: checkpoint 2,
    // both rivals flanking the player down the road.
    g.timeOfDay = 11.0;
    g.giveCar('sports', 0xe01e2b, 150, 141, Math.PI / 2);
    g.player.inCar.speed = 20;
    const r1 = makeCarMesh('coupe', 0x1f8a4f);
    r1.position.set(158, 0, 135);
    r1.rotation.y = Math.PI / 2;
    g.scene.add(r1);
    g.shotExtras.push(r1);
    const r2 = makeCarMesh('sedan', 0x8a2f6b);
    r2.position.set(158, 0, 147);
    r2.rotation.y = Math.PI / 2;
    g.scene.add(r2);
    g.shotExtras.push(r2);
    g.setMarker(200, 141, 'CHECKPOINT 2/4');
    g.hud.setMission('STREET KINGS', 'Checkpoint 2/4 — beat both rivals to the line.');
    hooks.push(() => {
      const car = g.player.inCar.mesh;
      g.camera.position.set(car.position.x - 14, 6.5, car.position.z - 8);
      g.camera.lookAt(185, 2, 141);
    });
  } else if (name === 'aerial') {
    // Sunset over the whole city: stadium, plaza, beach, lighthouse.
    // The default fog (far 700) swallows a high camera, so push it out.
    g.timeOfDay = 17.6;
    g.scene.fog.near = 200;
    g.scene.fog.far = 1600;
    hooks.push(() => {
      g.camera.position.set(-40, 300, 330);
      g.camera.lookAt(0, 0, -40);
    });
  }
  return hooks;
}
