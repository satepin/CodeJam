// Mejoras: 2-opt (por ruta) y recocido simulado sobre el costo REAL del evaluador.
import { DEPOSITO } from "./evaluador.js";

// 2-opt clásico sobre distancia (elimina cruces). Respeta los DEPOSITO como nodos fijos
// porque solo invierte tramos sin depósitos adentro.
export function dosOpt(inst, ruta) {
  const D = inst.D;
  let mejora = true;
  while (mejora) {
    mejora = false;
    const t = [DEPOSITO, ...ruta, DEPOSITO];
    for (let i = 1; i < t.length - 2; i++) {
      for (let j = i + 1; j < t.length - 1; j++) {
        if (t.slice(i, j + 1).includes(DEPOSITO)) break;
        const delta = D[t[i - 1]][t[j]] + D[t[i]][t[j + 1]] - D[t[i - 1]][t[i]] - D[t[j]][t[j + 1]];
        if (delta < 0) {
          const tramo = t.slice(i, j + 1).reverse();
          t.splice(i, tramo.length, ...tramo);
          mejora = true;
        }
      }
    }
    ruta.splice(0, ruta.length, ...t.slice(1, -1));
  }
  return ruta;
}

// RNG con semilla (mulberry32) para que los resultados sean reproducibles
export function rngConSemilla(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clonar = (sol) => ({ rutas: sol.rutas.map((r) => r.slice()), sinAsignar: sol.sinAsignar.slice() });

// Recocido simulado. Movidas:
//  - relocate: mover un pedido a otra posición/ruta (o a "sin asignar", y de vuelta)
//  - swap: intercambiar dos pedidos
//  - 2-opt aleatorio: invertir un tramo dentro de una ruta
// Las rutas pueden quedar vacías: así el algoritmo decide solo cuántos vehículos usar.
export function recocido(inst, solInicial, { ms = 5000, rng = Math.random, T0 = 30, probFalla = 0.03 } = {}) {
  let sol = clonar(solInicial);
  let actual = inst.costo(sol);
  let mejor = actual, mejorSol = clonar(sol);
  const k = sol.rutas.length;
  const inicio = Date.now(), fin = inicio + ms;
  const azar = (n) => Math.floor(rng() * n);
  let T = T0, it = 0;

  while (true) {
    if ((++it & 255) === 0) {
      const ahora = Date.now();
      if (ahora >= fin) break;
      T = T0 * (1 - (ahora - inicio) / ms) + 0.05; // enfriamiento lineal
    }
    const r = rng();
    let deshacer;

    if (r < 0.45) {
      // relocate
      const a = azar(k + 1);
      const fuente = a === k ? sol.sinAsignar : sol.rutas[a];
      if (fuente.length === 0) continue;
      const i = azar(fuente.length);
      const v = fuente[i];
      if (v === DEPOSITO) continue;
      fuente.splice(i, 1);
      const aFalla = rng() < probFalla;
      if (aFalla) {
        sol.sinAsignar.push(v);
        deshacer = () => { sol.sinAsignar.pop(); fuente.splice(i, 0, v); };
      } else {
        const b = azar(k);
        const j = azar(sol.rutas[b].length + 1);
        sol.rutas[b].splice(j, 0, v);
        deshacer = () => { sol.rutas[b].splice(j, 1); fuente.splice(i, 0, v); };
      }
    } else if (r < 0.75) {
      // swap
      const a = azar(k), b = azar(k);
      const ra = sol.rutas[a], rb = sol.rutas[b];
      if (!ra.length || !rb.length) continue;
      const i = azar(ra.length), j = azar(rb.length);
      [ra[i], rb[j]] = [rb[j], ra[i]];
      deshacer = () => { [ra[i], rb[j]] = [rb[j], ra[i]]; };
    } else {
      // inversión de tramo
      const ruta = sol.rutas[azar(k)];
      if (ruta.length < 3) continue;
      let i = azar(ruta.length), j = azar(ruta.length);
      if (i === j) continue;
      if (i > j) [i, j] = [j, i];
      const rev = () => {
        for (let x = i, y = j; x < y; x++, y--) [ruta[x], ruta[y]] = [ruta[y], ruta[x]];
      };
      rev();
      deshacer = rev;
    }

    const nuevo = inst.costo(sol);
    if (nuevo <= actual || rng() < Math.exp((actual - nuevo) / T)) {
      actual = nuevo;
      if (nuevo < mejor) { mejor = nuevo; mejorSol = clonar(sol); }
    } else {
      deshacer();
    }
  }

  mejorSol.rutas.forEach((ruta) => dosOpt(inst, ruta));
  return { sol: mejorSol, costo: inst.costo(mejorSol) };
}
