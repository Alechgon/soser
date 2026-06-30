# SOSER · Bitácora de Mantención (App Web)

Aplicación web de inspección de mantención en terreno para establecimientos JUNAEB/JUNJI-Integra (Licitación 85-34-LR25). Inspirada en el flujo tipo Frogmi, hecha a medida para SOSER.

## Qué hace
- **Inicio** con dos flujos: Bitácora preventiva y Bitácora correctiva.
- **Selección de establecimiento** por RBD o por nombre, con autocompletado en vivo sobre los 118 establecimientos cargados (soporta RBD repetidos colegio+jardín). Al elegir, completa dirección, comuna, supervisor e institución.
- **Cuestionario por activos** (Cocina → artefacto de calor, hornos, lavamanos; Equipos de frío; Enchufes; Documentación) con ramificaciones: cada "No" abre un campo *Indique* obligatorio + verificador (foto o video de máx. 15 s); los "Sí" que lo requieren piden foto.
- **Equipos de frío dinámicos**: agrega refrigeradores/visicooler con litros y cantidad.
- **Panel de secciones** (☰): lista desplegable de lo ya respondido, con miniaturas, editable y con salto al punto del cuestionario.
- **Recepción**: lista de personas (nombre + cargo) y lector de **ID por cámara** (OCR). Reconoce el documento y autocompleta; si falla, ingreso manual de respaldo.
- **Exportación**: al terminar descarga un **.zip** con el Excel de la bitácora + carpeta `/fotos`; el Excel enlaza cada verificador por ruta relativa. Incluye fecha/hora y GPS del momento.

## Cómo publicar en GitHub Pages
1. Crea un repositorio nuevo y sube estos archivos (`index.html`, `app.js`, `data.js`, `README.md`, `.nojekyll`).
2. En el repo: **Settings ▸ Pages ▸ Source: Deploy from a branch ▸ main ▸ /(root)**.
3. Abre la URL que entrega GitHub. **Debe ser HTTPS** para que funcionen cámara y GPS.

## Notas técnicas
- Sin framework. Librerías por CDN: SheetJS (Excel), JSZip (zip), Tesseract.js (OCR).
- Cámara/GPS requieren HTTPS y permiso del usuario.
- El lector de ID por OCR es de mejor esfuerzo; siempre hay ingreso manual de respaldo.
- Datos del establecimiento embebidos en `data.js` (editable).
