// Carga de datasets (JSON o CSV). Todo se lee del archivo `mundo`: nada hardcodeado.
import fs from "node:fs";
import path from "node:path";

export const DEFAULTS_MUNDO = {
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
};

// "falta", null o "" significan lo mismo
const vacio = (v) => v === undefined || v === null || v === "";

function parsearCSV(texto) {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const sep = lineas[0].includes(";") && !lineas[0].includes(",") ? ";" : ",";
  const cab = lineas[0].split(sep).map((s) => s.trim());
  return lineas.slice(1).map((l) => {
    const celdas = l.split(sep).map((s) => s.trim());
    const fila = {};
    cab.forEach((c, i) => (fila[c] = celdas[i] ?? ""));
    return fila;
  });
}

// Convierte strings numéricos a número; deja el resto como está
function normalizarValor(v) {
  if (typeof v !== "string") return v;
  if (v.trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function leerArchivo(carpeta, nombre, formato) {
  const pj = path.join(carpeta, `${nombre}.json`);
  const pc = path.join(carpeta, `${nombre}.csv`);
  const usarCSV = formato === "csv" || (formato !== "json" && !fs.existsSync(pj) && fs.existsSync(pc));
  if (usarCSV) return { tipo: "csv", datos: parsearCSV(fs.readFileSync(pc, "utf8")) };
  return { tipo: "json", datos: JSON.parse(fs.readFileSync(pj, "utf8")) };
}

export function cargarDataset(carpeta, formato = "auto") {
  // mundo
  const m = leerArchivo(carpeta, "mundo", formato);
  let crudo = m.datos;
  if (m.tipo === "csv") {
    crudo = {};
    for (const f of m.datos) crudo[f.clave] = f.valor;
  }
  const mundo = { ...DEFAULTS_MUNDO };
  for (const [k, v] of Object.entries(crudo)) {
    if (!vacio(v)) mundo[k] = k === "hora_salida" ? String(v) : normalizarValor(v);
  }

  // pedidos: conservamos campos extra (los eventos pueden agregar ventanas, prioridad, etc.)
  const pedidos = leerArchivo(carpeta, "pedidos", formato).datos.map((p) => {
    const o = {};
    for (const [k, v] of Object.entries(p)) o[k] = vacio(v) ? null : normalizarValor(v);
    return o;
  });

  // vehiculos: id como texto; campos extra se conservan
  const vehiculos = leerArchivo(carpeta, "vehiculos", formato).datos.map((v) => {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = vacio(val) ? null : normalizarValor(val);
    o.id = String(v.id);
    return o;
  });

  return { mundo, pedidos, vehiculos };
}
