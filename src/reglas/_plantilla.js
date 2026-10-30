// Plantilla para una regla nueva. Copiar, renombrar y registrar en ./index.js.
// IMPORTANTE: implementar la regla EXACTAMENTE como la describe la guía del evento
// y verificar con un test contra el simulador oficial (git pull del quickdrop-sim).
export default {
  nombre: "plantilla",

  // ¿Corre en este dataset? Ej.: solo si algún pedido trae el campo nuevo.
  aplica(inst) {
    return inst.pedidos.some((p) => p.campo_nuevo != null);
  },

  // Se llama al llegar a un pedido, ANTES del tiempo de servicio.
  // ctx.reloj = minutos desde 00:00; se puede modificar (ej. esperar).
  // Devolver una penalización (número) o 0.
  alVisitar(ctx, pedido, vehiculo) {
    return 0;
  },

  // Se llama en cada parada DEPOSITO (ej. reiniciar la carga del viaje).
  alRecargar(ctx, vehiculo) {},

  // Costo adicional sobre la solución completa.
  costoExtra(resumen, inst, sol) {
    return 0;
  },
};
