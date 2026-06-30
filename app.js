/* ============================================================
   SOSER · Bitácora de Mantención — App Web
   Single-page, sin framework. Estado en memoria + export ZIP.
   ============================================================ */

// ---- BBDD: [rbd, nombre, direccion, comuna, supervisor, institucion] ----
const COL = {RBD:0,NOM:1,DIR:2,COM:3,SUP:4,INST:5};

// ---------- Estado global ----------
const State = {
  mode:null,            // 'preventiva' | 'correctiva'
  est:null,             // establecimiento elegido (array BBDD)
  answers:{},           // key -> {value, indique, media:[]}
  receptores:[],        // personas que reciben
  flow:[],              // lista de pasos construida
  idx:0,                // paso actual
  startedAt:null,
  gps:null
};

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const content = $('#content');
const navbar = $('#navbar');
const overlays = $('#overlays');

function toast(msg,ms=1800){
  const t=document.createElement('div');t.className='toast';t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.remove(),ms);
}
function uid(){return Math.random().toString(36).slice(2,9);}
function norm(s){return (s||'').toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'');}

/* ============================================================
   HOME
   ============================================================ */
function renderHome(){
  navbar.classList.add('hidden');
  $('#btnDrawer').classList.add('hidden');
  $('#modeLabel').textContent='Bitácora';
  content.innerHTML = `
    <div class="screen">
      <div class="home-hero">
        <div class="mark">S</div>
        <h1>Bitácora de Mantención</h1>
        <p>Registro de inspección en terreno · SOSER</p>
      </div>
      <div class="home-choices">
        <div class="choice prev" id="cPrev">
          <div class="emoji">🛠️</div>
          <div><h3>Bitácora preventiva</h3><p>Inspección programada de activos por establecimiento</p></div>
          <div class="arrow">›</div>
        </div>
        <div class="choice corr" id="cCorr">
          <div class="emoji">⚠️</div>
          <div><h3>Bitácora correctiva</h3><p>Registro de intervención ante falla o emergencia</p></div>
          <div class="arrow">›</div>
        </div>
      </div>
      <p class="note" style="text-align:center;margin-top:26px">
        ${BBDD.length} establecimientos cargados · Licitación 85-34-LR25
      </p>
    </div>`;
  $('#cPrev').onclick=()=>startMode('preventiva');
  $('#cCorr').onclick=()=>startMode('correctiva');
}

function startMode(mode){
  State.mode=mode;
  State.est=null;State.answers={};State.receptores=[];State.idx=0;
  State.startedAt=new Date();
  $('#modeLabel').textContent = mode==='preventiva'?'Preventiva':'Correctiva';
  renderEstablecimiento();
}

/* ============================================================
   PASO 0 — SELECCIÓN DE ESTABLECIMIENTO
   ============================================================ */
function renderEstablecimiento(){
  navbar.classList.remove('hidden');
  $('#btnDrawer').classList.add('hidden');
  content.innerHTML = `
   <div class="screen">
    <div class="card">
      <div class="step-eyebrow">Información general</div>
      <h2 class="q">Selecciona el establecimiento</h2>
      <div class="banner">Busca por <b>RBD</b> o por <b>nombre</b>. Escribe y elige de la lista. Cualquiera de los dos completa los datos.</div>

      <div class="field-block">
        <label class="fld">RBD</label>
        <div class="search-wrap">
          <input type="text" id="qRbd" inputmode="numeric" placeholder="Ej: 8518" autocomplete="off">
          <button class="clearbtn hidden" id="clrRbd">✕</button>
          <div class="suggest hidden" id="sgRbd"></div>
        </div>
      </div>

      <div class="field-block">
        <label class="fld">Establecimiento</label>
        <div class="search-wrap">
          <input type="text" id="qNom" placeholder="Ej: Complejo Estación Central" autocomplete="off">
          <button class="clearbtn hidden" id="clrNom">✕</button>
          <div class="suggest hidden" id="sgNom"></div>
        </div>
      </div>

      <div id="estData" class="hidden">
        <div class="readonly-grid">
          <div class="ro"><span>Dirección</span><b id="dDir">—</b></div>
          <div class="ro"><span>Comuna</span><b id="dCom">—</b></div>
          <div class="ro"><span>Supervisor</span><b id="dSup">—</b></div>
          <div class="ro"><span>Institución</span><b id="dInst">—</b></div>
        </div>
      </div>
    </div>
   </div>`;

  $('#btnBack').onclick=renderHome;
  $('#btnNext').textContent='Aceptar y continuar';
  $('#btnNext').disabled=true;
  $('#btnNext').onclick=()=>{ buildFlow(); renderStep(); };

  setupSearch('qRbd','sgRbd','clrRbd',COL.RBD,true);
  setupSearch('qNom','sgNom','clrNom',COL.NOM,false);
}

function setupSearch(inputId,sgId,clrId,col,isRbd){
  const inp=$('#'+inputId), sg=$('#'+sgId), clr=$('#'+clrId);
  let hl=-1, current=[];
  inp.addEventListener('input',()=>{
    const v=norm(inp.value.trim());
    clr.classList.toggle('hidden', !inp.value);
    if(!v){sg.classList.add('hidden');return;}
    current = BBDD.filter(r=>norm(r[col]).includes(v)).slice(0,12);
    if(!current.length){sg.classList.add('hidden');return;}
    sg.innerHTML = current.map((r,i)=>`
      <div data-i="${i}">${r[col]}
        <small>${isRbd? r[COL.NOM] : 'RBD '+r[COL.RBD]} · ${r[COL.COM]}</small>
      </div>`).join('');
    sg.classList.remove('hidden'); hl=-1;
    $$('#'+sgId+' div').forEach(d=>d.onclick=()=>pickEst(current[+d.dataset.i]));
  });
  inp.addEventListener('keydown',e=>{
    const items=$$('#'+sgId+' div');
    if(!items.length)return;
    if(e.key==='ArrowDown'){hl=Math.min(hl+1,items.length-1);}
    else if(e.key==='ArrowUp'){hl=Math.max(hl-1,0);}
    else if(e.key==='Enter'&&hl>=0){pickEst(current[hl]);return;}
    else return;
    items.forEach((d,i)=>d.classList.toggle('hl',i===hl));
    e.preventDefault();
  });
  clr.onclick=()=>{ inp.value=''; clr.classList.add('hidden'); sg.classList.add('hidden'); clearEst(); };
}

function pickEst(r){
  State.est=r;
  $('#qRbd').value=r[COL.RBD]; $('#qNom').value=r[COL.NOM];
  $('#clrRbd').classList.remove('hidden'); $('#clrNom').classList.remove('hidden');
  $('#sgRbd').classList.add('hidden'); $('#sgNom').classList.add('hidden');
  $('#dDir').textContent=r[COL.DIR]||'—';
  $('#dCom').textContent=r[COL.COM]||'—';
  $('#dSup').textContent=r[COL.SUP]||'—';
  $('#dInst').textContent=r[COL.INST]||'—';
  $('#estData').classList.remove('hidden');
  $('#btnNext').disabled=false;
}
function clearEst(){
  State.est=null;$('#estData').classList.add('hidden');$('#btnNext').disabled=true;
}

/* ============================================================
   DEFINICIÓN DEL CUESTIONARIO
   Tipos de paso:
   - 'single'  : opciones, una elección (puede ramificar)
   - 'yesno'   : Sí / No  (No abre indique + verificador)
   - 'count'   : stepper numérico
   - 'photo'   : exige foto(s)
   - 'frio'    : equipos dinámicos
   - 'enchufes': número de tomas
   Cada paso: {id, grupo, activo, q, type, ...}
   branch(answer,State) -> puede inyectar pasos
   ============================================================ */

const GRUPOS = {
  COCINA:'Cocina', FRIO:'Equipos de frío', DOC:'Documentación'
};

// Catálogo de pasos. Algunos se generan dinámicamente según respuestas.
function buildFlow(){
  State.flow = [];
  State.answers = {};
  // --- COCINA: artefacto de calor ---
  addStep({id:'calor_tipo', grupo:GRUPOS.COCINA, activo:'Artefacto de calor',
    q:'¿Se utiliza cocinilla o anafe?', type:'single',
    options:['Cocinilla (4 platos)','Anafe (2 platos)']});
  addStep({id:'calor_unidades', grupo:GRUPOS.COCINA, activo:'Artefacto de calor',
    q:'¿Cuántas unidades?', type:'count', min:1, max:20});
  addStep({id:'calor_sec', grupo:GRUPOS.COCINA, activo:'Artefacto de calor',
    q:'¿Se encuentra con sus sellos SEC?', type:'yesno',
    yesPhoto:true, photoLabel:'Fotografía del sello SEC'});
  addStep({id:'calor_platos', grupo:GRUPOS.COCINA, activo:'Artefacto de calor',
    q:'¿Se encuentra con todos sus platos operativos?', type:'yesno'});
  addStep({id:'calor_anclaje', grupo:GRUPOS.COCINA, activo:'Artefacto de calor',
    q:'¿Se encuentran ancladas al piso?', type:'yesno'});
  addStep({id:'calor_gas', grupo:GRUPOS.COCINA, activo:'Artefacto de calor',
    q:'Conexión de gas: ¿flexibles en buen estado, con sello SEC y en norma?', type:'yesno'});

  // --- COCINA: hornos ---
  addStep({id:'horno_existe', grupo:GRUPOS.COCINA, activo:'Hornos',
    q:'¿Cuenta con hornos?', type:'yesno',
    noEndsActivo:true});            // si NO -> indique y salta al siguiente activo
  addStep({id:'horno_cant', grupo:GRUPOS.COCINA, activo:'Hornos',
    q:'¿Cuántos hornos existen en cocina?', type:'count', min:1, max:2,
    onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_tipo', grupo:GRUPOS.COCINA, activo:'Hornos',
    q:'¿Hornos simples o dobles?', type:'multi-tipo',
    onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_estado', grupo:GRUPOS.COCINA, activo:'Hornos',
    q:'¿Se encuentra en buen estado?', type:'photo',
    photoLabel:'Foto de los hornos', maxByHornos:true,
    onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_temp', grupo:GRUPOS.COCINA, activo:'Hornos',
    q:'¿Llega a temperatura y tiene quemadores en buen estado?', type:'yesno',
    onlyIf:()=>ans('horno_existe')==='Sí'});
  addStep({id:'horno_gas', grupo:GRUPOS.COCINA, activo:'Hornos',
    q:'Conexión a gas: ¿flexibles en buen estado, con sello SEC y en norma?', type:'yesno',
    onlyIf:()=>ans('horno_existe')==='Sí'});

  // --- COCINA: lavamanos ---
  addStep({id:'lava_existe', grupo:GRUPOS.COCINA, activo:'Lavamanos',
    q:'¿Cuenta con lavamanos al interior?', type:'yesno', noEndsActivo:true});
  addStep({id:'lava_estado', grupo:GRUPOS.COCINA, activo:'Lavamanos',
    q:'¿Se encuentra en buen estado?', type:'photo',
    photoLabel:'Fotografía del lavamanos', forcePhoto:true,
    onlyIf:()=>ans('lava_existe')==='Sí'});
  addStep({id:'lava_flex', grupo:GRUPOS.COCINA, activo:'Lavamanos',
    q:'¿Se encuentran flexibles y conexiones en buen estado?', type:'yesno',
    onlyIf:()=>ans('lava_existe')==='Sí'});

  // --- FRÍO ---
  addStep({id:'frio_equipos', grupo:GRUPOS.FRIO, activo:'Equipos de frío',
    q:'Indica los equipos de frío del establecimiento', type:'frio'});
  addStep({id:'frio_estado', grupo:GRUPOS.FRIO, activo:'Equipos de frío',
    q:'¿Los equipos se encuentran en buen estado?', type:'photo',
    photoLabel:'Foto por equipo', maxByFrio:true});
  addStep({id:'frio_temp', grupo:GRUPOS.FRIO, activo:'Equipos de frío',
    q:'¿Llega a la temperatura? (foto al termómetro dentro del equipo)', type:'yesno',
    yesPhoto:true, photoLabel:'Foto del termómetro'});

  // --- COCINA: enchufes ---
  addStep({id:'ench_existe', grupo:GRUPOS.COCINA, activo:'Enchufes',
    q:'¿La cocina cuenta con enchufes?', type:'yesno', noEndsActivo:true});
  addStep({id:'ench_cant', grupo:GRUPOS.COCINA, activo:'Enchufes',
    q:'¿Con cuántas tomas de corriente cuenta la cocina?', type:'enchufes',
    onlyIf:()=>ans('ench_existe')==='Sí'});
  addStep({id:'ench_estado', grupo:GRUPOS.COCINA, activo:'Enchufes',
    q:'¿Todos los enchufes están en buen estado, sin hundirse ni piezas rotas?', type:'yesno',
    onlyIf:()=>ans('ench_existe')==='Sí'});

  // --- DOCUMENTACIÓN ---
  addStep({id:'doc_sec', grupo:GRUPOS.DOC, activo:'Certificación SEC',
    q:'¿El establecimiento cuenta con certificación SEC?', type:'yesno',
    yesPhoto:true, photoLabel:'Foto del certificado SEC'});
  addStep({id:'doc_res', grupo:GRUPOS.DOC, activo:'Resolución sanitaria',
    q:'¿El establecimiento cuenta con resolución sanitaria?', type:'yesno',
    yesPhoto:true, photoLabel:'Foto de la resolución sanitaria'});

  State.idx=0;
}

function addStep(s){State.flow.push(s);}
function ans(id){return State.answers[id]?.value;}

// Avanza saltando pasos cuyo onlyIf no se cumple
function nextVisibleIdx(from){
  let i=from;
  while(i<State.flow.length){
    const s=State.flow[i];
    if(s.onlyIf && !s.onlyIf()){i++;continue;}
    return i;
  }
  return State.flow.length; // -> receptor
}
function prevVisibleIdx(from){
  let i=from;
  while(i>=0){
    const s=State.flow[i];
    if(s.onlyIf && !s.onlyIf()){i--;continue;}
    return i;
  }
  return -1;
}

/* ============================================================
   RENDER DE CADA PASO
   ============================================================ */
function renderStep(){
  const i = nextVisibleIdx(State.idx);
  State.idx = i;
  if(i>=State.flow.length){ renderReceptor(); return; }
  const s = State.flow[i];
  const a = State.answers[s.id] || {value:null,indique:'',media:[]};
  State.answers[s.id]=a;

  navbar.classList.remove('hidden');
  $('#btnDrawer').classList.remove('hidden');
  $('#btnDrawer').onclick=openDrawer;

  // progreso
  const total=State.flow.filter(st=>!st.onlyIf||st.onlyIf()).length;
  const done=State.flow.slice(0,i).filter(st=>!st.onlyIf||st.onlyIf()).length;
  const pct=Math.round(done/Math.max(total,1)*100);

  let body='';
  if(s.type==='single') body=renderSingle(s,a);
  else if(s.type==='yesno') body=renderYesNo(s,a);
  else if(s.type==='count') body=renderCount(s,a);
  else if(s.type==='enchufes') body=renderCount(s,a,true);
  else if(s.type==='photo') body=renderPhoto(s,a);
  else if(s.type==='frio') body=renderFrio(s,a);
  else if(s.type==='multi-tipo') body=renderHornoTipo(s,a);

  content.innerHTML=`
   <div class="screen">
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="card">
      <div class="step-eyebrow">${s.grupo} <span class="grp">· ${s.activo}</span></div>
      <h2 class="q">${s.q}</h2>
      <div id="qbody">${body}</div>
      <div id="indiqueSlot"></div>
    </div>
   </div>`;

  wireStep(s,a);

  $('#btnBack').textContent='‹';
  $('#btnBack').onclick=()=>{
    const p=prevVisibleIdx(i-1);
    if(p<0){ if(confirm('¿Volver a la selección de establecimiento? Se conservan las respuestas.')) renderEstablecimiento(); return; }
    State.idx=p; renderStep();
  };
  $('#btnNext').textContent= (i===lastVisible())?'Ir a recepción':'Continuar';
  refreshNext(s,a);
}

function lastVisible(){
  for(let i=State.flow.length-1;i>=0;i--){const s=State.flow[i];if(!s.onlyIf||s.onlyIf())return i;}
  return 0;
}

/* ---------- renders por tipo ---------- */
function renderSingle(s,a){
  return `<div class="opts ${s.options.length>2?'one':''}">${
    s.options.map(o=>`<div class="opt ${a.value===o?'sel':''}" data-v="${o}">${o}</div>`).join('')
  }</div>`;
}
function renderYesNo(s,a){
  return `<div class="opts">
    <div class="opt ${a.value==='Sí'?'sel yes':''}" data-v="Sí">✓ Sí</div>
    <div class="opt ${a.value==='No'?'sel no':''}" data-v="No">✕ No</div>
  </div>`;
}
function renderCount(s,a,plain){
  const v=a.value??(s.min??1);
  return `<div class="stepper">
    <button data-d="-1">−</button>
    <div class="val" id="cv">${v}</div>
    <button data-d="1">+</button>
  </div>${plain?'<p class="note">Indica el número total de tomas de corriente.</p>':''}`;
}
function renderPhoto(s,a){
  let max=1;
  if(s.maxByHornos) max=parseInt(ans('horno_cant')||1);
  if(s.maxByFrio) max=Math.max(1,(ans('frio_equipos')||[]).reduce((n,e)=>n+(+e.qty||1),0));
  a._max=max;
  return `<div class="verifier">
    <div class="vtitle">${s.photoLabel||'Fotografía'} ${max>1?`(hasta ${max})`:''}</div>
    <div class="vbtns">
      <button class="vbtn" data-cap="photo"><span class="ic">📷</span>Tomar foto</button>
    </div>
    <div class="thumbs" id="thumbs"></div>
    ${s.optionalIndique?'':''}
  </div>`;
}
function renderFrio(s,a){
  a.value=a.value||[];
  return `<div class="equip-add">
      <select id="frioSel">
        <option value="Refrigerador">Refrigerador</option>
        <option value="Visicooler">Visicooler</option>
      </select>
      <button class="btn primary" id="frioAdd" style="flex:0 0 auto;padding:0 18px">Agregar</button>
    </div>
    <div class="equip-head"><div>Equipo</div><div>Litros</div><div>Unid.</div><div></div></div>
    <div id="frioRows"></div>
    <p class="note">Agrega cada tipo y define litros y cantidad de unidades.</p>`;
}
function renderHornoTipo(s,a){
  a.value=a.value||{simple:0,doble:0};
  const n=parseInt(ans('horno_cant')||1);
  return `<p class="note">Define el tipo para los ${n} horno(s).</p>
    <div class="equip-row" style="grid-template-columns:1fr 70px"><div class="nm">Simple</div>
      <input type="number" id="hSimple" min="0" max="${n}" value="${a.value.simple}"></div>
    <div class="equip-row" style="grid-template-columns:1fr 70px"><div class="nm">Doble</div>
      <input type="number" id="hDoble" min="0" max="${n}" value="${a.value.doble}"></div>`;
}

/* ============================================================
   WIRING + VALIDACIÓN + INDIQUE/VERIFICADOR
   ============================================================ */
function wireStep(s,a){
  if(s.type==='single'){
    $$('.opt').forEach(o=>o.onclick=()=>{
      a.value=o.dataset.v; $$('.opt').forEach(x=>x.classList.remove('sel'));
      o.classList.add('sel'); maybeIndique(s,a); refreshNext(s,a);
    });
  }
  if(s.type==='yesno'){
    $$('.opt').forEach(o=>o.onclick=()=>{
      a.value=o.dataset.v; $$('.opt').forEach(x=>x.classList.remove('sel','yes','no'));
      o.classList.add('sel', a.value==='Sí'?'yes':'no');
      maybeIndique(s,a); refreshNext(s,a);
    });
    if(a.value) maybeIndique(s,a);
  }
  if(s.type==='count'||s.type==='enchufes'){
    a.value=a.value??(s.min??1);
    $$('.stepper button').forEach(b=>b.onclick=()=>{
      let v=a.value+parseInt(b.dataset.d);
      v=Math.max(s.min??0,Math.min(s.max??9999,v));
      a.value=v; $('#cv').textContent=v; refreshNext(s,a);
    });
  }
  if(s.type==='photo'){ renderThumbs(s,a); wireCapture(s,a); }
  if(s.type==='frio') wireFrio(s,a);
  if(s.type==='multi-tipo'){
    const upd=()=>{a.value={simple:+($('#hSimple').value||0),doble:+($('#hDoble').value||0)};refreshNext(s,a);};
    $('#hSimple').oninput=upd;$('#hDoble').oninput=upd;
  }
}

// Abre el bloque "Indique" + verificador cuando corresponde
function maybeIndique(s,a){
  const slot=$('#indiqueSlot'); slot.innerHTML='';
  const triggerNo = (s.type==='yesno' && a.value==='No');
  if(triggerNo){
    slot.innerHTML=`
      <div class="indique">
        <span class="reqtag">Obligatorio</span>
        <label class="fld">Indique la situación</label>
        <textarea id="indTxt" placeholder="Describe el hallazgo...">${a.indique||''}</textarea>
        <div class="verifier">
          <div class="vtitle">Incluir verificador</div>
          <div class="vbtns">
            <button class="vbtn" data-cap="photo"><span class="ic">📷</span>Foto</button>
            <button class="vbtn" data-cap="video"><span class="ic">🎥</span>Video (máx 15s)</button>
          </div>
          <div class="thumbs" id="thumbs"></div>
        </div>
      </div>`;
    $('#indTxt').oninput=e=>{a.indique=e.target.value;refreshNext(s,a);};
    renderThumbs(s,a); wireCapture(s,a);
  }
  // Sí con foto exigida
  if(s.type==='yesno' && a.value==='Sí' && s.yesPhoto){
    slot.innerHTML=`<div class="indique"><div class="verifier">
        <div class="vtitle">${s.photoLabel||'Fotografía'}</div>
        <div class="vbtns"><button class="vbtn" data-cap="photo"><span class="ic">📷</span>Tomar foto</button></div>
        <div class="thumbs" id="thumbs"></div>
      </div></div>`;
    renderThumbs(s,a); wireCapture(s,a);
  }
}

// ¿Puede avanzar?
function canAdvance(s,a){
  if(s.type==='single') return !!a.value;
  if(s.type==='count'||s.type==='enchufes') return a.value!=null;
  if(s.type==='photo'){
    if(s.forcePhoto||s.maxByHornos||s.maxByFrio) return (a.media||[]).length>=1;
    return true;
  }
  if(s.type==='frio') return (a.value||[]).length>=1;
  if(s.type==='multi-tipo'){
    const n=parseInt(ans('horno_cant')||1);
    return a.value && (a.value.simple+a.value.doble)>=1;
  }
  if(s.type==='yesno'){
    if(!a.value) return false;
    if(a.value==='No') return (a.indique||'').trim().length>0; // indique obligatorio
    if(a.value==='Sí' && s.yesPhoto) return (a.media||[]).length>=1;
    return true;
  }
  return true;
}

function refreshNext(s,a){
  const ok=canAdvance(s,a);
  $('#btnNext').disabled=!ok;
  $('#btnNext').onclick=()=>{
    if(!canAdvance(s,a))return;
    // Si NO termina activo: saltar pasos del mismo activo
    if(s.type==='yesno' && a.value==='No' && s.noEndsActivo){
      skipRestOfActivo(s);
    }
    State.idx=nextVisibleIdx(State.idx+1);
    renderStep();
  };
}

function skipRestOfActivo(s){
  // marca onlyIf falso para los siguientes del mismo activo (ya cubierto por onlyIf basados en ans)
  // Para 'existe'==No, los onlyIf de hijos chequean ans()==='Sí', así que se saltan solos.
}

/* ---------- FRÍO dinámico ---------- */
function wireFrio(s,a){
  const rows=$('#frioRows');
  const draw=()=>{
    rows.innerHTML=a.value.map((e,i)=>`
      <div class="equip-row">
        <div class="nm">${e.tipo}</div>
        <input type="number" placeholder="Lts" value="${e.lts||''}" data-i="${i}" data-k="lts">
        <input type="number" placeholder="N°" value="${e.qty||1}" data-i="${i}" data-k="qty">
        <button class="rm" data-rm="${i}">✕</button>
      </div>`).join('');
    $$('#frioRows input').forEach(inp=>inp.oninput=()=>{
      a.value[+inp.dataset.i][inp.dataset.k]= +inp.value||(inp.dataset.k==='qty'?1:0);
      refreshNext(s,a);
    });
    $$('#frioRows .rm').forEach(b=>b.onclick=()=>{a.value.splice(+b.dataset.rm,1);draw();refreshNext(s,a);});
    refreshNext(s,a);
  };
  $('#frioAdd').onclick=()=>{ a.value.push({tipo:$('#frioSel').value,lts:'',qty:1}); draw(); };
  draw();
}

/* ============================================================
   CÁMARA + VERIFICADORES (foto/video) con OCR opcional
   ============================================================ */
let camStream=null, camRec=null, camChunks=[], camTimer=null;
function wireCapture(s,a){
  $$('#qbody [data-cap],#indiqueSlot [data-cap]').forEach(b=>{
    b.onclick=()=>openCamera(b.dataset.cap,s,a);
  });
}
function renderThumbs(s,a){
  const box=$('#thumbs'); if(!box)return;
  box.innerHTML=(a.media||[]).map((m,i)=>`
    <div class="thumb">
      ${m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`}
      <span class="badge">${m.type==='video'?'video':'foto'}</span>
      <button class="del" data-del="${i}">✕</button>
    </div>`).join('');
  $$('#thumbs .del').forEach(b=>b.onclick=()=>{a.media.splice(+b.dataset.del,1);renderThumbs(s,a);refreshNext(s,a);});
}

async function openCamera(kind,s,a){
  const max = a._max || (kind==='video'?1:8);
  if((a.media||[]).filter(m=>m.type===(kind==='video'?'video':'photo')).length>=max && a._max){
    toast('Máximo alcanzado'); return;
  }
  const ov=document.createElement('div'); ov.className='cam-bg';
  ov.innerHTML=`
    <button class="camclose">✕</button>
    <video autoplay playsinline></video>
    <div class="cambar">
      <div class="shoot ${kind==='photo'?'photo':''}"></div>
    </div>`;
  overlays.appendChild(ov);
  const video=$('video',ov);
  try{
    camStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:'environment'}, audio:kind==='video'});
    video.srcObject=camStream;
  }catch(err){ toast('No se pudo abrir la cámara'); ov.remove(); return; }

  const close=()=>{ if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;} ov.remove(); };
  $('.camclose',ov).onclick=close;

  const shoot=$('.shoot',ov);
  if(kind==='photo'){
    shoot.onclick=()=>{
      const c=document.createElement('canvas');
      c.width=video.videoWidth;c.height=video.videoHeight;
      c.getContext('2d').drawImage(video,0,0);
      c.toBlob(b=>{
        const url=URL.createObjectURL(b);
        a.media=a.media||[]; a.media.push({type:'photo',blob:b,url});
        renderThumbs(s,a); refreshNext(s,a); close();
        toast('Foto agregada');
      },'image/jpeg',0.85);
    };
  } else {
    let recording=false;
    shoot.onclick=()=>{
      if(!recording){
        camChunks=[]; camRec=new MediaRecorder(camStream);
        camRec.ondataavailable=e=>camChunks.push(e.data);
        camRec.onstop=()=>{
          const b=new Blob(camChunks,{type:'video/webm'});
          const url=URL.createObjectURL(b);
          a.media=a.media||[]; a.media.push({type:'video',blob:b,url});
          renderThumbs(s,a); refreshNext(s,a); close(); toast('Video agregado');
        };
        camRec.start(); recording=true; shoot.style.background='#fff';
        const rec=document.createElement('div');rec.className='rec';rec.textContent='● REC 15s';ov.appendChild(rec);
        let t=15; camTimer=setInterval(()=>{t--;rec.textContent='● REC '+t+'s';if(t<=0){clearInterval(camTimer);camRec.stop();}},1000);
      } else { clearInterval(camTimer); camRec.stop(); }
    };
  }
}

/* ============================================================
   DRAWER — resumen de secciones (solo respondidas) con edición
   ============================================================ */
function openDrawer(){
  const bg=document.createElement('div');bg.className='drawer-bg';
  const dr=document.createElement('div');dr.className='drawer';
  // agrupar respondidas
  const groups={};
  State.flow.forEach((s,i)=>{
    const a=State.answers[s.id];
    if(!a||a.value==null||(s.onlyIf&&!s.onlyIf()))return;
    groups[s.grupo]=groups[s.grupo]||{};
    groups[s.grupo][s.activo]=groups[s.grupo][s.activo]||[];
    groups[s.grupo][s.activo].push({s,a,i});
  });
  let html='';
  for(const g in groups){
    let cnt=0; let inner='';
    for(const act in groups[g]){
      const items=groups[g][act];
      cnt+=items.length;
      inner+=`<div class="activo">
        <div class="ah" data-toggle>▸ ${act}</div>
        <div class="qa hidden">
          ${items.map(({s,a})=>`
            <div class="qrow">
              <div class="qq">${s.q}</div>
              <div class="aa ${a.value==='No'?'no':a.value==='Sí'?'yes':''}">${fmtAns(a.value)}</div>
              ${a.indique?`<div class="qq" style="margin-top:3px">↳ ${a.indique}</div>`:''}
              ${(a.media||[]).length?`<div class="mini-thumbs">${a.media.map(m=>m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}">`).join('')}</div>`:''}
            </div>`).join('')}
          <button class="jumpbtn" data-jump="${items[0].i}">Editar esta sección</button>
        </div>
      </div>`;
    }
    html+=`<div class="acc">
      <div class="head" data-acc>▾ ${g} <span class="cnt">${cnt}</span></div>
      <div class="activos">${inner}</div>
    </div>`;
  }
  if(!html) html='<p class="note">Aún no hay respuestas registradas.</p>';
  dr.innerHTML=`<header><b>Secciones</b><button class="iconbtn" id="drClose">✕</button></header><div class="body">${html}</div>`;
  overlays.appendChild(bg);overlays.appendChild(dr);
  const close=()=>{bg.remove();dr.remove();};
  bg.onclick=close; $('#drClose',dr).onclick=close;
  $$('[data-acc]',dr).forEach(h=>h.onclick=()=>h.nextElementSibling.classList.toggle('hidden'));
  $$('[data-toggle]',dr).forEach(h=>h.onclick=()=>{h.nextElementSibling.classList.toggle('hidden');h.textContent=h.textContent.startsWith('▸')?h.textContent.replace('▸','▾'):h.textContent.replace('▾','▸');});
  $$('[data-jump]',dr).forEach(b=>b.onclick=()=>{close();State.idx=+b.dataset.jump;renderStep();});
}
function fmtAns(v){
  if(Array.isArray(v)) return v.map(e=>`${e.tipo} ${e.lts||''}L ×${e.qty||1}`).join(', ');
  if(v&&typeof v==='object') return `Simple ${v.simple||0} · Doble ${v.doble||0}`;
  return v;
}

/* ============================================================
   RECEPTOR + ID (MRZ/OCR) + cierre
   ============================================================ */
const PERSONAS_ID = { // id leído -> datos
  '2':{nombre:'Manuel Alejandro Echeverría González', rut:'19.000.000-3', registro:'Z'+Math.random().toString(36).slice(2,10).toUpperCase()}
};

function renderReceptor(){
  navbar.classList.remove('hidden');
  $('#btnDrawer').classList.remove('hidden');
  content.innerHTML=`
   <div class="screen">
    <div class="card">
      <div class="step-eyebrow">Cierre</div>
      <h2 class="q">Persona que recibe</h2>
      <div class="field-block">
        <label class="fld">Nombre</label>
        <input type="text" id="rNombre" placeholder="Nombre completo">
      </div>
      <div class="field-block">
        <label class="fld">Cargo</label>
        <input type="text" id="rCargo" placeholder="Cargo">
      </div>
      <div class="vbtns">
        <button class="vbtn" id="addPerson"><span class="ic">＋</span>Agregar a la lista</button>
        <button class="vbtn" id="scanID"><span class="ic">🪪</span>Agregar ID (cámara)</button>
      </div>
      <div class="person-list" id="personList"></div>
      <p class="note">El lector de ID intenta reconocer el número del documento. Si la lectura falla, puedes ingresarlo manualmente.</p>
    </div>
   </div>`;
  $('#btnBack').textContent='‹';
  $('#btnBack').onclick=()=>{State.idx=lastVisible();renderStep();};
  $('#btnNext').textContent='Terminar y exportar';
  $('#btnNext').classList.remove('primary');$('#btnNext').classList.add('finish');
  $('#btnNext').disabled=State.receptores.length===0;
  $('#btnNext').onclick=finishAndExport;

  drawPersons();
  $('#addPerson').onclick=()=>{
    const n=$('#rNombre').value.trim(),c=$('#rCargo').value.trim();
    if(!n){toast('Ingresa el nombre');return;}
    State.receptores.push({nombre:n,cargo:c,rut:'',registro:'',id:''});
    $('#rNombre').value='';$('#rCargo').value='';drawPersons();
    $('#btnNext').disabled=false;
  };
  $('#scanID').onclick=scanID;
}
function drawPersons(){
  const box=$('#personList');
  box.innerHTML=State.receptores.map((p,i)=>`
    <div class="person">
      <div class="pr"><span>Nombre</span><b>${p.nombre}</b></div>
      ${p.cargo?`<div class="pr"><span>Cargo</span><b>${p.cargo}</b></div>`:''}
      ${p.rut?`<div class="pr"><span>RUT</span><b>${p.rut}</b></div>`:''}
      ${p.registro?`<div class="pr"><span>Registro ID</span><b>${p.registro}</b></div>`:''}
      <button class="jumpbtn" data-del="${i}">Quitar</button>
    </div>`).join('');
  $$('#personList [data-del]').forEach(b=>b.onclick=()=>{State.receptores.splice(+b.dataset.del,1);drawPersons();$('#btnNext').disabled=State.receptores.length===0;});
}

async function scanID(){
  const cargo=$('#rCargo').value.trim();
  const ov=document.createElement('div');ov.className='cam-bg';
  ov.innerHTML=`<button class="camclose">✕</button><video autoplay playsinline></video>
    <div class="mrzhint"><div class="mrzbox"><span>Encuadra el número del documento</span></div></div>
    <div class="cambar"><div class="shoot photo"></div></div>`;
  overlays.appendChild(ov);
  const video=$('video',ov);
  try{camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});video.srcObject=camStream;}
  catch{toast('No se pudo abrir la cámara');ov.remove();return;}
  const close=()=>{if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}ov.remove();};
  $('.camclose',ov).onclick=close;
  $('.shoot',ov).onclick=async()=>{
    const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;
    c.getContext('2d').drawImage(video,0,0);
    toast('Leyendo documento...');
    let num=null;
    try{
      if(window.Tesseract){
        const {data}=await Tesseract.recognize(c,'eng',{tessedit_char_whitelist:'0123456789<KMFN'});
        const digits=(data.text.match(/\d/g)||[]);
        // heurística simple: buscar un dígito aislado conocido o el primero
        num=detectID(data.text);
      }
    }catch(e){}
    close();
    if(num && PERSONAS_ID[num]){
      const p=PERSONAS_ID[num];
      State.receptores.push({nombre:p.nombre,cargo:cargo||'',rut:p.rut,registro:p.registro,id:num});
      $('#rCargo').value='';drawPersons();$('#btnNext').disabled=false;
      toast('ID '+num+' reconocido');
    } else {
      const manual=prompt('No se reconoció automáticamente. Ingresa el número de ID:');
      if(manual && PERSONAS_ID[manual.trim()]){
        const p=PERSONAS_ID[manual.trim()];
        State.receptores.push({nombre:p.nombre,cargo:cargo||'',rut:p.rut,registro:p.registro,id:manual.trim()});
        drawPersons();$('#btnNext').disabled=false;toast('ID '+manual.trim()+' cargado');
      } else if(manual){ toast('ID no encontrado en el registro'); }
    }
  };
}
function detectID(text){
  const t=(text||'').replace(/\s/g,'');
  for(const k in PERSONAS_ID){ if(t.includes(k)) return k; }
  const m=t.match(/\d+/); return m?m[0]:null;
}

/* ============================================================
   EXPORTAR — Excel (SheetJS) + fotos en ZIP (JSZip)
   El Excel enlaza cada foto por ruta relativa fotos/...
   ============================================================ */
async function finishAndExport(){
  $('#btnNext').disabled=true;
  $('#btnNext').innerHTML='<span class="spinner"></span> Generando...';
  // GPS
  try{
    State.gps=await new Promise((res)=>{
      if(!navigator.geolocation){res(null);return;}
      navigator.geolocation.getCurrentPosition(
        p=>res({lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy}),
        ()=>res(null),{timeout:6000});
    });
  }catch{State.gps=null;}

  const now=new Date();
  const stamp=now.toISOString().slice(0,19).replace(/[:T]/g,'-');
  const est=State.est;
  const rbd=est[COL.RBD], nom=est[COL.NOM];

  // Construir filas
  const rows=[];
  rows.push(['BITÁCORA DE MANTENCIÓN — SOSER']);
  rows.push(['Modo', State.mode==='preventiva'?'Preventiva':'Correctiva']);
  rows.push(['RBD', rbd]); rows.push(['Establecimiento', nom]);
  rows.push(['Dirección', est[COL.DIR]]); rows.push(['Comuna', est[COL.COM]]);
  rows.push(['Supervisor', est[COL.SUP]]); rows.push(['Institución', est[COL.INST]]);
  rows.push(['Fecha y hora', now.toLocaleString('es-CL')]);
  rows.push(['GPS', State.gps?`${State.gps.lat.toFixed(6)}, ${State.gps.lon.toFixed(6)} (±${Math.round(State.gps.acc)}m)`:'No disponible']);
  rows.push([]);
  rows.push(['Grupo','Activo','Pregunta','Respuesta','Indique / Observación','Verificadores']);

  const zip=new JSZip();
  const fotos=zip.folder('fotos');
  let mediaCount=0;
  const linkRows=[]; // {rowIndex, files:[names]}

  for(const s of State.flow){
    const a=State.answers[s.id];
    if(!a||a.value==null||(s.onlyIf&&!s.onlyIf()))continue;
    const files=[];
    for(const m of (a.media||[])){
      mediaCount++;
      const ext=m.type==='video'?'webm':'jpg';
      const fname=`${rbd}_${s.id}_${mediaCount}.${ext}`;
      fotos.file(fname, m.blob);
      files.push('fotos/'+fname);
    }
    rows.push([s.grupo,s.activo,s.q,fmtAns(a.value),a.indique||'', files.join(' | ')]);
    if(files.length) linkRows.push({r:rows.length-1, files});
  }
  rows.push([]);
  rows.push(['RECEPCIÓN']);
  rows.push(['Nombre','Cargo','RUT','Registro ID']);
  State.receptores.forEach(p=>rows.push([p.nombre,p.cargo,p.rut,p.registro]));

  // Crear hoja
  const ws=XLSX.utils.aoa_to_sheet(rows);
  // Hipervínculos a fotos (col F = index 5)
  linkRows.forEach(({r,files})=>{
    const cellRef=XLSX.utils.encode_cell({r,c:5});
    if(files.length===1){
      ws[cellRef]={t:'s',v:files[0],l:{Target:files[0],Tooltip:'Abrir verificador'}};
    }
  });
  ws['!cols']=[{wch:16},{wch:20},{wch:48},{wch:22},{wch:40},{wch:36}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Bitácora');

  const xlsxBuf=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  zip.file(`Bitacora_${rbd}_${stamp}.xlsx`, xlsxBuf);
  zip.file('LEEME.txt',
    `Bitácora de Mantención SOSER\nRBD ${rbd} - ${nom}\n${now.toLocaleString('es-CL')}\n\n`+
    `Descomprime esta carpeta completa. El Excel enlaza las fotos/videos\n`+
    `que están en la subcarpeta "fotos". Mantén ambos juntos para que los\n`+
    `hipervínculos funcionen.\n`);

  const blob=await zip.generateAsync({type:'blob'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=`Bitacora_${rbd}_${stamp}.zip`;
  document.body.appendChild(a); a.click(); a.remove();

  renderDone(rbd,nom,mediaCount);
}

function renderDone(rbd,nom,media){
  navbar.classList.add('hidden');$('#btnDrawer').classList.add('hidden');
  content.innerHTML=`
   <div class="screen">
    <div class="home-hero" style="padding-top:60px">
      <div class="mark" style="background:linear-gradient(135deg,var(--soser-green),#1c7a52)">✓</div>
      <h1>Bitácora completada</h1>
      <p>RBD ${rbd} · ${nom}</p>
    </div>
    <div class="card" style="text-align:center">
      <p>Se descargó un archivo <b>.zip</b> con el Excel y ${media} verificador(es) en la carpeta <b>/fotos</b>.</p>
      <p class="note">Descomprime todo junto para que los enlaces del Excel funcionen.</p>
      <button class="btn finish" style="margin-top:14px" id="again">Nueva bitácora</button>
    </div>
   </div>`;
  $('#again').onclick=renderHome;
}

/* ============================================================
   ARRANQUE
   ============================================================ */
renderHome();
