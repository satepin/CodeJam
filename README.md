# CodeJam — QuickDrop

Generador de planes de reparto para QuickDrop (CodeJam EICA/UNViMe 2026). JavaScript puro, Node 18 o más, sin dependencias.

## Uso

```bash
# Genera el plan (JSON o CSV según la extensión de salida)
node index.js datos/practica plan.json
node index.js datos/practica plan.csv --segundos 30 --semilla 7

# Si el dataset viene solo en CSV
node index.js carpeta_dataset plan.json --formato csv

# Tests (el evaluador tiene que coincidir con el simulador oficial)
npm test
```

Verificar con el simulador oficial:

```bash
python -m quickdrop simular datos/practica plan.json --detalle
```

**En un cierre:** descargar el dataset → `node index.js <carpeta> plan.json` → subir `plan.json`. Sin pasos a mano.

## Estructura

```
index.js              CLI: lee argumentos, carga, resuelve, escribe
src/cargar.js         lee mundo/pedidos/vehiculos en JSON o CSV, aplica defaults, conserva campos extra
src/evaluador.js      simulación + costo oficial  ← ÚNICO lugar con reglas del problema
src/constructores.js  vecino más cercano, barrido (sweep)
src/mejoras.js        2-opt, recocido simulado (relocate / swap / inversión)
src/solver.js         prueba cada k de vehículos, pulido final, conversión al plan
src/escribir.js       salida JSON / CSV
test/                 tests contra valores del simulador oficial
```

**Decisión de diseño clave:** el recocido no sabe nada de las reglas, solo llama a `inst.costo(sol)`. Cuando un evento agregue una regla (capacidad, ventanas horarias, velocidades por vehículo), se modifica `evaluador.js` y el algoritmo sigue funcionando.

## Estrategia

1. **Barrido** alrededor del depósito para repartir los pedidos en k sectores, con vecino más cercano dentro de cada sector.
2. **2-opt** para eliminar los cruces de cada ruta.
3. **Recocido simulado** sobre el costo real (distancia + vehículos + makespan + fallas). Las rutas pueden vaciarse, así que el algoritmo decide solo cuántos vehículos usar. También puede dejar un pedido sin entregar si eso sale más barato que la falla.
4. Se repite para k = 1…K y al final se pule la mejor solución.

## Registro de decisiones (para el pitch)

| Estrategia | Dataset de práctica N2 (40 pedidos) |
|---|---|
| Barrido + 2-opt, 1 vehículo | 1112 |
| Barrido + 2-opt, mejor k (2) | 958 |
| + Recocido simulado (20 s) | 922 |
| Depósito movido a (10,10) | 814 con 3 vehículos |

Todos los valores están verificados con el simulador oficial.

Observaciones:
- Con los costos por defecto conviene usar 2 vehículos (depósito en la esquina) o 3 (depósito en el centro). Usar los 5 sale más caro por el costo fijo.
- **Probamos repartir los 20 s en varias corridas con semillas distintas y no mejoró**: promedio de 3 semillas con 1 corrida = 914, con 4 = 918, con 8 = 919. Nos quedamos con 1 corrida larga (`--reinicios` sigue disponible).

## Nivel 3: preparados para los eventos

- Las reglas nuevas van en `src/reglas/` (ver `_plantilla.js`) y se registran en `src/reglas/index.js`. El algoritmo no se toca.
- Cada vehículo puede tener sus propios parámetros (`param(vehiculo, campo)` usa el del vehículo si existe, si no el del mundo). Por ejemplo, `min_por_cuadra` por vehículo ya funciona.
- El reloj de la simulación está en minutos desde 00:00 (`ctx.reloj`), listo para ventanas horarias.
- `DEPOSITO` ya está soportado en la simulación y en el plan (recarga = nuevo viaje, hook `alRecargar`).
- Flujo por evento: `git pull` del quickdrop-sim → leer la guía → regla nueva + test contra el simulador → probar con la práctica → commit → entregar.

## Flujo de Git

- Una rama por regla o evento (`evento-1-capacidad`, etc.), merge a `main` cuando los tests pasan.
- Commits chicos y descriptivos: el historial muestra cómo nos adaptamos.
