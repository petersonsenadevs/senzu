#!/usr/bin/env node
// Guard de deriva del carve-out (F10-T4): Senzu consume el cerebro desde el repo canónico Hemispheric. Si las
// copias de Senzu y los originales de Hemispheric divergen, ROMPE el build (hay que correr tools/sync-hemispheric.mjs
// o editar en Hemispheric, no en Senzu). Si Hemispheric no está presente, pasa (Senzu usa su copia vendorizada).
//   node tools/test-sync-hemispheric.mjs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'sync-hemispheric.mjs'), '--check'], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
if (r.stderr) process.stdout.write(r.stderr);
const fallos = r.status === 0 ? 0 : 1;
process.stdout.write(`Casos: 1  Fallos: ${fallos}\n`);
process.exit(fallos);
