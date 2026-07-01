# SOSER · Agregar Caso (App Web + Google Apps Script)

App web de registro de casos de mantención (solo correctivo) con identidad SOSER (gris carbón + degradado naranja-verde). Los casos se guardan en tu Google Sheet mediante un Apps Script.

## Archivos
- `index.html`, `app.js`, `data.js` → la app web (se sube a GitHub Pages).
- `AppsScript_SOSER.gs` → el script que pegas en tu Google Sheet.

## Flujo de la app
Inicio (Agregar caso · Reportes generados · Configuración) → elegir establecimiento por RBD o nombre (con técnico por comuna: Estación Central = Multitécnico, Santiago = Rodrigo Martínez) → grid de categorías (Gas, Electricidad, Filtraciones, Infraestructura, Equipos, Otro) → descripción (Indique) + verificadores foto/video → Finalizar. El GPS se activa al entrar y queda listo al enviar. Cada reporte tiene un ID correlativo por encargado (ej. M0001) y se guarda en caché local (Reportes generados) aunque falle el envío, con opción de reintentar.

## Instalar el Apps Script (una sola vez)
1. Abre tu Google Sheet ▸ **Extensiones ▸ Apps Script**.
2. Borra lo que haya y pega todo `AppsScript_SOSER.gs`.
3. Selecciona la función **primeraVez** y pulsa ▶ Ejecutar (autoriza permisos). Esto crea la hoja **Configuración** con los RBD y los textos editables.
4. **Implementar ▸ Nueva implementación ▸ Aplicación web**: ejecutar como *Yo*, acceso *Cualquier persona*. Copia la URL que termina en **/exec**.
5. En la app ▸ **Configuración**, pega esa URL y tu **nombre de encargado**. Guarda.

## Qué escribe en el Sheet
- Una **hoja por encargado** (nombre de hoja = nombre del encargado).
- Una fila por caso: ID, fecha, RBD, establecimiento, dirección, comuna, institución, supervisor, técnico, categoría, descripción, GPS, precisión, verificadores (links) y timestamp.
- Las fotos/videos se suben a una carpeta de Drive `SOSER_Casos_<id>` y quedan **enlazadas** en la fila. Se nombran `foto_<RBD>_<fecha_hora>` o `video_<RBD>_<fecha_hora>`.
- La hoja **Configuración** trae todos los RBD (comuna, supervisor, establecimiento, institución, técnico) y los textos de la app, todo editable por ti.

## Publicar la app en GitHub Pages
Sube `index.html`, `app.js`, `data.js`, `.nojekyll` a un repo → Settings ▸ Pages ▸ main ▸ /(root). Ábrela en HTTPS (necesario para cámara y GPS).

## Nota honesta
El envío usa `no-cors` (la app no lee la respuesta del script), por eso el caso se guarda siempre en caché local y, si algo falla, puedes reintentar desde "Reportes generados". La foto se sube completa a Drive y se enlaza en el Sheet, tal como pediste.
