/* ============================================================
   SOSER · Bitácora de Mantención — App Web (v2)
   Colorimetría SOSER · GPS desde inicio · OCR en vivo · tickets
   ============================================================ */
const COL={RBD:0,NOM:1,DIR:2,COM:3,SUP:4,INST:5};
const LOGO_SVG=`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F39A12"/><stop offset="0.5" stop-color="#E8A30C"/><stop offset="1" stop-color="#7CB518"/></linearGradient></defs><path d="M50 12 C30 12 20 30 28 48 C34 62 50 64 50 64 C50 64 66 62 72 48 C80 30 70 12 50 12 Z" fill="url(#sg)"/><path d="M50 20 C44 30 56 40 50 52 C46 44 54 34 50 20 Z" fill="#2E7D32" opacity="0.85"/></svg>`;

const State={
  mode:null, est:null, answers:{}, flow:[], idx:0,
  startedAt:null, gps:null, gpsWatch:null,
  receptor:null, ticket:null, corr:{}
};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const content=$('#content'), navbar=$('#navbar'), overlays=$('#overlays');
$('#logoSlot').innerHTML=LOGO_SVG;

function toast(m,ms=1900){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),ms);}
function norm(s){return (s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function todayStr(){const d=new Date();return String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();}

/* ---------- GPS desde el inicio ---------- */
function startGPS(){
  const chip=$('#gpsChip'),dot=$('#gpsDot'),txt=$('#gpsTxt');
  chip.classList.remove('hidden');dot.className='dot wait';txt.textContent='GPS…';
  if(!navigator.geolocation){txt.textContent='Sin GPS';dot.className='dot';return;}
  if(State.gpsWatch)navigator.geolocation.clearWatch(State.gpsWatch);
  State.gpsWatch=navigator.geolocation.watchPosition(
    p=>{State.gps={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy,t:Date.now()};
        dot.className='dot ok';txt.textContent='±'+Math.round(p.coords.accuracy)+'m';},
    ()=>{dot.className='dot';txt.textContent='GPS off';},
    {enableHighAccuracy:true,maximumAge:0,timeout:20000});
}
function stopGPS(){if(State.gpsWatch){navigator.geolocation.clearWatch(State.gpsWatch);State.gpsWatch=null;}}

/* ============================================================ HOME */
function renderHome(){
  stopGPS();$('#gpsChip').classList.add('hidden');
  navbar.classList.add('hidden');$('#btnDrawer').classList.add('hidden');
  $('#modeLabel').textContent='Bitácora';
  content.innerHTML=`<div class="screen">
    <div class="home-hero"><div class="mark">${LOGO_SVG}</div>
      <h1>Bitácora de Mantención</h1><p>Registro de inspección en terreno · SOSER</p></div>
    <div class="home-choices">
      <div class="choice prev" id="cPrev"><div class="emoji">🛠️</div>
        <div><h3>Bitácora preventiva</h3><p>Inspección programada de activos por establecimiento</p></div><div class="arrow">›</div></div>
      <div class="choice corr" id="cCorr"><div class="emoji">⚠️</div>
        <div><h3>Bitácora correctiva</h3><p>Intervención por falla, ticket o emergencia</p></div><div class="arrow">›</div></div>
    </div>
    <p class="note" style="text-align:center;margin-top:28px">${BBDD.length} establecimientos · Licitación 85-34-LR25</p></div>`;
  $('#cPrev').onclick=()=>startMode('preventiva');
  $('#cCorr').onclick=()=>startMode('correctiva');
}
function startMode(mode){
  State.mode=mode;State.est=null;State.answers={};State.idx=0;
  State.receptor=null;State.ticket=null;State.corr={};State.startedAt=new Date();
  $('#modeLabel').textContent=mode==='preventiva'?'Preventiva':'Correctiva';
  startGPS();
  renderEstablecimiento();
}

/* ============================================================ ESTABLECIMIENTO */
function renderEstablecimiento(){
  navbar.classList.remove('hidden');$('#btnDrawer').classList.add('hidden');
  const ticketBtn=State.mode==='correctiva'?`<button class="addticket-btn" id="btnAddTicket">🎫 Agregar ticket</button>`:'';
  content.innerHTML=`<div class="screen">
    ${ticketBtn}
    <div class="card">
      <div class="step-eyebrow"><b>Información general</b></div>
      <h2 class="q">Selecciona el establecimiento</h2>
      <div class="banner">Busca por <b>RBD</b> o por <b>nombre</b>. Escribe y elige de la lista; cualquiera completa los datos.</div>
      <div class="field-block"><label class="fld">RBD</label>
        <div class="search-wrap"><span class="ic-lead">🔢</span>
          <input type="text" id="qRbd" inputmode="numeric" placeholder="Ej: 9880" autocomplete="off">
          <button class="clearbtn hidden" id="clrRbd">✕</button><div class="suggest hidden" id="sgRbd"></div></div></div>
      <div class="divider-or">O BIEN</div>
      <div class="field-block"><label class="fld">Establecimiento</label>
        <div class="search-wrap"><span class="ic-lead">🏫</span>
          <input type="text" id="qNom" placeholder="Ej: Estado de Palestina" autocomplete="off">
          <button class="clearbtn hidden" id="clrNom">✕</button><div class="suggest hidden" id="sgNom"></div></div></div>
      <div id="estData" class="hidden"><div class="readonly-grid">
          <div class="ro full"><span>Dirección</span><b id="dDir">—</b></div>
          <div class="ro"><span>Comuna</span><b id="dCom">—</b></div>
          <div class="ro"><span>Supervisor</span><b id="dSup">—</b></div>
          <div class="ro full"><span>Institución</span><b id="dInst">—</b></div></div></div>
    </div></div>`;
  $('#btnBack').onclick=renderHome;
  $('#btnNext').textContent='Aceptar y continuar';$('#btnNext').disabled=true;
  $('#btnNext').onclick=()=>{ if(State.mode==='preventiva'){buildFlow();renderStep();} else {renderCorrZona();} };
  if(State.mode==='correctiva')$('#btnAddTicket').onclick=renderTicketEntry;
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
    sg.classList.remove('hidden');hl=-1;
    $$('#'+sgId+' div[data-i]').forEach(d=>d.onclick=()=>pickEst(cur[+d.dataset.i]));});
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
  $('#dSup').textContent=r[COL.SUP]||'—';$('#dInst').textContent=r[COL.INST]||'—';
  $('#estData').classList.remove('hidden');$('#btnNext').disabled=false;
}
function clearEst(){State.est=null;const e=$('#estData');if(e)e.classList.add('hidden');$('#btnNext').disabled=true;}

/* ============================================================ TICKETS (correctiva) */
const TICKETS={
  '1234':{desc:'Anafe no anclado', fecha:'30-06-2026', rbd:'9880', subido:'Mecheverría'}
};
function renderTicketEntry(){
  content.innerHTML=`<div class="screen">
    <div class="card">
      <div class="step-eyebrow"><b>Correctiva</b> <span class="grp">· Ticket</span></div>
      <h2 class="q">Ingresar número de ticket</h2>
      <div class="field-block"><label class="fld">N° de ticket (4 dígitos)</label>
        <input type="tel" id="tkNum" inputmode="numeric" maxlength="4" placeholder="____" style="letter-spacing:8px;font-size:24px;text-align:center;font-weight:800"></div>
      <button class="btn accent" id="tkAdd" style="width:100%">Agregar</button>
      <div id="tkResult"></div>
    </div></div>`;
  $('#btnBack').onclick=renderEstablecimiento;
  $('#btnNext').textContent='Usar este ticket';$('#btnNext').disabled=true;
  $('#tkNum').oninput=e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,4);};
  $('#tkAdd').onclick=()=>{
    const n=$('#tkNum').value.trim();
    const t=TICKETS[n];
    const box=$('#tkResult');
    if(!t){box.innerHTML=`<p class="note" style="color:var(--red)">Ticket ${n||'—'} no encontrado.</p>`;$('#btnNext').disabled=true;return;}
    const est=BBDD.find(r=>r[COL.RBD]===t.rbd);
    State.ticket={num:n,...t,est};
    box.innerHTML=`<div class="ticket">
      <div class="tnum">🎫 Ticket N° ${n}</div>
      <div class="tdesc">${t.desc}</div>
      <div class="trow"><span>Fecha</span><b>${t.fecha}</b></div>
      <div class="trow"><span>Establecimiento</span><b>${est?est[COL.NOM]:'—'}</b></div>
      <div class="trow"><span>RBD</span><b>${t.rbd}</b></div>
      <div class="trow"><span>Dirección</span><b>${est?est[COL.DIR]:'—'}</b></div>
      <div class="trow"><span>Comuna</span><b>${est?est[COL.COM]:'—'}</b></div>
      <div class="trow"><span>Supervisor</span><b>${est?est[COL.SUP]:'—'}</b></div>
      <div class="trow"><span>Subido por</span><b>${t.subido}</b></div>
    </div>`;
    // fijar establecimiento del ticket
    if(est){State.est=est;}
    $('#btnNext').disabled=false;
  };
  $('#btnNext').onclick=()=>{ if(State.ticket){State.corr.viaTicket=true;renderCorrZona();} };
}

/* ============================================================ CUESTIONARIO PREVENTIVO */
const GRUPOS={COCINA:'Cocina',FRIO:'Equipos de frío',DOC:'Documentación'};
function buildFlow(){
  State.flow=[];State.answers={};
  addStep({id:'calor_tipo',grupo:GRUPOS.COCINA,activo:'Artefacto de calor',q:'¿Se utiliza cocinilla o anafe?',type:'single',options:['Cocinilla (4 platos)','Anafe (2 platos)']});
  addStep({id:'calor_unidades',grupo:GRUPOS.COCINA,activo:'Artefacto de calor',q:'¿Cuántas unidades?',type:'count',min:1,max:20});
  addStep({id:'calor_sec',grupo:GRUPOS.COCINA,activo:'Artefacto de calor',q:'¿Se encuentra con sus sellos SEC?',type:'yesno',yesPhoto:true,photoLabel:'Fotografía del sello SEC'});
  addStep({id:'calor_platos',grupo:GRUPOS.COCINA,activo:'Artefacto de calor',q:'¿Se encuentra con todos sus platos operativos?',type:'yesno'});
  addStep({id:'calor_anclaje',grupo:GRUPOS.COCINA,activo:'Artefacto de calor',q:'¿Se encuentran ancladas al piso?',type:'yesno'});
  addStep({id:'calor_gas',grupo:GRUPOS.COCINA,activo:'Artefacto de calor',q:'Conexión de gas: ¿flexibles en buen estado, con sello SEC y en norma?',type:'yesno'});
  addStep({id:'horno_existe',grupo:GRUPOS.COCINA,activo:'Hornos',q:'¿Cuenta con hornos?',type:'yesno',noEndsActivo:true});
  addStep({id:'horno_cant',grupo:GRUPOS.COCINA,activo:'Hornos',q:'¿Cuántos hornos existen en cocina?',type:'count',min:1,max:2,onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_tipo',grupo:GRUPOS.COCINA,activo:'Hornos',q:'¿Hornos simples o dobles?',type:'multi-tipo',onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_estado',grupo:GRUPOS.COCINA,activo:'Hornos',q:'¿Se encuentra en buen estado?',type:'photo',photoLabel:'Foto de los hornos',maxByHornos:true,onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_temp',grupo:GRUPOS.COCINA,activo:'Hornos',q:'¿Llega a temperatura y tiene quemadores en buen estado?',type:'yesno',onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_gas',grupo:GRUPOS.COCINA,activo:'Hornos',q:'Conexión a gas: ¿flexibles en buen estado, con sello SEC y en norma?',type:'yesno',onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'lava_existe',grupo:GRUPOS.COCINA,activo:'Lavamanos',q:'¿Cuenta con lavamanos al interior?',type:'yesno',noEndsActivo:true});
  addStep({id:'lava_estado',grupo:GRUPOS.COCINA,activo:'Lavamanos',q:'¿Se encuentra en buen estado?',type:'photo',photoLabel:'Fotografía del lavamanos',forcePhoto:true,onlyIf:()=>ans('lava_existe')==='Sí'});
  addStep({id:'lava_flex',grupo:GRUPOS.COCINA,activo:'Lavamanos',q:'¿Se encuentran flexibles y conexiones en buen estado?',type:'yesno',onlyIf:()=>ans('lava_existe')==='Sí'});
  addStep({id:'frio_equipos',grupo:GRUPOS.FRIO,activo:'Equipos de frío',q:'Indica los equipos de frío del establecimiento',type:'frio'});
  addStep({id:'frio_estado',grupo:GRUPOS.FRIO,activo:'Equipos de frío',q:'¿Los equipos se encuentran en buen estado?',type:'photo',photoLabel:'Foto por equipo',maxByFrio:true});
  addStep({id:'frio_temp',grupo:GRUPOS.FRIO,activo:'Equipos de frío',q:'¿Llega a la temperatura? (foto al termómetro dentro del equipo)',type:'yesno',yesPhoto:true,photoLabel:'Foto del termómetro'});
  addStep({id:'ench_existe',grupo:GRUPOS.COCINA,activo:'Enchufes',q:'¿La cocina cuenta con enchufes?',type:'yesno',noEndsActivo:true});
  addStep({id:'ench_cant',grupo:GRUPOS.COCINA,activo:'Enchufes',q:'¿Con cuántas tomas de corriente cuenta la cocina?',type:'count',min:1,max:40,onlyIf:()=>ans('ench_existe')==='Sí'});
  addStep({id:'ench_estado',grupo:GRUPOS.COCINA,activo:'Enchufes',q:'¿Todos los enchufes están en buen estado, sin hundirse ni piezas rotas?',type:'yesno',onlyIf:()=>ans('ench_existe')==='Sí'});
  addStep({id:'doc_sec',grupo:GRUPOS.DOC,activo:'Certificación SEC',q:'¿El establecimiento cuenta con certificación SEC?',type:'yesno',yesPhoto:true,photoLabel:'Foto del certificado SEC'});
  addStep({id:'doc_res',grupo:GRUPOS.DOC,activo:'Resolución sanitaria',q:'¿El establecimiento cuenta con resolución sanitaria?',type:'yesno',yesPhoto:true,photoLabel:'Foto de la resolución sanitaria'});
  State.idx=0;
}
function addStep(s){State.flow.push(s);}
function ans(id){return State.answers[id]?.value;}
function nextVisibleIdx(f){let i=f;while(i<State.flow.length){const s=State.flow[i];if(s.onlyIf&&!s.onlyIf()){i++;continue;}return i;}return State.flow.length;}
function prevVisibleIdx(f){let i=f;while(i>=0){const s=State.flow[i];if(s.onlyIf&&!s.onlyIf()){i--;continue;}return i;}return -1;}

/* ============================================================ RENDER PASO */
function renderStep(){
  const i=nextVisibleIdx(State.idx);State.idx=i;
  if(i>=State.flow.length){renderReceptor();return;}
  const s=State.flow[i];
  const a=State.answers[s.id]||{value:null,indique:'',media:[]};State.answers[s.id]=a;
  navbar.classList.remove('hidden');$('#btnDrawer').classList.remove('hidden');$('#btnDrawer').onclick=openDrawer;
  const total=State.flow.filter(st=>!st.onlyIf||st.onlyIf()).length;
  const done=State.flow.slice(0,i).filter(st=>!st.onlyIf||st.onlyIf()).length;
  const pct=Math.round(done/Math.max(total,1)*100);
  let body='';
  if(s.type==='single')body=renderSingle(s,a);
  else if(s.type==='yesno')body=renderYesNo(s,a);
  else if(s.type==='count'||s.type==='enchufes')body=renderCount(s,a);
  else if(s.type==='photo')body=renderPhoto(s,a);
  else if(s.type==='frio')body=renderFrio(s,a);
  else if(s.type==='multi-tipo')body=renderHornoTipo(s,a);
  content.innerHTML=`<div class="screen"><div class="progress"><i style="width:${pct}%"></i></div>
    <div class="card"><div class="step-eyebrow"><b>${s.grupo}</b> <span class="grp">· ${s.activo}</span></div>
      <h2 class="q">${s.q}</h2><div id="qbody">${body}</div><div id="indiqueSlot"></div></div></div>`;
  wireStep(s,a);
  $('#btnBack').textContent='‹';
  $('#btnBack').onclick=()=>{const p=prevVisibleIdx(i-1);if(p<0){if(confirm('¿Volver a la selección de establecimiento?'))renderEstablecimiento();return;}State.idx=p;renderStep();};
  $('#btnNext').textContent=(i===lastVisible())?'Ir a recepción':'Continuar';
  refreshNext(s,a);
}
function lastVisible(){for(let i=State.flow.length-1;i>=0;i--){const s=State.flow[i];if(!s.onlyIf||s.onlyIf())return i;}return 0;}
function renderSingle(s,a){return `<div class="opts ${s.options.length>2?'one':''}">${s.options.map(o=>`<div class="opt ${a.value===o?'sel':''}" data-v="${o}">${o}</div>`).join('')}</div>`;}
function renderYesNo(s,a){return `<div class="opts"><div class="opt ${a.value==='Sí'?'sel yes':''}" data-v="Sí">✓ Sí</div><div class="opt ${a.value==='No'?'sel no':''}" data-v="No">✕ No</div></div>`;}
function renderCount(s,a,plain){const v=a.value??(s.min??1);return `<div class="stepper"><button data-d="-1">−</button><div class="val" id="cv">${v}</div><button data-d="1">+</button></div>`;}
function renderPhoto(s,a){let max=1;if(s.maxByHornos)max=parseInt(ans('horno_cant')||1);if(s.maxByFrio)max=Math.max(1,(ans('frio_equipos')||[]).reduce((n,e)=>n+(+e.qty||1),0));a._max=max;
  return `<div class="verifier"><div class="vtitle">${s.photoLabel||'Fotografía'} ${max>1?`(hasta ${max})`:''}</div><div class="vbtns"><button class="vbtn" data-cap="photo"><span class="ic">📷</span>Tomar foto</button></div><div class="thumbs" id="thumbs"></div></div>`;}
function renderFrio(s,a){a.value=a.value||[];return `<div class="equip-add"><select id="frioSel"><option value="Refrigerador">Refrigerador</option><option value="Visicooler">Visicooler</option></select><button class="btn accent" id="frioAdd" style="flex:0 0 auto;padding:0 18px">Agregar</button></div><div class="equip-head"><div>Equipo</div><div>Litros</div><div>Unid.</div><div></div></div><div id="frioRows"></div><p class="note">Agrega cada equipo y define litros y unidades.</p>`;}
function renderHornoTipo(s,a){a.value=a.value||{simple:0,doble:0};const n=parseInt(ans('horno_cant')||1);
  return `<p class="note">Define el tipo para los ${n} horno(s).</p><div class="equip-row" style="grid-template-columns:1fr 70px"><div class="nm">Simple</div><input type="number" id="hSimple" min="0" max="${n}" value="${a.value.simple}"></div><div class="equip-row" style="grid-template-columns:1fr 70px"><div class="nm">Doble</div><input type="number" id="hDoble" min="0" max="${n}" value="${a.value.doble}"></div>`;}

/* ============================================================ WIRING + VALIDACIÓN */
function wireStep(s,a){
  if(s.type==='single')$$('.opt').forEach(o=>o.onclick=()=>{a.value=o.dataset.v;$$('.opt').forEach(x=>x.classList.remove('sel'));o.classList.add('sel');maybeIndique(s,a);refreshNext(s,a);});
  if(s.type==='yesno'){$$('.opt').forEach(o=>o.onclick=()=>{a.value=o.dataset.v;$$('.opt').forEach(x=>x.classList.remove('sel','yes','no'));o.classList.add('sel',a.value==='Sí'?'yes':'no');maybeIndique(s,a);refreshNext(s,a);});if(a.value)maybeIndique(s,a);}
  if(s.type==='count'||s.type==='enchufes'){a.value=a.value??(s.min??1);$$('.stepper button').forEach(b=>b.onclick=()=>{let v=a.value+parseInt(b.dataset.d);v=Math.max(s.min??0,Math.min(s.max??9999,v));a.value=v;$('#cv').textContent=v;refreshNext(s,a);});}
  if(s.type==='photo'){renderThumbs(s,a);wireCapture(s,a);}
  if(s.type==='frio')wireFrio(s,a);
  if(s.type==='multi-tipo'){const upd=()=>{a.value={simple:+($('#hSimple').value||0),doble:+($('#hDoble').value||0)};refreshNext(s,a);};$('#hSimple').oninput=upd;$('#hDoble').oninput=upd;}
}
function maybeIndique(s,a){
  const slot=$('#indiqueSlot');slot.innerHTML='';
  if(s.type==='yesno'&&a.value==='No'){
    slot.innerHTML=`<div class="indique"><span class="reqtag">Obligatorio</span><label class="fld">Indique la situación</label>
      <textarea id="indTxt" placeholder="Describe el hallazgo...">${a.indique||''}</textarea>
      <div class="verifier"><div class="vtitle">Incluir verificador</div>
        <div class="vbtns"><button class="vbtn" data-cap="photo"><span class="ic">📷</span>Foto</button><button class="vbtn" data-cap="video"><span class="ic">🎥</span>Video (máx 15s)</button></div>
        <div class="thumbs" id="thumbs"></div></div></div>`;
    $('#indTxt').oninput=e=>{a.indique=e.target.value;refreshNext(s,a);};renderThumbs(s,a);wireCapture(s,a);
  }
  if(s.type==='yesno'&&a.value==='Sí'&&s.yesPhoto){
    slot.innerHTML=`<div class="indique"><div class="verifier"><div class="vtitle">${s.photoLabel||'Fotografía'}</div><div class="vbtns"><button class="vbtn" data-cap="photo"><span class="ic">📷</span>Tomar foto</button></div><div class="thumbs" id="thumbs"></div></div></div>`;
    renderThumbs(s,a);wireCapture(s,a);
  }
}
function canAdvance(s,a){
  if(s.type==='single')return !!a.value;
  if(s.type==='count'||s.type==='enchufes')return a.value!=null;
  if(s.type==='photo')return (s.forcePhoto||s.maxByHornos||s.maxByFrio)?(a.media||[]).length>=1:true;
  if(s.type==='frio')return (a.value||[]).length>=1;
  if(s.type==='multi-tipo')return a.value&&(a.value.simple+a.value.doble)>=1;
  if(s.type==='yesno'){if(!a.value)return false;if(a.value==='No')return (a.indique||'').trim().length>0;if(a.value==='Sí'&&s.yesPhoto)return (a.media||[]).length>=1;return true;}
  return true;
}
function refreshNext(s,a){const ok=canAdvance(s,a);$('#btnNext').disabled=!ok;
  $('#btnNext').onclick=()=>{if(!canAdvance(s,a))return;State.idx=nextVisibleIdx(State.idx+1);renderStep();};}
function wireFrio(s,a){const rows=$('#frioRows');
  const draw=()=>{rows.innerHTML=a.value.map((e,i)=>`<div class="equip-row"><div class="nm">${e.tipo}</div><input type="number" placeholder="Lts" value="${e.lts||''}" data-i="${i}" data-k="lts"><input type="number" placeholder="N°" value="${e.qty||1}" data-i="${i}" data-k="qty"><button class="rm" data-rm="${i}">✕</button></div>`).join('');
    $$('#frioRows input').forEach(inp=>inp.oninput=()=>{a.value[+inp.dataset.i][inp.dataset.k]=+inp.value||(inp.dataset.k==='qty'?1:0);refreshNext(s,a);});
    $$('#frioRows .rm').forEach(b=>b.onclick=()=>{a.value.splice(+b.dataset.rm,1);draw();refreshNext(s,a);});refreshNext(s,a);};
  $('#frioAdd').onclick=()=>{a.value.push({tipo:$('#frioSel').value,lts:'',qty:1});draw();};draw();
}

/* ============================================================ CÁMARA (foto/video) */
let camStream=null,camRec=null,camChunks=[],camTimer=null;
function wireCapture(s,a){$$('#qbody [data-cap],#indiqueSlot [data-cap]').forEach(b=>b.onclick=()=>openCamera(b.dataset.cap,s,a));}
function renderThumbs(s,a){const box=$('#thumbs');if(!box)return;
  box.innerHTML=(a.media||[]).map((m,i)=>`<div class="thumb">${m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`}<span class="badge">${m.type}</span><button class="del" data-del="${i}">✕</button></div>`).join('');
  $$('#thumbs .del').forEach(b=>b.onclick=()=>{a.media.splice(+b.dataset.del,1);renderThumbs(s,a);refreshNext(s,a);});}
async function openCamera(kind,s,a){
  const max=a._max||(kind==='video'?1:8);
  const ov=document.createElement('div');ov.className='cam-bg';
  ov.innerHTML=`<button class="camclose">✕</button><video autoplay playsinline></video><div class="cambar"><div class="shoot ${kind==='photo'?'photo':''}"></div></div>`;
  overlays.appendChild(ov);const video=$('video',ov);
  try{camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:kind==='video'});video.srcObject=camStream;}
  catch{toast('No se pudo abrir la cámara');ov.remove();return;}
  const close=()=>{if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}ov.remove();};
  $('.camclose',ov).onclick=close;const shoot=$('.shoot',ov);
  if(kind==='photo'){shoot.onclick=()=>{const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);
    c.toBlob(b=>{const url=URL.createObjectURL(b);a.media=a.media||[];a.media.push({type:'photo',blob:b,url});renderThumbs(s,a);refreshNext(s,a);close();toast('Foto agregada');},'image/jpeg',0.85);};}
  else{let rec=false;shoot.onclick=()=>{if(!rec){camChunks=[];camRec=new MediaRecorder(camStream);camRec.ondataavailable=e=>camChunks.push(e.data);
    camRec.onstop=()=>{const b=new Blob(camChunks,{type:'video/webm'});const url=URL.createObjectURL(b);a.media=a.media||[];a.media.push({type:'video',blob:b,url});renderThumbs(s,a);refreshNext(s,a);close();toast('Video agregado');};
    camRec.start();rec=true;shoot.style.background='#fff';const r=document.createElement('div');r.className='rec';r.textContent='● REC 15s';ov.appendChild(r);let t=15;camTimer=setInterval(()=>{t--;r.textContent='● REC '+t+'s';if(t<=0){clearInterval(camTimer);camRec.stop();}},1000);}else{clearInterval(camTimer);camRec.stop();}};}
}

/* ============================================================ DRAWER */
function openDrawer(){
  const bg=document.createElement('div');bg.className='drawer-bg';
  const dr=document.createElement('div');dr.className='drawer';
  const groups={};
  State.flow.forEach((s,i)=>{const a=State.answers[s.id];if(!a||a.value==null||(s.onlyIf&&!s.onlyIf()))return;
    groups[s.grupo]=groups[s.grupo]||{};groups[s.grupo][s.activo]=groups[s.grupo][s.activo]||[];groups[s.grupo][s.activo].push({s,a,i});});
  let html='';
  for(const g in groups){let cnt=0,inner='';for(const act in groups[g]){const items=groups[g][act];cnt+=items.length;
    inner+=`<div class="activo"><div class="ah" data-toggle>▸ ${act}</div><div class="qa hidden">${items.map(({s,a})=>`<div class="qrow"><div class="qq">${s.q}</div><div class="aa ${a.value==='No'?'no':a.value==='Sí'?'yes':''}">${fmtAns(a.value)}</div>${a.indique?`<div class="qq" style="margin-top:3px">↳ ${a.indique}</div>`:''}${(a.media||[]).length?`<div class="mini-thumbs">${a.media.map(m=>m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`).join('')}</div>`:''}</div>`).join('')}<button class="jumpbtn" data-jump="${items[0].i}">Editar esta sección</button></div></div>`;}
    html+=`<div class="acc"><div class="head" data-acc>▾ ${g} <span class="cnt">${cnt}</span></div><div class="activos">${inner}</div></div>`;}
  if(!html)html='<p class="note">Aún no hay respuestas registradas.</p>';
  dr.innerHTML=`<header><b>Secciones</b><button class="iconbtn" id="drClose">✕</button></header><div class="body">${html}</div>`;
  overlays.appendChild(bg);overlays.appendChild(dr);
  const close=()=>{bg.remove();dr.remove();};bg.onclick=close;$('#drClose',dr).onclick=close;
  $$('[data-acc]',dr).forEach(h=>h.onclick=()=>h.nextElementSibling.classList.toggle('hidden'));
  $$('[data-toggle]',dr).forEach(h=>h.onclick=()=>{const qa=h.nextElementSibling;qa.classList.toggle('hidden');h.textContent=h.textContent.startsWith('▸')?h.textContent.replace('▸','▾'):h.textContent.replace('▾','▸');});
  $$('[data-jump]',dr).forEach(b=>b.onclick=()=>{close();State.idx=+b.dataset.jump;renderStep();});
}
function fmtAns(v){if(Array.isArray(v))return v.map(e=>`${e.tipo} ${e.lts||''}L ×${e.qty||1}`).join(', ');if(v&&typeof v==='object')return `Simple ${v.simple||0} · Doble ${v.doble||0}`;return v;}

/* ============================================================ ESCÁNER ID EN VIVO (auto al detectar 2) */
const PERSONAS_ID={'2':{nombre:'Manuel Alejandro Echeverría González',rut:'19.000.000-3',cargo:'Admin'}};
let scanLoop=null,scanning=false;
async function openScanner(onFound){
  const ov=document.createElement('div');ov.className='cam-bg';
  ov.innerHTML=`<button class="camclose">✕</button><video autoplay playsinline></video>
    <div class="scanhint"><div class="scanbox"><div class="laser"></div></div><div class="scanlabel" id="scanlbl">Encuadra el documento…</div></div>
    <div class="cambar"><div class="shoot photo" title="Capturar manual"></div></div>`;
  overlays.appendChild(ov);const video=$('video',ov);
  try{camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});video.srcObject=camStream;}
  catch{toast('No se pudo abrir la cámara');ov.remove();return;}
  const close=()=>{scanning=false;if(scanLoop)clearTimeout(scanLoop);if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}ov.remove();};
  $('.camclose',ov).onclick=close;
  const lbl=$('#scanlbl',ov);
  const finish=(num)=>{const p=PERSONAS_ID[num];if(!p)return false;lbl.textContent='✓ ID '+num+' reconocido';lbl.classList.add('found');
    setTimeout(()=>{close();onFound({...p,id:num});},700);return true;};
  // captura manual de respaldo
  $('.shoot',ov).onclick=async()=>{const c=grab(video);await tryRead(c,lbl,finish,true);};
  // bucle de escaneo en vivo
  scanning=true;
  const tick=async()=>{
    if(!scanning)return;
    const c=grab(video,0.5);
    await tryRead(c,lbl,finish,false);
    if(scanning)scanLoop=setTimeout(tick,1100);
  };
  setTimeout(tick,900);
}
function grab(video,scale=1){const c=document.createElement('canvas');c.width=(video.videoWidth||640)*scale;c.height=(video.videoHeight||480)*scale;c.getContext('2d').drawImage(video,0,0,c.width,c.height);return c;}
async function tryRead(canvas,lbl,finish,manual){
  if(!window.Tesseract){if(manual){const m=prompt('OCR no disponible. Ingresa el número de ID:');if(m&&finish(m.trim()))return;else toast('ID no encontrado');}return;}
  try{
    const {data}=await Tesseract.recognize(canvas,'eng',{tessedit_char_whitelist:'0123456789'});
    const txt=(data.text||'').replace(/\s/g,'');
    for(const k in PERSONAS_ID){if(txt.includes(k)){if(finish(k))return;}}
    if(manual){const m=prompt('No se reconoció. Ingresa el número de ID:');if(m&&finish(m.trim()))return;else if(m)toast('ID no encontrado');}
  }catch(e){if(manual)toast('No se pudo leer');}
}

/* ============================================================ RECEPTOR (manual / identificación) */
function renderReceptor(){
  navbar.classList.remove('hidden');$('#btnDrawer').classList.toggle('hidden',State.mode!=='preventiva');
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="step-eyebrow"><b>Cierre</b> <span class="grp">· Recepción</span></div>
    <h2 class="q">Persona que recibe</h2>
    <p class="note" style="margin-bottom:14px">Elige cómo registrar al receptor.</p>
    <div class="opts"><div class="opt" id="optManual">✍️ Ingreso manual</div><div class="opt" id="optID">🪪 Identificación</div></div>
  </div></div>`;
  $('#btnBack').textContent='‹';
  $('#btnBack').onclick=()=>{ if(State.mode==='preventiva'){State.idx=lastVisible();renderStep();} else {renderCorrGastos();} };
  $('#btnNext').classList.add('hidden');
  $('#optManual').onclick=renderManual;
  $('#optID').onclick=()=>openScanner(d=>{State.receptor={nombre:d.nombre,rut:d.rut,cargo:d.cargo,id:d.id,registro:'Z'+Math.random().toString(36).slice(2,10).toUpperCase(),firma:null};renderValidate();});
}
function renderManual(){
  $('#btnNext').classList.add('hidden');
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="step-eyebrow"><b>Recepción</b> <span class="grp">· Ingreso manual</span></div>
    <h2 class="q">Datos del receptor</h2>
    <div class="field-block"><label class="fld">Nombre</label><input type="text" id="mNom" placeholder="Nombre completo"></div>
    <div class="field-block"><label class="fld">RUT</label><input type="text" id="mRut" placeholder="12.345.678-9"></div>
    <div class="field-block"><label class="fld">Cargo</label><input type="text" id="mCargo" placeholder="Cargo"></div>
    <label class="fld">Firma</label><canvas class="sigpad" id="sig"></canvas>
    <div class="sigtools"><button id="sigClear">Borrar firma</button></div>
  </div></div>`;
  $('#btnBack').onclick=renderReceptor;$('#btnNext').classList.remove('hidden');
  $('#btnNext').textContent='Validar';$('#btnNext').disabled=false;
  const sig=initSignature($('#sig'));$('#sigClear').onclick=sig.clear;
  $('#btnNext').onclick=()=>{
    const n=$('#mNom').value.trim();if(!n){toast('Ingresa el nombre');return;}
    State.receptor={nombre:n,rut:$('#mRut').value.trim(),cargo:$('#mCargo').value.trim(),id:'',registro:'',firma:sig.isEmpty()?null:sig.dataURL()};
    renderValidate();
  };
}
function renderValidate(){
  navbar.classList.remove('hidden');$('#btnDrawer').classList.add('hidden');
  const r=State.receptor;const needSig=!r.firma;
  content.innerHTML=`<div class="screen"><div class="card validate-card">
    <div class="step-eyebrow"><b>Validación</b></div>
    <h2 class="q">Confirma los datos</h2>
    <div class="person">
      <div class="pr"><span>Nombre</span><b>${r.nombre}</b></div>
      ${r.rut?`<div class="pr"><span>RUT</span><b>${r.rut}</b></div>`:''}
      ${r.cargo?`<div class="pr"><span>Cargo</span><b>${r.cargo}</b></div>`:''}
      ${r.id?`<div class="pr"><span>ID leído</span><b>${r.id}</b></div>`:''}
      ${r.registro?`<div class="pr"><span>Registro ID</span><b>${r.registro}</b></div>`:''}
    </div>
    ${r.firma?`<label class="fld" style="margin-top:14px">Firma</label><div class="sigshow"><img src="${r.firma}"></div>`:
      `<label class="fld" style="margin-top:14px">Firma del receptor</label><canvas class="sigpad" id="sig2"></canvas><div class="sigtools"><button id="sigClear2">Borrar</button></div>`}
  </div></div>`;
  $('#btnBack').textContent='‹';$('#btnBack').onclick=renderReceptor;
  $('#btnNext').classList.remove('hidden');$('#btnNext').classList.remove('accent');$('#btnNext').classList.add('finish');
  $('#btnNext').textContent='Terminar y descargar';
  let sig2=null;
  if(needSig){sig2=initSignature($('#sig2'));$('#sigClear2').onclick=sig2.clear;}
  $('#btnNext').disabled=false;
  $('#btnNext').onclick=()=>{
    if(needSig){if(sig2.isEmpty()){toast('Falta la firma');return;}State.receptor.firma=sig2.dataURL();}
    finishAndExport();
  };
}
/* firma en canvas */
function initSignature(canvas){
  const ctx=canvas.getContext('2d');let drawing=false,empty=true;
  function resize(){const r=canvas.getBoundingClientRect();canvas.width=r.width*2;canvas.height=r.height*2;ctx.scale(2,2);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.strokeStyle='#2C2C2C';}
  setTimeout(resize,30);
  const pos=e=>{const r=canvas.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};};
  const start=e=>{drawing=true;empty=false;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault();};
  const move=e=>{if(!drawing)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();e.preventDefault();};
  const end=()=>drawing=false;
  canvas.addEventListener('mousedown',start);canvas.addEventListener('mousemove',move);window.addEventListener('mouseup',end);
  canvas.addEventListener('touchstart',start,{passive:false});canvas.addEventListener('touchmove',move,{passive:false});canvas.addEventListener('touchend',end);
  return{clear:()=>{ctx.clearRect(0,0,canvas.width,canvas.height);empty=true;},isEmpty:()=>empty,dataURL:()=>canvas.toDataURL('image/png')};
}

/* ============================================================ CORRECTIVA */
const ZONAS=[['Cocina','🍳'],['Equipos de frío','❄️'],['Enchufes / eléctrico','🔌'],['Gas','🔥'],['Lavamanos / agua','🚰'],['Otro','🧰']];
function renderCorrZona(){
  navbar.classList.remove('hidden');$('#btnDrawer').classList.add('hidden');
  State.corr.zona=State.corr.zona||null;
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="step-eyebrow"><b>Correctiva</b> <span class="grp">· Zona</span></div>
    <h2 class="q">¿Qué zona vas a intervenir?</h2>
    ${State.ticket?`<div class="ticket" style="margin-bottom:14px"><div class="tnum">🎫 Ticket ${State.ticket.num}</div><div class="tdesc">${State.ticket.desc}</div></div>`:''}
    <div class="section-pills">${ZONAS.map(([z,ic])=>`<div class="pill ${State.corr.zona===z?'sel':''}" data-z="${z}"><span class="pic">${ic}</span><b>${z}</b></div>`).join('')}</div>
  </div></div>`;
  $('#btnBack').onclick=()=>{ State.ticket?renderTicketEntry():renderEstablecimiento(); };
  $('#btnNext').classList.remove('hidden');$('#btnNext').textContent='Continuar';$('#btnNext').disabled=!State.corr.zona;
  $$('.pill').forEach(p=>p.onclick=()=>{State.corr.zona=p.dataset.z;$$('.pill').forEach(x=>x.classList.remove('sel'));p.classList.add('sel');$('#btnNext').disabled=false;});
  $('#btnNext').onclick=()=>renderCorrReparacion();
}
function renderCorrReparacion(){
  const c=State.corr;c.media=c.media||[];
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="step-eyebrow"><b>Correctiva</b> <span class="grp">· ${c.zona}</span></div>
    <h2 class="q">Reparación realizada</h2>
    <div class="field-block"><label class="fld">Falla detectada</label><textarea id="cFalla" placeholder="Describe la falla...">${c.falla||''}</textarea></div>
    <div class="field-block"><label class="fld">Reparación / acción ejecutada</label><textarea id="cRep" placeholder="Describe la reparación...">${c.reparacion||''}</textarea></div>
    <div class="verifier"><div class="vtitle">Fotografías (antes / después)</div>
      <div class="vbtns"><button class="vbtn" id="cPhoto"><span class="ic">📷</span>Foto</button><button class="vbtn" id="cVideo"><span class="ic">🎥</span>Video 15s</button></div>
      <div class="thumbs" id="thumbs"></div></div>
  </div></div>`;
  $('#btnBack').onclick=renderCorrZona;
  $('#btnNext').classList.remove('hidden');$('#btnNext').textContent='Continuar';
  const upd=()=>{c.falla=$('#cFalla').value;c.reparacion=$('#cRep').value;$('#btnNext').disabled=!(c.falla.trim()&&c.reparacion.trim());};
  $('#cFalla').oninput=upd;$('#cRep').oninput=upd;upd();
  const fakeA={media:c.media,_max:12};
  const rt=()=>{const box=$('#thumbs');box.innerHTML=c.media.map((m,i)=>`<div class="thumb">${m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`}<span class="badge">${m.type}</span><button class="del" data-del="${i}">✕</button></div>`).join('');$$('#thumbs .del').forEach(b=>b.onclick=()=>{c.media.splice(+b.dataset.del,1);rt();});};
  $('#cPhoto').onclick=()=>openCamera('photo',{photoLabel:'Foto'},{get media(){return c.media},set media(v){c.media=v},_max:12,...{}}) ;
  // simpler: custom capture appended to c.media
  $('#cPhoto').onclick=()=>capTo(c,'photo',rt);
  $('#cVideo').onclick=()=>capTo(c,'video',rt);
  rt();
  $('#btnNext').onclick=()=>renderCorrGastos();
}
function capTo(c,kind,after){
  const ov=document.createElement('div');ov.className='cam-bg';
  ov.innerHTML=`<button class="camclose">✕</button><video autoplay playsinline></video><div class="cambar"><div class="shoot ${kind==='photo'?'photo':''}"></div></div>`;
  overlays.appendChild(ov);const video=$('video',ov);
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:kind==='video'}).then(st=>{camStream=st;video.srcObject=st;}).catch(()=>{toast('Sin cámara');ov.remove();});
  const close=()=>{if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}ov.remove();};
  $('.camclose',ov).onclick=close;const shoot=$('.shoot',ov);
  if(kind==='photo'){shoot.onclick=()=>{const cv=grab(video);cv.toBlob(b=>{c.media.push({type:'photo',blob:b,url:URL.createObjectURL(b)});after();close();toast('Foto agregada');},'image/jpeg',.85);};}
  else{let rec=false;shoot.onclick=()=>{if(!rec){camChunks=[];camRec=new MediaRecorder(camStream);camRec.ondataavailable=e=>camChunks.push(e.data);camRec.onstop=()=>{const b=new Blob(camChunks,{type:'video/webm'});c.media.push({type:'video',blob:b,url:URL.createObjectURL(b)});after();close();toast('Video agregado');};camRec.start();rec=true;shoot.style.background='#fff';const r=document.createElement('div');r.className='rec';r.textContent='● 15s';ov.appendChild(r);let t=15;camTimer=setInterval(()=>{t--;r.textContent='● '+t+'s';if(t<=0){clearInterval(camTimer);camRec.stop();}},1000);}else{clearInterval(camTimer);camRec.stop();}};}
}
function renderCorrGastos(){
  const c=State.corr;
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="step-eyebrow"><b>Correctiva</b> <span class="grp">· Gastos</span></div>
    <h2 class="q">Para solucionar el inconveniente, ¿ocupó repuestos o gastos locales?</h2>
    <div class="opts"><div class="opt ${c.gasto==='Sí'?'sel yes':''}" data-g="Sí">✓ Sí</div><div class="opt ${c.gasto==='No'?'sel no':''}" data-g="No">✕ No</div></div>
    <div id="gSlot"></div>
  </div></div>`;
  $('#btnBack').onclick=renderCorrReparacion;
  $('#btnNext').classList.remove('hidden');$('#btnNext').textContent='Continuar';
  const slot=$('#gSlot');
  const draw=()=>{
    slot.innerHTML='';
    if(c.gasto==='Sí'){slot.innerHTML=`<div class="indique"><span class="reqtag">Detalle obligatorio</span><label class="fld">Indique materiales / repuestos y gasto</label><textarea id="gTxt" placeholder="Ej: 1 flexible de gas, 1 abrazadera — $8.500">${c.gastoDetalle||''}</textarea></div>`;
      $('#gTxt').oninput=e=>{c.gastoDetalle=e.target.value;refresh();};}
    refresh();
  };
  const refresh=()=>{let ok=!!c.gasto;if(c.gasto==='Sí')ok=(c.gastoDetalle||'').trim().length>0;$('#btnNext').disabled=!ok;};
  $$('.opt').forEach(o=>o.onclick=()=>{c.gasto=o.dataset.g;$$('.opt').forEach(x=>x.classList.remove('sel','yes','no'));o.classList.add('sel',c.gasto==='Sí'?'yes':'no');draw();});
  draw();
  $('#btnNext').onclick=()=>{ State.ticket?renderCorrTicketEstado():renderReceptor(); };
}
function renderCorrTicketEstado(){
  const c=State.corr;
  content.innerHTML=`<div class="screen"><div class="card">
    <div class="step-eyebrow"><b>Correctiva</b> <span class="grp">· Ticket ${State.ticket.num}</span></div>
    <h2 class="q">¿Cómo queda el ticket?</h2>
    <div class="opts one">
      <div class="opt ${c.ticketEstado==='Solucionado'?'sel yes':''}" data-t="Solucionado">✅ Solucionado</div>
      <div class="opt ${c.ticketEstado==='Pendiente'?'sel':''}" data-t="Pendiente">⏳ Pendiente</div>
      <div class="opt ${c.ticketEstado==='Derivado'?'sel':''}" data-t="Derivado">↗️ Derivado</div>
    </div>
  </div></div>`;
  $('#btnBack').onclick=renderCorrGastos;
  $('#btnNext').classList.remove('hidden');$('#btnNext').textContent='Ir a recepción';$('#btnNext').disabled=!c.ticketEstado;
  $$('.opt').forEach(o=>o.onclick=()=>{c.ticketEstado=o.dataset.t;$$('.opt').forEach(x=>x.classList.remove('sel','yes'));o.classList.add('sel',o.dataset.t==='Solucionado'?'yes':'');$('#btnNext').disabled=false;});
  $('#btnNext').onclick=renderReceptor;
}

/* ============================================================ EXPORT — Excel expandido + ZIP */
async function finishAndExport(){
  $('#btnNext').disabled=true;$('#btnNext').innerHTML='<span class="spinner"></span> Generando...';
  // GPS ya viene corriendo; tomar el último (si no hay, intento puntual)
  if(!State.gps){try{State.gps=await new Promise(res=>{if(!navigator.geolocation){res(null);return;}navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy}),()=>res(null),{timeout:6000});});}catch{State.gps=null;}}
  const now=new Date(),stamp=now.toISOString().slice(0,19).replace(/[:T]/g,'-');
  const est=State.est||{};const rbd=est[COL.RBD]||'SN',nom=est[COL.NOM]||'';
  const zip=new JSZip(),fotos=zip.folder('fotos');let mc=0;

  // Cabecera (hoja Resumen)
  const head=[
    ['BITÁCORA DE MANTENCIÓN — SOSER'],
    ['Modo',State.mode==='preventiva'?'Preventiva':'Correctiva'],
    ['RBD',rbd],['Establecimiento',nom],['Dirección',est[COL.DIR]||''],
    ['Comuna',est[COL.COM]||''],['Supervisor',est[COL.SUP]||''],['Institución',est[COL.INST]||''],
    ['Fecha y hora',now.toLocaleString('es-CL')],
    ['GPS',State.gps?`${State.gps.lat.toFixed(6)}, ${State.gps.lon.toFixed(6)} (±${Math.round(State.gps.acc)}m)`:'No disponible'],
  ];
  if(State.ticket){head.push([]);head.push(['TICKET']);head.push(['N°',State.ticket.num]);head.push(['Descripción',State.ticket.desc]);head.push(['Fecha ticket',State.ticket.fecha]);head.push(['Subido por',State.ticket.subido]);head.push(['Estado final',State.corr.ticketEstado||'']);}
  head.push([]);
  const r=State.receptor||{};
  head.push(['RECEPCIÓN']);
  head.push(['Nombre',r.nombre||'']);head.push(['RUT',r.rut||'']);head.push(['Cargo',r.cargo||'']);
  if(r.id)head.push(['ID leído',r.id]);if(r.registro)head.push(['Registro ID',r.registro]);
  // firma como imagen guardada en fotos
  if(r.firma){const b=dataURLtoBlob(r.firma);fotos.file('firma_receptor.png',b);head.push(['Firma','fotos/firma_receptor.png']);}

  async function saveMedia(prefix,media){const files=[];for(const m of (media||[])){mc++;const ext=m.type==='video'?'webm':'jpg';const fn=`${rbd}_${prefix}_${mc}.${ext}`;fotos.file(fn,m.blob);files.push('fotos/'+fn);}return files;}

  // ---- Hoja de detalle EXPANDIDA EN COLUMNAS ----
  // Encabezados máximos: Grupo|Activo|Pregunta|Respuesta|Detalle1|Detalle2|Detalle3|Indique|Verif1|Verif2|...
  const detail=[];
  let maxVerif=0;
  const bodyRows=[];
  if(State.mode==='preventiva'){
    for(const s of State.flow){
      const a=State.answers[s.id];if(!a||a.value==null||(s.onlyIf&&!s.onlyIf()))continue;
      const files=await saveMedia(s.id,a.media);maxVerif=Math.max(maxVerif,files.length);
      // datos expandidos según tipo
      let d1='',d2='',d3='';
      if(Array.isArray(a.value)){ // frío: una fila por equipo
        for(const e of a.value){bodyRows.push({g:s.grupo,act:s.activo,q:s.q,resp:e.tipo,d1:(e.lts||'')+' L',d2:'×'+(e.qty||1),d3:'',ind:a.indique||'',files});}
        continue;
      } else if(a.value&&typeof a.value==='object'){d1='Simple: '+(a.value.simple||0);d2='Doble: '+(a.value.doble||0);}
      bodyRows.push({g:s.grupo,act:s.activo,q:s.q,resp:fmtAns(a.value),d1,d2,d3,ind:a.indique||'',files});
    }
  } else {
    const c=State.corr;
    const files=await saveMedia('correctiva',c.media);maxVerif=Math.max(maxVerif,files.length);
    bodyRows.push({g:'Correctiva',act:c.zona,q:'Falla detectada',resp:c.falla||'',d1:'',d2:'',d3:'',ind:'',files:[]});
    bodyRows.push({g:'Correctiva',act:c.zona,q:'Reparación ejecutada',resp:c.reparacion||'',d1:'',d2:'',d3:'',ind:'',files});
    bodyRows.push({g:'Correctiva',act:'Gastos',q:'¿Ocupó repuestos/gastos locales?',resp:c.gasto||'',d1:'',d2:'',d3:'',ind:c.gastoDetalle||'',files:[]});
    if(State.ticket)bodyRows.push({g:'Correctiva',act:'Ticket',q:'Estado del ticket',resp:c.ticketEstado||'',d1:'Ticket '+State.ticket.num,d2:'',d3:'',ind:'',files:[]});
  }
  const verHeaders=[];for(let i=0;i<Math.max(maxVerif,1);i++)verHeaders.push('Verificador '+(i+1));
  detail.push(['Grupo','Activo','Pregunta','Respuesta','Dato 1','Dato 2','Dato 3','Indique / Observación',...verHeaders]);
  const linkCells=[];
  bodyRows.forEach(row=>{
    const base=[row.g,row.act,row.q,row.resp,row.d1,row.d2,row.d3,row.ind];
    const r0=detail.length;
    row.files.forEach((f,i)=>{base.push(f);linkCells.push({r:r0,c:8+i,target:f});});
    detail.push(base);
  });

  // armar libro: hoja Resumen + hoja Detalle
  const wb=XLSX.utils.book_new();
  const wsH=XLSX.utils.aoa_to_sheet(head);
  wsH['!cols']=[{wch:18},{wch:48}];
  // hipervínculo firma
  head.forEach((rw,i)=>{if(rw[1]&&typeof rw[1]==='string'&&rw[1].startsWith('fotos/')){const ref=XLSX.utils.encode_cell({r:i,c:1});wsH[ref]={t:'s',v:rw[1],l:{Target:rw[1]}};}});
  XLSX.utils.book_append_sheet(wb,wsH,'Resumen');
  const wsD=XLSX.utils.aoa_to_sheet(detail);
  wsD['!cols']=[{wch:14},{wch:20},{wch:46},{wch:20},{wch:14},{wch:12},{wch:12},{wch:38},...verHeaders.map(()=>({wch:30}))];
  linkCells.forEach(({r,c,target})=>{const ref=XLSX.utils.encode_cell({r,c});wsD[ref]={t:'s',v:target,l:{Target:target,Tooltip:'Abrir verificador'}};});
  XLSX.utils.book_append_sheet(wb,wsD,'Detalle');

  const buf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  zip.file(`Bitacora_${rbd}_${stamp}.xlsx`,buf);
  zip.file('LEEME.txt',`Bitácora SOSER\nRBD ${rbd} - ${nom}\n${now.toLocaleString('es-CL')}\n\nDescomprime todo junto: el Excel enlaza las fotos/videos de la carpeta "fotos".`);
  const blob=await zip.generateAsync({type:'blob'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Bitacora_${rbd}_${stamp}.zip`;document.body.appendChild(a);a.click();a.remove();
  stopGPS();
  renderDone(rbd,nom,mc);
}
function dataURLtoBlob(durl){const arr=durl.split(',');const mime=arr[0].match(/:(.*?);/)[1];const bstr=atob(arr[1]);let n=bstr.length;const u8=new Uint8Array(n);while(n--)u8[n]=bstr.charCodeAt(n);return new Blob([u8],{type:mime});}
function renderDone(rbd,nom,media){
  navbar.classList.add('hidden');$('#btnDrawer').classList.add('hidden');$('#gpsChip').classList.add('hidden');
  content.innerHTML=`<div class="screen"><div class="home-hero" style="padding-top:54px"><div class="mark" style="background:#fff">${LOGO_SVG}</div>
    <h1>Bitácora completada</h1><p>RBD ${rbd} · ${nom}</p></div>
    <div class="card" style="text-align:center">
      <p>Se descargó un <b>.zip</b> con el Excel (hojas Resumen y Detalle) y ${media} verificador(es) en la carpeta <b>/fotos</b>.</p>
      <p class="note">Descomprime todo junto para que los enlaces funcionen.</p>
      <button class="btn finish" style="margin-top:14px" id="again">Nueva bitácora</button>
    </div></div>`;
  $('#again').onclick=renderHome;
}

/* ============================================================ ARRANQUE */
renderHome();
