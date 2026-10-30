/**
 * @file Carga de un dataset de QuickDrop desde sus tres archivos JSON
 * (mundo.json, pedidos.json y vehiculos.json).
 */
import fs from "node:fs";
import path from "node:path";

/**
 * Valores por defecto del mundo, según ESPECIFICACION.md.
 * Se usan cuando un campo falta, vale null o está vacío.
 * @type {Record<string, number|string>}
 */
export const VALORES_POR_DEFECTO_MUNDO = {
  grilla_ancho: 20,
  grilla_alto: 20,
  deposito_x: 0,
  deposito_y: 0,
  hora_salida: "08:00",
  tiempo_servicio: 5,
  tiempo_carga: 10,
  min_por_cuadra: 3,
  costo_por_cuadra: 3,
  costo_por_vehiculo: 60,
  costo_por_minuto_total: 1,
  costo_por_falla: 200,
  costo_por_minuto_premium: 1,
};

/**
 * @typedef {Object} Pedido
 * @property {number} id   Identificador único del pedido.
 * @property {number} x    Columna del cliente en la grilla.
 * @property {number} y    Fila del cliente en la grilla.
 * @property {number} peso Peso del paquete en kg.
 * @property {boolean} premium true si es un cliente premium (su demora suma costo). Si falta, es false.
 */

/**
 * @typedef {Object} Vehiculo
 * @property {string} id Identificador del vehículo (por ejemplo "V1").
 */

/**
 * @typedef {Object} Dataset
 * @property {Record<string, number|string>} mundo Parámetros del mundo, con valores por defecto aplicados.
 * @property {Pedido[]} pedidos     Lista de pedidos a entregar.
 * @property {Vehiculo[]} vehiculos Lista de vehículos disponibles.
 */

/**
 * Indica si un valor cuenta como "campo ausente" (falta, null o string vacío).
 * @param {*} valor Valor leído del archivo.
 * @returns {boolean} true si el campo debe considerarse ausente.
 */
function esCampoAusente(valor) {
  return valor === undefined || valor === null || valor === "";
}

/**
 * Interpreta un campo booleano como lo hace el simulador oficial:
 * acepta true/false, 1/0 y los textos "1", "true", "si", "sí", "verdadero" (y sus opuestos).
 * Un campo ausente vale false.
 * @param {*} valor Valor leído del archivo.
 * @returns {boolean} El valor como booleano.
 */
function leerBooleano(valor) {
  if (esCampoAusente(valor)) return false;
  if (typeof valor === "boolean") return valor;
  const textoNormalizado = String(valor).trim().toLowerCase();
  return ["1", "true", "si", "sí", "verdadero"].includes(textoNormalizado);
}

/**
 * Lee y parsea un archivo JSON de la carpeta del dataset.
 * @param {string} carpetaDataset Ruta de la carpeta del dataset.
 * @param {string} nombreArchivo  Nombre sin extensión ("mundo", "pedidos" o "vehiculos").
 * @returns {*} Contenido del archivo ya parseado.
 */
function leerJSON(carpetaDataset, nombreArchivo) {
  const rutaArchivo = path.join(carpetaDataset, `${nombreArchivo}.json`);
  return JSON.parse(fs.readFileSync(rutaArchivo, "utf8"));
}

/**
 * Carga un dataset completo. Los campos del mundo que faltan toman su valor
 * por defecto; los campos desconocidos se ignoran.
 * @param {string} carpetaDataset Ruta de la carpeta con los tres archivos JSON.
 * @returns {Dataset} Mundo, pedidos y vehículos listos para usar.
 */
export function cargarDataset(carpetaDataset) {
  const mundoLeido = leerJSON(carpetaDataset, "mundo");
  const mundo = { ...VALORES_POR_DEFECTO_MUNDO };
  for (const nombreCampo of Object.keys(VALORES_POR_DEFECTO_MUNDO)) {
    if (!esCampoAusente(mundoLeido[nombreCampo])) mundo[nombreCampo] = mundoLeido[nombreCampo];
  }

  const pedidos = leerJSON(carpetaDataset, "pedidos").map((pedidoLeido) => ({
    id: pedidoLeido.id,
    x: pedidoLeido.x,
    y: pedidoLeido.y,
    peso: pedidoLeido.peso,
    premium: leerBooleano(pedidoLeido.premium),
  }));

  const vehiculos = leerJSON(carpetaDataset, "vehiculos").map((vehiculoLeido) => ({
    id: String(vehiculoLeido.id),
  }));

  return { mundo, pedidos, vehiculos };
}
