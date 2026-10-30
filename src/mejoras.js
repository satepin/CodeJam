/**
 * @file Mejoras sobre una solución: 2-opt (elimina cruces dentro de una ruta)
 * y recocido simulado (mueve pedidos entre rutas usando el costo real).
 */
import { INDICE_DEPOSITO } from "./evaluador.js";

/**
 * 2-opt: mientras encuentre dos tramos de la ruta cuyo intercambio acorte el
 * recorrido, invierte el pedazo de ruta entre ellos. Modifica la ruta recibida.
 * @param {import("./evaluador.js").Instancia} instancia Dataset preparado.
 * @param {number[]} ruta Índices de pedidos en orden de visita.
 * @returns {number[]} La misma ruta, ya mejorada.
 */
export function dosOpt(instancia, ruta) {
  const distancias = instancia.distancias;
  let huboMejora = true;
  while (huboMejora) {
    huboMejora = false;
    // recorrido completo, con el depósito al principio y al final
    const recorrido = [INDICE_DEPOSITO, ...ruta, INDICE_DEPOSITO];
    for (let posicionInicio = 1; posicionInicio < recorrido.length - 2; posicionInicio++) {
      for (let posicionFin = posicionInicio + 1; posicionFin < recorrido.length - 1; posicionFin++) {
        const anteriorAlInicio = recorrido[posicionInicio - 1];
        const puntoInicio = recorrido[posicionInicio];
        const puntoFin = recorrido[posicionFin];
        const siguienteAlFin = recorrido[posicionFin + 1];
        const ahorroDistancia =
          distancias[anteriorAlInicio][puntoInicio] + distancias[puntoFin][siguienteAlFin] -
          distancias[anteriorAlInicio][puntoFin] - distancias[puntoInicio][siguienteAlFin];
        if (ahorroDistancia > 0) {
          const tramoInvertido = recorrido.slice(posicionInicio, posicionFin + 1).reverse();
          recorrido.splice(posicionInicio, tramoInvertido.length, ...tramoInvertido);
          huboMejora = true;
        }
      }
    }
    ruta.splice(0, ruta.length, ...recorrido.slice(1, -1));
  }
  return ruta;
}

/**
 * Crea un generador de números aleatorios con semilla (algoritmo mulberry32),
 * para que la misma semilla dé siempre la misma secuencia.
 * @param {number} semilla Número entero inicial.
 * @returns {() => number} Función que devuelve un número en [0, 1).
 */
export function crearAleatorioConSemilla(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let mezcla = estado;
    mezcla = Math.imul(mezcla ^ (mezcla >>> 15), mezcla | 1);
    mezcla ^= mezcla + Math.imul(mezcla ^ (mezcla >>> 7), mezcla | 61);
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Copia profunda de una solución (para guardar la mejor sin que se modifique después).
 * @param {import("./evaluador.js").Solucion} solucion Solución a copiar.
 * @returns {import("./evaluador.js").Solucion} Copia independiente.
 */
function copiarSolucion(solucion) {
  return {
    rutasPorVehiculo: solucion.rutasPorVehiculo.map((ruta) => ruta.slice()),
    pedidosSinAsignar: solucion.pedidosSinAsignar.slice(),
  };
}

/**
 * Recocido simulado. En cada paso aplica un cambio al azar:
 *  - mover un pedido a otra posición o a otra ruta (o dejarlo sin asignar, y viceversa);
 *  - intercambiar dos pedidos entre rutas;
 *  - invertir un tramo dentro de una ruta.
 * Si el costo baja, acepta el cambio. Si sube, a veces lo acepta igual
 * (más seguido al principio, cuando la "temperatura" es alta) para no quedar
 * atrapado en una solución mediocre. Las rutas pueden quedar vacías, así que
 * el algoritmo decide solo cuántos vehículos conviene usar.
 *
 * @param {import("./evaluador.js").Instancia} instancia Dataset preparado.
 * @param {import("./evaluador.js").Solucion} solucionInicial Punto de partida (no se modifica).
 * @param {Object} opciones
 * @param {number} opciones.milisegundos Tiempo máximo de búsqueda.
 * @param {() => number} opciones.aleatorio Generador de números en [0, 1).
 * @param {number} [opciones.temperaturaInicial=30] Qué tan permisivo es al principio con los empeoramientos.
 * @param {number} [opciones.probabilidadDejarSinAsignar=0.03] Probabilidad de que una movida deje el pedido sin entregar.
 * @returns {{solucion: import("./evaluador.js").Solucion, costo: number}} Mejor solución encontrada y su costo.
 */
export function recocidoSimulado(
  instancia,
  solucionInicial,
  { milisegundos, aleatorio, temperaturaInicial = 30, probabilidadDejarSinAsignar = 0.03 }
) {
  const solucion = copiarSolucion(solucionInicial);
  const rutas = solucion.rutasPorVehiculo;
  const sinAsignar = solucion.pedidosSinAsignar;
  const cantidadRutas = rutas.length;

  let costoActual = instancia.costo(solucion);
  let mejorCosto = costoActual;
  let mejorSolucion = copiarSolucion(solucion);

  const momentoInicio = Date.now();
  const momentoFin = momentoInicio + milisegundos;
  /** @param {number} limite @returns {number} entero al azar en [0, limite) */
  const enteroAlAzar = (limite) => Math.floor(aleatorio() * limite);

  let temperatura = temperaturaInicial;
  let contadorIteraciones = 0;

  while (true) {
    // cada 256 iteraciones: revisar el reloj y enfriar (baja lineal de temperatura)
    contadorIteraciones++;
    if (contadorIteraciones % 256 === 0) {
      const momentoActual = Date.now();
      if (momentoActual >= momentoFin) break;
      const fraccionTranscurrida = (momentoActual - momentoInicio) / milisegundos;
      temperatura = temperaturaInicial * (1 - fraccionTranscurrida) + 0.05;
    }

    const tipoMovida = aleatorio();
    /** Función que revierte la movida si no se acepta. */
    let deshacerMovida;

    if (tipoMovida < 0.45) {
      // MOVER un pedido: la lista de origen puede ser una ruta o la de sin asignar
      const numeroOrigen = enteroAlAzar(cantidadRutas + 1);
      const listaOrigen = numeroOrigen === cantidadRutas ? sinAsignar : rutas[numeroOrigen];
      if (listaOrigen.length === 0) continue;
      const posicionOrigen = enteroAlAzar(listaOrigen.length);
      const [pedidoMovido] = listaOrigen.splice(posicionOrigen, 1);

      if (aleatorio() < probabilidadDejarSinAsignar) {
        sinAsignar.push(pedidoMovido);
        deshacerMovida = () => {
          sinAsignar.pop();
          listaOrigen.splice(posicionOrigen, 0, pedidoMovido);
        };
      } else {
        const rutaDestino = rutas[enteroAlAzar(cantidadRutas)];
        const posicionDestino = enteroAlAzar(rutaDestino.length + 1);
        rutaDestino.splice(posicionDestino, 0, pedidoMovido);
        deshacerMovida = () => {
          rutaDestino.splice(posicionDestino, 1);
          listaOrigen.splice(posicionOrigen, 0, pedidoMovido);
        };
      }
    } else if (tipoMovida < 0.75) {
      // INTERCAMBIAR dos pedidos (pueden estar en la misma ruta o en rutas distintas)
      const rutaA = rutas[enteroAlAzar(cantidadRutas)];
      const rutaB = rutas[enteroAlAzar(cantidadRutas)];
      if (rutaA.length === 0 || rutaB.length === 0) continue;
      const posicionA = enteroAlAzar(rutaA.length);
      const posicionB = enteroAlAzar(rutaB.length);
      const intercambiar = () => {
        [rutaA[posicionA], rutaB[posicionB]] = [rutaB[posicionB], rutaA[posicionA]];
      };
      intercambiar();
      deshacerMovida = intercambiar;
    } else {
      // INVERTIR un tramo dentro de una ruta
      const ruta = rutas[enteroAlAzar(cantidadRutas)];
      if (ruta.length < 3) continue;
      let posicionInicio = enteroAlAzar(ruta.length);
      let posicionFin = enteroAlAzar(ruta.length);
      if (posicionInicio === posicionFin) continue;
      if (posicionInicio > posicionFin) [posicionInicio, posicionFin] = [posicionFin, posicionInicio];
      const invertirTramo = () => {
        for (let izquierda = posicionInicio, derecha = posicionFin; izquierda < derecha; izquierda++, derecha--) {
          [ruta[izquierda], ruta[derecha]] = [ruta[derecha], ruta[izquierda]];
        }
      };
      invertirTramo();
      deshacerMovida = invertirTramo;
    }

    const costoNuevo = instancia.costo(solucion);
    const aceptarMovida =
      costoNuevo <= costoActual || aleatorio() < Math.exp((costoActual - costoNuevo) / temperatura);
    if (aceptarMovida) {
      costoActual = costoNuevo;
      if (costoNuevo < mejorCosto) {
        mejorCosto = costoNuevo;
        mejorSolucion = copiarSolucion(solucion);
      }
    } else {
      deshacerMovida();
    }
  }

  // 2-opt final: solo mira distancia, así que se aplica únicamente si baja el costo total
  // (con premium, acortar la ruta puede atrasar a un cliente premium y salir más caro).
  const solucionConDosOpt = copiarSolucion(mejorSolucion);
  solucionConDosOpt.rutasPorVehiculo.forEach((ruta) => dosOpt(instancia, ruta));
  const costoConDosOpt = instancia.costo(solucionConDosOpt);
  if (costoConDosOpt < mejorCosto) return { solucion: solucionConDosOpt, costo: costoConDosOpt };
  return { solucion: mejorSolucion, costo: mejorCosto };
}
