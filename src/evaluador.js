/**
 * @file Evaluador: calcula el costo de una solución igual que el simulador oficial
 * (ESPECIFICACION.md §4 y §6). El algoritmo de búsqueda solo usa este costo.
 */

/** Índice del depósito en la matriz de distancias. Los pedidos ocupan los índices 1..n. */
export const INDICE_DEPOSITO = 0;

/**
 * @typedef {Object} Solucion
 * @property {number[][]} rutasPorVehiculo Para cada vehículo (en el orden del dataset),
 *   la lista ordenada de índices de pedidos que visita. Una lista vacía = vehículo sin usar.
 * @property {number[]} pedidosSinAsignar Índices de pedidos que no entrega nadie (cuentan como falla).
 */

/**
 * @typedef {Object} DetalleCosto
 * @property {number} costoTotal         Costo final (menor es mejor).
 * @property {number} distanciaTotal     Cuadras recorridas sumando todos los vehículos.
 * @property {number} cantidadVehiculosUsados Vehículos con al menos un pedido.
 * @property {number} makespanMinutos    Minutos hasta que vuelve el último vehículo.
 * @property {number} cantidadFallas     Pedidos sin entregar.
 * @property {number} minutosPremium     Suma, para cada premium entregado, de los minutos
 *   desde la salida hasta que empieza su entrega.
 */

/**
 * Representa un dataset preparado para evaluar soluciones rápidamente:
 * guarda las coordenadas y una matriz con todas las distancias Manhattan.
 */
export class Instancia {
  /**
   * @param {import("./cargar.js").Dataset} dataset Dataset cargado.
   */
  constructor({ mundo, pedidos, vehiculos }) {
    /** Parámetros del mundo (costos, tiempos, depósito). */
    this.mundo = mundo;
    /** Pedidos en el orden del archivo; el pedido del índice i está en pedidos[i - 1]. */
    this.pedidos = pedidos;
    /** Vehículos disponibles. */
    this.vehiculos = vehiculos;
    /** Cantidad de pedidos. */
    this.cantidadPedidos = pedidos.length;

    /** Coordenada x de cada índice (0 = depósito). */
    this.coordenadasX = [mundo.deposito_x, ...pedidos.map((pedido) => pedido.x)];
    /** Coordenada y de cada índice (0 = depósito). */
    this.coordenadasY = [mundo.deposito_y, ...pedidos.map((pedido) => pedido.y)];

    const cantidadPuntos = this.cantidadPedidos + 1;
    /** distancias[origen][destino] = cuadras Manhattan entre dos índices. */
    this.distancias = Array.from({ length: cantidadPuntos }, (_, indiceOrigen) =>
      Array.from({ length: cantidadPuntos }, (_, indiceDestino) =>
        Math.abs(this.coordenadasX[indiceOrigen] - this.coordenadasX[indiceDestino]) +
        Math.abs(this.coordenadasY[indiceOrigen] - this.coordenadasY[indiceDestino])
      )
    );
  }

  /**
   * Recorre una ruta: sale del depósito, visita los pedidos en orden y vuelve.
   * La entrega de cada pedido empieza apenas llega el vehículo y dura tiempo_servicio.
   * @param {number[]} ruta Índices de pedidos en orden de visita.
   * @returns {{distanciaRuta: number, minutosRuta: number, minutosPremiumRuta: number}}
   *   Cuadras recorridas, minutos desde la salida hasta volver al depósito y
   *   suma de los minutos de llegada (desde la salida) a cada pedido premium.
   */
  recorrerRuta(ruta) {
    const { min_por_cuadra: minutosPorCuadra, tiempo_servicio: tiempoServicio } = this.mundo;
    let distanciaRuta = 0;
    let minutosDesdeSalida = 0;
    let minutosPremiumRuta = 0;
    let indiceAnterior = INDICE_DEPOSITO;
    for (const indicePedido of ruta) {
      const cuadrasTramo = this.distancias[indiceAnterior][indicePedido];
      distanciaRuta += cuadrasTramo;
      minutosDesdeSalida += cuadrasTramo * minutosPorCuadra; // momento de llegada = inicio de la entrega
      if (this.pedidos[indicePedido - 1].premium) minutosPremiumRuta += minutosDesdeSalida;
      minutosDesdeSalida += tiempoServicio;
      indiceAnterior = indicePedido;
    }
    const cuadrasVuelta = this.distancias[indiceAnterior][INDICE_DEPOSITO];
    distanciaRuta += cuadrasVuelta;
    const minutosRuta = minutosDesdeSalida + cuadrasVuelta * minutosPorCuadra;
    return { distanciaRuta, minutosRuta, minutosPremiumRuta };
  }

  /**
   * Calcula el costo de una solución con la fórmula oficial:
   * costo_por_cuadra × distancia + costo fijo por vehículo usado
   * + costo_por_minuto_total × makespan + costo_por_falla × fallas
   * + costo_por_minuto_premium × minutos de espera de los premium entregados.
   * @param {Solucion} solucion Solución a evaluar.
   * @returns {number} Costo total.
   */
  costo(solucion) {
    return this.detalleCosto(solucion).costoTotal;
  }

  /**
   * Igual que {@link Instancia#costo}, pero devuelve también cada componente.
   * @param {Solucion} solucion Solución a evaluar.
   * @returns {DetalleCosto} Costo total y sus componentes.
   */
  detalleCosto(solucion) {
    const mundo = this.mundo;
    let distanciaTotal = 0;
    let makespanMinutos = 0;
    let cantidadVehiculosUsados = 0;
    let minutosPremium = 0;
    for (const ruta of solucion.rutasPorVehiculo) {
      if (ruta.length === 0) continue; // un vehículo sin pedidos no se usa ni se cobra
      const { distanciaRuta, minutosRuta, minutosPremiumRuta } = this.recorrerRuta(ruta);
      cantidadVehiculosUsados++;
      distanciaTotal += distanciaRuta;
      makespanMinutos = Math.max(makespanMinutos, minutosRuta);
      minutosPremium += minutosPremiumRuta;
    }
    const cantidadFallas = solucion.pedidosSinAsignar.length;
    const costoTotal =
      mundo.costo_por_cuadra * distanciaTotal +
      mundo.costo_por_vehiculo * cantidadVehiculosUsados +
      mundo.costo_por_minuto_total * makespanMinutos +
      mundo.costo_por_falla * cantidadFallas +
      mundo.costo_por_minuto_premium * minutosPremium;
    return { costoTotal, distanciaTotal, cantidadVehiculosUsados, makespanMinutos, cantidadFallas, minutosPremium };
  }
}
