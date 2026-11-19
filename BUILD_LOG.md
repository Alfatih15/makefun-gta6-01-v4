# NOVA BAY — build log

## What it is

A new open-world crime game for gta6-01 v3, built to beat v2 "VELORA HEAT".
Mara Voss returns to Nova Bay after five years away. Nadia Reyes, the fixer
who runs the marina, has work. The Glass Kings, led by Damon Kross, hold the
docks, the casino and the airport — take it all back across 8 missions.

## The city

10×10 blocks (Downtown, Old Town, The Docks, Foundry Row, University,
Marina, South Beach) plus an airport runway at the north edge, a pier with a
rotating ferris wheel, a lighthouse with a sweeping beam, a stadium, a park
with a pond, and the Aurora casino with neon. Sea and beach close the map
to the south.

## Systems

- 24 traffic cars on the grid with traffic lights; 44 pedestrians who flee gunfire
- 12 parked stealable cars (sedan, coupe, sports, taxi, van, truck)
- Wanted 0–5 stars: foot cops (chase + shoot + bust), interceptors from
  2 stars, police helicopter with searchlight from 4 stars
- 8 missions: Homecoming, Hot Wheels, Ghost the Heat, Deadline Delivery,
  Street Kings race, Dockside Shootout, The Aurora Job, King of Nova Bay
- Pistol combat with tracers and muzzle flash; health/ammo pickups
- Taxi fares and 10 hidden cash stashes
- HUD with cash, stars, heat bar, clock, district, health, ammo, speed and
  a live circular minimap
- Day/dusk/night cycle, streetlights, rotating ferris wheel, lighthouse
  beam, occasional rain, synthesized WebAudio SFX and music
- Save to localStorage after every mission; title / pause / busted /
  complete menus

## Files

- `game/index.html` — page, import map, HUD DOM
- `game/src/` — 16 modules, one job each (config, random, input, audio,
  textures, city, vehicles, pedestrians, player, police, combat, missions,
  hud, save, shots, main)
- `game/vendor/three.module.min.js` — three.js r160, vendored
- `main.ts` — entrypoint: copies game/ + screenshots/, writes dossier.json

## Verification

- `node --check` on every module: pass
- `MAKEFUN_OUTPUT_DIR=out node main.ts`: writes a valid dossier.json
  (650,611 bytes; 4 JPEG images with sha256; source-outline text 104,466
  bytes, under the 163,840 cap; 17 source files + vendored three r160)
- Kit check `--worktree`: **4 passed, 0 failed, 16 skipped** (2026-11-19
  ~10:10 WIB). The 5 "at submission" items (repo_public, repo_owner,
  repo_created_after_open, commit_in_repo, duplicate_snapshot) are the
  site's to run on the pushed commit.
- Play-test in headless Chrome 140 (SwiftShader): title → walk → steal car
  → drive → mission → combat → pause, zero console errors, zero failed
  network requests
- Screenshots: 4 real renders at 1280×800, eyeballed

## Bugs found and fixed

- MissionManager was created before game.setMarker existed (TypeError at
  boot) — moved its creation after the game helpers.
- Title menu heading had no id, so hud.showMenu threw "Cannot set
  properties of null" at boot — added id="menu-title" to the h1.
- Shot mode (?shot=) staged the scene but never hid the title menu and the
  mission toast stayed up at shot time — shot setup now calls
  hud.hideMenu() and clears the toast + toastTimer.
- Road strips were built with swapped positions: the two 14-wide asphalt
  planes both landed on the central cross (x≈0 / z≈0), so every road
  outside the centre was grass. Swapped the strip positions so each
  ROAD_LINE gets a real north-south and east-west asphalt strip.
- Shootout shot: the staged player mesh never synced (shot mode never runs
  player.update), so Mara was standing at the marina spawn, off-frame —
  the hook now copies player.pos/yaw to the mesh and shows the gun.
- Shootout shot: Mara's jacket and the Glass Kings rivals shared the same
  red (0x8a1f2d) — rivals are now purple (0x7a2fd0); interceptors are
  hidden for that shot so they don't swarm the frame.
- Race shot: the player car sat under the minimap — rivals now stage ahead
  of the player and the camera sits further back.
- Aerial shot: the default fog (far 700) swallowed the high camera — the
  aerial hook pushes fog to far 1600 and lowers the camera to y=300.
- P did not resume from pause: update() only runs while playing, so the
  pause key could never be seen while paused. Pause is now an edge
  (game._pauseEdge, computed in frame()): P/Esc pauses on a fresh press
  and resumes on a fresh press.
- Menu clicks leaked into a shot: the START/RESUME/RETRY click set
  input.clicked, and the first update() after starting fired the pistol
  (mag 12→11 before the first real shot). Menu handlers now consume the
  click.
- Play-test round 3 (2026-11-19 ~10:30 WIB, 11/11 pass, zero console
  errors, zero failed requests): boot, title, start, mission 1 completes
  (idx 0→1, +$150, $200→$350), steal car (heat 22), drive 30 km/h with
  3.7u displacement, shoot mag 12→9, pause P→paused, resume P→playing.
- Cover shot: the car staged inside a city block (150,-180 is not a road)
  — restaged on the Downtown avenue (60,-81) heading west into the dusk,
  with interceptors flanking and one blocking ahead.

## Notes

- 2026-11-19 ~09:55 WIB the VM/service restarted mid-shoot: /tmp was
  wiped (all 4 screenshot PNGs lost, re-taken), the static server and
  headless Chrome died (restarted), and the live recording process died
  too. The recorder was resumed with the same command and picked up the
  same recording id 01a1f31a-a245-757b-827f-8911b9c3c8ab (pid 2057);
  workspace files were untouched.
