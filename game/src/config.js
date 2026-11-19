// NOVA BAY — shared tuning and world constants.
// One job: every number the rest of the game agrees on lives here.
export const WORLD = {
  blocks: 10, // 10x10 city blocks
  block: 60, // block edge in metres
  road: 14, // road width
  pitch: 74, // block + road
  half: 370, // half the city span
  seaZ: 392, // sea starts here (south edge)
  beachZ: 378, // beach strip starts here
  airportZ: -352, // runway band (north edge)
};

export const DISTRICTS = {
  downtown: { x0: 0, z0: -352, x1: 370, z1: -30, name: 'DOWNTOWN' },
  oldtown: { x0: -370, z0: -352, x1: 0, z1: -30, name: 'OLD TOWN' },
  harbor: { x0: 250, z0: -30, x1: 370, z1: 330, name: 'THE DOCKS' },
  industrial: { x0: 0, z0: -30, x1: 250, z1: 330, name: 'FOUNDRY ROW' },
  university: { x0: -370, z0: -30, x1: 0, z1: 330, name: 'UNIVERSITY' },
  marina: { x0: -370, z0: 330, x1: 0, z1: 378, name: 'MARINA' },
  beach: { x0: 0, z0: 330, x1: 370, z1: 378, name: 'SOUTH BEACH' },
};

export const PALETTE = {
  skyDay: 0x87b5e0,
  skyDusk: 0xff9a5c,
  skyNight: 0x0b1026,
  sunDay: 0xfff2d8,
  sunDusk: 0xffb36b,
  moon: 0x8fa8ff,
  asphalt: 0x2a2d34,
  sidewalk: 0x8d8f96,
  grass: 0x4a7d3a,
  sand: 0xd9c28a,
  water: 0x1a5f8a,
  neonPink: 0xff2e88,
  neonCyan: 0x00e5ff,
  neonGold: 0xffb300,
};

export const PLAYER = {
  walkSpeed: 6.5,
  sprintSpeed: 11,
  radius: 0.7,
  maxHealth: 100,
  magSize: 12,
  startCash: 200,
  startAmmo: 48,
};

export const CAR = {
  // type: [topSpeed m/s, accel, steer, color set]
  sedan: { top: 26, accel: 14, steer: 1.9, colors: [0x8a2f2f, 0x2f4d8a, 0x6b6f75, 0x3a6b4f] },
  coupe: { top: 30, accel: 17, steer: 2.2, colors: [0xd8a017, 0x7a1f1f, 0x1f2a3a] },
  sports: { top: 38, accel: 22, steer: 2.5, colors: [0xe01e2b, 0xffd21f, 0x111318] },
  taxi: { top: 26, accel: 14, steer: 1.9, colors: [0xf5c518] },
  van: { top: 22, accel: 11, steer: 1.6, colors: [0xd8d8d8, 0x4a6b8a] },
  truck: { top: 20, accel: 9, steer: 1.3, colors: [0x5a4632, 0x37424e] },
  police: { top: 34, accel: 20, steer: 2.4, colors: [0x14161c] },
};

export const WANTED = {
  heatPerStar: 20,
  decayPerSec: 2.5,
  decayDelay: 5,
  stealCar: 22,
  killPed: 25,
  shoot: 6,
  killCop: 30,
  maxHeat: 100,
};

export const MISSIONS = [
  { id: 'homecoming', title: 'HOMECOMING', reward: 150 },
  { id: 'hotwheels', title: 'HOT WHEELS', reward: 250 },
  { id: 'ghostheat', title: 'GHOST THE HEAT', reward: 300 },
  { id: 'deadline', title: 'DEADLINE DELIVERY', reward: 400 },
  { id: 'streetkings', title: 'STREET KINGS', reward: 600 },
  { id: 'dockside', title: 'DOCKSIDE SHOOTOUT', reward: 800 },
  { id: 'aurora', title: 'THE AURORA JOB', reward: 1500 },
  { id: 'king', title: 'KING OF NOVA BAY', reward: 2500 },
];

export const STASH_SPOTS = [
  [300, 300], [-320, -300], [120, -320], [-180, 180], [340, 60],
  [-340, 320], [60, 120], [-60, -180], [200, -120], [-260, 40],
];
