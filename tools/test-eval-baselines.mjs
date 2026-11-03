#!/usr/bin/env node
// Batería ADVERSARIA del benchmark (plan F8-T4): casos rebuscados aplicados a CADA motor, para que lo aguante un
// escéptico. Reproducible con un comando; NINGUNA cifra tocada a mano: las aserciones son relativas (el motor ≥ un
// baseline), booleanas (encuentra la aguja / se abstiene / da lo mismo dos veces) o de presupuesto (tiempo).
//   node tools/test-eval-baselines.mjs
// Casos: envenenado (casi-duplicados + distractores), homónimos, idioma cruzado, erratas, sin-respuesta (abstención),
// empates (determinismo) y escala a 10 000 hechos. La batería curada está en tools/eval-hechos/adversario.json.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crearBaseline } from './eval-hechos/baselines.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const m = await import(pathToFileURL(path.join(ROOT, 'core', 'hooks', 'hechos.mjs')).href);
const { crearBaselineEmbedding } = await import(pathToFileURL(path.join(ROOT, 'tools', 'eval-hechos', 'embedding.mjs')).href);
const UMBRAL = m.UMBRAL_RECUERDO;
const T0 = Date.UTC(2026, 0, 1, 9, 0, 0);
let casos = 0, fallos = 0;
const ok = (c, n, d = '') => { casos++; if (!c) { fallos++; process.stdout.write(`FAIL ${n}${d ? ' -> ' + d : ''}\n`); } else process.stdout.write(`ok   ${n}\n`); };

// Corre un motor sobre unos hechos y preguntas; devuelve got por pregunta (ids del corpus). Mismo montaje para todos.
async function correr(motor, hechos, preguntas) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-adv-'));
    let idx = null, P = null, ids = null;
    if (motor === 'embedding') idx = await crearBaselineEmbedding(hechos);
    else if (motor !== 'motor') idx = crearBaseline(motor, hechos, { palabras: m.palabras, palabraConPeso: m.palabraConPeso });
    else {
        P = path.join(base, 'proy');
        fs.mkdirSync(path.join(P, 'senzu'), { recursive: true });
        fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
        process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'u', 'memoria.md');
        ids = new Map();
        for (const h of [...hechos].sort((a, b) => a.t - b.t)) ids.set(m.guardarHecho(P, { dimension: h.dimension, valor: h.valor, claves: h.claves }, { ahora: new Date(T0 + h.t * 1000).toISOString() }).hecho.id, h.id);
    }
    const res = [];
    for (const q of preguntas) {
        let got;
        if (idx) got = (await idx.buscar(q.q, { limite: 3 })).map(x => x.id);
        else got = m.buscarHechos(P, q.q, { historico: false, limite: 3 }).filter(x => x.puntuacion >= UMBRAL).map(x => ids.get(x.hecho.id));
        res.push({ ...q, got, r1: q.espera != null ? got[0] === q.espera : null, r3: q.espera != null ? got.includes(q.espera) : null, calla: q.espera == null ? got.length === 0 : null });
    }
    fs.rmSync(base, { recursive: true, force: true });
    return res;
}
const recall3 = res => { const con = res.filter(r => r.espera != null); return con.length ? con.filter(r => r.r3).length / con.length : 0; };
const porCat = (res, cat) => res.filter(r => r.cat === cat);

// === batería curada (adversario.json) sobre los 4 motores ===
const adv = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'eval-hechos', 'adversario.json'), 'utf8'));
const R = {};
for (const motor of ['motor', 'bm25', 'grep', 'embedding']) R[motor] = await correr(motor, adv.hechos, adv.preguntas);

// 1. Envenenado (casi-duplicados): el motor encuentra la aguja y no lo hace peor que el léxico
ok(porCat(R.motor, 'envenenado').every(r => r.r3), 'envenenado: el motor saca la aguja entre casi-duplicados', JSON.stringify(porCat(R.motor, 'envenenado').map(r => [r.espera, r.got])));
ok(recall3(porCat(R.motor, 'envenenado')) >= recall3(porCat(R.bm25, 'envenenado')), 'envenenado: motor recall@3 ≥ bm25');
// 2. Homónimos (misma palabra «banco», distinto sentido): desambigua por contexto
ok(porCat(R.motor, 'homonimo').every(r => r.r3), 'homónimos: desambigua banco mueble vs banco entidad', JSON.stringify(porCat(R.motor, 'homonimo').map(r => [r.espera, r.got])));
// 3. Idioma cruzado (hecho en es, pregunta en en): el motor no lo hace peor que grep
ok(porCat(R.motor, 'cruzado').every(r => r.r3), 'cruzado: encuentra el hecho en es preguntando en en');
ok(recall3(porCat(R.motor, 'cruzado')) >= recall3(porCat(R.grep, 'cruzado')), 'cruzado: motor recall@3 ≥ grep');
// 4. Erratas: aguanta los typos al menos tan bien como grep
ok(recall3(porCat(R.motor, 'errata')) >= recall3(porCat(R.grep, 'errata')), 'errata: motor recall@3 ≥ grep', `${recall3(porCat(R.motor, 'errata'))} vs ${recall3(porCat(R.grep, 'errata'))}`);
// 5. Sin respuesta (abstención): el motor calla en TODAS; dato honesto de cada motor
for (const motor of ['motor', 'bm25', 'grep', 'embedding']) {
    const sin = R[motor].filter(r => r.espera == null);
    process.stdout.write(`     abstención ${motor}: ${sin.filter(r => r.calla).length}/${sin.length}\n`);
}
ok(R.motor.filter(r => r.espera == null).every(r => r.calla), 'sin-respuesta: el motor se abstiene en TODAS (no inventa)');

// 6. Empates: dos hechos equivalentes para la misma consulta → respuesta DETERMINISTA (igual dos veces)
const emp = {
    hechos: [
        { id: 'sa', dimension: 'proyecto.servidor-alfa', valor: 'el servidor web alfa corre en Frankfurt', claves: ['servidor', 'server', 'web', 'frankfurt'], t: 1 },
        { id: 'sb', dimension: 'proyecto.servidor-beta', valor: 'el servidor web beta corre en Frankfurt', claves: ['servidor', 'server', 'web', 'frankfurt'], t: 2 },
    ],
    preguntas: [{ q: '¿dónde corre el servidor web?', lang: 'es', espera: null, cat: 'empate' }],
};
const e1 = await correr('motor', emp.hechos, emp.preguntas);
const e2 = await correr('motor', emp.hechos, emp.preguntas);
ok(JSON.stringify(e1[0].got) === JSON.stringify(e2[0].got) && e1[0].got.length > 0, 'empate: ante dos hechos equivalentes el motor da el MISMO orden dos veces (determinista)', JSON.stringify([e1[0].got, e2[0].got]));

// 7. Escala: 10 000 hechos de ruido + 1 aguja. La encuentra, y la consulta es rápida (presupuesto, no cifra afinada).
// Carga MASIVA (escribir el JSONL directo, como test-hechos-robustez): guardarHecho reescribe el archivo entero en
// cada llamada, así que 10k inserciones una a una serían O(n²); el almacén es un JSONL y se puede sembrar de golpe.
const N = 10000;
const temas = ['suministro', 'mantenimiento', 'facturación', 'logística', 'soporte'];
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'senzu-10k-'));
const P = path.join(base, 'proy');
fs.mkdirSync(path.join(P, 'senzu', 'memoria'), { recursive: true });
fs.writeFileSync(path.join(P, 'senzu', 'senzu.json'), '{}');
process.env.SENZU_MEMORIA_USUARIO = path.join(base, 'u', 'memoria.md');
const lineas = Array.from({ length: N }, (_, i) => JSON.stringify({ id: 'g-' + String(i).padStart(8, '0'), dimension: `nota.${temas[i % 5]}-${i}`,
    valor: `nota de ${temas[i % 5]} número ${i} del equipo ${i % 37}`, claves: [temas[i % 5], 'nota', `equipo${i % 37}`], estado: 'activo', alcance: 'proyecto', creado: new Date(T0 + i * 1000).toISOString() }));
fs.writeFileSync(path.join(P, 'senzu', 'memoria', 'hechos.jsonl'), lineas.join('\n') + '\n');
m.guardarHecho(P, { dimension: 'proyecto.clave-despliegue', valor: 'la frase de despliegue del proyecto es zafiro cuarenta y dos', claves: ['frase', 'despliegue', 'passphrase', 'zafiro'] });
const tq = performance.now();
const hits = m.buscarHechos(P, '¿cuál es la frase de despliegue del proyecto?', { historico: false, limite: 3 }).filter(x => x.puntuacion >= UMBRAL);
const msQ = performance.now() - tq;
fs.rmSync(base, { recursive: true, force: true });
process.stdout.write(`     10k: ${N} hechos sembrados (masivo), consulta ${msQ.toFixed(1)} ms\n`);
ok(hits.some(x => /zafiro/.test(x.hecho?.valor || '')), 'escala 10k: encuentra la aguja entre 10 000 hechos de ruido');
ok(msQ < 1000, 'escala 10k: la consulta tarda < 1 s (presupuesto)', `${msQ.toFixed(1)} ms`);

process.stdout.write(`\nCasos: ${casos}  Fallos: ${fallos}\n`);
process.exit(fallos ? 1 : 0);
