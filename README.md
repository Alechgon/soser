# SOSER · Agregar Caso — v5

App web de registro de casos de mantención (SOSER). Guarda en Google Sheet vía Apps Script; verificadores (fotos/videos) en Google Drive.

## Novedades v5

- **FIX fotos en verificadores (General y Mis reportes)**: los links de Drive (`/file/d/ID/view`) devuelven una página, no la imagen; por eso no se veían. Ahora se extrae el ID y se usan endpoints embebibles:
  - Foto: `lh3.googleusercontent.com/d/ID=w1600` (fallback automático a `drive.google.com/thumbnail?id=ID&sz=w1600`).
  - Video: reproductor de Drive en iframe (`/file/d/ID/preview`).
  - Si nada funciona (permiso o archivo movido), el visor muestra el botón **Abrir en Drive ↗**.
- **General = TODOS los casos**: los KPI de la pestaña General suman todos los tickets de todos los encargados, con subtítulo resumen (establecimientos con casos, encargados, registros totales).
- **Buscador General completo**: busca por **nombre o RBD** sobre **toda la BBDD** (igual que en Agregar caso). Cada resultado muestra al lado un badge **"N caso(s)"** (naranjo) o **"Sin casos"** (gris). Se ordena primero los que tienen casos.
- **KPIs por establecimiento**: al tocar un resultado, aparece una tarjeta con el colegio (nombre, RBD, comuna, técnico) y los KPI pasan a ser **solo de ese establecimiento** (aunque sean 0). La ✕ vuelve a la vista general.
- **Botón ↻ Actualizar** en Reportes (refresca Mis reportes o General según la pestaña).
- **Reintento de subida**: si un verificador falla, el recuadro rojo del thumbnail ahora es un botón **Reintentar** (mismo nombre de archivo, sin duplicar).
- **Reenviar pendientes**: los casos que quedaron "Pendiente envío" (sin señal) tienen botón **📤 Reenviar** en Mis reportes; reconstruye el payload completo desde la BBDD.
- **Fotos de galería más livianas**: se reducen a máx 1920 px antes de subir (las fotos de 10+ MB del teléfono demoraban o reventaban el límite del backend).
- **Verificadores con URL desde el origen**: la app ya envía `foto: nombre -> url` al registrar el caso, así el backend no depende de buscar el archivo por nombre en Drive.
- **IDs sin colisión**: el correlativo del reporte considera también lo que ya existe en el Sheet, así no se repite si se borra el caché del teléfono.
- **Visor mejorado**: swipe izquierda/derecha, flechas de teclado, Esc para cerrar, precarga de la imagen siguiente, spinner de carga.
- **Pulido general**: escape de HTML en todo contenido dinámico (descripciones con `<`, comillas, etc. ya no rompen la vista), timeout de 90 s en subidas, foco visible para accesibilidad, `prefers-reduced-motion`, breakpoints tablet/desktop (≥700 px y ≥1000 px), y se eliminó la librería XLSX que se cargaba sin usarse (app 100 % sin dependencias externas: mejor para señal mala en terreno).

## Archivos

- `index.html`, `app.js`, `data.js`, `.nojekyll` → app (GitHub Pages).
- `AppsScript_SOSER.gs` → backend del Sheet (**v3**, hay que re-implementar).

## IMPORTANTE: actualizar el Apps Script (v3)

En tu Sheet: Extensiones ▸ Apps Script ▸ borra todo ▸ pega este `.gs` ▸ Implementar ▸ Gestionar implementaciones ▸ lápiz ▸ **Nueva versión** ▸ Implementar. Mantiene la misma URL `/exec`. Acceso: **Cualquier persona**. (Es retrocompatible: los teléfonos que sigan con la app v4 no se rompen.)

## Publicar

Sube los archivos a un repo ▸ Settings ▸ Pages ▸ main ▸ /(root). **Debe ser HTTPS** para cámara y GPS.

---

# Base para la app Administradora (contrato de datos)

Esta sección deja especificada la API para construir el panel admin sobre el mismo backend, sin tocar esta app.

## Arquitectura

```
App terreno (esta) ──POST caso/archivos──▶ Apps Script /exec ──▶ Google Sheet (1 hoja por encargado)
                                                    │                    Google Drive (carpeta SOSER_Casos_<sheetId>)
App admin (futura) ──GET ?admin=1 ─────────────────┘
                   ──POST derivar / visar / borrar
```

## Endpoints (GET)

| Llamada | Devuelve |
|---|---|
| `GET /exec?admin=1` | `{ok:true, reportes:[...]}` — **todos** los casos de todas las hojas de encargados |
| `GET /exec?encargado=NOMBRE` | `{ok:true, reportes:[...]}` — casos de ese encargado |

Cada reporte:

```json
{
  "encargado": "Manuel Echeverría", "fila": 7,
  "id": "M0007", "fecha": "05-07-2026, 10:32:11", "rbd": "9880",
  "establecimiento": "ESTADO DE PALESTINA", "direccion": "...", "comuna": "...",
  "institucion": "JUNAEB", "supervisor": "...", "tecnico": "Multitécnico",
  "categoria": "Electricidad", "descripcion": "...",
  "gps": "-33.451234, -70.712345", "precision": 8,
  "verificadores": "foto: foto_9880_..jpg -> https://drive.google.com/file/d/ID/view\nvideo: video_9880_..webm -> https://drive.google.com/file/d/ID/view",
  "timestamp": "2026-07-05T13:32:11.000Z",
  "visado": "", "derivadoA": ""
}
```

## Endpoints (POST, body JSON con `Content-Type: text/plain`)

| `accion` | Payload | Efecto |
|---|---|---|
| `caso` | id, encargado, datos del establecimiento, categoría, descripción, gps, `verificadores` (líneas `tipo: nombre -> url`) | Agrega fila a la hoja del encargado |
| `subirArchivo` | `fileName, mime, data(base64), encargado` | Sube a Drive, devuelve `{ok, url}` |
| `borrarArchivo` | `fileName, encargado` | Envía el archivo a papelera |
| `borrar` | `encargado, reporteId, motivo` | Borrado **lógico**: `Visado = "ELIMINADO: motivo"`, fila gris |
| `derivar` | `encargado, reporteId, derivadoA` (opcional `visado`) | Escribe "Derivado a" |
| `visar` | `encargado, reporteId, visado` | Escribe "Visado" |

## Convenciones de estado (derivadas de las columnas, en este orden)

1. `visado` empieza con `ELIMINADO` → **Eliminado** (tachado, al final).
2. `visado` contiene `final`/`solucion` → **Finalizado**.
3. `derivadoA` con valor → **Derivado**.
4. `visado` con valor → **Visado**.
5. Nada → **Sin visar**.

## Media en Drive (para el visor del admin)

- Extraer ID: regex `\/file\/d\/([-\w]{20,})` o `[?&]id=([-\w]{20,})`.
- Imagen embebible: `https://lh3.googleusercontent.com/d/ID=w1600` (fallback `https://drive.google.com/thumbnail?id=ID&sz=w1600`).
- Video embebible: `<iframe src="https://drive.google.com/file/d/ID/preview">`.
- Los archivos se comparten como *cualquiera con el link (viewer)* al subirse.

## Notas para el admin

- Las hojas del Sheet cuyo nombre no sea de sistema (`Configuración`) son hojas de encargado.
- `fila` en la respuesta admin permite ubicar el registro exacto si se quiere escribir directo.
- Para notificaciones, hacer polling a `?admin=1` y comparar `id`+`encargado` contra lo ya visto (así funciona el panel admin actual).
