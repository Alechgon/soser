/*******************************************************************
 * SOSER · Backend "Agregar Caso" — Google Apps Script
 * -----------------------------------------------------------------
 * Qué hace:
 *  - Recibe los casos que envía la app web (POST).
 *  - Crea/usa una carpeta en Drive para las fotos/videos y las sube,
 *    devolviendo un link; el archivo se nombra foto_/video_<RBD>_<fecha_hora>.
 *  - Crea una hoja por cada encargado (nombre de hoja = nombre encargado)
 *    y escribe una fila por caso, con ID correlativo, GPS, categoría,
 *    descripción y los links de verificadores.
 *  - Mantiene una hoja "Configuración" con todos los RBD (comuna,
 *    supervisor, establecimiento, institución, técnico) y las preguntas/
 *    textos de la app (editables por ti).
 *
 * Cómo instalar (una sola vez):
 *  1. Abre tu Google Sheet ▸ menú Extensiones ▸ Apps Script.
 *  2. Borra lo que haya y pega TODO este archivo.
 *  3. Arriba, en el selector de función elige "primeraVez" y pulsa ▶ (Ejecutar).
 *     Autoriza los permisos que pida (a tu propia cuenta).
 *     Esto crea la hoja Configuración con los RBD y textos.
 *  4. Botón "Implementar" ▸ "Nueva implementación" ▸ tipo "Aplicación web".
 *     - Ejecutar como: Yo.
 *     - Quién tiene acceso: Cualquier persona.
 *     Copia la URL que termina en /exec.
 *  5. Pega esa URL en la app (Configuración) junto a tu nombre de encargado.
 *
 * Nota: la primera vez que llega un caso, se crea la carpeta de Drive
 *       "SOSER_Casos_<idHoja>" automáticamente.
 *******************************************************************/

// === Ajusta aquí si quieres precargar/editar los RBD desde el script ===
// (También puedes editarlos directamente en la hoja Configuración.)
var RBD_SEMILLA = [
  // [RBD, Establecimiento, Direccion, Comuna, Supervisor, Institucion, Tecnico]
  // Se rellena en primeraVez() sólo si la hoja está vacía. Puedes dejar [] y cargarlos a mano.
];

var PREGUNTAS_APP = [
  ['Pantalla','Texto'],
  ['Inicio - título','Gestión de Casos'],
  ['Agregar caso - establecimiento','Indica el establecimiento'],
  ['Categorías','Gas | Electricidad | Filtraciones | Infraestructura | Equipos | Otro'],
  ['Descripción - label','Indique'],
  ['Verificadores','Foto | Video (máx 15s)'],
  ['Regla técnico','Estación Central = Multitécnico · Santiago = Rodrigo Martínez · resto = Por asignar']
];

function primeraVez() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Hoja Configuración
  var cfg = ss.getSheetByName('Configuración') || ss.insertSheet('Configuración');
  if (cfg.getLastRow() === 0) {
    cfg.getRange(1,1,1,7).setValues([['RBD','Establecimiento','Dirección','Comuna','Supervisor','Institución','Técnico mantención']]);
    cfg.getRange(1,1,1,7).setFontWeight('bold').setBackground('#333333').setFontColor('#ffffff');
    if (RBD_SEMILLA.length) cfg.getRange(2,1,RBD_SEMILLA.length,7).setValues(RBD_SEMILLA);
    cfg.setFrozenRows(1);
    // Bloque de textos de la app, más abajo
    var startRow = Math.max(cfg.getLastRow(), 1) + 3;
    cfg.getRange(startRow,1).setValue('TEXTOS / PREGUNTAS DE LA APP (editables)').setFontWeight('bold');
    cfg.getRange(startRow+1,1,PREGUNTAS_APP.length,2).setValues(PREGUNTAS_APP);
    cfg.getRange(startRow+1,1,1,2).setFontWeight('bold').setBackground('#F49A0F').setFontColor('#ffffff');
  }
  SpreadsheetApp.getUi().alert('Listo. Hoja "Configuración" creada. Ahora implementa como aplicación web y copia la URL /exec.');
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1) Hoja del encargado
    var nombreHoja = (data.encargado || 'Sin encargado').substring(0,90);
    var sh = ss.getSheetByName(nombreHoja);
    if (!sh) {
      sh = ss.insertSheet(nombreHoja);
      sh.appendRow(['ID','Fecha','RBD','Establecimiento','Dirección','Comuna','Institución','Supervisor','Técnico','Categoría','Descripción','GPS','Precisión (m)','Verificadores','Timestamp']);
      sh.getRange(1,1,1,15).setFontWeight('bold').setBackground('#333333').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }

    // 2) Carpeta de Drive para verificadores
    var folder = obtenerCarpeta(ss.getId());
    var links = [];
    if (data.media && data.media.length) {
      for (var i=0; i<data.media.length; i++) {
        var m = data.media[i];
        var blob = Utilities.newBlob(Utilities.base64Decode(m.data), m.mime, m.name);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        links.push(m.name + ': ' + file.getUrl());
      }
    }

    // 3) Escribir fila
    sh.appendRow([
      data.reporteId||'', data.fecha||'', data.rbd||'', data.establecimiento||'',
      data.direccion||'', data.comuna||'', data.institucion||'', data.supervisor||'',
      data.tecnico||'', data.categoria||'', data.descripcion||'',
      data.gps||'', data.gps_acc||'', links.join('\n'), data.timestamp||''
    ]);

    return ContentService.createTextOutput(JSON.stringify({ok:true, id:data.reporteId})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function obtenerCarpeta(idHoja) {
  var nombre = 'SOSER_Casos_' + idHoja;
  var it = DriveApp.getFoldersByName(nombre);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(nombre);
}

// Permite probar en el navegador que la URL /exec responde
function doGet() {
  return ContentService.createTextOutput('SOSER Casos backend activo. Usa POST desde la app.');
}
