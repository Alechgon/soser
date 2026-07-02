# SOSER · Agregar Caso — v3 (rediseño premium)

App web de registro de casos de mantención con identidad SOSER. Los casos se guardan en tu Google Sheet vía Apps Script.

## Cambios v3
- **Configuración**: ícono ⚙️ solo (sin texto) en el inicio, protegido con clave 123456789.
- **Categorías renombradas**: Calor (🔥 — Equipos, gas, filtración), Electricidad (Enchufes, iluminación, observaciones), Filtraciones (Agua, cañería, humedad), Infraestructura (Mosquiteros, pisos, muros), Frío (🧊 — Equipos, temperatura, filtración), Otro.
- **Categoría por toque**: seleccionar el cuadro avanza directo (sin botón Continuar); solo queda el back. La categoría se registra igual en el Sheet.
- **Establecimiento arriba de RBD**; al elegir, los campos se contraen en una **burbuja tipo Messenger** y se ven los datos sin scroll. Tocar la burbuja vuelve a buscar.
- **Responsivo total** (vertical y horizontal): el menú de categorías ocupa toda la pantalla sin scroll en cualquier tamaño; en horizontal usa 3 columnas.
- **Subida de verificadores en segundo plano**: apenas tomas la foto/video empieza a subir. Cada miniatura muestra su progreso (spinner → ✓). Si eliminas con la X, se cancela y, si ya estaba en la nube, se borra ese archivo. Barra de carga al finalizar.
- **Reportes generados**: KPIs arriba (Total, Derivados, Solucionados) compactos; buscador de establecimientos con casos; al elegir uno, los KPIs cambian a ese establecimiento (y "‹ Ver todos" vuelve a los generales). Solo la **lista** de casos hace scroll, no la pantalla entera.
- **Eliminar caso**: botón 🗑️ abre un cuadro con fondo difuminado que pide **motivo**; al eliminar, el ticket queda gris y baja al final de la lista.

## Archivos
- `index.html`, `app.js`, `data.js`, `.nojekyll` → la app (GitHub Pages).
- `AppsScript_SOSER.gs` → script del Sheet (incluye subida en background, borrado de archivo, borrado lógico, y el modo admin/derivar del panel).

## IMPORTANTE: actualizar el Apps Script
Este `.gs` reemplaza al anterior. En tu Sheet: Extensiones ▸ Apps Script ▸ borra todo ▸ pega este ▸ ejecuta `primeraVez` ▸ Implementar ▸ Gestionar implementaciones ▸ lápiz ▸ Nueva versión ▸ Implementar (conserva la misma URL /exec).

## Nota honesta
El envío usa `no-cors`, así que la app no lee la respuesta al escribir; por eso el caso queda también en caché local con reintento, y la subida en background asume éxito salvo error de red (ahí la miniatura queda marcada con "!"). La lectura de reportes (para KPIs y estados desde el Sheet) sí devuelve JSON.
