// Tests: el evaluador tiene que dar EXACTAMENTE lo mismo que el simulador oficial.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cargarDataset } from "../src/cargar.js";
import { Instancia, DEPOSITO } from "../src/evaluador.js";
import { resolver, aPlan } from "../src/solver.js";

function planASol(inst, plan) {
  const idx = new Map(inst.pedidos.map((p, i) => [p.id, i + 1]));
  const rutas = inst.vehiculos.map((v) => {
    const r = plan.rutas.find((x) => x.vehiculo === v.id);
    return r ? r.paradas.map((p) => (p === "DEPOSITO" ? DEPOSITO : idx.get(p))) : [];
  });
  const usados = new Set(rutas.flat());
  const sinAsignar = [...idx.values()].filter((v) => !usados.has(v));
  return { rutas, sinAsignar };
}

test("plan de ejemplo del repo oficial cuesta 1013 (con DEPOSITO)", () => {
  const inst = new Instancia(cargarDataset("datos/ejemplo"));
  const plan = JSON.parse(fs.readFileSync("datos/ejemplo/plan_ejemplo.json", "utf8"));
  assert.equal(inst.costo(planASol(inst, plan)), 1013);
});

test("CSV y JSON cargan lo mismo", () => {
  const a = cargarDataset("datos/ejemplo", "json");
  const b = cargarDataset("datos/ejemplo", "csv");
  assert.deepEqual(a.mundo, b.mundo);
  assert.deepEqual(a.pedidos.map((p) => [p.id, p.x, p.y]), b.pedidos.map((p) => [p.id, p.x, p.y]));
});

test("pedido sin asignar suma costo_por_falla", () => {
  const inst = new Instancia(cargarDataset("datos/ejemplo"));
  const base = inst.costo({ rutas: [[1]], sinAsignar: [] });
  const conFalla = inst.costo({ rutas: [[1]], sinAsignar: [2] });
  assert.equal(conFalla - base, inst.mundo.costo_por_falla);
});

test("el solver genera un plan válido (sin repetidos, vehículos existentes)", () => {
  const ds = cargarDataset("datos/practica");
  const { inst, sol } = resolver(ds, { segundos: 2, log: () => {} });
  const plan = aPlan(inst, sol);
  const vs = plan.rutas.map((r) => r.vehiculo);
  assert.equal(new Set(vs).size, vs.length);
  const ps = plan.rutas.flatMap((r) => r.paradas).filter((p) => p !== "DEPOSITO");
  assert.equal(new Set(ps).size, ps.length);
  for (const v of vs) assert.ok(ds.vehiculos.some((x) => x.id === v));
});

test("respeta un depósito que no está en (0,0)", () => {
  const ds = cargarDataset("datos/practica");
  ds.mundo.deposito_x = 10; ds.mundo.deposito_y = 10;
  const inst = new Instancia(ds);
  assert.equal(inst.D[0][1], Math.abs(10 - ds.pedidos[0].x) + Math.abs(10 - ds.pedidos[0].y));
});
