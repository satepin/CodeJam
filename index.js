#!/usr/bin/env node
// QuickDrop — generador de planes de reparto.
// Uso: node index.js <carpeta_dataset> [plan.json|plan.csv] [--segundos 20] [--semilla 1] [--reinicios 1] [--formato auto|json|csv]
import { cargarDataset } from "./src/cargar.js";
import { resolver, aPlan } from "./src/solver.js";
import { escribirPlan } from "./src/escribir.js";

function args(argv) {
  const pos = [], op = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) op[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { pos, op };
}

const { pos, op } = args(process.argv.slice(2));
if (pos.length < 1) {
  console.error("Uso: node index.js <carpeta_dataset> [plan.json|plan.csv] [--segundos 20] [--semilla 1] [--reinicios 1] [--formato auto|json|csv]");
  process.exit(1);
}
const [carpeta, salida = "plan.json"] = pos;
const segundos = Number(op.segundos ?? 20);
const semilla = Number(op.semilla ?? 1);
const reinicios = Number(op.reinicios ?? 1);

const dataset = cargarDataset(carpeta, op.formato ?? "auto");
console.error(`Dataset: ${dataset.pedidos.length} pedidos, ${dataset.vehiculos.length} vehículos, depósito (${dataset.mundo.deposito_x},${dataset.mundo.deposito_y})`);
const { inst, sol, costo } = resolver(dataset, { segundos, semilla, reinicios });
const plan = aPlan(inst, sol);
escribirPlan(plan, salida);

console.error(`\nCOSTO ESTIMADO: ${costo.total}`);
console.error(`  distancia ${costo.dist} cuadras · ${costo.usados} vehículos · makespan ${costo.makespan} min · ${costo.fallas} fallas`);
console.error(`Plan escrito en ${salida}`);
