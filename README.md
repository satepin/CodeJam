# CodeJam — QuickDrop

Generador de planes de reparto para QuickDrop (CodeJam EICA/UNViMe 2026). JavaScript, Node 18 o más, sin dependencias.

## Uso

```bash
node index.js datos/practica plan.json
node index.js datos/practica plan.json --segundos 30 --semilla 7
```

Verificar con el simulador oficial:

```bash
python -m quickdrop simular datos/practica plan.json --detalle
```

## Estructura

```
index.js              lee argumentos, carga el dataset, resuelve y escribe plan.json
src/cargar.js         lee mundo/pedidos/vehiculos (JSON) y aplica valores por defecto
src/evaluador.js      calcula el costo igual que el simulador oficial
src/constructores.js  vecino más cercano y barrido (solución inicial)
src/mejoras.js        2-opt y recocido simulado
src/solver.js         prueba cada cantidad de vehículos y arma el plan
```

## Estrategia

1. **Barrido** alrededor del depósito para repartir los pedidos en sectores, con vecino más cercano dentro de cada sector.
2. **2-opt** para eliminar los cruces de cada ruta.
3. **Recocido simulado** sobre el costo real (distancia + vehículos + makespan + fallas). Las rutas pueden vaciarse, así que el algoritmo decide solo cuántos vehículos usar.
4. Se repite para cada cantidad de vehículos y se queda con la mejor.

## Resultados (dataset de práctica, verificados con el simulador oficial)

| Estrategia | Costo |
|---|---|
| Barrido + 2-opt, 1 vehículo | 1112 |
| Barrido + 2-opt, mejor cantidad (2) | 958 |
| + Recocido simulado (20 s) | 922 |
