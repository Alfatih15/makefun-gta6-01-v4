// NOVA BAY — the gta6-01 entrypoint (Node 22, standard library only).
//
// What it does: the playable game lives in game/ next to this file — plain
// static files (index.html, ES modules, three.js vendored under game/vendor/)
// that any static server can host offline. This program hands the entry in
// by copying game/ and screenshots/ into /output and writing
// /output/dossier.json with the vendored make.fun library, which is the
// summary the judge reads (screenshots first, then the source outline).
//
// Run it locally the same way the grader runs it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the result with `node serve.ts` and open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });

const shotsDir = join(outDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
const localShots = join(root, 'screenshots');
if (existsSync(localShots)) cpSync(localShots, shotsDir, { recursive: true });

// Caps from the competition's gate (reference/gate.json): the dossier text
// is capped at 160 KiB; the rest refuse anything the scorer would refuse
// (more than 4 screenshots, one over 256 KiB, game/ over 993 files or
// 48 MiB, a path over 1000 bytes), so a local pass means the gate's
// file checks pass too.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
