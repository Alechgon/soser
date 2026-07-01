/* ============================================================
   SOSER · Agregar Caso — App Web
   Config (Sheet+encargado) · GPS al inicio · categorías ·
   verificadores · caché de reportes · IDs correlativos · envío Apps Script
   ============================================================ */
const COL={RBD:0,NOM:1,DIR:2,COM:3,SUP:4,INST:5,TEC:6};
const LOGO_SVG=`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F49A0F"/><stop offset="0.5" stop-color="#E8A30C"/><stop offset="1" stop-color="#7DB61C"/></linearGradient></defs><path d="M50 12 C30 12 20 30 28 48 C34 62 50 64 50 64 C50 64 66 62 72 48 C80 30 70 12 50 12 Z" fill="url(#sg)"/><path d="M50 20 C44 30 56 40 50 52 C46 44 54 34 50 20 Z" fill="#2E7D32" opacity="0.85"/></svg>`;

const LS_CFG='soser_caso_cfg', LS_REPORTS='soser_caso_reports';
const State={est:null,cat:null,desc:'',media:[],gps:null,gpsWatch:null,startedAt:null};
let CFG=loadCfg();      // {sheetUrl, encargado}
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const content=$('#content'),navbar=$('#navbar'),overlays=$('#overlays');
$('#logoSlot').innerHTML=LOGO_SVG;

function toast(m,ms=2000){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),ms);}
function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function loadCfg(){try{return JSON.parse(localStorage.getItem(LS_CFG))||{}}catch{return{}}}
function saveCfg(c){localStorage.setItem(LS_CFG,JSON.stringify(c));CFG=c;}
function loadReports(){try{return JSON.parse(localStorage.getItem(LS_REPORTS))||[]}catch{return[]}}
function saveReports(r){localStorage.setItem(LS_REPORTS,JSON.stringify(r));}
function stamp(){const d=new Date();const p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;}
function nextReportId(){
  const ini=(CFG.encargado||'X').trim().charAt(0).toUpperCase();
  const reps=loadReports().filter(r=>r.encargado===CFG.encargado);
  const n=reps.length+1;
  return ini+String(n).padStart(4,'0');
}

/* ---------- GPS ---------- */
function startGPS(){
  const chip=$('#gpsChip'),dot=$('#gpsDot'),txt=$('#gpsTxt');chip.classList.remove('hidden');dot.className='dot wait';txt.textContent='GPS…';
  if(!navigator.geolocation){txt.textContent='Sin GPS';dot.className='dot';return;}
  if(State.gpsWatch)navigator.geolocation.clearWatch(State.gpsWatch);
  State.gpsWatch=navigator.geolocation.watchPosition(
    p=>{State.gps={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy};dot.className='dot ok';txt.textContent='±'+Math.round(p.coords.accuracy)+'m';},
    ()=>{dot.className='dot';txt.textContent='GPS off';},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
function stopGPS(){if(State.gpsWatch){navigator.geolocation.clearWatch(State.gpsWatch);State.gpsWatch=null;}}

/* ============================================================ HOME */
function renderHome(){
  stopGPS();$('#gpsChip').classList.add('hidden');navbar.classList.add('hidden');$('#btnHome').classList.add('hidden');
  $('#modeLabel').textContent='Casos';
  const cfgOk=CFG.sheetUrl&&CFG.encargado;
  content.innerHTML=`<div class="screen">
    <div class="hero"><div class="mark">${LOGO_SVG}</div><h1>Gestión de Casos</h1>
      <p>${cfgOk?('Encargado: '+CFG.encargado):'Registro de mantención · SOSER'}</p></div>
    <div class="home-actions">
      <button class="primary-action" id="aAdd"><div class="pa-ic">➕</div>
        <div><h3>Agregar caso</h3><p>Nuevo reporte de mantención en terreno</p></div><div class="pa-arrow">›</div></button>
      <div class="mini-actions">
        <div class="mini" id="aReports"><div class="m-ic">📋</div><b>Reportes generados</b><small>${loadReports().filter(r=>r.encargado===CFG.encargado).length} registrados</small></div>
        <div class="mini" id="aCfg"><div class="m-ic">⚙️</div><b>Configuración</b><small>${cfgOk?'Listo':'Pendiente'}</small></div>
      </div>
    </div>
    ${cfgOk?'':'<div class="cfg-warn">Configura primero el <b>Sheet</b> y el <b>nombre de encargado</b> para poder enviar casos.</div>'}
  </div>`;
  $('#aAdd').onclick=()=>{ if(!cfgOk){toast('Primero completa la configuración');renderConfig();return;} startCase(); };
  $('#aReports').onclick=renderReports;
  $('#aCfg').onclick=renderConfig;
}

/* ============================================================ CONFIG */
function renderConfig(){
  navbar.classList.remove('hidden');$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="eyebrow"><b>Configuración</b></div>
    <h2 class="q">Conexión y encargado</h2>
    <div class="banner">Pega la URL de tu <b>Apps Script</b> (la que termina en <code>/exec</code>) y tu <b>nombre de encargado</b>. Con tu nombre se crea/usa una hoja propia en el Sheet.</div>
    <div class="field-block"><label class="fld">URL del Apps Script (/exec)</label>
      <input type="url" id="cfgUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${CFG.sheetUrl||''}"></div>
    <div class="field-block"><label class="fld">Nombre de encargado</label>
      <input type="text" id="cfgEnc" placeholder="Ej: Manuel Echeverría" value="${CFG.encargado||''}"></div>
    <p class="note">La URL y el nombre quedan guardados en este dispositivo. Cada encargado usa su propio nombre.</p>
  </div></div>`;
  $('#btnBack').onclick=renderHome;
  $('#btnNext').textContent='Guardar';$('#btnNext').disabled=false;
  $('#btnNext').onclick=()=>{
    const url=$('#cfgUrl').value.trim(),enc=$('#cfgEnc').value.trim();
    if(!enc){toast('Falta el nombre de encargado');return;}
    if(url&&!/^https:\/\/script\.google\.com\/.*\/exec$/.test(url)){ if(!confirm('La URL no parece un /exec de Apps Script. ¿Guardar igual?'))return; }
    saveCfg({sheetUrl:url,encargado:enc});toast('Configuración guardada');renderHome();
  };
}

/* ============================================================ REPORTES (caché) */
function renderReports(){
  navbar.classList.remove('hidden');$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;
  const reps=loadReports().filter(r=>r.encargado===CFG.encargado).sort((a,b)=>b.ts-a.ts);
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="eyebrow"><b>Reportes generados</b> <span class="grp">· ${CFG.encargado||'—'}</span></div>
    <h2 class="q">${reps.length} reporte(s)</h2>
    ${reps.length?reps.map(r=>`<div class="rep"><div class="rh"><span class="rid">${r.id}</span><span class="rcat">${r.cat}</span></div>
        <div class="rtitle">${r.nom} · RBD ${r.rbd}</div>
        <div class="rmeta">${r.fecha} · ${r.desc.slice(0,60)}${r.desc.length>60?'…':''}</div>
        <span class="rstatus ${r.enviado?'ok':'pend'}">${r.enviado?'✓ Enviado al Sheet':'⚠ Pendiente de envío'}</span>
        ${r.enviado?'':`<div style="margin-top:8px"><button class="btn accent" style="padding:9px 14px;font-size:13px" data-resend="${r.id}">Reintentar envío</button></div>`}
      </div>`).join(''):'<p class="note">Aún no has generado reportes.</p>'}
  </div></div>`;
  $('#btnBack').onclick=renderHome;$('#btnNext').classList.add('hidden');
  $$('[data-resend]').forEach(b=>b.onclick=()=>resend(b.dataset.resend));
}
async function resend(id){
  const reps=loadReports();const r=reps.find(x=>x.id===id);if(!r)return;
  toast('Reenviando…');const ok=await sendToSheet(r.payload);
  if(ok){r.enviado=true;saveReports(reps);toast('Enviado ✓');renderReports();}else toast('No se pudo enviar');
}

/* ============================================================ NUEVO CASO */
function startCase(){
  State.est=null;State.cat=null;State.desc='';State.media=[];State.startedAt=new Date();
  $('#modeLabel').textContent='Agregar caso';startGPS();
  renderEstablecimiento();
}
function renderEstablecimiento(){
  navbar.classList.remove('hidden');$('#btnHome').classList.remove('hidden');$('#btnHome').onclick=renderHome;
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="eyebrow"><b>Agregar caso</b> <span class="grp">· Establecimiento</span></div>
    <h2 class="q">Indica el establecimiento</h2>
    <div class="banner">Busca por <b>RBD</b> o por <b>nombre</b>. Algunos RBD se repiten porque hay dos instituciones juntas; elige la correcta.</div>
    <div class="field-block"><label class="fld">RBD</label>
      <div class="search-wrap"><span class="ic-lead">🔢</span>
        <input type="text" id="qRbd" inputmode="numeric" placeholder="Ej: 8518" autocomplete="off">
        <button class="clearbtn hidden" id="clrRbd">✕</button><div class="suggest hidden" id="sgRbd"></div></div></div>
    <div class="divider-or">O BIEN</div>
    <div class="field-block"><label class="fld">Establecimiento</label>
      <div class="search-wrap"><span class="ic-lead">🏫</span>
        <input type="text" id="qNom" placeholder="Ej: Complejo Estación Central" autocomplete="off">
        <button class="clearbtn hidden" id="clrNom">✕</button><div class="suggest hidden" id="sgNom"></div></div></div>
    <div id="estData" class="hidden"><div class="readonly-grid">
      <div class="ro full"><span>Dirección</span><b id="dDir">—</b></div>
      <div class="ro"><span>Comuna</span><b id="dCom">—</b></div>
      <div class="ro"><span>Institución</span><b id="dInst">—</b></div>
      <div class="ro"><span>Supervisor</span><b id="dSup">—</b></div>
      <div class="ro tech"><span>Técnico manten.</span><b id="dTec">—</b></div>
    </div></div>
  </div></div>`;
  $('#btnBack').onclick=renderHome;
  $('#btnNext').textContent='Continuar';$('#btnNext').disabled=true;$('#btnNext').classList.remove('hidden');
  $('#btnNext').onclick=renderCategoria;
  setupSearch('qRbd','sgRbd','clrRbd',COL.RBD,true);
  setupSearch('qNom','sgNom','clrNom',COL.NOM,false);
}
function setupSearch(inputId,sgId,clrId,col,isRbd){
  const inp=$('#'+inputId),sg=$('#'+sgId),clr=$('#'+clrId);let hl=-1,cur=[];
  inp.addEventListener('input',()=>{const v=norm(inp.value.trim());clr.classList.toggle('hidden',!inp.value);
    if(!v){sg.classList.add('hidden');return;}
    cur=BBDD.filter(r=>norm(r[col]).includes(v)).slice(0,14);
    if(!cur.length){sg.classList.add('hidden');return;}
    sg.innerHTML=cur.map((r,i)=>`<div data-i="${i}"><div>${r[col]}<small>${isRbd?r[COL.NOM]:'RBD '+r[COL.RBD]} · ${r[COL.COM]}</small></div></div>`).join('');
    sg.classList.remove('hidden');hl=-1;$$('#'+sgId+' div[data-i]').forEach(d=>d.onclick=()=>pickEst(cur[+d.dataset.i]));});
  inp.addEventListener('keydown',e=>{const it=$$('#'+sgId+' div[data-i]');if(!it.length)return;
    if(e.key==='ArrowDown')hl=Math.min(hl+1,it.length-1);else if(e.key==='ArrowUp')hl=Math.max(hl-1,0);
    else if(e.key==='Enter'&&hl>=0){pickEst(cur[hl]);return;}else return;
    it.forEach((d,i)=>d.classList.toggle('hl',i===hl));e.preventDefault();});
  clr.onclick=()=>{inp.value='';clr.classList.add('hidden');sg.classList.add('hidden');clearEst();};
}
function pickEst(r){
  State.est=r;$('#qRbd').value=r[COL.RBD];$('#qNom').value=r[COL.NOM];
  $('#clrRbd').classList.remove('hidden');$('#clrNom').classList.remove('hidden');
  $('#sgRbd').classList.add('hidden');$('#sgNom').classList.add('hidden');
  $('#dDir').textContent=r[COL.DIR]||'—';$('#dCom').textContent=r[COL.COM]||'—';
  $('#dInst').textContent=r[COL.INST]||'—';$('#dSup').textContent=r[COL.SUP]||'—';$('#dTec').textContent=r[COL.TEC]||'—';
  $('#estData').classList.remove('hidden');$('#btnNext').disabled=false;
}
function clearEst(){State.est=null;const e=$('#estData');if(e)e.classList.add('hidden');$('#btnNext').disabled=true;}

/* ============================================================ CATEGORÍA (grid ejecutivo) */
const CATS=[
  ['Gas','🔥','Fugas, conexiones, sellos'],
  ['Electricidad','⚡','Enchufes, tableros, SEC'],
  ['Filtraciones','💧','Agua, cañerías, humedad'],
  ['Infraestructura','🏗️','Pisos, muros, estructura'],
  ['Equipos','🧊','Frío, cocción, artefactos'],
  ['Otro','🧰','Otro tipo de caso']
];
function renderCategoria(){
  content.innerHTML=`<div class="screen"><div class="progress"><i style="width:50%"></i></div>
    <div class="eyebrow" style="margin:0 4px 10px"><b>Agregar caso</b> <span class="grp">· Categoría</span></div>
    <h2 class="q" style="margin:0 4px 16px">Selecciona el tipo de caso</h2>
    <div class="cat-grid">${CATS.map(([n,ic,sub])=>`<div class="cat ${State.cat===n?'sel':''}" data-c="${n}"><div class="glow"></div><div class="cat-ic">${ic}</div><div><div class="cat-name">${n}</div><div class="cat-sub">${sub}</div></div></div>`).join('')}</div>
  </div>`;
  $('#btnBack').onclick=renderEstablecimiento;
  $('#btnNext').textContent='Continuar';$('#btnNext').disabled=!State.cat;$('#btnNext').classList.remove('hidden');
  $$('.cat').forEach(c=>c.onclick=()=>{State.cat=c.dataset.c;$$('.cat').forEach(x=>x.classList.remove('sel'));c.classList.add('sel');$('#btnNext').disabled=false;});
  $('#btnNext').onclick=renderDescripcion;
}

/* ============================================================ DESCRIPCIÓN + VERIFICADORES */
function renderDescripcion(){
  content.innerHTML=`<div class="screen"><div class="progress"><i style="width:80%"></i></div>
    <div class="card">
      <div class="eyebrow"><b>Agregar caso</b> <span class="grp">· ${State.cat}</span></div>
      <h2 class="q">Describe la situación</h2>
      <div class="field-block"><label class="fld">Indique</label>
        <textarea id="descTxt" placeholder="Describe el caso, la falla o el requerimiento...">${State.desc||''}</textarea></div>
      <div class="verifier"><div class="vtitle">Verificadores</div>
        <div class="vbtns"><button class="vbtn" data-cap="photo"><span class="ic">📷</span>Foto</button><button class="vbtn" data-cap="video"><span class="ic">🎥</span>Video (máx 15s)</button></div>
        <div class="thumbs" id="thumbs"></div></div>
    </div></div>`;
  $('#btnBack').onclick=renderCategoria;
  $('#btnNext').textContent='Finalizar y enviar';$('#btnNext').classList.remove('accent');$('#btnNext').classList.add('finish');$('#btnNext').classList.remove('hidden');
  const upd=()=>{State.desc=$('#descTxt').value;$('#btnNext').disabled=!State.desc.trim();};
  $('#descTxt').oninput=upd;upd();
  renderThumbs();$$('[data-cap]').forEach(b=>b.onclick=()=>openCamera(b.dataset.cap));
  $('#btnNext').onclick=finishCase;
}
function renderThumbs(){const box=$('#thumbs');if(!box)return;
  box.innerHTML=State.media.map((m,i)=>`<div class="thumb">${m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`}<span class="badge">${m.type}</span><button class="del" data-del="${i}">✕</button></div>`).join('');
  $$('#thumbs .del').forEach(b=>b.onclick=()=>{State.media.splice(+b.dataset.del,1);renderThumbs();});}

/* ============================================================ CÁMARA */
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
    c.toBlob(b=>{State.media.push({type:'photo',blob:b,url:URL.createObjectURL(b)});renderThumbs();close();toast('Foto agregada');},'image/jpeg',.82);};}
  else{let rec=false;shoot.onclick=()=>{if(!rec){camChunks=[];camRec=new MediaRecorder(camStream);camRec.ondataavailable=e=>camChunks.push(e.data);
    camRec.onstop=()=>{const b=new Blob(camChunks,{type:'video/webm'});State.media.push({type:'video',blob:b,url:URL.createObjectURL(b)});renderThumbs();close();toast('Video agregado');};
    camRec.start();rec=true;shoot.style.background='#fff';const r=document.createElement('div');r.className='rec';r.textContent='● REC 15s';ov.appendChild(r);let t=15;camTimer=setInterval(()=>{t--;r.textContent='● REC '+t+'s';if(t<=0){clearInterval(camTimer);camRec.stop();}},1000);}else{clearInterval(camTimer);camRec.stop();}};}
}

/* ============================================================ FINALIZAR + ENVIAR */
function blobToB64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(blob);});}
async function finishCase(){
  $('#btnNext').disabled=true;$('#btnNext').innerHTML='<span class="spinner"></span> Enviando...';
  if(!State.gps){try{State.gps=await new Promise(r=>{if(!navigator.geolocation){r(null);return;}navigator.geolocation.getCurrentPosition(p=>r({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy}),()=>r(null),{timeout:6000});});}catch{State.gps=null;}}
  const now=new Date();const est=State.est;const rbd=est[COL.RBD];
  const id=nextReportId();
  const st=stamp();
  // preparar media
  const mediaPayload=[];
  for(const m of State.media){
    const b64=await blobToB64(m.blob);
    const base=(m.type==='video'?'video':'foto')+'_'+rbd+'_'+st;
    mediaPayload.push({name:base+(m.type==='video'?'.webm':'.jpg'),type:m.type,mime:m.type==='video'?'video/webm':'image/jpeg',data:b64});
  }
  const payload={
    encargado:CFG.encargado, reporteId:id,
    fecha:now.toLocaleString('es-CL'), timestamp:now.toISOString(),
    rbd, establecimiento:est[COL.NOM], direccion:est[COL.DIR], comuna:est[COL.COM],
    supervisor:est[COL.SUP], institucion:est[COL.INST], tecnico:est[COL.TEC],
    categoria:State.cat, descripcion:State.desc,
    gps:State.gps?`${State.gps.lat.toFixed(6)}, ${State.gps.lon.toFixed(6)}`:'', gps_acc:State.gps?Math.round(State.gps.acc):'',
    media:mediaPayload
  };
  // cache report
  const reps=loadReports();
  reps.push({id,encargado:CFG.encargado,rbd,nom:est[COL.NOM],cat:State.cat,desc:State.desc,fecha:payload.fecha,ts:Date.now(),enviado:false,payload});
  saveReports(reps);
  // enviar
  const ok=await sendToSheet(payload);
  if(ok){const rr=loadReports();const found=rr.find(x=>x.id===id);if(found)found.enviado=true;saveReports(rr);}
  stopGPS();
  renderDone(id,ok);
}
async function sendToSheet(payload){
  if(!CFG.sheetUrl)return false;
  try{
    await fetch(CFG.sheetUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
    // no-cors => respuesta opaca; asumimos éxito si no lanzó error de red
    return true;
  }catch(e){return false;}
}
function renderDone(id,ok){
  navbar.classList.add('hidden');$('#btnHome').classList.add('hidden');$('#gpsChip').classList.add('hidden');
  content.innerHTML=`<div class="screen"><div class="hero" style="padding-top:50px"><div class="mark" style="background:#fff">${LOGO_SVG}</div>
    <h1>Caso registrado</h1><p>Reporte <b>${id}</b></p></div>
    <div class="card" style="text-align:center">
      <p>${ok?'El caso fue enviado al Sheet de <b>'+CFG.encargado+'</b>.':'El caso quedó guardado en <b>Reportes generados</b> como <b>pendiente</b>; podrás reintentar el envío.'}</p>
      <p class="note">ID único: ${id} · ${State.est[COL.NOM]} (RBD ${State.est[COL.RBD]})</p>
      <div style="display:grid;gap:10px;margin-top:16px">
        <button class="btn accent" id="again">Agregar otro caso</button>
        <button class="btn ghost" id="toHome" style="width:100%">Volver al inicio</button>
      </div>
    </div></div>`;
  $('#again').onclick=startCase;$('#toHome').onclick=renderHome;
}

/* ============================================================ ARRANQUE */
renderHome();
