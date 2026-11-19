// NOVA BAY — the city itself: ground, roads, districts, landmarks.
// One job: build every static mesh of Nova Bay and hand back colliders,
// spawn points and the animated landmarks.
import * as THREE from 'three';
import { WORLD, DISTRICTS, PALETTE } from './config.js';
import { facadeTexture, roadTexture, groundTexture, neonTexture, waterTexture } from './textures.js';

const ROAD_LINES = [];
for (let i = 0; i < 9; i++) ROAD_LINES.push(-303 + i * 74);
ROAD_LINES.push(-377, 377);

function districtAt(x, z) {
  if (z >= 356) return 'beach';
  for (const [key, d] of Object.entries(DISTRICTS)) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return key;
  }
  return 'oldtown';
}

export function districtNameAt(x, z) {
  const key = districtAt(x, z);
  return DISTRICTS[key] ? DISTRICTS[key].name : 'NOVA BAY';
}

function box(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const lamps = [];
  const animated = { ferris: null, lighthouseBeam: null, trafficLights: [] };
  const spawns = {
    start: { x: -229, z: 340 },
    marina: { x: -200, z: 365 },
    garage: { x: 120, z: 289 },
    docks: { x: 289, z: 150 },
    casino: { x: 250, z: -240 },
    airport: { x: -40, z: -330 },
    safehouse: { x: -303, z: -280 },
    stadium: { x: -280, z: 180 },
  };

  const mats = {
    grass: new THREE.MeshStandardMaterial({ map: groundTexture('#4a7d3a', '#3a6b2f'), roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95 }),
    sidewalk: new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 1 }),
    sand: new THREE.MeshStandardMaterial({ map: groundTexture('#d9c28a', '#b89f66'), roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ map: waterTexture(), roughness: 0.25, metalness: 0.4 }),
    plaza: new THREE.MeshStandardMaterial({ color: 0xb8b0a0, roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.9 }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x2f6b2a, roughness: 1 }),
    palm: new THREE.MeshStandardMaterial({ color: 0x2f8a5a, roughness: 1 }),
  };
  const facadeMats = {};
  function facade(base, lit) {
    const key = base + lit;
    if (!facadeMats[key]) {
      facadeMats[key] = new THREE.MeshStandardMaterial({ map: facadeTexture(base, lit, rng), roughness: 0.85 });
    }
    return facadeMats[key];
  }

  // Ground: grass base, road strips, block pads, beach, sea.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), mats.grass);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 20);
  ground.receiveShadow = true;
  scene.add(ground);
  for (const line of ROAD_LINES) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(14, 780), mats.asphalt);
    v.rotation.x = -Math.PI / 2;
    v.rotation.z = Math.PI / 2;
    v.position.set(0, 0, line);
    v.receiveShadow = true;
    scene.add(v);
    const hz = new THREE.Mesh(new THREE.PlaneGeometry(14, 780), mats.asphalt);
    hz.rotation.x = -Math.PI / 2;
    hz.position.set(line, 0, 0);
    hz.receiveShadow = true;
    scene.add(hz);
  }
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1100, 220), mats.water);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.1, 392 + 110);
  scene.add(sea);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(820, 36), mats.sand);
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.02, 374);
  beach.receiveShadow = true;
  scene.add(beach);

  // Block pads + buildings.
  const special = new Set(['4,4', '5,4', '4,5', '5,5', '2,6', '3,6', '1,7', '2,7', '8,4', '9,4', '8,5', '9,5', '7,1']);
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const bx = -370 + i * 74;
      const bz = -370 + j * 74;
      const cx = bx + 30;
      const cz = bz + 30;
      if (j === 0) continue; // airport row
      if (special.has(`${i},${j}`)) continue;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(62, 62), mats.sidewalk);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(cx, 0.01, cz);
      pad.receiveShadow = true;
      scene.add(pad);
      const d = districtAt(cx, cz);
      const count = d === 'downtown' ? 2 : rng.int(2, 3);
      for (let b = 0; b < count; b++) {
        const w = rng.range(14, 24);
        const dep = rng.range(14, 24);
        const h = d === 'downtown' ? rng.range(38, 88)
          : d === 'oldtown' ? rng.range(10, 22)
          : d === 'industrial' || d === 'harbor' ? rng.range(9, 16)
          : rng.range(12, 30);
        const ox = rng.range(-16, 16);
        const oz = rng.range(-16, 16);
        const base = d === 'downtown' ? rng.pick(['#3a4a6b', '#4a3a5e', '#2f4d5e', '#5e4a3a'])
          : d === 'oldtown' ? rng.pick(['#8a6f5a', '#7a5a4a', '#6b5a6b', '#9a7f5f'])
          : d === 'industrial' ? rng.pick(['#5a5a5e', '#6b5a4a', '#4a5a5a'])
          : rng.pick(['#7a8a9a', '#8a7a5a', '#5a7a6b', '#9a8a7a']);
        const m = box(w, h, dep, facade(base, d === 'downtown' ? 0.5 : 0.25), cx + ox, h / 2, cz + oz);
        scene.add(m);
        const roof = box(w + 1, 0.8, dep + 1, mats.dark, cx + ox, h + 0.4, cz + oz);
        scene.add(roof);
        colliders.push({ x0: cx + ox - w / 2, x1: cx + ox + w / 2, z0: cz + oz - dep / 2, z1: cz + oz + dep / 2 });
      }
    }
  }

  // Central plaza + fountain.
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), mats.plaza);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.02, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);
  const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(9, 11, 1.2, 20), mats.sidewalk);
  fountainBase.position.set(0, 0.6, 0);
  fountainBase.castShadow = true;
  scene.add(fountainBase);
  const fountainWater = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.5, 20), mats.water);
  fountainWater.position.set(0, 1.1, 0);
  scene.add(fountainWater);
  const fountainTop = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2, 3, 10), mats.sidewalk);
  fountainTop.position.set(0, 2.4, 0);
  fountainTop.castShadow = true;
  scene.add(fountainTop);
  colliders.push({ x0: -11, x1: 11, z0: -11, z1: 11 });

  // Park: trees + pond.
  for (let i = 0; i < 26; i++) {
    const x = -260 + rng.range(-55, 55);
    const z = 110 + rng.range(-25, 25);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 6), mats.trunk);
    trunk.position.set(x, 2, z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(rng.range(2.5, 4.5), 8, 6), mats.leaves);
    crown.position.set(x, 5.5, z);
    crown.castShadow = true;
    scene.add(crown);
  }
  const pond = new THREE.Mesh(new THREE.CircleGeometry(14, 20), mats.water);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-235, 0.05, 118);
  scene.add(pond);

  // Stadium.
  const stadium = new THREE.Mesh(new THREE.CylinderGeometry(34, 38, 14, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.8, side: THREE.DoubleSide }));
  stadium.position.set(-280, 7, 180);
  stadium.castShadow = true;
  scene.add(stadium);
  const field = new THREE.Mesh(new THREE.CircleGeometry(30, 24), mats.grass);
  field.rotation.x = -Math.PI / 2;
  field.position.set(-280, 0.1, 180);
  scene.add(field);
  colliders.push({ x0: -318, x1: -242, z0: 142, z1: 218 });
  for (const [fx, fz] of [[-315, 145], [-245, 145], [-315, 215], [-245, 215]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 26, 6), mats.dark);
    pole.position.set(fx, 13, fz);
    scene.add(pole);
    const lampHead = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c8, emissiveIntensity: 1.4 }));
    lampHead.position.set(fx, 26, fz);
    scene.add(lampHead);
  }

  // The Aurora casino (downtown) with neon.
  const casino = box(34, 22, 26, facade('#2a1a3a', 0.6), 250, 11, -260);
  scene.add(casino);
  const casinoRoof = box(36, 1.5, 28, new THREE.MeshStandardMaterial({ color: PALETTE.neonGold, emissive: PALETTE.neonGold, emissiveIntensity: 0.7 }), 250, 22.5, -260);
  scene.add(casinoRoof);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), new THREE.MeshStandardMaterial({ map: neonTexture('AURORA', '#ff2e88', 'CASINO · NOVA BAY'), emissive: 0xffffff, emissiveMap: neonTexture('AURORA', '#ff2e88', 'CASINO · NOVA BAY'), emissiveIntensity: 1.2 }));
  neon.position.set(250, 16, -246.8);
  scene.add(neon);
  colliders.push({ x0: 233, x1: 267, z0: -273, z1: -247 });

  // Docks: warehouses + cranes.
  for (const [wx, wz] of [[320, 80], [320, 160], [340, 240]]) {
    const wh = box(26, 12, 40, facade('#5a5a5e', 0.15), wx, 6, wz);
    scene.add(wh);
    colliders.push({ x0: wx - 13, x1: wx + 13, z0: wz - 20, z1: wz + 20 });
  }
  for (const cx of [300, 350]) {
    const tower = box(3, 42, 3, mats.dark, cx, 21, 60);
    scene.add(tower);
    const jib = box(34, 2, 2, new THREE.MeshStandardMaterial({ color: 0xd8a017 }), cx + 8, 40, 60);
    scene.add(jib);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), mats.dark);
    hook.position.set(cx + 20, 30, 60);
    scene.add(hook);
  }
  // Shipping containers.
  const containerColors = [0x8a2f2f, 0x2f6b4f, 0x2f4d8a, 0xd8a017];
  for (let i = 0; i < 14; i++) {
    const x = 296 + rng.range(0, 60);
    const z = 90 + rng.range(0, 220);
    const c = box(7, 2.6, 2.6, new THREE.MeshStandardMaterial({ color: containerColors[i % 4], roughness: 0.9 }), x, 1.3, z, rng.pick([0, Math.PI / 2]));
    scene.add(c);
  }

  // Airport: runway, hangar, plane.
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(420, 22), mats.asphalt);
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.02, -362);
  scene.add(runway);
  const hangar = box(40, 14, 26, facade('#4a5a6b', 0.2), -140, 7, -330);
  scene.add(hangar);
  colliders.push({ x0: -160, x1: -120, z0: -343, z1: -317 });
  const plane = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 10), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 }));
  fus.rotation.z = Math.PI / 2;
  plane.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0x2f4d8a, roughness: 0.5 }));
  plane.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 0.5), new THREE.MeshStandardMaterial({ color: 0x2f4d8a }));
  tail.position.set(-13, 3, 0);
  plane.add(tail);
  plane.position.set(60, 2.4, -362);
  plane.rotation.y = Math.PI / 2;
  plane.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(plane);

  // Pier + ferris wheel + palms on the beach.
  const pier = box(10, 1, 70, new THREE.MeshStandardMaterial({ color: 0x8a6f4a, roughness: 1 }), -200, 0.5, 400);
  scene.add(pier);
  const wheel = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 0.8, 8, 32), new THREE.MeshStandardMaterial({ color: PALETTE.neonPink, emissive: PALETTE.neonPink, emissiveIntensity: 0.6 }));
  wheel.add(rim);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 32, 6), mats.dark);
    spoke.rotation.z = a;
    wheel.add(spoke);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: [0xff2e88, 0x00e5ff, 0xffb300, 0x7aff5a][i % 4], roughness: 0.6 }));
    cab.position.set(Math.cos(a) * 16, Math.sin(a) * 16, 0);
    wheel.add(cab);
  }
  const support = new THREE.Mesh(new THREE.CylinderGeometry(1, 2, 20, 8), mats.dark);
  support.position.set(0, -8, 0);
  wheel.add(support);
  wheel.position.set(-200, 22, 428);
  scene.add(wheel);
  animated.ferris = wheel;
  for (let i = 0; i < 18; i++) {
    const x = -360 + rng.range(0, 720);
    const z = 362 + rng.range(0, 12);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 7, 6), mats.trunk);
    trunk.position.set(x, 3.5, z);
    trunk.rotation.z = rng.range(-0.15, 0.15);
    scene.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3, 5, 7), mats.palm);
    top.position.set(x, 8.5, z);
    scene.add(top);
  }

  // Lighthouse on a rock in the sea.
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(8, 12, 6, 10), new THREE.MeshStandardMaterial({ color: 0x5a5a5e, roughness: 1 }));
  rock.position.set(280, 1, 440);
  scene.add(rock);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 18, 10), new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.8 }));
  tower.position.set(280, 12, 440);
  tower.castShadow = true;
  scene.add(tower);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 3, 10), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2c8, emissiveIntensity: 2 }));
  lampRoom.position.set(280, 22, 440);
  scene.add(lampRoom);
  const beam = new THREE.SpotLight(0xfff2c8, 0, 120, 0.35, 0.5);
  beam.position.set(280, 22, 440);
  beam.target.position.set(280, 0, 340);
  scene.add(beam);
  scene.add(beam.target);
  animated.lighthouseBeam = beam;

  // Streetlights at intersections (instanced poles + emissive bulbs).
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.25, 7, 6);
  const bulbGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.8 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd88a, emissiveIntensity: 0.4 });
  const lampPositions = [];
  for (const lx of ROAD_LINES) {
    for (const lz of ROAD_LINES) {
      if (Math.abs(lx) > 360 || Math.abs(lz) > 360) continue;
      lampPositions.push([lx + 8, lz + 8]);
    }
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampPositions.length);
  const dummy = new THREE.Object3D();
  lampPositions.forEach(([x, z], i) => {
    dummy.position.set(x, 3.5, z);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 7.1, z);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  });
  poles.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  scene.add(poles);
  scene.add(bulbs);
  lamps.push({ bulbMat });

  // Traffic lights at four central intersections.
  for (const [tx, tz] of [[-37, -37], [37, -37], [-37, 37], [37, 37]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 6), mats.dark);
    pole.position.set(tx + 8, 3, tz + 8);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), mats.dark);
    head.position.set(tx + 8, 6.4, tz + 8);
    scene.add(head);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x00ff44, emissiveIntensity: 2 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), lightMat);
    lamp.position.set(tx + 8, 6.9, tz + 8);
    scene.add(lamp);
    animated.trafficLights.push({ mat: lightMat, state: 1, timer: rng.range(0, 6), x: tx, z: tz });
  }

  // Downtown neon signs on towers.
  const neonSigns = [
    ['NOVA', '#00e5ff', 180, -300],
    ['HOTEL', '#ff2e88', 260, -180],
    ['24H', '#ffb300', 100, -320],
  ];
  for (const [text, color, x, z] of neonSigns) {
    const tex = neonTexture(text, color, null);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.5), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1 }));
    sign.position.set(x, 42, z + 13.2);
    scene.add(sign);
  }

  return { colliders, lamps, animated, spawns, roadLines: ROAD_LINES };
}
