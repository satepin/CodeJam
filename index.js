#!/usr/bin/env node
/**
 * @file Programa principal: lee un dataset, busca un plan de reparto y lo escribe en JSON.
 *
 * Uso: node index.js <carpeta_dataset> [plan.json] [--segundos 20] [--semilla 1]
 */
import fs from "node:fs";
import { cargarDataset } from "./src/cargar.js";
import { resolver, convertirAPlan } from "./src/solver.js";

/**
 * Separa los argumentos de la línea de comandos en posicionales y opciones (--nombre valor).
 * @param {string[]} listaArgumentos Argumentos recibidos (sin "node" ni el nombre del script).
 * @returns {{posicionales: string[], opciones: Record<string, string>}} Argumentos separados.
 */
function leerArgumentos(listaArgumentos) {
  const posicionales = [];
  const opciones = {};
  for (let posicion = 0; posicion < listaArgumentos.length; posicion++) {
    const argumento = listaArgumentos[posicion];
    if (argumento.startsWith("--")) {
      opciones[argumento.slice(2)] = listaArgumentos[posicion + 1];
      posicion++;
    } else {
      posicionales.push(argumento);
    }
  }
  return { posicionales, opciones };
}

const { posicionales, opciones } = leerArgumentos(process.argv.slice(2));
if (posicionales.length < 1) {
  console.error("Uso: node index.js <carpeta_dataset> [plan.json] [--segundos 20] [--semilla 1]");
  process.exit(1);
}
const [carpetaDataset, archivoSalida = "plan.json"] = posicionales;

const dataset = cargarDataset(carpetaDataset);
console.error(
  `Dataset: ${dataset.pedidos.length} pedidos, ${dataset.vehiculos.length} vehículos, ` +
    `depósito (${dataset.mundo.deposito_x},${dataset.mundo.deposito_y})`
);

const { instancia, solucion, detalle } = resolver(dataset, {
  segundos: Number(opciones.segundos ?? 20),
  semilla: Number(opciones.semilla ?? 1),
});
const plan = convertirAPlan(instancia, solucion);
fs.writeFileSync(archivoSalida, JSON.stringify(plan, null, 2) + "\n");

console.error(`\nCOSTO ESTIMADO: ${detalle.costoTotal}`);
console.error(
  `  distancia ${detalle.distanciaTotal} cuadras · ${detalle.cantidadVehiculosUsados} vehículos · ` +
    `makespan ${detalle.makespanMinutos} min · ${detalle.cantidadFallas} fallas · ` +
    `espera premium ${detalle.minutosPremium} min`
);
console.error(`Plan escrito en ${archivoSalida}`);
