/* ============================================================
   SOSER · Agregar Caso — App Web v5
   ------------------------------------------------------------
   Novedades v5 (respecto a v4):
   - FIX visor: las fotos/videos de Drive ahora SÍ se ven
     (conversión de links de Drive a endpoints embebibles).
   - Pestaña General: KPIs sobre TODOS los casos de todos los
     encargados + subtítulo con resumen.
   - Buscador General: muestra TODOS los establecimientos de la
     BBDD (por nombre o RBD, igual que en Agregar caso), con
     badge "N caso(s)" / "Sin casos" al lado de cada uno.
   - Al elegir un establecimiento, los KPIs pasan a ser LOS DE
     ESE establecimiento (aunque tenga 0) + tarjeta de contexto.
   - Botón ↻ actualizar, reintento de subidas con error,
     reenvío de casos pendientes, swipe/teclado en el visor,
     escape de HTML, IDs sin colisión tras borrar caché.
   ============================================================ */
'use strict';

/* ------------------------- Base ------------------------- */
const COL = { RBD: 0, NOM: 1, DIR: 2, COM: 3, SUP: 4, INST: 5, TEC: 6 };
const LOGO_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F49A0F"/><stop offset="0.5" stop-color="#E8A30C"/><stop offset="1" stop-color="#7DB61C"/></linearGradient></defs><path d="M50 12 C30 12 20 30 28 48 C34 62 50 64 50 64 C50 64 66 62 72 48 C80 30 70 12 50 12 Z" fill="url(#sg)"/><path d="M50 20 C44 30 56 40 50 52 C46 44 54 34 50 20 Z" fill="#2E7D32" opacity="0.85"/></svg>`;
const LS_CFG = 'soser_caso_cfg', LS_REPORTS = 'soser_caso_reports';
const CFG_PIN = '123456789';
const VIDEO_MAX = 15;               // segundos máx de video
const FOTO_MAX_LADO = 1920;         // px máx de fotos de galería (reduce peso de subida)

const State = { est: null, cat: null, emergencia: false, desc: '', media: [], gps: null, gpsWatch: null, startedAt: null };
let CFG = loadCfg();

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const content = $('#content'), navwrap = $('#navwrap'), overlays = $('#overlays');
const btnBack = $('#btnBack'), btnNext = $('#btnNext');
$('#logoSlot').innerHTML = LOGO_SVG;

/* --------------------- Utilidades ---------------------- */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function toast(m, ms = 2200) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
function norm(s) { return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function loadCfg() { try { return JSON.parse(localStorage.getItem(LS_CFG)) || {}; } catch { return {}; } }
function saveCfg(c) { localStorage.setItem(LS_CFG, JSON.stringify(c)); CFG = c; }
function loadReports() { try { return JSON.parse(localStorage.getItem(LS_REPORTS)) || []; } catch { return []; } }
function saveReports(r) { try { localStorage.setItem(LS_REPORTS, JSON.stringify(r)); } catch (e) { toast('Sin espacio local para guardar el historial.'); } }
function stamp() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`; }
function showNav(show) { navwrap.classList.toggle('hidden', !show); }

/* IDs sin colisión: usa el máximo entre el contador local y lo que ya
   existe en el Sheet (repMios), así no se repite tras borrar caché. */
function nextReportId() {
  const ini = (CFG.encargado || 'X').trim().charAt(0).toUpperCase();
  const nums = [];
  loadReports().filter(r => r.encargado === CFG.encargado).forEach(r => { const m = String(r.id || '').match(/(\d+)$/); if (m) nums.push(+m[1]); });
  repMios.forEach(r => { const m = String(r.id || '').match(/(\d+)$/); if (m) nums.push(+m[1]); });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return ini + String(next).padStart(4, '0');
}

/* ------------- Google Drive: links embebibles ------------- */
/* Un link normal de Drive (https://drive.google.com/file/d/ID/view)
   devuelve una PÁGINA, no la imagen -> por eso "no se veían las fotos".
   Se extrae el ID y se usan endpoints que sí sirven el contenido. */
function driveIdFrom(url) {
  if (!url) return '';
  let m = String(url).match(/\/file\/d\/([-\w]{20,})/); if (m) return m[1];
  m = String(url).match(/[?&]id=([-\w]{20,})/); if (m) return m[1];
  m = String(url).match(/googleusercontent\.com\/d\/([-\w]{20,})/); if (m) return m[1];
  return '';
}
function driveImgSources(id) {
  return [
    `https://lh3.googleusercontent.com/d/${id}=w1600`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w1600`
  ];
}
function driveVideoPreview(id) { return `https://drive.google.com/file/d/${id}/preview`; }
function driveOpenUrl(id) { return `https://drive.google.com/file/d/${id}/view`; }

/* ------------------------- GPS -------------------------- */
function startGPS() {
  const chip = $('#gpsChip'), dot = $('#gpsDot'), txt = $('#gpsTxt');
  chip.classList.remove('hidden'); dot.className = 'dot wait'; txt.textContent = 'GPS…';
  if (!navigator.geolocation) { txt.textContent = 'Sin GPS'; dot.className = 'dot'; return; }
  if (State.gpsWatch) navigator.geolocation.clearWatch(State.gpsWatch);
  State.gpsWatch = navigator.geolocation.watchPosition(
    p => { State.gps = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }; dot.className = 'dot ok'; txt.textContent = '±' + Math.round(p.coords.accuracy) + 'm'; },
    () => { dot.className = 'dot'; txt.textContent = 'GPS off'; },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
}
function stopGPS() { if (State.gpsWatch) { navigator.geolocation.clearWatch(State.gpsWatch); State.gpsWatch = null; } }

/* ------------------------- HOME ------------------------- */
function renderHome() {
  stopGPS(); $('#gpsChip').classList.add('hidden'); showNav(false); $('#btnHome').classList.add('hidden'); $('#modeLabel').textContent = 'Casos';
  const cfgOk = CFG.sheetUrl && CFG.encargado;
  const nrep = loadReports().filter(r => r.encargado === CFG.encargado).length;
  content.innerHTML = `<div class="screen"><div style="flex:0 0 auto">
    <div class="hero"><div class="mark">${LOGO_SVG}</div><h1>Gestión de Casos</h1>
      <p>${cfgOk ? ('Encargado: ' + esc(CFG.encargado)) : 'Registro de mantención · SOSER'}</p></div>
    <div class="home-actions">
      <button class="emerg-action" id="aEmerg"><div class="pulse"></div><div class="pa-ic">🚨</div><div><h3>Emergencia</h3><p>Reporte inmediato · salta la categoría</p></div><div class="pa-arrow">›</div></button>
      <button class="primary-action" id="aAdd"><div class="pa-ic">➕</div><div><h3>Agregar caso</h3><p>Nuevo reporte de mantención en terreno</p></div><div class="pa-arrow">›</div></button>
      <button class="primary-action rep" id="aReports"><div class="pa-ic">📋</div><div><h3>Reportes generados</h3><p>${nrep} registrado(s) · estados y derivaciones</p></div><div class="pa-arrow">›</div></button>
    </div>
    <div class="cfg-fab" id="aCfg" title="Configuración" role="button" tabindex="0">⚙️</div>
    ${cfgOk ? '' : '<div class="cfg-warn">Configura primero (ícono ⚙️) el <b>Sheet</b> y el <b>nombre de encargado</b>.</div>'}
  </div></div>`;
  $('#aEmerg').onclick = () => { if (!cfgOk) { toast('Primero completa la configuración'); askPin(renderConfig); return; } startCase(true); };
  $('#aAdd').onclick = () => { if (!cfgOk) { toast('Primero completa la configuración'); askPin(renderConfig); return; } startCase(false); };
  $('#aReports').onclick = renderReports;
  $('#aCfg').onclick = () => askPin(renderConfig);
}

/* ------------------------- PIN -------------------------- */
function askPin(onOk) {
  showNav(false); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = renderHome; let entered = '';
  content.innerHTML = `<div class="screen"><div style="flex:1;display:flex;align-items:center;justify-content:center">
    <div class="card" style="max-width:340px;width:100%">
      <div class="eyebrow"><b>Configuración</b></div>
      <h2 class="q" style="text-align:center;margin-bottom:4px">Ingresa la clave</h2>
      <div class="pin-dots" id="pinDots">${'<i></i>'.repeat(9)}</div>
      <div class="pin-grid" id="pinGrid">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<button class="pin-key" data-k="${n}">${n}</button>`).join('')}
        <button class="pin-key" data-k="del">⌫</button><button class="pin-key" data-k="0">0</button><button class="pin-key" data-k="ok" style="background:var(--grad);color:#fff">✓</button>
      </div>
    </div></div></div>`;
  const dots = () => $$('#pinDots i').forEach((d, i) => d.classList.toggle('on', i < entered.length));
  const check = () => { if (entered === CFG_PIN) onOk(); else { toast('Clave incorrecta'); entered = ''; dots(); } };
  $$('#pinGrid .pin-key').forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === 'del') entered = entered.slice(0, -1); else if (k === 'ok') return check(); else if (entered.length < 9) entered += k; dots(); if (entered.length === 9) check(); });
}

/* ------------------------ CONFIG ------------------------ */
function renderConfig() {
  showNav(true); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = renderHome;
  content.innerHTML = `<div class="screen"><div style="flex:1;overflow-y:auto"><div class="card">
    <div class="eyebrow"><b>Configuración</b></div><h2 class="q">Conexión y encargado</h2>
    <div class="banner">Pega la URL de tu <b>Apps Script</b> (termina en <code>/exec</code>) y tu <b>nombre de encargado</b>.</div>
    <div class="field-block"><label class="fld">URL del Apps Script (/exec)</label><input type="url" id="cfgUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(CFG.sheetUrl || '')}"></div>
    <div class="field-block"><label class="fld">Nombre de encargado</label><input type="text" id="cfgEnc" placeholder="Ej: Manuel Echeverría" value="${esc(CFG.encargado || '')}"></div>
    <p class="note">Se guardan en este dispositivo. Cada encargado usa su propio nombre.</p>
  </div></div></div>`;
  btnBack.onclick = renderHome; btnNext.textContent = 'Guardar'; btnNext.disabled = false; btnNext.className = 'btn accent';
  btnNext.onclick = () => {
    const url = $('#cfgUrl').value.trim(), enc = $('#cfgEnc').value.trim();
    if (!enc) { toast('Falta el nombre de encargado'); return; }
    if (url && !/^https:\/\/script\.google\.com\/.*\/exec$/.test(url)) { if (!confirm('La URL no parece /exec. ¿Guardar igual?')) return; }
    saveCfg({ sheetUrl: url, encargado: enc }); toast('Configuración guardada'); renderHome();
  };
}

/* ============================================================
   REPORTES — 2 pestañas: Mis reportes / General
   ============================================================ */
let repTab = 'mios';          // 'mios' | 'general'
let repFilterEst = null;      // {rbd, nom, com, tec} elegido en General
let repMios = [], repGeneral = [];
let generalLoading = false, generalLoaded = false;
let lastRenderedList = [];    // lista tal como se pintó (para bindear botones)

/* Índice de TODOS los establecimientos de la BBDD (dedup por RBD+nombre),
   igual base que el buscador de "Agregar caso". */
const ESTS = (() => {
  const seen = new Set(), out = [];
  for (const r of BBDD) {
    const key = String(r[COL.RBD]) + '|' + norm(r[COL.NOM]);
    if (seen.has(key)) continue; seen.add(key);
    out.push({ rbd: String(r[COL.RBD]), nom: r[COL.NOM], dir: r[COL.DIR], com: r[COL.COM], tec: r[COL.TEC], inst: r[COL.INST] });
  }
  return out;
})();

async function renderReports() {
  showNav(false); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = renderHome;
  repTab = 'mios'; repFilterEst = null;
  repMios = loadReports().filter(r => r.encargado === CFG.encargado);
  paintReports();
  const mine = await fetchMine();
  if (mine) {
    const pend = loadReports().filter(r => r.encargado === CFG.encargado && r.enviado === false);
    repMios = [...mine.map(r => ({ ...r, enviado: true })), ...pend];
    if (repTab === 'mios') paintReports();
  }
}

function estadoDe(r) {
  const v = (r.visado || '').toString().trim().toLowerCase(), d = (r.derivadoA || '').toString().trim();
  if (v.startsWith('eliminado')) return { k: 'pend', t: 'Eliminado' };
  if (r.enviado === false) return { k: 'pend', t: 'Pendiente envío' };
  if (v.includes('final') || v.includes('solucion')) return { k: 'fin', t: 'Finalizado' };
  if (d) return { k: 'der', t: 'Derivado' };
  if (v) return { k: 'vis', t: 'Visado' };
  return { k: 'pend', t: 'Sin visar' };
}
function isBorrado(r) { return r.borrado || (r.visado || '').toString().toLowerCase().startsWith('eliminado'); }

/* Casos activos del scope actual (pestaña + filtro de establecimiento) */
function currentSource() { return repTab === 'mios' ? repMios : repGeneral; }
function matchEst(r, est) {
  if (!est) return true;
  const rb = String(r.rbd || '').trim();
  if (rb && est.rbd && rb === String(est.rbd)) return true;
  return norm(r.nom || r.establecimiento) === norm(est.nom);
}
function caseCountByRbd() {
  const map = {};
  for (const r of repGeneral) { if (isBorrado(r)) continue; const k = String(r.rbd || '').trim(); if (!k) continue; map[k] = (map[k] || 0) + 1; }
  return map;
}

function paintReports() {
  const source = currentSource();
  const scope = (repTab === 'general' && repFilterEst) ? source.filter(r => matchEst(r, repFilterEst)) : source;
  const scopeAct = scope.filter(r => !isBorrado(r));
  const total = scopeAct.length;
  const derivados = scopeAct.filter(r => estadoDe(r).k === 'der').length;
  const solucion = scopeAct.filter(r => estadoDe(r).k === 'fin').length;

  /* Subtítulo resumen en General (sin filtro): todos los casos, todos los encargados */
  let kpiSub = '';
  if (repTab === 'general' && !repFilterEst) {
    const act = source.filter(r => !isBorrado(r));
    const nEst = new Set(act.map(r => String(r.rbd || norm(r.nom || r.establecimiento)))).size;
    const nEnc = new Set(act.map(r => r.encargado).filter(Boolean)).size;
    kpiSub = generalLoaded ? `<div class="kpi-sub">🏫 ${nEst} establecimiento(s) con casos · 👷 ${nEnc} encargado(s) · ${source.length} registro(s) en total</div>` : '';
  }
  if (repTab === 'general' && repFilterEst) {
    kpiSub = `<div class="kpi-sub">KPIs de este establecimiento${total === 0 ? ' · sin casos registrados' : ''}</div>`;
  }

  const searchBlock = repTab === 'general' ? (
    repFilterEst
      ? `<div class="est-card">
           <div class="eic">🏫</div>
           <div class="einfo">
             <div class="ename">${esc(repFilterEst.nom)}</div>
             <div class="emeta"><span>RBD ${esc(repFilterEst.rbd)}</span>${repFilterEst.com ? `<span>· ${esc(repFilterEst.com)}</span>` : ''}${repFilterEst.tec ? `<span>· 🔧 ${esc(repFilterEst.tec)}</span>` : ''}</div>
           </div>
           <button class="eclose" id="clrEst" title="Ver todos">✕</button>
         </div>`
      : `<div class="rep-search search-wrap"><span class="ic-lead">🔎</span>
          <input type="text" id="repQ" placeholder="Buscar establecimiento o RBD…" autocomplete="off">
          <button class="clearbtn hidden" id="repClr">✕</button>
          <div class="suggest hidden" id="repSug"></div></div>`
  ) : '';

  content.innerHTML = `<div class="screen">
    <div class="rep-head">
      <div class="rep-toolbar">
        <div class="tabs">
          <button class="tab ${repTab === 'mios' ? 'sel' : ''}" data-tab="mios">Mis reportes</button>
          <button class="tab ${repTab === 'general' ? 'sel' : ''}" data-tab="general">General</button>
        </div>
        <button class="refreshbtn" id="repRefresh" title="Actualizar">↻</button>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="bar"></div><div class="n">${total}</div><div class="l">${(repTab === 'general' && repFilterEst) ? 'Casos' : 'Total'}</div></div>
        <div class="kpi der"><div class="bar"></div><div class="n">${derivados}</div><div class="l">Derivados</div></div>
        <div class="kpi sol"><div class="bar"></div><div class="n">${solucion}</div><div class="l">Solucionados</div></div>
      </div>
      ${kpiSub}
      ${searchBlock}
    </div>
    <div class="rep-list" id="repList">${(repTab === 'general' && generalLoading && !repGeneral.length)
      ? `<div class="loading"><span class="spinner"></span><p>Cargando casos generales…</p></div>`
      : renderRepList(scope)}</div>
  </div>`;

  $$('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));
  $('#repRefresh').onclick = refreshCurrentTab;
  bindRepList();
  if (repTab === 'general') {
    if (repFilterEst) { $('#clrEst').onclick = () => { repFilterEst = null; paintReports(); }; }
    else bindGeneralSearch();
  }
}

/* Buscador General: TODOS los establecimientos (nombre o RBD) + badge de casos */
function bindGeneralSearch() {
  const inp = $('#repQ'), sug = $('#repSug'), clr = $('#repClr');
  if (!inp) return;
  const counts = caseCountByRbd();
  let hl = -1, cur = [];
  const paint = () => {
    const v = norm(inp.value.trim());
    clr.classList.toggle('hidden', !inp.value);
    if (!v) { sug.classList.add('hidden'); return; }
    cur = ESTS
      .filter(e => norm(e.nom).includes(v) || e.rbd.includes(v))
      .sort((a, b) => (counts[b.rbd] || 0) - (counts[a.rbd] || 0) || a.nom.localeCompare(b.nom))
      .slice(0, 20);
    if (!cur.length) { sug.innerHTML = `<div class="sopt nocase"><div class="stxt">Sin coincidencias<small>Revisa el nombre o el RBD</small></div></div>`; sug.classList.remove('hidden'); return; }
    sug.innerHTML = cur.map((e, i) => {
      const n = counts[e.rbd] || 0;
      const badge = n ? `<span class="casebadge has">${n} caso${n > 1 ? 's' : ''}</span>` : `<span class="casebadge none">Sin casos</span>`;
      return `<div class="sopt ${n ? '' : 'nocase'}" data-i="${i}" role="button">
        <div class="stxt">${esc(e.nom)}<small>RBD ${esc(e.rbd)} · ${esc(e.com)}</small></div>${badge}</div>`;
    }).join('');
    sug.classList.remove('hidden'); hl = -1;
    $$('#repSug .sopt[data-i]').forEach(d => d.onclick = () => pickGeneralEst(cur[+d.dataset.i]));
  };
  inp.addEventListener('input', paint);
  inp.addEventListener('keydown', e => {
    const it = $$('#repSug .sopt[data-i]'); if (!it.length) return;
    if (e.key === 'ArrowDown') hl = Math.min(hl + 1, it.length - 1);
    else if (e.key === 'ArrowUp') hl = Math.max(hl - 1, 0);
    else if (e.key === 'Enter' && hl >= 0) { pickGeneralEst(cur[hl]); return; }
    else return;
    it.forEach((d, i) => d.classList.toggle('hl', i === hl)); e.preventDefault();
  });
  clr.onclick = () => { inp.value = ''; clr.classList.add('hidden'); sug.classList.add('hidden'); inp.focus(); };
}
function pickGeneralEst(e) { repFilterEst = e; paintReports(); }

async function switchTab(tab) {
  if (repTab === tab) return;
  repTab = tab; repFilterEst = null;
  if (tab === 'general') {
    paintReports();
    if (!generalLoaded && !generalLoading) await loadGeneral();
  } else paintReports();
}
async function loadGeneral() {
  generalLoading = true; if (repTab === 'general') paintReports();
  const all = await fetchGeneral();
  generalLoading = false;
  if (all) { repGeneral = all; generalLoaded = true; }
  else if (repTab === 'general') toast('No se pudo cargar General. Revisa conexión y URL /exec.', 3200);
  if (repTab === 'general') paintReports();
}
async function refreshCurrentTab() {
  const btn = $('#repRefresh'); if (btn) btn.classList.add('spin');
  if (repTab === 'general') { generalLoaded = false; await loadGeneral(); }
  else {
    const mine = await fetchMine();
    if (mine) {
      const pend = loadReports().filter(r => r.encargado === CFG.encargado && r.enviado === false);
      repMios = [...mine.map(r => ({ ...r, enviado: true })), ...pend];
    } else toast('No se pudo actualizar. Revisa conexión.', 2600);
    paintReports();
  }
  const b2 = $('#repRefresh'); if (b2) b2.classList.remove('spin');
}

function sortedScope(scope) {
  return scope.slice().sort((a, b) => {
    const ba = isBorrado(a), bb = isBorrado(b);
    if (ba !== bb) return ba ? 1 : -1;
    return (b.ts || 0) - (a.ts || 0) || String(b.timestamp || '').localeCompare(String(a.timestamp || '')) || String(b.id).localeCompare(String(a.id));
  });
}
function renderRepList(scope) {
  const list = sortedScope(scope);
  lastRenderedList = list;
  if (!list.length) {
    if (repTab === 'general' && repFilterEst) return `<div class="empty"><div class="ic">🏫</div><p><b>${esc(repFilterEst.nom)}</b><br>no tiene casos registrados todavía.</p></div>`;
    return `<div class="empty"><div class="ic">📭</div><p>Sin reportes ${repTab === 'general' ? 'en general' : 'aún'}.</p></div>`;
  }
  return list.map((r, i) => {
    const borrado = isBorrado(r);
    const st = estadoDe(r);
    const verifCount = verifList(r).length;
    const canDelete = repTab === 'mios' && !borrado;
    const canResend = repTab === 'mios' && !borrado && r.enviado === false;
    return `<div class="rep ${borrado ? 'deleting' : ''}">
      <div class="rid">${esc(r.id)}</div>
      <div class="rbody">
        <div class="rtitle" style="${borrado ? 'text-decoration:line-through;color:#999' : ''}">${esc(r.nom || r.establecimiento)} · RBD ${esc(r.rbd)}</div>
        <div class="rdesc" style="${borrado ? 'text-decoration:line-through' : ''}">${esc(r.desc || r.descripcion || '')}</div>
        <div class="rmeta"><span>${esc(r.cat || r.categoria || '')}</span><span>${esc(r.fecha || '')}</span>${repTab === 'general' && r.encargado ? `<span>👷 ${esc(r.encargado)}</span>` : ''}<span class="rstate ${st.k}">${st.t}</span>${r.derivadoA ? `<span>↗ ${esc(r.derivadoA)}</span>` : ''}${borrado && r.motivoBorrado ? `<span>· ${esc(r.motivoBorrado)}</span>` : ''}</div>
      </div>
      <div class="rside">
        ${verifCount ? `<button class="rverif" data-verif="${i}"><span class="vic">📎</span>Ver (${verifCount})</button>` : ''}
        ${canResend ? `<button class="rsend" data-send="${i}"><span class="vic">📤</span>Reenviar</button>` : ''}
      </div>
      ${canDelete ? `<button class="rdel" data-del="${esc(r.id)}" title="Eliminar">🗑️</button>` : ''}
    </div>`;
  }).join('');
}
function bindRepList() {
  $$('#repList .rdel').forEach(btn => btn.onclick = () => openDelete(btn.dataset.del));
  $$('#repList .rverif').forEach(btn => btn.onclick = () => openViewer(verifList(lastRenderedList[+btn.dataset.verif])));
  $$('#repList .rsend').forEach(btn => btn.onclick = () => resendPending(lastRenderedList[+btn.dataset.send], btn));
}

/* Extrae verificadores (media local o texto del Sheet) con ID de Drive */
function verifList(r) {
  const out = [];
  if (Array.isArray(r.media) && r.media.length) {
    for (const m of r.media) {
      const url = m.url || '';
      out.push({ name: m.name || '', url, driveId: driveIdFrom(url), type: m.type || (/\.webm$/i.test(m.name || '') ? 'video' : 'photo'), local: url.startsWith('blob:') });
    }
    return out;
  }
  const raw = r.verificadores || '';
  if (!raw) return out;
  for (const line of String(raw).split('\n')) {
    if (!line.trim()) continue;
    const um = line.match(/(https?:\/\/[^\s]+)/);
    const url = um ? um[1] : '';
    if (!url) continue;
    const type = /(^|\b)video\b/i.test(line) || /\.webm/i.test(line) ? 'video' : 'photo';
    const nm = line.split('->')[0].split(':').slice(1).join(':').trim() || line.split(':')[0].trim();
    out.push({ name: nm, url, driveId: driveIdFrom(url), type, local: false });
  }
  return out;
}

/* ---------------- VISOR de verificadores ----------------
   - Fotos Drive: lh3.googleusercontent.com/d/ID (con fallback a thumbnail).
   - Videos Drive: iframe /preview (reproductor propio de Drive).
   - Media local de la sesión: <img>/<video> directo.
   - Swipe, flechas, teclado, precarga del siguiente. ---------- */
function openViewer(items) {
  if (!items || !items.length) { toast('Sin verificadores'); return; }
  let idx = 0;
  const ov = document.createElement('div'); ov.className = 'viewer-bg';
  overlays.appendChild(ov);
  const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
  const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
  document.addEventListener('keydown', onKey);
  const go = d => { const n = idx + d; if (n < 0 || n >= items.length) return; idx = n; render(); };

  function mediaHTML(it) {
    if (it.type === 'video') {
      if (it.local) return `<video src="${esc(it.url)}" controls autoplay playsinline></video>`;
      if (it.driveId) return `<iframe src="${driveVideoPreview(it.driveId)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
      return missHTML(it);
    }
    if (it.local) return `<img src="${esc(it.url)}" alt="">`;
    if (it.driveId) {
      const [src, fb] = driveImgSources(it.driveId);
      return `<div class="viewer-load" id="vload"><div class="ring"></div>Cargando…</div>
        <img src="${src}" data-fb="${fb}" data-tries="0" alt="" style="opacity:0"
          onload="this.style.opacity=1;var l=document.getElementById('vload');if(l)l.remove();"
          onerror="if(this.dataset.tries==='0'){this.dataset.tries='1';this.src=this.dataset.fb;}else{this.outerHTML=document.getElementById('vmiss').innerHTML;var l=document.getElementById('vload');if(l)l.remove();}">`;
    }
    return missHTML(it);
  }
  function missHTML(it) {
    const open = it.driveId ? driveOpenUrl(it.driveId) : it.url;
    return `<div class="viewer-miss">No se pudo mostrar aquí.<br>${open ? `<a href="${esc(open)}" target="_blank" rel="noopener">Abrir en Drive ↗</a>` : 'El archivo no tiene link.'}</div>`;
  }
  function preload(n) {
    const it = items[n]; if (!it || it.type === 'video' || it.local || !it.driveId) return;
    const im = new Image(); im.src = driveImgSources(it.driveId)[0];
  }
  function render() {
    const it = items[idx];
    const openUrl = it.driveId ? driveOpenUrl(it.driveId) : (it.local ? '' : it.url);
    ov.innerHTML = `
      <div class="viewer-top"><span class="vcount">${idx + 1} / ${items.length}</span>
        ${openUrl ? `<a class="vopen" href="${esc(openUrl)}" target="_blank" rel="noopener">Drive ↗</a>` : '<span style="margin-left:auto"></span>'}
        <button class="vclose" title="Cerrar">✕</button></div>
      <div class="viewer-stage">
        ${items.length > 1 ? `<button class="viewer-nav prev" ${idx === 0 ? 'disabled' : ''}>‹</button>` : ''}
        ${mediaHTML(it)}
        ${items.length > 1 ? `<button class="viewer-nav next" ${idx === items.length - 1 ? 'disabled' : ''}>›</button>` : ''}
      </div>
      <div class="viewer-cap">${esc(it.name || '')}</div>
      <template id="vmiss">${missHTML(it)}</template>`;
    $('.vclose', ov).onclick = close;
    const pv = $('.viewer-nav.prev', ov), nx = $('.viewer-nav.next', ov);
    if (pv) pv.onclick = () => go(-1);
    if (nx) nx.onclick = () => go(1);
    preload(idx + 1); preload(idx - 1);
  }
  /* swipe horizontal */
  let sx = null, sy = null;
  ov.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  ov.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    sx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  }, { passive: true });
  ov.addEventListener('click', e => { if (e.target === ov || e.target.classList.contains('viewer-stage')) close(); });
  render();
}

/* ---------------- Eliminar (borrado lógico) --------------- */
function openDelete(id) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal"><h3>Eliminar caso ${esc(id)}</h3><p>Indica el motivo de la eliminación. El caso quedará tachado y al final de la lista, pero seguirá visible.</p>
    <textarea id="delMotivo" placeholder="Ej: subido por error, duplicado…"></textarea>
    <div class="mbtns"><button class="btn ghost" id="delCancel" style="flex:1">Cancelar</button><button class="btn" id="delOk" style="flex:1;background:var(--red);color:#fff">Eliminar</button></div>
  </div>`;
  overlays.appendChild(bg);
  const close = () => bg.remove();
  bg.onclick = e => { if (e.target === bg) close(); };
  $('#delCancel', bg).onclick = close;
  $('#delOk', bg).onclick = async () => {
    const motivo = $('#delMotivo', bg).value.trim(); if (!motivo) { toast('Indica el motivo'); return; }
    $('#delOk', bg).innerHTML = '<span class="spinner"></span>';
    const reps = loadReports(); const r = reps.find(x => String(x.id) === String(id) && x.encargado === CFG.encargado);
    if (r) { r.borrado = true; r.motivoBorrado = motivo; saveReports(reps); }
    const m = repMios.find(x => String(x.id) === String(id)); if (m) { m.borrado = true; m.motivoBorrado = motivo; }
    await sendAction({ accion: 'borrar', encargado: CFG.encargado, reporteId: id, motivo });
    close(); toast('Caso eliminado'); paintReports();
  };
}

/* ---------------- Reenviar caso pendiente ------------------ */
async function resendPending(r, btn) {
  if (!r || r.enviado !== false) return;
  if (btn) btn.innerHTML = '<span class="spinner" style="border-top-color:var(--blue)"></span>';
  const fila = BBDD.find(x => String(x[COL.RBD]) === String(r.rbd) && norm(x[COL.NOM]) === norm(r.nom)) || BBDD.find(x => String(x[COL.RBD]) === String(r.rbd)) || [];
  const verificadores = (r.media || []).map(m => (m.type === 'video' ? 'video' : 'foto') + ': ' + (m.name || '') + (m.url ? ' -> ' + m.url : '')).join('\n');
  const payload = {
    accion: 'caso', encargado: CFG.encargado, reporteId: r.id, fecha: r.fecha || new Date().toLocaleString('es-CL'),
    timestamp: new Date(r.ts || Date.now()).toISOString(),
    rbd: r.rbd, establecimiento: r.nom, direccion: fila[COL.DIR] || '', comuna: fila[COL.COM] || '',
    supervisor: fila[COL.SUP] || '', institucion: fila[COL.INST] || '', tecnico: fila[COL.TEC] || '',
    categoria: r.cat || '', descripcion: r.desc || '', gps: r.gpsTxt || '', gps_acc: r.gpsAcc || '', verificadores
  };
  let ok = false;
  try { const res = await postJSON(payload); ok = !!(res && res.ok); } catch (e) { ok = false; }
  if (ok) {
    const reps = loadReports(); const f = reps.find(x => String(x.id) === String(r.id) && x.encargado === CFG.encargado);
    if (f) f.enviado = true; saveReports(reps);
    r.enviado = true; toast('Caso ' + r.id + ' enviado ✓');
  } else toast('No se pudo enviar. Revisa conexión.', 3000);
  paintReports();
}

/* --------------------- Red / backend ---------------------- */
async function fetchMine() {
  if (!CFG.sheetUrl || !CFG.encargado) return null;
  try {
    const res = await fetch(CFG.sheetUrl + '?encargado=' + encodeURIComponent(CFG.encargado) + '&t=' + Date.now());
    const d = await res.json();
    if (d && d.ok && Array.isArray(d.reportes)) return d.reportes.reverse();
    return null;
  } catch (e) { return null; }
}
async function fetchGeneral() {
  if (!CFG.sheetUrl) return null;
  try {
    const res = await fetch(CFG.sheetUrl + '?admin=1&t=' + Date.now());
    const d = await res.json();
    if (d && d.ok && Array.isArray(d.reportes)) return d.reportes.reverse();
    return null;
  } catch (e) { return null; }
}
async function postJSON(payload, timeoutMs = 90000) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(CFG.sheetUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl.signal });
    return await res.json();
  } finally { clearTimeout(t); }
}
async function sendAction(payload) {
  try {
    const res = await fetch(CFG.sheetUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return await res.json().catch(() => ({ ok: true }));
  } catch (e) { return { ok: false }; }
}

/* ============================================================
   NUEVO CASO
   ============================================================ */
function startCase(emergencia) {
  State.est = null; State.cat = emergencia ? 'EMERGENCIA' : null; State.emergencia = !!emergencia;
  State.desc = ''; State.media = []; State.startedAt = new Date();
  $('#modeLabel').textContent = emergencia ? 'Emergencia' : 'Agregar caso';
  startGPS(); renderEstablecimiento();
}

function renderEstablecimiento() {
  showNav(true); $('#btnHome').classList.remove('hidden'); $('#btnHome').onclick = renderHome;
  const chosen = !!State.est;
  content.innerHTML = `<div class="screen"><div style="flex:1;overflow-y:auto"><div class="card">
    <div class="eyebrow"><b>Agregar caso</b> <span class="grp">· Establecimiento</span></div>
    <h2 class="q">Indica el establecimiento</h2>
    <div id="searchZone">${chosen ? renderBubbles() : renderSearchInputs()}</div>
    <div id="estData" class="${chosen ? '' : 'hidden'}"><div class="readonly-grid" style="margin-top:4px">
      <div class="ro full"><span>Dirección</span><b id="dDir">${chosen ? esc(State.est[COL.DIR]) : '—'}</b></div>
      <div class="ro"><span>Comuna</span><b id="dCom">${chosen ? esc(State.est[COL.COM]) : '—'}</b></div>
      <div class="ro"><span>Institución</span><b id="dInst">${chosen ? esc(State.est[COL.INST]) : '—'}</b></div>
      <div class="ro"><span>Supervisor</span><b id="dSup">${chosen ? esc(State.est[COL.SUP]) : '—'}</b></div>
      <div class="ro tech"><span>Técnico manten.</span><b id="dTec">${chosen ? esc(State.est[COL.TEC]) : '—'}</b></div>
    </div></div>
  </div></div></div>`;
  btnBack.onclick = renderHome; btnNext.className = 'btn accent'; btnNext.classList.remove('hidden');
  btnNext.textContent = 'Continuar'; btnNext.disabled = !chosen;
  btnNext.onclick = () => { State.emergencia ? renderDescripcion() : renderCategoria(); };
  if (chosen) bindBubbles(); else bindSearchInputs();
}
function renderSearchInputs() {
  return `<div class="field-block"><label class="fld">Establecimiento</label>
      <div class="search-wrap"><span class="ic-lead">🏫</span>
        <input type="text" id="qNom" placeholder="Ej: Estado de Palestina" autocomplete="off">
        <button class="clearbtn hidden" id="clrNom">✕</button><div class="suggest hidden" id="sgNom"></div></div></div>
    <div class="divider-or">O BIEN</div>
    <div class="field-block"><label class="fld">RBD</label>
      <div class="search-wrap"><span class="ic-lead">🔢</span>
        <input type="text" id="qRbd" inputmode="numeric" placeholder="Ej: 9880" autocomplete="off">
        <button class="clearbtn hidden" id="clrRbd">✕</button><div class="suggest hidden" id="sgRbd"></div></div></div>`;
}
function renderBubbles() {
  const e = State.est;
  return `<div class="bubble-row"><button class="bubble" id="bubble"><span class="b-ic">🏫</span><span class="b-txt">${esc(e[COL.NOM])} · RBD ${esc(e[COL.RBD])}</span><span class="b-edit">✎</span></button></div>`;
}
function bindBubbles() { const b = $('#bubble'); if (b) b.onclick = () => { State.est = null; renderEstablecimiento(); }; }
function bindSearchInputs() {
  setupSearch('qRbd', 'sgRbd', 'clrRbd', COL.RBD, true);
  setupSearch('qNom', 'sgNom', 'clrNom', COL.NOM, false);
}
function setupSearch(inputId, sgId, clrId, col, isRbd) {
  const inp = $('#' + inputId); if (!inp) return;
  const sg = $('#' + sgId), clr = $('#' + clrId); let hl = -1, cur = [];
  inp.addEventListener('input', () => {
    const v = norm(inp.value.trim()); clr.classList.toggle('hidden', !inp.value);
    if (!v) { sg.classList.add('hidden'); return; }
    cur = BBDD.filter(r => norm(r[col]).includes(v)).slice(0, 14);
    if (!cur.length) { sg.classList.add('hidden'); return; }
    sg.innerHTML = cur.map((r, i) => `<div class="sopt" data-i="${i}"><div class="stxt">${esc(r[col])}<small>${isRbd ? esc(r[COL.NOM]) : 'RBD ' + esc(r[COL.RBD])} · ${esc(r[COL.COM])}</small></div></div>`).join('');
    sg.classList.remove('hidden'); hl = -1;
    $$('#' + sgId + ' .sopt[data-i]').forEach(d => d.onclick = () => pickEst(cur[+d.dataset.i]));
  });
  inp.addEventListener('keydown', e => {
    const it = $$('#' + sgId + ' .sopt[data-i]'); if (!it.length) return;
    if (e.key === 'ArrowDown') hl = Math.min(hl + 1, it.length - 1);
    else if (e.key === 'ArrowUp') hl = Math.max(hl - 1, 0);
    else if (e.key === 'Enter' && hl >= 0) { pickEst(cur[hl]); return; }
    else return;
    it.forEach((d, i) => d.classList.toggle('hl', i === hl)); e.preventDefault();
  });
  clr.onclick = () => { inp.value = ''; clr.classList.add('hidden'); sg.classList.add('hidden'); };
}
function pickEst(r) {
  State.est = r;
  $('#searchZone').innerHTML = renderBubbles(); bindBubbles();
  $('#dDir').textContent = r[COL.DIR] || '—'; $('#dCom').textContent = r[COL.COM] || '—';
  $('#dInst').textContent = r[COL.INST] || '—'; $('#dSup').textContent = r[COL.SUP] || '—';
  $('#dTec').textContent = r[COL.TEC] || '—';
  $('#estData').classList.remove('hidden'); btnNext.disabled = false;
}

/* --------------------- CATEGORÍA ------------------------ */
const CATS = [
  ['Calor', '🔥', 'Equipos, gas, filtración'],
  ['Electricidad', '⚡', 'Enchufes, iluminación, observaciones'],
  ['Filtraciones', '💧', 'Agua, cañería, humedad'],
  ['Infraestructura', '🏗️', 'Mosquiteros, pisos, muros'],
  ['Frío', '🧊', 'Equipos, temperatura, filtración'],
  ['Otro', '🧰', 'Otro tipo de caso']
];
function renderCategoria() {
  showNav(true);
  content.innerHTML = `<div class="screen">
    <div class="eyebrow" style="margin:0 2px 8px;flex:0 0 auto"><b>Agregar caso</b> <span class="grp">· Categoría</span></div>
    <h2 class="q" style="margin:0 2px 14px;flex:0 0 auto">Selecciona el tipo de caso</h2>
    <div class="cat-grid">${CATS.map(([n, ic, sub]) => `<div class="cat" data-c="${esc(n)}" role="button" tabindex="0"><div class="glow"></div><div class="cat-ic">${ic}</div><div><div class="cat-name">${esc(n)}</div><div class="cat-sub">${esc(sub)}</div></div></div>`).join('')}</div>
  </div>`;
  btnBack.onclick = renderEstablecimiento;
  btnNext.classList.add('hidden');
  navwrap.querySelector('.inner').style.justifyContent = 'flex-start';
  $$('.cat').forEach(c => {
    const pick = () => { State.cat = c.dataset.c; renderDescripcion(); };
    c.onclick = pick;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
  });
}

/* --------- DESCRIPCIÓN + VERIFICADORES (subida bg) --------- */
function renderDescripcion() {
  showNav(true); btnNext.classList.remove('hidden');
  navwrap.querySelector('.inner').style.justifyContent = '';
  content.innerHTML = `<div class="screen"><div style="flex:1;overflow-y:auto"><div class="card">
    <div class="eyebrow"><b>Agregar caso</b> <span class="grp">· ${esc(State.cat)}</span></div>
    <h2 class="q">Describe la situación</h2>
    <div class="field-block"><label class="fld">Indique</label><textarea id="descTxt" placeholder="Describe el caso, la falla o el requerimiento...">${esc(State.desc || '')}</textarea></div>
    <div class="verifier"><div class="vtitle">Verificadores</div>
      <div class="vbtns">
        <button class="vbtn" data-cap="photo"><span class="ic">📷</span>Cámara foto</button>
        <button class="vbtn" data-cap="video"><span class="ic">🎥</span>Cámara video</button>
        <button class="vbtn" id="galBtn"><span class="ic">🖼️</span>Galería</button>
      </div>
      <div class="thumbs" id="thumbs"></div>
      <div id="upSummary"></div>
    </div>
  </div></div></div>`;
  btnBack.onclick = () => { State.emergencia ? renderHome() : renderCategoria(); };
  btnNext.className = 'btn finish'; btnNext.textContent = 'Finalizar';
  const upd = () => { State.desc = $('#descTxt').value; refreshFinish(); };
  $('#descTxt').oninput = upd;
  renderThumbs();
  $$('[data-cap]').forEach(b => b.onclick = () => openCamera(b.dataset.cap));
  $('#galBtn').onclick = pickFromGallery;
  refreshFinish();
  btnNext.onclick = finishCase;
}
function refreshFinish() {
  const hasDesc = (State.desc || '').trim().length > 0;
  const uploading = State.media.some(m => !m.cancelled && m.upState === 'uploading');
  if (btnNext) btnNext.disabled = !hasDesc || uploading;
  renderUpBar();
}
function renderUpBar() {
  const box = $('#upSummary'); if (!box) return;
  const active = State.media.filter(m => !m.cancelled);
  const uploading = active.filter(m => m.upState === 'uploading');
  const done = active.filter(m => m.upState === 'done');
  const err = active.filter(m => m.upState === 'error');
  if (!active.length) { box.innerHTML = ''; return; }
  const pct = active.length ? Math.round(done.length / active.length * 100) : 0;
  const cls = uploading.length ? '' : (err.length ? 'err' : 'ok');
  const st = uploading.length ? `Subiendo ${done.length}/${active.length}…` : (err.length ? `${err.length} con error` : `${done.length}/${active.length} listo`);
  box.innerHTML = `<div class="upglobal ${cls}"><div class="ut"><span>Verificadores</span><span class="st">${st}</span></div><div class="track"><i style="width:${pct}%"></i></div>${uploading.length ? '<p class="note" style="margin-top:8px">Espera a que terminen de subir para finalizar.</p>' : ''}${err.length ? '<p class="note" style="margin-top:8px;color:var(--red)">Algún archivo falló. Toca el recuadro rojo para <b>reintentar</b> o elimínalo con ✕.</p>' : ''}</div>`;
}
function renderThumbs() {
  const box = $('#thumbs'); if (!box) return;
  box.innerHTML = State.media.map((m, i) => {
    let ov = '';
    if (m.upState === 'uploading') ov = `<div class="up"><div class="ring"></div></div>`;
    else if (m.upState === 'done') ov = `<div class="up done"><span class="ok">✓</span></div>`;
    else if (m.upState === 'error') ov = `<button class="up err" data-retry="${i}"><span class="ok">!</span><span class="rt">Reintentar</span></button>`;
    return `<div class="thumb">${m.type === 'video' ? `<video src="${m.url}" muted></video>` : `<img src="${m.url}" alt="">`}<span class="badge">${m.type}</span><button class="del" data-del="${i}" title="Quitar">✕</button>${ov}</div>`;
  }).join('');
  $$('#thumbs .del').forEach(b => b.onclick = () => removeMedia(+b.dataset.del));
  $$('#thumbs [data-retry]').forEach(b => b.onclick = () => retryMedia(+b.dataset.retry));
}
function removeMedia(i) {
  const m = State.media[i]; if (!m) return;
  if (m.upState === 'uploading' || m.upState === 'done') {
    if (m.driveName) sendAction({ accion: 'borrarArchivo', encargado: CFG.encargado, fileName: m.driveName });
    m.cancelled = true;
  }
  State.media.splice(i, 1); renderThumbs(); refreshFinish();
}
function retryMedia(i) {
  const m = State.media[i]; if (!m || m.upState !== 'error') return;
  m.upState = 'uploading'; renderThumbs(); refreshFinish();
  uploadOne(m);
}

/* --------------------- CÁMARA (robusta) -------------------- */
let camStream = null, camRec = null, camChunks = [], camTimer = null;
function stopCam() {
  if (camTimer) { clearInterval(camTimer); camTimer = null; }
  if (camStream) { camStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} }); camStream = null; }
}
async function openCamera(kind) {
  const secure = window.isSecureContext || location.hostname === 'localhost' || location.protocol === 'file:';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Tu navegador no permite la cámara aquí. Usa "Galería".', 3200); return; }
  if (!secure) { toast('La cámara requiere HTTPS. Abre la app con https:// o usa "Galería".', 3600); return; }
  const ov = document.createElement('div'); ov.className = 'cam-bg';
  ov.innerHTML = `<button class="camclose">✕</button><video autoplay playsinline muted></video><div class="cambar"><div class="shoot ${kind === 'photo' ? 'photo' : ''}"></div></div>`;
  overlays.appendChild(ov); const video = $('video', ov);
  const close = () => { stopCam(); ov.remove(); };
  $('.camclose', ov).onclick = close;
  stopCam();
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: kind === 'video' });
    video.srcObject = camStream;
    await video.play().catch(() => {});
  } catch (err) {
    close();
    let msg = 'No se pudo abrir la cámara.';
    if (err && err.name === 'NotAllowedError') msg = 'Permiso de cámara denegado. Actívalo en el navegador o usa "Galería".';
    else if (err && err.name === 'NotFoundError') msg = 'No se encontró cámara. Usa "Galería".';
    else if (err && err.name === 'NotReadableError') msg = 'La cámara está ocupada por otra app. Ciérrala y reintenta, o usa "Galería".';
    toast(msg, 3800); return;
  }
  const shoot = $('.shoot', ov);
  if (kind === 'photo') {
    shoot.onclick = () => {
      const c = document.createElement('canvas'); c.width = video.videoWidth || 1280; c.height = video.videoHeight || 720;
      c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
      c.toBlob(b => { if (b) addMedia({ type: 'photo', blob: b, url: URL.createObjectURL(b) }); close(); }, 'image/jpeg', .82);
    };
  } else {
    let rec = false;
    shoot.onclick = () => {
      if (!rec) {
        camChunks = [];
        try { camRec = new MediaRecorder(camStream); } catch (e) { toast('No se pudo grabar video en este navegador. Usa "Galería".', 3200); close(); return; }
        camRec.ondataavailable = e => { if (e.data && e.data.size) camChunks.push(e.data); };
        camRec.onstop = () => { const b = new Blob(camChunks, { type: 'video/webm' }); addMedia({ type: 'video', blob: b, url: URL.createObjectURL(b) }); close(); };
        camRec.start(); rec = true; shoot.style.background = '#fff';
        const r = document.createElement('div'); r.className = 'rec'; r.textContent = '● REC 15s'; ov.appendChild(r); let t = VIDEO_MAX;
        camTimer = setInterval(() => { t--; r.textContent = '● REC ' + t + 's'; if (t <= 0) { clearInterval(camTimer); camTimer = null; if (camRec && camRec.state !== 'inactive') camRec.stop(); } }, 1000);
      } else {
        if (camTimer) { clearInterval(camTimer); camTimer = null; }
        if (camRec && camRec.state !== 'inactive') camRec.stop();
      }
    };
  }
}

/* --------------------- GALERÍA ----------------------------- */
function pickFromGallery() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*,video/*'; inp.multiple = true;
  inp.onchange = async () => {
    for (const file of inp.files) {
      const isVideo = file.type.startsWith('video');
      if (isVideo) {
        const dur = await videoDuration(file).catch(() => 0);
        if (dur > VIDEO_MAX) {
          toast('El video dura ' + Math.round(dur) + 's (máx ' + VIDEO_MAX + 's). Puedes recortarlo.', 3200);
          openTrimmer(file); continue;
        }
        addMedia({ type: 'video', blob: file, url: URL.createObjectURL(file) });
      } else {
        const small = await downscaleImage(file).catch(() => file);
        addMedia({ type: 'photo', blob: small, url: URL.createObjectURL(small) });
      }
    }
  };
  inp.click();
}
/* Fotos de galería pueden pesar 8-15 MB: se reducen a máx 1920 px
   para que la subida en terreno sea rápida y no reviente el límite del backend. */
function downscaleImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (Math.max(w, h) <= FOTO_MAX_LADO && file.size < 2.5 * 1024 * 1024) { URL.revokeObjectURL(img.src); res(file); return; }
      const k = FOTO_MAX_LADO / Math.max(w, h);
      const c = document.createElement('canvas'); c.width = Math.round(w * Math.min(1, k)); c.height = Math.round(h * Math.min(1, k));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      c.toBlob(b => b ? res(b) : rej(new Error('toBlob')), 'image/jpeg', .85);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function videoDuration(fileOrBlob) {
  return new Promise((res, rej) => {
    const v = document.createElement('video'); v.preload = 'metadata';
    v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(v.src); };
    v.onerror = rej; v.src = URL.createObjectURL(fileOrBlob);
  });
}

/* ------------- RECORTE DE VIDEO (tipo Movie Maker) ---------- */
async function openTrimmer(file) {
  const url = URL.createObjectURL(file);
  const total = await videoDuration(file).catch(() => 0);
  if (!total) { toast('No se pudo leer el video.'); return; }
  let a = 0, b = Math.min(VIDEO_MAX, total);
  const ov = document.createElement('div'); ov.className = 'trim-bg';
  ov.innerHTML = `<div class="trim-top"><b>Recortar video</b><button class="tx">✕</button></div>
    <div class="trim-video"><video id="tv" src="${url}" playsinline></video></div>
    <div class="trim-ctrl">
      <div class="trim-info">Selección: <b id="tsel">0.0s – ${b.toFixed(1)}s</b> · máx ${VIDEO_MAX}s</div>
      <div class="trim-track" id="ttrack"><div class="trim-sel" id="tselbar"></div><div class="trim-handle start" id="th0">‹</div><div class="trim-handle end" id="th1">›</div></div>
      <div class="trim-btns"><button class="btn ghost" id="tprev" style="flex:1">▶ Previsualizar</button><button class="btn finish" id="tok" style="flex:1">Usar recorte</button></div>
    </div>`;
  overlays.appendChild(ov);
  const v = $('#tv', ov), track = $('#ttrack', ov), selbar = $('#tselbar', ov), h0 = $('#th0', ov), h1 = $('#th1', ov), sel = $('#tsel', ov);
  const W = () => track.clientWidth;
  const draw = () => { const w = W(); const x0 = a / total * w, x1 = b / total * w; selbar.style.left = x0 + 'px'; selbar.style.width = (x1 - x0) + 'px'; h0.style.left = (x0 - 11) + 'px'; h1.style.left = (x1 - 11) + 'px'; sel.textContent = `${a.toFixed(1)}s – ${b.toFixed(1)}s`; };
  setTimeout(draw, 60);
  const clamp = val => Math.max(0, Math.min(total, val));
  const drag = (handle, isStart) => {
    const move = clientX => {
      const rect = track.getBoundingClientRect(); let t = clamp((clientX - rect.left) / W() * total);
      if (isStart) { a = Math.min(t, b - 0.3); if (b - a > VIDEO_MAX) b = a + VIDEO_MAX; } else { b = Math.max(t, a + 0.3); if (b - a > VIDEO_MAX) a = b - VIDEO_MAX; }
      a = clamp(a); b = clamp(b); draw(); if (v) { v.currentTime = isStart ? a : b; }
    };
    const mm = e => { move(e.touches ? e.touches[0].clientX : e.clientX); e.preventDefault(); };
    const up = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('touchmove', mm); document.removeEventListener('mouseup', up); document.removeEventListener('touchend', up); };
    handle.addEventListener('mousedown', e => { document.addEventListener('mousemove', mm); document.addEventListener('mouseup', up); e.preventDefault(); });
    handle.addEventListener('touchstart', e => { document.addEventListener('touchmove', mm, { passive: false }); document.addEventListener('touchend', up); e.preventDefault(); }, { passive: false });
  };
  drag(h0, true); drag(h1, false);
  const close = () => { URL.revokeObjectURL(url); ov.remove(); };
  $('.tx', ov).onclick = close;
  $('#tprev', ov).onclick = () => { v.currentTime = a; v.play(); const stop = () => { if (v.currentTime >= b) { v.pause(); v.removeEventListener('timeupdate', stop); } }; v.addEventListener('timeupdate', stop); };
  $('#tok', ov).onclick = async () => {
    $('#tok', ov).innerHTML = '<span class="spinner"></span>';
    try {
      const clip = await trimVideo(file, a, b);
      addMedia({ type: 'video', blob: clip, url: URL.createObjectURL(clip) });
      close();
    } catch (e) { toast('No se pudo recortar en este equipo. Intenta grabar un video corto.', 3600); close(); }
  };
}
async function trimVideo(file, start, end) {
  return new Promise(async (resolve, reject) => {
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video'); v.src = url; v.muted = false; v.playsInline = true;
      await new Promise((r, j) => { v.onloadedmetadata = r; v.onerror = j; });
      const canvas = document.createElement('canvas'); canvas.width = v.videoWidth || 640; canvas.height = v.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      const cstream = canvas.captureStream(25);
      const rec = new MediaRecorder(cstream, { mimeType: 'video/webm' });
      const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => { URL.revokeObjectURL(url); resolve(new Blob(chunks, { type: 'video/webm' })); };
      v.currentTime = start;
      await new Promise(r => { v.onseeked = r; });
      rec.start(); v.play();
      const draw = () => { if (v.currentTime >= end || v.ended) { rec.stop(); v.pause(); return; } ctx.drawImage(v, 0, 0, canvas.width, canvas.height); requestAnimationFrame(draw); };
      draw();
    } catch (e) { reject(e); }
  });
}

/* ------------------- SUBIDA de verificadores ---------------- */
function addMedia(m) {
  m.upState = 'uploading'; m.driveName = null; m.driveUrl = ''; m.cancelled = false;
  State.media.push(m); renderThumbs(); refreshFinish();
  uploadOne(m);
}
async function uploadOne(m) {
  const rbd = State.est ? State.est[COL.RBD] : 'SN';
  if (!m.driveName) {
    const base = (m.type === 'video' ? 'video' : 'foto') + '_' + rbd + '_' + stamp() + '_' + Math.random().toString(36).slice(2, 6);
    m.driveName = base + (m.type === 'video' ? '.webm' : '.jpg');
  }
  try {
    const b64 = await blobToB64(m.blob);
    if (m.cancelled) return;
    /* Se lee la respuesta (CORS real) para CONFIRMAR que subió y capturar la URL de Drive */
    const resp = await postJSON({ accion: 'subirArchivo', encargado: CFG.encargado, fileName: m.driveName, mime: m.type === 'video' ? 'video/webm' : 'image/jpeg', data: b64, tipo: m.type });
    if (m.cancelled) { sendAction({ accion: 'borrarArchivo', encargado: CFG.encargado, fileName: m.driveName }); return; }
    if (resp && resp.ok) { m.upState = 'done'; m.driveUrl = resp.url || ''; }
    else m.upState = 'error';
  } catch (e) { m.upState = 'error'; }
  renderThumbs(); refreshFinish();
}
function blobToB64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); }); }

/* ------------------------ FINALIZAR ------------------------- */
async function finishCase() {
  const active = State.media.filter(m => !m.cancelled);
  if (active.some(m => m.upState === 'uploading')) { toast('Espera a que terminen de subir los verificadores.', 2600); return; }
  if (active.some(m => m.upState === 'error')) { toast('Hay verificadores con error. Reintenta (toca el recuadro rojo) o elimínalos.', 3200); return; }
  btnNext.disabled = true; btnNext.innerHTML = '<span class="spinner"></span> Finalizando...';
  if (!State.gps) {
    try {
      State.gps = await new Promise(r => {
        if (!navigator.geolocation) { r(null); return; }
        navigator.geolocation.getCurrentPosition(p => r({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }), () => r(null), { timeout: 6000 });
      });
    } catch { State.gps = null; }
  }
  const now = new Date(); const est = State.est; const rbd = est[COL.RBD]; const id = nextReportId();
  const done = active.filter(m => m.upState === 'done');
  /* Se envía nombre Y url -> el backend no depende de buscar el archivo por nombre */
  const verificadores = done.map(m => (m.type === 'video' ? 'video' : 'foto') + ': ' + m.driveName + (m.driveUrl ? ' -> ' + m.driveUrl : ''));
  const gpsTxt = State.gps ? `${State.gps.lat.toFixed(6)}, ${State.gps.lon.toFixed(6)}` : '';
  const gpsAcc = State.gps ? Math.round(State.gps.acc) : '';
  const payload = {
    accion: 'caso', encargado: CFG.encargado, reporteId: id, fecha: now.toLocaleString('es-CL'), timestamp: now.toISOString(),
    rbd, establecimiento: est[COL.NOM], direccion: est[COL.DIR], comuna: est[COL.COM], supervisor: est[COL.SUP], institucion: est[COL.INST], tecnico: est[COL.TEC],
    categoria: State.cat, descripcion: State.desc, gps: gpsTxt, gps_acc: gpsAcc,
    verificadores: verificadores.join('\n')
  };
  const reps = loadReports();
  /* Se guarda la URL de DRIVE (no el blob:), así el visor funciona tras recargar */
  reps.push({
    id, encargado: CFG.encargado, rbd, nom: est[COL.NOM], cat: State.cat, desc: State.desc, fecha: payload.fecha, ts: Date.now(),
    enviado: false, visado: '', derivadoA: '', gpsTxt, gpsAcc,
    media: done.map(m => ({ type: m.type, name: m.driveName, url: m.driveUrl || '' }))
  });
  saveReports(reps);
  let ok = false;
  try { const r = await postJSON(payload); ok = !!(r && r.ok); } catch (e) { ok = false; }
  if (ok) { const rr = loadReports(); const f = rr.find(x => x.id === id && x.encargado === CFG.encargado); if (f) f.enviado = true; saveReports(rr); }
  stopGPS(); renderDone(id, ok);
}
function renderDone(id, ok) {
  showNav(false); $('#btnHome').classList.add('hidden'); $('#gpsChip').classList.add('hidden');
  content.innerHTML = `<div class="screen"><div style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="hero"><div class="mark">${LOGO_SVG}</div><h1>Caso registrado</h1><p>Reporte <b>${esc(id)}</b></p></div>
    <div class="card" style="text-align:center;margin-top:10px">
      <p>${ok ? 'El caso fue enviado al Sheet de <b>' + esc(CFG.encargado) + '</b>.' : 'Quedó guardado como <b>pendiente</b> en Reportes generados; usa el botón <b>Reenviar</b> cuando tengas señal.'}</p>
      <p class="note">${esc(State.est[COL.NOM])} (RBD ${esc(State.est[COL.RBD])})</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <button class="btn accent" id="again">Agregar otro caso</button>
        <button class="btn ghost" id="toHome" style="width:100%">Volver al inicio</button>
      </div>
    </div></div></div>`;
  $('#again').onclick = () => startCase(false); $('#toHome').onclick = renderHome;
}

/* ------------------------ ARRANQUE -------------------------- */
renderHome();
