# makefun-gta6-01-v4

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Alfatih15/makefun-gta6-01-v4/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Alfatih15/makefun-gta6-01-v4/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

NOVA BAY: an open-world crime story in a sun-soaked coastal city you can explore on foot and by car.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Or serve the game directly:

```sh
node serve.ts
```

Then open http://localhost:8080.

---

<sub>Entered on [make.fun](https://make.fun/?ref=hjff56h1&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

An original open-world crime game for the make.fun **gta6-01** bounty. Mara Voss
came home to Nova Bay after five years away — broke, fast, and already on the
NBPD's list. Nadia Reyes, the fixer who runs the marina, has work for anyone
fast enough to take it. Steal the coupe, outrun the Nova Bay PD, win the
Street Kings race, clear the docks of the Glass Kings, crack the Aurora casino
vault, and take down Damon Kross, the Glass King himself, at the airport.

## How to play

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move on foot / drive |
| Mouse | Look around (click to lock) |
| Click | Shoot (pistol) |
| E | Enter / exit car |
| R | Reload |
| Shift | Sprint |
| P / Esc | Pause |
| M | Mute |

## The city

Nova Bay is a 10×10-block coastal city: Downtown glass towers with neon,
Old Town brick streets, the Docks with cranes and warehouses, Foundry Row,
University with its stadium, the Marina, South Beach with its pier and ferris
wheel, and an airport with a runway at the north edge. The sea, the beach and
a lighthouse close the map to the south.

## Systems

- **Traffic & pedestrians** — 24 traffic cars driving the grid with traffic
  lights, 44 pedestrians who walk the sidewalks and flee gunfire
- **Stealable cars** — 12 parked cars plus traffic: sedans, coupes, sports
  cars, taxis, vans and trucks, each with its own speed and handling
- **Wanted level** — 0–5 stars: foot cops chase and shoot, interceptors ram
  from 2 stars, a police helicopter with a searchlight hunts you from 4
- **8 missions** — Homecoming, Hot Wheels, Ghost the Heat, Deadline Delivery,
  Street Kings (checkpoint race), Dockside Shootout, The Aurora Job (vault
  heist) and the finale, King of Nova Bay
- **Combat** — pistol with tracers, muzzle flash, reloads, health and ammo
  pickups
- **Side activities** — taxi fares and 10 hidden cash stashes
- **HUD** — cash, wanted stars, heat bar, clock, district name, health,
  ammo, speedometer and a live circular minimap
- **World** — day/dusk/night cycle with streetlights, a rotating ferris
  wheel, a sweeping lighthouse beam, occasional rain, synthesized WebAudio
  sound effects and music
- **Save** — progress saves automatically after every mission (localStorage)
