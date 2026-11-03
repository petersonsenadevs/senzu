#!/usr/bin/env node
// Runner del benchmark de MEMORIA sobre LongMemEval (X-T22): mide motor vs embedding vs mem0 en los dos tipos que de
// verdad ejercitan la actualización y el tiempo — knowledge-update + temporal-reasoning (211 preguntas). A diferencia
// de LoCoMo (turno-a-turno), aquí el MOTOR usa su ingesta ESTRUCTURADA (hechos a dimensiones estables que se actualizan
// → sustituye/data: X-18/X-20); el embedding reusa la MISMA extracción (caché) pero la embebe plana; mem0 usa su propia
// memoria (su forma natural). Mismo contestador y mismo juez (Qwen3 local), 0 EUR. Lo ejecuta el USUARIO.
// REANUDABLE: si se corta (Ctrl+C, suspensión), relánzalo y sigue. Deja el equipo ENCHUFADO y SIN SUSPENDER.
// AVISO: la extracción es el cuello (~10 min/haystack). Motor ~horas (construye la caché); embedding luego casi gratis;
// mem0 hace su PROPIA extracción → otras muchas horas. Es un run de varios días por tandas.
//   node tools/eval-productos/correr-bench-longmemeval.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PYM = path.join(HERE, 'mem0', '.venv', 'Scripts', 'python.exe');
const TIPOS = 'knowledge-update,temporal-reasoning';
const LIMITE = String(Number(process.argv[2]) || 0);   // tanda: node correr-bench-longmemeval.mjs 30  → solo 30 preguntas
const lim = LIMITE !== '0' ? ['--limite', LIMITE] : [];
const SUBSET = path.join(HERE, '..', '.datos', 'longmemeval-subset-mem0.json');
const R_MOTOR = path.join(HERE, 'resultados-e2e-longmemeval-motor-estructurada.json');
const R_EMB = path.join(HERE, 'resultados-e2e-longmemeval-embedding-estructurada.json');
const R_MEM0 = path.join(HERE, 'resultados-e2e-longmemeval-mem0.json');

function run(titulo, cmd, args, opts = {}) {
    console.log(`\n========== ${titulo} ==========`);
    console.log('> ' + cmd + ' ' + args.join(' '));
    const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
    if (r.error) { console.error('ERROR al lanzar: ' + r.error.message); process.exit(1); }
    if (r.status !== 0) { console.error(`FALLO (exit ${r.status}) en: ${titulo}`); process.exit(r.status || 1); }
}

console.log('== Benchmark de MEMORIA · LongMemEval (knowledge-update + temporal-reasoning, 211 preg.) ==');
console.log('motor (ingesta estructurada) vs embedding vs mem0. Reanudable. Enchufado y SIN SUSPENDER. 0 EUR.\n');

// 0) subset compacto para mem0 (si falta): lo exporta Node desde el fichero grande
if (!fs.existsSync(SUBSET)) {
    run('Exportar subset para mem0', 'node', [path.join(HERE, 'loader.mjs'), '--exportar-mem0', '--tipos', TIPOS]);
}

// 1) MOTOR con ingesta estructurada (construye la caché de extracción que el embedding reutiliza)
run('Motor · ingesta estructurada', 'node',
    [path.join(HERE, 'pipeline.mjs'), '--longmemeval', '--ingesta', 'estructurada', '--retriever', 'motor',
        '--tipos', TIPOS, '--topk', '10', '--tope-gasto', '999', ...lim]);

// 2) EMBEDDING con la MISMA extracción (caché ya hecha): casi gratis en tiempo
run('Embedding · misma extracción (plana)', 'node',
    [path.join(HERE, 'pipeline.mjs'), '--longmemeval', '--ingesta', 'estructurada', '--retriever', 'embedding',
        '--tipos', TIPOS, '--topk', '10', '--tope-gasto', '999', ...lim]);

// 3) mem0 con su propia memoria (su ingesta natural); colección y json propios; reanuda solo
run('mem0 · su propia memoria', PYM,
    [path.join(HERE, 'mem0', 'mem0_longmemeval.py'), '--topk', '10', '--coleccion', 'longmemeval_full', '--salida', R_MEM0, ...lim],
    { cwd: path.join(HERE, 'mem0') });

// 4) tabla final sobre las preguntas comunes (por tipo: knowledge-update y temporal-reasoning)
run('Tabla final (motor vs embedding vs mem0)', 'node',
    [path.join(HERE, 'comparar.mjs'), R_MOTOR, R_EMB, R_MEM0]);

console.log('\n== LISTO. Avisa a Claude: "mira el benchmark de LongMemEval". ==');
