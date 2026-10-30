// Escritura del plan en JSON o CSV
import fs from "node:fs";

export function escribirPlan(plan, archivo) {
  if (archivo.toLowerCase().endsWith(".csv")) {
    const filas = ["vehiculo,parada"];
    for (const r of plan.rutas) for (const p of r.paradas) filas.push(`${r.vehiculo},${p}`);
    fs.writeFileSync(archivo, filas.join("\n") + "\n");
  } else {
    fs.writeFileSync(archivo, JSON.stringify(plan, null, 2) + "\n");
  }
}
