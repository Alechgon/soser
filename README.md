# SOSER · Agregar Caso (App Web + Google Apps Script) — v2

App web de registro de casos de mantención con identidad SOSER. Los casos se guardan en tu Google Sheet vía Apps Script.

## Novedades v2
- **Configuración protegida con clave** (123456789), como botón pequeño en la esquina inferior.
- **Todas las pantallas responsivas sin scroll**: el grid de categorías (Gas, Electricidad, Filtraciones, Infraestructura, Equipos, Otro) y demás pantallas caben planas en celular y tablet, sin deslizar.
- **Home con dos tarjetas grandes iguales**: "Agregar caso" y "Reportes generados" (mismo estilo), una sobre otra.
- **Reportes generados sincronizados con el Sheet**: aunque se borre el caché del teléfono, la app los vuelve a leer desde el Sheet, mostrando el estado **Visado** y **Derivado a**.
- GPS activo desde el inicio (chip en la barra superior).

## Archivos
- `index.html`, `app.js`, `data.js`, `.nojekyll` → la app (GitHub Pages).
- `AppsScript_SOSER.gs` → script para tu Google Sheet.

## Columnas en el Sheet (hoja por encargado)
ID · Fecha · RBD · Establecimiento · Dirección · Comuna · Institución · Supervisor · Técnico · Categoría · Descripción · GPS · Precisión · Verificadores · Timestamp · **Visado** · **Derivado a**

Las dos últimas columnas las llenas tú (o tu otra app). La app de terreno las **lee** y las muestra en "Reportes generados".

## Instalar / ACTUALIZAR el Apps Script
Ya tienes una versión pegada. Para activar la lectura de reportes y las columnas Visado/Derivado:
1. Google Sheet ▸ Extensiones ▸ Apps Script.
2. Borra todo y pega el nuevo `AppsScript_SOSER.gs`.
3. Ejecuta **primeraVez** una vez (▶).
4. Implementar ▸ **Gestionar implementaciones** ▸ editar (lápiz) ▸ Versión: **Nueva versión** ▸ Implementar. Así conservas la **misma URL /exec** que ya pegaste en la app.
   - Ejecutar como: Yo · Acceso: Cualquier persona.

## Publicar la app
Sube `index.html`, `app.js`, `data.js`, `.nojekyll` a un repo → Settings ▸ Pages ▸ main ▸ /(root). HTTPS para cámara y GPS.

## Nota honesta
El envío de casos usa `no-cors` (la app no lee la respuesta al escribir), por eso el caso queda también en caché local con opción de reintento. En cambio la **lectura** de reportes (doGet) sí devuelve JSON y es la que sincroniza Visado/Derivado desde el Sheet. Para que la lectura funcione, la implementación debe tener acceso "Cualquier persona".
