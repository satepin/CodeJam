/**
 * @file Orquestación de la búsqueda: prueba cada cantidad de vehículos y se queda
 * con la mejor solución; también convierte la solución al formato del plan.
 */
import { Instancia } from "./evaluador.js";
import { barrido } from "./constructores.js";
import { dosOpt, recocidoSimulado, crearAleatorioConSemilla } from "./mejoras.js";

/**
 * Resuelve un dataset:
 *  1. para cada cantidad de vehículos (1..total), arma una solución inicial con
 *     barrido + 2-opt y la mejora con recocido simulado (70% del tiempo en total);
 *  2. a la mejor de todas le aplica un recocido final más suave (30% del tiempo).
 * @param {import("./cargar.js").Dataset} dataset Dataset cargado.
 * @param {Object} [opciones]
 * @param {number} [opciones.segundos=20] Tiempo total de búsqueda.
 * @param {number} [opciones.semilla=1]   Semilla del generador aleatorio.
 * @param {(mensaje: string) => void} [opciones.mostrarProgreso=console.error] Dónde escribir el progreso.
 * @returns {{instancia: Instancia, solucion: import("./evaluador.js").Solucion,
 *   detalle: import("./evaluador.js").DetalleCosto}} Mejor solución y su costo desglosado.
 */
export function resolver(dataset, { segundos = 20, semilla = 1, mostrarProgreso = console.error } = {}) {
  const instancia = new Instancia(dataset);
  const totalVehiculos = dataset.vehiculos.length;
  const aleatorio = crearAleatorioConSemilla(semilla);
  const milisegundosTotales = segundos * 1000;
  const milisegundosPorCantidad = (milisegundosTotales * 0.7) / totalVehiculos;

  let mejorResultado = null;
  for (let cantidadVehiculos = 1; cantidadVehiculos <= totalVehiculos; cantidadVehiculos++) {
    const rutasIniciales = barrido(instancia, cantidadVehiculos).map((ruta) => dosOpt(instancia, ruta));
    // completar con rutas vacías: el recocido puede pasarles pedidos si conviene
    while (rutasIniciales.length < totalVehiculos) rutasIniciales.push([]);
    const solucionInicial = { rutasPorVehiculo: rutasIniciales, pedidosSinAsignar: [] };
    const costoInicial = instancia.costo(solucionInicial);
      //mas comentarios uwu
    const resultado = recocidoSimulado(instancia, solucionInicial, {
      milisegundos: milisegundosPorCantidad,
      aleatorio,
    });
    const detalle = instancia.detalleCosto(resultado.solucion);
    mostrarProgreso(
      `  ${cantidadVehiculos} vehículo(s): barrido+2opt=${costoInicial} -> recocido=${resultado.costo}` +
        ` (usa ${detalle.cantidadVehiculosUsados}, ${detalle.cantidadFallas} fallas)`
    );
    if (!mejorResultado || resultado.costo < mejorResultado.costo) mejorResultado = resultado;
  }

  const resultadoFinal = recocidoSimulado(instancia, mejorResultado.solucion, {
    milisegundos: milisegundosTotales * 0.3,
    aleatorio,
    temperaturaInicial: 8,
  });
  if (resultadoFinal.costo < mejorResultado.costo) mejorResultado = resultadoFinal;
  mostrarProgreso(`  pulido final: ${mejorResultado.costo}`);

  return {
    instancia,
    solucion: mejorResultado.solucion,
    detalle: instancia.detalleCosto(mejorResultado.solucion),
  };
}

/**
 * Convierte la solución interna (índices) al plan oficial (ids de pedido y de vehículo).
 * Los vehículos sin pedidos no se incluyen; los pedidos sin asignar tampoco (fallan).
 * @param {Instancia} instancia Dataset preparado.
 * @param {import("./evaluador.js").Solucion} solucion Solución a convertir.
 * @returns {{rutas: {vehiculo: string, paradas: number[]}[]}} Plan listo para escribir en JSON.
 */
export function convertirAPlan(instancia, solucion) {
  const rutas = [];
  solucion.rutasPorVehiculo.forEach((ruta, numeroVehiculo) => {
    if (ruta.length === 0) return;
    rutas.push({
      vehiculo: instancia.vehiculos[numeroVehiculo].id,
      paradas: ruta.map((indicePedido) => instancia.pedidos[indicePedido - 1].id),
    });
  });
  return { rutas };
}
