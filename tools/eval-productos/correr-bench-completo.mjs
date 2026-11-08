#!/usr/bin/env node
// Runner del benchmark COMPLETO del cara a cara (plan F8-T9): mide mem0 y Zep sobre las 10 conversaciones de LoCoMo (las
// 1986 preguntas), igual que motor y embedding, y saca la tabla final a 4. Lo ejecuta el USUARIO; tarda ~20 h (Zep es lento).
// REANUDABLE: si se corta (o lo paras con Ctrl+C), relánzalo y sigue donde iba. 100 % local, 0 EUR.
// IMPORTANTE: deja el equipo ENCHUFADO y SIN SUSPENDER mientras dura (si no, el sistema puede matar el proceso).
//   node tools/eval-productos/correr-bench-completo.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PYM = path.join(HERE, 'mem0', '.venv', 'Scripts', 'python.exe');
const PYZ = path.join(HERE, 'zep', '.venv', 'Scripts', 'python.exe');
const R_MEM0 = path.join(HERE, 'resultados-e2e-locomo-mem0-full.json');
const R_ZEP = path.join(HERE, 'resultados-e2e-locomo-zep-full.json');
const R_MOTOR = path.join(HERE, 'resultados-e2e-locomo-motor-llm.json');
const R_EMB = path.join(HERE, 'resultados-e2e-locomo-embedding-llm.json');

function run(titulo, cmd, args, opts = {}) {
    console.log(`\n========== ${titulo} ==========`);
    console.log('> ' + cmd + ' ' + args.join(' '));
    const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
    if (r.error) { console.error('ERROR al lanzar: ' + r.error.message); process.exit(1); }
    if (r.status !== 0) { console.error(`FALLO (exit ${r.status}) en: ${titulo}`); process.exit(r.status || 1); }
}

console.log('== Benchmark COMPLETO (10 convs): motor vs embedding vs mem0 vs zep ==');
console.log('Reanudable. Deja el equipo ENCHUFADO y SIN SUSPENDER (~20 h). 0 EUR.\n');

// 1) Neo4j arriba (idempotente) + espera a que responda el puerto bolt
run('Arrancar Neo4j (Docker)', 'docker', ['start', 'neo4j-graphiti']);
run('Esperar a Neo4j', PYZ, ['-c',
    "import socket,time,sys\n" +
    "for _ in range(40):\n" +
    "    try:\n" +
    "        socket.create_connection(('localhost',7687),2).close(); print('neo4j listo'); sys.exit(0)\n" +
    "    except Exception: time.sleep(2)\n" +
    "print('neo4j NO responde'); sys.exit(1)"]);

// 2) mem0 COMPLETO (coleccion propia 'locomo_full' + json propio; reanuda solo)
run('mem0 completo (10 convs)', PYM,
    [path.join(HERE, 'mem0', 'mem0_locomo.py'), '--topk', '10', '--coleccion', 'locomo_full', '--salida', R_MEM0],
    { cwd: path.join(HERE, 'mem0') });

// 3) Zep COMPLETO. En el PRIMER arranque (sin json) se limpia Neo4j para empezar fresco; al reanudar NO se limpia.
if (!fs.existsSync(R_ZEP)) {
    run('Limpiar Neo4j (primer arranque de Zep)', PYZ, ['-c',
        "from neo4j import GraphDatabase\n" +
        "d=GraphDatabase.driver('bolt://localhost:7687',auth=('neo4j','graphiti123'))\n" +
        "s=d.session(); s.run('MATCH (n) DETACH DELETE n'); s.close(); d.close(); print('neo4j limpio')"]);
}
run('Zep/Graphiti completo (10 convs)', PYZ,
    [path.join(HERE, 'zep', 'zep_locomo.py'), '--topk', '10', '--salida', R_ZEP],
    { cwd: path.join(HERE, 'zep') });

// 4) Tabla final a 4 sobre las preguntas comunes (seran las 1986 al terminar)
run('Tabla final (motor vs embedding vs mem0 vs zep)', 'node',
    [path.join(HERE, 'comparar.mjs'), R_MOTOR, R_EMB, R_MEM0, R_ZEP]);

console.log('\n== LISTO. Avisa a Claude: "mira el benchmark completo". ==');
