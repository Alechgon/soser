/* ============================================================
   SOSER · Agregar Caso — App Web (v3, rediseño premium)
   ============================================================ */
const COL={RBD:0,NOM:1,DIR:2,COM:3,SUP:4,INST:5,TEC:6};
const LOGO_SVG=`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F49A0F"/><stop offset="0.5" stop-color="#E8A30C"/><stop offset="1" stop-color="#7DB61C"/></linearGradient></defs><path d="M50 12 C30 12 20 30 28 48 C34 62 50 64 50 64 C50 64 66 62 72 48 C80 30 70 12 50 12 Z" fill="url(#sg)"/><path d="M50 20 C44 30 56 40 50 52 C46 44 54 34 50 20 Z" fill="#2E7D32" opacity="0.85"/></svg>`;
const LS_CFG='soser_caso_cfg', LS_REPORTS='soser_caso_reports';
const CFG_PIN='123456789';
const State={est:null,cat:null,desc:'',media:[],gps:null,gpsWatch:null,startedAt:null};
let CFG=loadCfg();
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const content=$('#content'),navwrap=$('#navwrap'),overlays=$('#overlays');
const btnBack=$('#btnBack'),btnNext=$('#btnNext');
$('#logoSlot').innerHTML=LOGO_SVG;

function toast(m,ms=2000){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),ms);}
function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function loadCfg(){try{return JSON.parse(localStorage.getItem(LS_CFG))||{}}catch{return{}}}
function saveCfg(c){localStorage.setItem(LS_CFG,JSON.stringify(c));CFG=c;}
function loadReports(){try{return JSON.parse(localStorage.getItem(LS_REPORTS))||[]}catch{return[]}}
function saveReports(r){localStorage.setItem(LS_REPORTS,JSON.stringify(r));}
function stamp(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;}
function nextReportId(){const ini=(CFG.encargado||'X').trim().charAt(0).toUpperCase();const reps=loadReports().filter(r=>r.encargado===CFG.encargado);return ini+String(reps.length+1).padStart(4,'0');}
function showNav(show){navwrap.classList.toggle('hidden',!show);}

/* GPS */
function startGPS(){const chip=$('#gpsChip'),dot=$('#gpsDot'),txt=$('#gpsTxt');chip.classList.remove('hidden');dot.className='dot wait';txt.textContent='GPS…';
  if(!navigator.geolocation){txt.textContent='Sin GPS';dot.className='dot';return;}
  if(State.gpsWatch)navigator.geolocation.clearWatch(State.gpsWatch);
  State.gpsWatch=navigator.geolocation.watchPosition(p=>{State.gps={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy};dot.className='dot ok';txt.textContent='±'+Math.round(p.coords.accuracy)+'m';},()=>{dot.className='dot';txt.textContent='GPS off';},{enableHighAccuracy:true,maximumAge:0,timeout:20000});}
function stopGPS(){if(State.gpsWatch){navigator.geolocation.clearWatch(State.gpsWatch);State.gpsWatch=null;}}

/* ============================================================ HOME */
function renderHome(){
  stopGPS();$('#gpsChip').classList.add('hidden');showNav(false);$('#btnHome').classList.add('hidden');$('#modeLabel').textContent='Casos';
  const cfgOk=CFG.sheetUrl&&CFG.encargado;
  const nrep=loadReports().filter(r=>r.encargado===CFG.encargado).length;
  content.innerHTML=`<div class="screen"><div style="flex:0 0 auto">
    <div class="hero"><div class="mark">${LOGO_SVG}</div><h1>Gestión de Casos</h1>
      <p>${cfgOk?('Encargado: '+CFG.encargado):'Registro de mantención · SOSER'}</p></div>
    <div class="home-actions">
      <button class="primary-action" id="aAdd"><div class="pa-ic">➕</div><div><h3>Agregar caso</h3><p>Nuevo reporte de mantención en terreno</p></div><div class="pa-arrow">›</div></button>
      <button class="primary-action rep" id="aReports"><div class="pa-ic">📋</div><div><h3>Reportes generados</h3><p>${nrep} registrado(s) · estados y derivaciones</p></div><div class="pa-arrow">›</div></button>
    </div>
    <div class="cfg-fab" id="aCfg" title="Configuración">⚙️</div>
    ${cfgOk?'':'<div class="cfg-warn">Configura primero (ícono ⚙️) el <b>Sheet</b> y el <b>nombre de encargado</b>.</div>'}
  </div></div>`;
  $('#aAdd').onclick=()=>{ if(!cfgOk){toast('Primero completa la configuración');askPin(renderConfig);return;} startCase(); };
  $('#aReports').onclick=renderReports;
  $('#aCfg').onclick=()=>askPin(renderConfig);
}

/* PIN */
function askPin(onOk){
  showNav(false);$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;let entered='';
  content.innerHTML=`<div class="screen"><div style="flex:1;display:flex;align-items:center;justify-content:center">
    <div class="card" style="max-width:340px;width:100%">
      <div class="eyebrow"><b>Configuración</b></div>
      <h2 class="q" style="text-align:center;margin-bottom:4px">Ingresa la clave</h2>
      <div class="pin-dots" id="pinDots">${'<i></i>'.repeat(9)}</div>
      <div class="pin-grid" id="pinGrid">
        ${[1,2,3,4,5,6,7,8,9].map(n=>`<button class="pin-key" data-k="${n}">${n}</button>`).join('')}
        <button class="pin-key" data-k="del">⌫</button><button class="pin-key" data-k="0">0</button><button class="pin-key" data-k="ok" style="background:var(--grad);color:#fff">✓</button>
      </div>
    </div></div></div>`;
  const dots=()=>$$('#pinDots i').forEach((d,i)=>d.classList.toggle('on',i<entered.length));
  const check=()=>{if(entered===CFG_PIN)onOk();else{toast('Clave incorrecta');entered='';dots();}};
  $$('#pinGrid .pin-key').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(k==='del')entered=entered.slice(0,-1);else if(k==='ok')return check();else if(entered.length<9)entered+=k;dots();if(entered.length===9)check();});
}

/* CONFIG */
function renderConfig(){
  showNav(true);$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;
  content.innerHTML=`<div class="screen"><div style="flex:1;overflow-y:auto"><div class="card">
    <div class="eyebrow"><b>Configuración</b></div><h2 class="q">Conexión y encargado</h2>
    <div class="banner">Pega la URL de tu <b>Apps Script</b> (termina en <code>/exec</code>) y tu <b>nombre de encargado</b>.</div>
    <div class="field-block"><label class="fld">URL del Apps Script (/exec)</label><input type="url" id="cfgUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${CFG.sheetUrl||''}"></div>
    <div class="field-block"><label class="fld">Nombre de encargado</label><input type="text" id="cfgEnc" placeholder="Ej: Manuel Echeverría" value="${CFG.encargado||''}"></div>
    <p class="note">Se guardan en este dispositivo. Cada encargado usa su propio nombre.</p>
  </div></div></div>`;
  btnBack.onclick=renderHome;btnNext.textContent='Guardar';btnNext.disabled=false;btnNext.className='btn accent';
  btnNext.onclick=()=>{const url=$('#cfgUrl').value.trim(),enc=$('#cfgEnc').value.trim();if(!enc){toast('Falta el nombre de encargado');return;}
    if(url&&!/^https:\/\/script\.google\.com\/.*\/exec$/.test(url)){if(!confirm('La URL no parece /exec. ¿Guardar igual?'))return;}
    saveCfg({sheetUrl:url,encargado:enc});toast('Configuración guardada');renderHome();};
}

/* ============================================================ REPORTES + KPIs + borrar */
let repFilterEst=null; // establecimiento seleccionado para KPIs
async function renderReports(){
  showNav(false);$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;repFilterEst=null;
  const local=loadReports().filter(r=>r.encargado===CFG.encargado);
  paintReports(local,false);
  const remote=await fetchReportsFromSheet();
  if(remote){const pend=local.filter(r=>r.enviado===false);
    const merged=[...remote.map(r=>({...r,enviado:true})),...pend];
    // conservar borrados locales
    paintReports(merged,true);}
}
function estadoDe(r){
  const v=(r.visado||'').toString().trim(), d=(r.derivadoA||'').toString().trim();
  if(r.enviado===false)return{k:'pend',t:'Pendiente envío'};
  if(d)return{k:'der',t:'Derivado'};
  if(v)return{k:'vis',t:'Visado'};
  return{k:'pend',t:'Sin visar'};
}
function paintReports(list,fromSheet){
  const activos=list.filter(r=>!r.borrado);
  const scope = repFilterEst? activos.filter(r=>(r.nom||r.establecimiento)===repFilterEst) : activos;
  const total=scope.length;
  const derivados=scope.filter(r=>estadoDe(r).k==='der').length;
  const solucion=scope.filter(r=>{const v=(r.visado||'').toString().toLowerCase();return v.includes('final')||v.includes('solucion');}).length;
  // establecimientos únicos con casos
  const ests=[...new Set(activos.map(r=>r.nom||r.establecimiento).filter(Boolean))];
  content.innerHTML=`<div class="screen">
    <div class="rep-head">
      <div class="eyebrow" style="margin:0 2px 8px"><b>Reportes generados</b> <span class="grp">· ${repFilterEst||CFG.encargado||'—'}</span></div>
      <div class="kpis">
        <div class="kpi"><div class="bar"></div><div class="n">${total}</div><div class="l">${repFilterEst?'Casos':'Total casos'}</div></div>
        <div class="kpi der"><div class="bar"></div><div class="n">${derivados}</div><div class="l">Derivados</div></div>
        <div class="kpi sol"><div class="bar"></div><div class="n">${solucion}</div><div class="l">Solucionados</div></div>
      </div>
      ${repFilterEst?`<button class="btn ghost" id="clrEst" style="width:100%;margin-bottom:12px;flex:none">‹ Ver todos los establecimientos</button>`:`
      <div class="rep-search search-wrap" style="margin-bottom:12px">
        <span class="ic-lead">🔎</span>
        <input type="text" id="repQ" placeholder="Buscar establecimiento con casos…" autocomplete="off">
        <div class="suggest hidden" id="repSug"></div>
      </div>`}
    </div>
    <div class="rep-list" id="repList">${renderRepList(scope,fromSheet)}</div>
  </div>`;
  bindRepList(scope);
  if(repFilterEst){$('#clrEst').onclick=()=>{repFilterEst=null;paintReports(list,fromSheet);};}
  else{
    const inp=$('#repQ'),sug=$('#repSug');
    inp.addEventListener('input',()=>{const v=norm(inp.value.trim());if(!v){sug.classList.add('hidden');return;}
      const m=ests.filter(e=>norm(e).includes(v)).slice(0,10);
      if(!m.length){sug.classList.add('hidden');return;}
      sug.innerHTML=m.map(e=>{const n=activos.filter(r=>(r.nom||r.establecimiento)===e).length;return `<div data-e="${e.replace(/"/g,'&quot;')}"><div>${e}<small>${n} caso(s)</small></div></div>`;}).join('');
      sug.classList.remove('hidden');
      $$('#repSug div[data-e]').forEach(d=>d.onclick=()=>{repFilterEst=d.dataset.e;paintReports(list,fromSheet);});});
  }
}
function renderRepList(scope,fromSheet){
  const list=scope.slice().sort((a,b)=>{
    if(!!a.borrado!==!!b.borrado)return a.borrado?1:-1; // borrados al final
    return (b.ts||0)-(a.ts||0);
  });
  if(!list.length)return `<div class="empty"><div class="ic">📭</div><p>Sin reportes ${repFilterEst?'para este establecimiento':'aún'}.</p></div>`;
  return list.map(r=>{
    if(r.borrado){return `<div class="rep deleting"><div class="rid">${r.id}</div><div class="rbody"><div class="rtitle">${r.nom||r.establecimiento} · RBD ${r.rbd}</div><div class="rmeta"><span class="rstate pend">Eliminado</span> <span>${r.motivoBorrado||''}</span></div></div></div>`;}
    const st=estadoDe(r);
    return `<div class="rep"><div class="rid">${r.id}</div>
      <div class="rbody">
        <div class="rtitle">${r.nom||r.establecimiento} · RBD ${r.rbd}</div>
        <div class="rdesc">${r.desc||r.descripcion||''}</div>
        <div class="rmeta"><span>${r.cat||r.categoria||''}</span><span>${r.fecha||''}</span><span class="rstate ${st.k}">${st.t}</span>${r.derivadoA?`<span>↗ ${r.derivadoA}</span>`:''}</div>
      </div>
      <button class="rdel" data-del="${r.id}" title="Eliminar">🗑️</button>
    </div>`;}).join('');
}
function bindRepList(scope){
  $$('#repList .rdel').forEach(b=>b.onclick=()=>openDelete(b.dataset.del));
}
function openDelete(id){
  const bg=document.createElement('div');bg.className='modal-bg';
  bg.innerHTML=`<div class="modal"><h3>Eliminar caso ${id}</h3><p>Indica el motivo de la eliminación.</p>
    <textarea id="delMotivo" placeholder="Ej: subido por error, duplicado…"></textarea>
    <div class="mbtns"><button class="btn ghost" id="delCancel" style="flex:1">Cancelar</button><button class="btn" id="delOk" style="flex:1;background:var(--red);color:#fff">Eliminar</button></div>
  </div>`;
  overlays.appendChild(bg);
  const close=()=>bg.remove();
  bg.onclick=e=>{if(e.target===bg)close();};
  $('#delCancel',bg).onclick=close;
  $('#delOk',bg).onclick=async()=>{
    const motivo=$('#delMotivo',bg).value.trim();if(!motivo){toast('Indica el motivo');return;}
    $('#delOk',bg).innerHTML='<span class="spinner"></span>';
    // marcar local como borrado
    const reps=loadReports();const r=reps.find(x=>x.id===id&&x.encargado===CFG.encargado);
    if(r){r.borrado=true;r.motivoBorrado=motivo;saveReports(reps);}
    // avisar al Sheet (borrado lógico)
    await sendAction({accion:'borrar',encargado:CFG.encargado,reporteId:id,motivo});
    close();toast('Caso eliminado');renderReports();
  };
}
async function fetchReportsFromSheet(){
  if(!CFG.sheetUrl||!CFG.encargado)return null;
  try{const res=await fetch(CFG.sheetUrl+'?encargado='+encodeURIComponent(CFG.encargado)+'&t='+Date.now());const d=await res.json();
    if(d&&d.ok&&Array.isArray(d.reportes))return d.reportes.reverse();return null;}catch(e){return null;}
}
async function sendAction(payload){try{await fetch(CFG.sheetUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});return true;}catch(e){return false;}}

/* ============================================================ NUEVO CASO */
function startCase(){State.est=null;State.cat=null;State.desc='';State.media=[];State.startedAt=new Date();$('#modeLabel').textContent='Agregar caso';startGPS();renderEstablecimiento();}

function renderEstablecimiento(){
  showNav(true);$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;
  const chosen=!!State.est;
  content.innerHTML=`<div class="screen"><div style="flex:1;overflow-y:auto"><div class="card">
    <div class="eyebrow"><b>Agregar caso</b> <span class="grp">· Establecimiento</span></div>
    <h2 class="q">Indica el establecimiento</h2>
    <div id="searchZone">
      ${chosen?renderBubbles():renderSearchInputs()}
    </div>
    <div id="estData" class="${chosen?'':'hidden'}"><div class="readonly-grid" style="margin-top:4px">
      <div class="ro full"><span>Dirección</span><b id="dDir">${chosen?State.est[COL.DIR]:'—'}</b></div>
      <div class="ro"><span>Comuna</span><b id="dCom">${chosen?State.est[COL.COM]:'—'}</b></div>
      <div class="ro"><span>Institución</span><b id="dInst">${chosen?State.est[COL.INST]:'—'}</b></div>
      <div class="ro"><span>Supervisor</span><b id="dSup">${chosen?State.est[COL.SUP]:'—'}</b></div>
      <div class="ro tech"><span>Técnico manten.</span><b id="dTec">${chosen?State.est[COL.TEC]:'—'}</b></div>
    </div></div>
  </div></div></div>`;
  btnBack.onclick=renderHome;btnNext.className='btn accent';btnNext.textContent='Continuar';btnNext.disabled=!chosen;
  btnNext.onclick=renderCategoria;
  if(chosen)bindBubbles();else bindSearchInputs();
}
function renderSearchInputs(){
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
function renderBubbles(){
  const e=State.est;
  return `<div class="bubble-row"><button class="bubble" id="bubble"><span class="b-ic">🏫</span><span class="b-txt">${e[COL.NOM]} · RBD ${e[COL.RBD]}</span><span class="b-edit">✎</span></button></div>`;
}
function bindBubbles(){
  const b=$('#bubble');if(b)b.onclick=()=>{State.est=null;renderEstablecimiento();};
}
function bindSearchInputs(){
  setupSearch('qRbd','sgRbd','clrRbd',COL.RBD,true);
  setupSearch('qNom','sgNom','clrNom',COL.NOM,false);
}
function setupSearch(inputId,sgId,clrId,col,isRbd){
  const inp=$('#'+inputId);if(!inp)return;const sg=$('#'+sgId),clr=$('#'+clrId);let hl=-1,cur=[];
  inp.addEventListener('input',()=>{const v=norm(inp.value.trim());clr.classList.toggle('hidden',!inp.value);
    if(!v){sg.classList.add('hidden');return;}
    cur=BBDD.filter(r=>norm(r[col]).includes(v)).slice(0,14);
    if(!cur.length){sg.classList.add('hidden');return;}
    sg.innerHTML=cur.map((r,i)=>`<div data-i="${i}"><div>${r[col]}<small>${isRbd?r[COL.NOM]:'RBD '+r[COL.RBD]} · ${r[COL.COM]}</small></div></div>`).join('');
    sg.classList.remove('hidden');hl=-1;$$('#'+sgId+' div[data-i]').forEach(d=>d.onclick=()=>pickEst(cur[+d.dataset.i]));});
  inp.addEventListener('keydown',e=>{const it=$$('#'+sgId+' div[data-i]');if(!it.length)return;if(e.key==='ArrowDown')hl=Math.min(hl+1,it.length-1);else if(e.key==='ArrowUp')hl=Math.max(hl-1,0);else if(e.key==='Enter'&&hl>=0){pickEst(cur[hl]);return;}else return;it.forEach((d,i)=>d.classList.toggle('hl',i===hl));e.preventDefault();});
  clr.onclick=()=>{inp.value='';clr.classList.add('hidden');sg.classList.add('hidden');};
}
function pickEst(r){
  State.est=r;
  // animación: reemplaza inputs por burbuja y muestra datos
  $('#searchZone').innerHTML=renderBubbles();bindBubbles();
  $('#dDir').textContent=r[COL.DIR]||'—';$('#dCom').textContent=r[COL.COM]||'—';$('#dInst').textContent=r[COL.INST]||'—';$('#dSup').textContent=r[COL.SUP]||'—';$('#dTec').textContent=r[COL.TEC]||'—';
  $('#estData').classList.remove('hidden');btnNext.disabled=false;
}

/* CATEGORÍA — tap directo = continuar (sin botón) */
const CATS=[
  ['Calor','🔥','Equipos, gas, filtración'],
  ['Electricidad','⚡','Enchufes, iluminación, observaciones'],
  ['Filtraciones','💧','Agua, cañería, humedad'],
  ['Infraestructura','🏗️','Mosquiteros, pisos, muros'],
  ['Frío','🧊','Equipos, temperatura, filtración'],
  ['Otro','🧰','Otro tipo de caso']
];
function renderCategoria(){
  showNav(true);
  content.innerHTML=`<div class="screen">
    <div class="eyebrow" style="margin:0 2px 8px;flex:0 0 auto"><b>Agregar caso</b> <span class="grp">· Categoría</span></div>
    <h2 class="q" style="margin:0 2px 14px;flex:0 0 auto">Selecciona el tipo de caso</h2>
    <div class="cat-grid">${CATS.map(([n,ic,sub])=>`<div class="cat" data-c="${n}"><div class="glow"></div><div class="cat-ic">${ic}</div><div><div class="cat-name">${n}</div><div class="cat-sub">${sub}</div></div></div>`).join('')}</div>
  </div>`;
  // solo Back en la barra; el tap en la categoría avanza
  btnBack.onclick=renderEstablecimiento;
  btnNext.classList.add('hidden');
  navwrap.querySelector('.inner').style.justifyContent='flex-start';
  $$('.cat').forEach(c=>c.onclick=()=>{State.cat=c.dataset.c;renderDescripcion();});
}

/* ============================================================ DESCRIPCIÓN + VERIFICADORES (subida en background) */
function renderDescripcion(){
  showNav(true);btnNext.classList.remove('hidden');
  navwrap.querySelector('.inner').style.justifyContent='';
  content.innerHTML=`<div class="screen"><div style="flex:1;overflow-y:auto"><div class="card">
    <div class="eyebrow"><b>Agregar caso</b> <span class="grp">· ${State.cat}</span></div>
    <h2 class="q">Describe la situación</h2>
    <div class="field-block"><label class="fld">Indique</label><textarea id="descTxt" placeholder="Describe el caso, la falla o el requerimiento...">${State.desc||''}</textarea></div>
    <div class="verifier"><div class="vtitle">Verificadores</div>
      <div class="vbtns"><button class="vbtn" data-cap="photo"><span class="ic">📷</span>Foto</button><button class="vbtn" data-cap="video"><span class="ic">🎥</span>Video (máx 15s)</button></div>
      <div class="thumbs" id="thumbs"></div>
      <div id="upSummary"></div>
    </div>
  </div></div></div>`;
  btnBack.onclick=renderCategoria;btnNext.className='btn finish';btnNext.textContent='Finalizar';
  const upd=()=>{State.desc=$('#descTxt').value;btnNext.disabled=!State.desc.trim();};
  $('#descTxt').oninput=upd;upd();
  renderThumbs();$$('[data-cap]').forEach(b=>b.onclick=()=>openCamera(b.dataset.cap));
  btnNext.onclick=finishCase;
}
function renderThumbs(){
  const box=$('#thumbs');if(!box)return;
  box.innerHTML=State.media.map((m,i)=>{
    let ov='';
    if(m.upState==='uploading')ov=`<div class="up"><div class="ring"></div></div>`;
    else if(m.upState==='done')ov=`<div class="up done"><span class="ok">✓</span></div>`;
    else if(m.upState==='error')ov=`<div class="up err"><span class="ok">!</span></div>`;
    return `<div class="thumb">${m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`}<span class="badge">${m.type}</span><button class="del" data-del="${i}">✕</button>${ov}</div>`;
  }).join('');
  $$('#thumbs .del').forEach(b=>b.onclick=()=>removeMedia(+b.dataset.del));
}
function removeMedia(i){
  const m=State.media[i];if(!m)return;
  // si ya está subida o subiéndose, pedir borrado en la nube
  if(m.upState==='uploading'||m.upState==='done'){
    if(m.driveName){ sendAction({accion:'borrarArchivo',encargado:CFG.encargado,fileName:m.driveName}); }
    m.cancelled=true;
  }
  State.media.splice(i,1);renderThumbs();
}

/* Cámara: al capturar, vuelve a la app y ARRANCA la subida en background */
let camStream=null,camRec=null,camChunks=[],camTimer=null;
async function openCamera(kind){
  const ov=document.createElement('div');ov.className='cam-bg';
  ov.innerHTML=`<button class="camclose">✕</button><video autoplay playsinline></video><div class="cambar"><div class="shoot ${kind==='photo'?'photo':''}"></div></div>`;
  overlays.appendChild(ov);const video=$('video',ov);
  try{camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:kind==='video'});video.srcObject=camStream;}
  catch{toast('No se pudo abrir la cámara');ov.remove();return;}
  const close=()=>{if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}ov.remove();};
  $('.camclose',ov).onclick=close;const shoot=$('.shoot',ov);
  if(kind==='photo'){shoot.onclick=()=>{const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);
    c.toBlob(b=>{addMedia({type:'photo',blob:b,url:URL.createObjectURL(b)});close();},'image/jpeg',.82);};}
  else{let rec=false;shoot.onclick=()=>{if(!rec){camChunks=[];camRec=new MediaRecorder(camStream);camRec.ondataavailable=e=>camChunks.push(e.data);
    camRec.onstop=()=>{const b=new Blob(camChunks,{type:'video/webm'});addMedia({type:'video',blob:b,url:URL.createObjectURL(b)});close();};
    camRec.start();rec=true;shoot.style.background='#fff';const r=document.createElement('div');r.className='rec';r.textContent='● REC 15s';ov.appendChild(r);let t=15;camTimer=setInterval(()=>{t--;r.textContent='● REC '+t+'s';if(t<=0){clearInterval(camTimer);camRec.stop();}},1000);}else{clearInterval(camTimer);camRec.stop();}};}
}
function addMedia(m){
  m.upState='uploading';m.driveName=null;m.cancelled=false;
  State.media.push(m);renderThumbs();toast(m.type==='video'?'Video agregado, subiendo…':'Foto agregada, subiendo…',1400);
  uploadOne(m); // background
}
async function uploadOne(m){
  // Nombre único de archivo
  const rbd=State.est?State.est[COL.RBD]:'SN';
  const base=(m.type==='video'?'video':'foto')+'_'+rbd+'_'+stamp()+'_'+Math.random().toString(36).slice(2,6);
  m.driveName=base+(m.type==='video'?'.webm':'.jpg');
  try{
    const b64=await blobToB64(m.blob);
    if(m.cancelled){return;}
    await sendAction({accion:'subirArchivo',encargado:CFG.encargado,fileName:m.driveName,mime:m.type==='video'?'video/webm':'image/jpeg',data:b64,tipo:m.type});
    if(m.cancelled){ sendAction({accion:'borrarArchivo',encargado:CFG.encargado,fileName:m.driveName}); return; }
    m.upState='done';
  }catch(e){ m.upState='error'; m.driveName='error_'+Date.now(); }
  renderThumbs();
}
function blobToB64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(blob);});}

/* ============================================================ FINALIZAR */
async function finishCase(){
  btnNext.disabled=true;btnNext.innerHTML='<span class="spinner"></span> Finalizando...';
  // esperar a que terminen las subidas en curso
  const pend=State.media.filter(m=>m.upState==='uploading'&&!m.cancelled);
  if(pend.length){
    showUpBar();
    let guard=0;
    while(State.media.some(m=>m.upState==='uploading'&&!m.cancelled) && guard<60){await new Promise(r=>setTimeout(r,500));guard++;}
  }
  if(!State.gps){try{State.gps=await new Promise(r=>{if(!navigator.geolocation){r(null);return;}navigator.geolocation.getCurrentPosition(p=>r({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy}),()=>r(null),{timeout:6000});});}catch{State.gps=null;}}
  const now=new Date();const est=State.est;const rbd=est[COL.RBD];const id=nextReportId();
  const verificadores=State.media.filter(m=>!m.cancelled&&m.upState==='done').map(m=>(m.type==='video'?'video':'foto')+': '+m.driveName);
  const payload={accion:'caso',encargado:CFG.encargado,reporteId:id,fecha:now.toLocaleString('es-CL'),timestamp:now.toISOString(),
    rbd,establecimiento:est[COL.NOM],direccion:est[COL.DIR],comuna:est[COL.COM],supervisor:est[COL.SUP],institucion:est[COL.INST],tecnico:est[COL.TEC],
    categoria:State.cat,descripcion:State.desc,gps:State.gps?`${State.gps.lat.toFixed(6)}, ${State.gps.lon.toFixed(6)}`:'',gps_acc:State.gps?Math.round(State.gps.acc):'',
    verificadores:verificadores.join('\n')};
  const reps=loadReports();
  reps.push({id,encargado:CFG.encargado,rbd,nom:est[COL.NOM],cat:State.cat,desc:State.desc,fecha:payload.fecha,ts:Date.now(),enviado:false,visado:'',derivadoA:''});
  saveReports(reps);
  const ok=await sendAction(payload);
  if(ok){const rr=loadReports();const f=rr.find(x=>x.id===id&&x.encargado===CFG.encargado);if(f)f.enviado=true;saveReports(rr);}
  stopGPS();renderDone(id,ok);
}
function showUpBar(){
  const box=$('#upSummary');if(!box)return;
  box.innerHTML=`<div class="upbar"><i id="upi"></i></div><p class="note">Subiendo verificadores…</p>`;
  const tick=()=>{const tot=State.media.filter(m=>!m.cancelled).length||1;const done=State.media.filter(m=>m.upState==='done').length;const pi=$('#upi');if(pi)pi.style.width=Math.round(done/tot*100)+'%';if(State.media.some(m=>m.upState==='uploading'))setTimeout(tick,400);};
  tick();
}
function renderDone(id,ok){
  showNav(false);$('#btnHome').classList.add('hidden');$('#gpsChip').classList.add('hidden');
  content.innerHTML=`<div class="screen"><div style="flex:1;display:flex;flex-direction:column;justify-content:center">
    <div class="hero"><div class="mark">${LOGO_SVG}</div><h1>Caso registrado</h1><p>Reporte <b>${id}</b></p></div>
    <div class="card" style="text-align:center;margin-top:10px">
      <p>${ok?'El caso fue enviado al Sheet de <b>'+CFG.encargado+'</b>.':'Quedó guardado como <b>pendiente</b> en Reportes generados; podrás reintentar.'}</p>
      <p class="note">${State.est[COL.NOM]} (RBD ${State.est[COL.RBD]})</p>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px">
        <button class="btn accent" id="again">Agregar otro caso</button>
        <button class="btn ghost" id="toHome" style="width:100%">Volver al inicio</button>
      </div>
    </div></div></div>`;
  $('#again').onclick=startCase;$('#toHome').onclick=renderHome;
}

/* ARRANQUE */
renderHome();
