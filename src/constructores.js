/**
 * @file Heurísticas constructivas: arman rápido una primera solución razonable,
 * que después mejora el recocido simulado.
 */
import { INDICE_DEPOSITO } from "./evaluador.js";

/**
 * Arma una ruta con la regla del vecino más cercano: desde el depósito,
 * siempre va al pedido pendiente que está más cerca.
 * @param {import("./evaluador.js").Instancia} instancia Dataset preparado.
 * @param {number[]} indicesPedidos Pedidos que debe visitar esta ruta.
 * @returns {number[]} Los mismos pedidos, ordenados por vecino más cercano.
 */
export function vecinoMasCercano(instancia, indicesPedidos) {
  const pedidosPendientes = new Set(indicesPedidos);
  const ruta = [];
  let indiceActual = INDICE_DEPOSITO;
  while (pedidosPendientes.size > 0) {
    let indiceMasCercano = null;
    let distanciaMasCercana = Infinity;
    for (const indiceCandidato of pedidosPendientes) {
      const distanciaCandidato = instancia.distancias[indiceActual][indiceCandidato];
      if (distanciaCandidato < distanciaMasCercana) {
        distanciaMasCercana = distanciaCandidato;
        indiceMasCercano = indiceCandidato;
      }
    }
    ruta.push(indiceMasCercano);
    pedidosPendientes.delete(indiceMasCercano);
    indiceActual = indiceMasCercano;
  }
  return ruta;
}

/**
 * Barrido (sweep): ordena los pedidos por el ángulo que forman con el depósito
 * y los corta en sectores consecutivos, uno por vehículo. Cada sector se
 * ordena con vecino más cercano.
 * @param {import("./evaluador.js").Instancia} instancia Dataset preparado.
 * @param {number} cantidadVehiculos En cuántos sectores (rutas) repartir los pedidos.
 * @returns {number[][]} Una ruta por sector.
 */
export function barrido(instancia, cantidadVehiculos) {
  const { deposito_x: depositoX, deposito_y: depositoY } = instancia.mundo;

  /**
   * Ángulo de un pedido respecto del depósito, en el rango [0, 2π).
   * @param {number} indicePedido Índice del pedido.
   * @returns {number} Ángulo en radianes.
   */
  const anguloDesdeDeposito = (indicePedido) => {
    const angulo = Math.atan2(
      instancia.coordenadasY[indicePedido] - depositoY,
      instancia.coordenadasX[indicePedido] - depositoX
    );
    return angulo < 0 ? angulo + 2 * Math.PI : angulo;
  };

  const pedidosOrdenadosPorAngulo = [];
  for (let indicePedido = 1; indicePedido <= instancia.cantidadPedidos; indicePedido++) {
    pedidosOrdenadosPorAngulo.push(indicePedido);
  }
  pedidosOrdenadosPorAngulo.sort((pedidoA, pedidoB) => anguloDesdeDeposito(pedidoA) - anguloDesdeDeposito(pedidoB));

  const pedidosPorSector = Math.ceil(pedidosOrdenadosPorAngulo.length / cantidadVehiculos);
  const rutas = [];
  for (let numeroSector = 0; numeroSector < cantidadVehiculos; numeroSector++) {
    const pedidosDelSector = pedidosOrdenadosPorAngulo.slice(
      numeroSector * pedidosPorSector,
      (numeroSector + 1) * pedidosPorSector
    );
    rutas.push(vecinoMasCercano(instancia, pedidosDelSector));
  }
  return rutas;
}
