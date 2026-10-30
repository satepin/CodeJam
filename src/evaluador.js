// Evaluador: réplica de la simulación y del costo oficial (ESPECIFICACION.md §4 y §6).
// Es la ÚNICA pieza que sabe de reglas. El algoritmo solo llama a inst.costo(sol).
//
// Cómo agregar una regla de un evento (ej. capacidad, ventanas horarias):
//   1. Crear src/reglas/<nombre>.js (copiar src/reglas/_plantilla.js) con los hooks necesarios:
//        - aplica(inst)                      -> bool: ¿esta regla corre en este dataset?
//        - alVisitar(ctx, pedido, vehiculo)   -> modifica ctx (ej. ctx.reloj por espera) y/o
//                                                devuelve una penalización (número) o 0
//        - alRecargar(ctx, vehiculo)          -> se llama en cada parada DEPOSITO
//        - costoExtra(resumen, inst, sol)     -> costo adicional sobre la solución entera
//   2. Agregarla al array REGLAS de src/reglas/index.js.
//   3. Agregar un test en test/ que compare contra el simulador oficial.
import { REGLAS } from "./reglas/index.js";
import { horaAMin } from "./horas.js";

export const DEPOSITO = 0; // nodo 0 = depósito; los pedidos son nodos 1..n

export class Instancia {
  constructor({ mundo, pedidos, vehiculos }) {
    this.mundo = mundo;
    this.pedidos = pedidos;
    this.vehiculos = vehiculos;
    this.n = pedidos.length;
    this.salida = horaAMin(mundo.hora_salida);
    this.xs = [mundo.deposito_x, ...pedidos.map((p) => p.x)];
    this.ys = [mundo.deposito_y, ...pedidos.map((p) => p.y)];
    const N = this.n + 1;
    this.D = Array.from({ length: N }, (_, i) =>
      Array.from({ length: N }, (_, j) => Math.abs(this.xs[i] - this.xs[j]) + Math.abs(this.ys[i] - this.ys[j]))
    );
    this.reglas = REGLAS.filter((r) => !r.aplica || r.aplica(this));
  }

  // Parámetro de un vehículo con fallback al mundo (preparado para flotas heterogéneas)
  param(vehiculo, campo) {
    const v = vehiculo?.[campo];
    return v === null || v === undefined ? this.mundo[campo] : v;
  }

  // Simula la ruta del vehículo i. Devuelve distancia, minutos (desde la salida),
  // entregas y penalizaciones de reglas.
  simularRuta(ruta, i = 0) {
    const m = this.mundo;
    const veh = this.vehiculos[i];
    const mpc = this.param(veh, "min_por_cuadra");
    const ctx = { reloj: this.salida, dist: 0, prev: DEPOSITO, entregas: 0, penal: 0, viaje: 1, inst: this };
    for (const v of ruta) {
      const d = this.D[ctx.prev][v];
      ctx.dist += d;
      ctx.reloj += d * mpc;
      if (v === DEPOSITO) {
        ctx.reloj += m.tiempo_carga;
        ctx.viaje++;
        for (const r of this.reglas) if (r.alRecargar) r.alRecargar(ctx, veh);
      } else {
        const pedido = this.pedidos[v - 1];
        for (const r of this.reglas) if (r.alVisitar) ctx.penal += r.alVisitar(ctx, pedido, veh) || 0;
        ctx.reloj += m.tiempo_servicio;
        ctx.entregas++;
      }
      ctx.prev = v;
    }
    const vuelta = this.D[ctx.prev][DEPOSITO];
    ctx.dist += vuelta;
    ctx.reloj += vuelta * mpc;
    return { dist: ctx.dist, min: ctx.reloj - this.salida, entregas: ctx.entregas, penal: ctx.penal };
  }

  // Costo total de una solución { rutas: [[nodos]...], sinAsignar: [nodos] }
  costo(sol, detalle = false) {
    const m = this.mundo;
    let dist = 0, makespan = 0, usados = 0, penal = 0;
    sol.rutas.forEach((r, i) => {
      const s = this.simularRuta(r, i);
      if (s.entregas === 0) return; // un vehículo cuenta solo si entrega algo
      usados++;
      dist += s.dist;
      penal += s.penal;
      if (s.min > makespan) makespan = s.min;
    });
    const fallas = sol.sinAsignar.length;
    const resumen = { dist, usados, makespan, fallas, penal };
    for (const r of this.reglas) if (r.costoExtra) penal += r.costoExtra(resumen, this, sol) || 0;
    const total =
      m.costo_por_cuadra * dist +
      m.costo_por_vehiculo * usados +
      m.costo_por_minuto_total * makespan +
      m.costo_por_falla * fallas +
      penal;
    if (!detalle) return total;
    return { total, dist, usados, makespan, fallas, penal };
  }
}
