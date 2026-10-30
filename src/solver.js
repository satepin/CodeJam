// Orquestación: para cada cantidad de vehículos k, barrido + 2-opt como punto de partida
// y recocido simulado. Al final, un recocido extra desde la mejor solución encontrada.
import { Instancia, DEPOSITO } from "./evaluador.js";
import { barrido } from "./constructores.js";
import { dosOpt, recocido, rngConSemilla } from "./mejoras.js";

// Varias corridas independientes (semillas distintas) repartiendo el tiempo; gana la mejor.
// El recocido es aleatorio: con el mismo tiempo total, varias corridas cortas suelen
// encontrar mejores soluciones que una sola larga.
export function resolver(dataset, { segundos = 20, semilla = 1, reinicios = 1, log = console.error } = {}) {
  let mejor = null;
  for (let r = 0; r < reinicios; r++) {
    log(`Corrida ${r + 1}/${reinicios} (semilla ${semilla + r})`);
    const res = corrida(dataset, { segundos: segundos / reinicios, semilla: semilla + r, log });
    if (!mejor || res.costo.total < mejor.costo.total) mejor = res;
  }
  log(`Mejor de ${reinicios} corridas: ${mejor.costo.total}`);
  return mejor;
}

export function corrida(dataset, { segundos = 20, semilla = 1, log = console.error } = {}) {
  const inst = new Instancia(dataset);
  const K = dataset.vehiculos.length;
  const rng = rngConSemilla(semilla);
  const msTotal = segundos * 1000;
  const msPorK = (msTotal * 0.7) / K;
  const historial = [];

  let mejor = null;
  for (let k = 1; k <= K; k++) {
    const rutasK = barrido(inst, k).map((r) => dosOpt(inst, r));
    // relleno con rutas vacías: el recocido puede pasarles pedidos si conviene
    while (rutasK.length < K) rutasK.push([]);
    const inicial = { rutas: rutasK, sinAsignar: [] };
    const cIni = inst.costo(inicial);
    const res = recocido(inst, inicial, { ms: msPorK, rng });
    const det = inst.costo(res.sol, true);
    historial.push({ k, barrido: cIni, recocido: res.costo, usados: det.usados });
    log(`  k=${k}: barrido+2opt=${cIni}  ->  recocido=${res.costo}  (usa ${det.usados} vehículos, ${det.fallas} fallas)`);
    if (!mejor || res.costo < mejor.costo) mejor = res;
  }

  // pulido final desde la mejor
  const final = recocido(inst, mejor.sol, { ms: msTotal * 0.3, rng, T0: 8 });
  if (final.costo < mejor.costo) mejor = final;
  log(`  pulido final: ${mejor.costo}`);

  return { inst, sol: mejor.sol, costo: inst.costo(mejor.sol, true), historial };
}

// Convierte la solución interna al formato del plan oficial
export function aPlan(inst, sol) {
  const rutas = [];
  sol.rutas.forEach((ruta, i) => {
    // sacar DEPOSITO al principio/final o repetidos (no aportan nada)
    const limpia = ruta.filter((v, j) => !(v === DEPOSITO && (j === 0 || ruta[j - 1] === DEPOSITO)));
    while (limpia.length && limpia[limpia.length - 1] === DEPOSITO) limpia.pop();
    if (!limpia.some((v) => v !== DEPOSITO)) return;
    rutas.push({
      vehiculo: inst.vehiculos[i].id,
      paradas: limpia.map((v) => (v === DEPOSITO ? "DEPOSITO" : inst.pedidos[v - 1].id)),
    });
  });
  return { rutas };
}
