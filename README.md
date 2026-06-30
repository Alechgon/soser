# SOSER · Bitácora de Mantención (App Web v2)

App web de inspección de mantención en terreno para SOSER (Licitación 85-34-LR25), con identidad visual SOSER (gris carbón + degradado naranja-verde).

## Novedades v2
- **Colorimetría SOSER** aplicada (logo gota, gris carbón, acento naranja→verde).
- **GPS desde el inicio**: arranca al entrar a una bitácora y se refina en segundo plano; el chip del encabezado muestra la precisión actual.
- **Escáner de ID en vivo**: la cámara lee en continuo y se dispara sola al detectar el número del documento (no hay que tomar la foto). Respaldo manual si no engancha.
- **Cierre con dos caminos**: *Ingreso manual* (nombre, RUT, cargo y firma dibujada) o *Identificación* (cámara → autocompleta). Ambos llegan a la **misma pantalla de validación** con todos los datos + firma + "Terminar y descargar".
- **Excel expandido en columnas**: hoja Resumen + hoja Detalle donde cada pregunta despliega sus datos hacia la derecha (Dato 1/2/3, Indique, Verificadores), y los equipos de frío se abren una fila por equipo.

## Bitácora preventiva
Establecimiento → cuestionario por activos (artefacto de calor, hornos, lavamanos, equipos de frío, enchufes, documentación) con ramificaciones, *Indique* obligatorio en cada "No" + verificador foto/video → recepción → validación → ZIP.

## Bitácora correctiva
Establecimiento (con botón **Agregar ticket** arriba: ingresa 4 dígitos, p. ej. 1234, y muestra el ticket asignado) → **zona** a intervenir → **reparación** (falla, acción, fotos antes/después) → **gastos** (¿ocupó repuestos/gastos locales? Sí→detalle / No→sigue) → si hay ticket, **estado** (Solucionado/Pendiente/Derivado) → recepción → validación → ZIP.

## Publicar en GitHub Pages
1. Sube `index.html`, `app.js`, `data.js`, `README.md`, `.nojekyll` a un repo.
2. Settings ▸ Pages ▸ Deploy from a branch ▸ main ▸ /(root).
3. Abre la URL HTTPS (necesario para cámara y GPS).

## Datos de ejemplo precargados
- Ticket **1234** → "Anafe no anclado", Estado de Palestina (RBD 9880), subido por Mecheverría.
- ID **2** → Manuel Alejandro Echeverría González, RUT 19.000.000-3, cargo Admin.
