// Heurísticas constructivas: arman una solución inicial razonable y rápida.
import { DEPOSITO } from "./evaluador.js";

// Vecino más cercano sobre un conjunto de nodos, desde el depósito
export function vecinoMasCercano(inst, nodos) {
  const pendientes = new Set(nodos);
  const ruta = [];
  let actual = DEPOSITO;
  while (pendientes.size) {
    let mejor = null, mejorD = Infinity;
    for (const v of pendientes) {
      const d = inst.D[actual][v];
      if (d < mejorD) { mejorD = d; mejor = v; }
    }
    ruta.push(mejor);
    pendientes.delete(mejor);
    actual = mejor;
  }
  return ruta;
}

// Barrido (sweep): ordena por ángulo alrededor del depósito y corta en k sectores
export function barrido(inst, k, desfase = 0) {
  const { deposito_x: dx, deposito_y: dy } = inst.mundo;
  const nodos = [];
  for (let v = 1; v <= inst.n; v++) nodos.push(v);
  const ang = (v) => {
    let a = Math.atan2(inst.ys[v] - dy, inst.xs[v] - dx) - desfase;
    while (a < 0) a += 2 * Math.PI;
    return a;
  };
  nodos.sort((a, b) => ang(a) - ang(b));
  const tam = Math.ceil(nodos.length / k);
  const rutas = [];
  for (let i = 0; i < k; i++) rutas.push(vecinoMasCercano(inst, nodos.slice(i * tam, (i + 1) * tam)));
  return rutas;
}
