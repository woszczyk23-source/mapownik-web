(function(){
"use strict";

/* ===================== Supabase init ===================== */
const CFG = window.MAPOWNIK_CONFIG || {};
if(!CFG.SUPABASE_URL || CFG.SUPABASE_URL.indexOf("WKLEJ_TU") === 0){
  document.body.innerHTML = '<div style="max-width:480px;margin:60px auto;padding:20px;font-family:sans-serif;line-height:1.6;">' +
    '<h2>Brak konfiguracji</h2><p>Uzupełnij plik <code>config.js</code> danymi swojego projektu Supabase (Project URL i anon key z zakładki Project Settings → API), zapisz i odśwież stronę.</p></div>';
  return;
}
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const SUPPORT_EMAIL = CFG.SUPPORT_EMAIL || "kontakt@twoja-domena.pl";

/* ===================== Eye-curve geometry ===================== */
function betaF(s,p,q){ if(s<=0||s>=1) return 0; return Math.pow(s,p)*Math.pow(1-s,q); }
function betaMax(p,q){ const s=p/(p+q); return betaF(s,p,q); }
function lidPoints(x0,x1,y0,H,p,q,upward,n){
  n=n||40; const pts=[]; const fmax=betaMax(p,q);
  for(let i=0;i<=n;i++){
    const s=i/n, x=x0+s*(x1-x0), f=betaF(s,p,q)/fmax;
    pts.push([x, upward? y0-H*f : y0+H*f]);
  }
  return pts;
}
function eyeOutlinePath(cx,cy,w,hUp,hLow,pUp,qUp,pLow,qLow){
  const x0=cx-w/2, x1=cx+w/2, y0=cy;
  const upper=lidPoints(x0,x1,y0,hUp,pUp,qUp,true,44);
  const lower=lidPoints(x0,x1,y0,hLow,pLow,qLow,false,44).slice(1,-1).reverse();
  const all=upper.concat(lower);
  let d="M "+all[0][0].toFixed(2)+","+all[0][1].toFixed(2)+" ";
  for(let i=1;i<all.length;i++) d+="L "+all[i][0].toFixed(2)+","+all[i][1].toFixed(2)+" ";
  return d+"Z";
}
function tickMarks(x0,x1,y0,hUp,pUp,qUp,pAmp,qAmp,nTicks,minLen,maxLen){
  const fmaxCurve=betaMax(pUp,qUp), fmaxAmp=betaMax(pAmp,qAmp);
  const out=[];
  for(let i=0;i<nTicks;i++){
    const s=(i+0.5)/nTicks;
    const x=x0+s*(x1-x0);
    const fc=betaF(s,pUp,qUp)/fmaxCurve;
    const y=y0-hUp*fc;
    const amp=betaF(s,pAmp,qAmp)/fmaxAmp;
    const len=minLen+amp*(maxLen-minLen);
    const ds=0.001, s2=Math.min(0.999,s+ds);
    const fc2=betaF(s2,pUp,qUp)/fmaxCurve;
    const x2=x0+s2*(x1-x0), y2=y0-hUp*fc2;
    let dx=x2-x, dy=y2-y; const norm=Math.hypot(dx,dy)||1;
    let nx=-dy/norm, ny=dx/norm;
    if(ny>0){ nx=-nx; ny=-ny; }
    out.push([x,y,x+nx*len,y+ny*len]);
  }
  return out;
}

const STYLES=[
  ["Naturalna","Łagodne, niemal niezauważalne przejście długości — pasuje do większości kształtów oka.",2.5,3,7,14],
  ["Kocie oko","Rzęsy wydłużają się ku zewnętrznemu kącikowi — optycznie wydłuża i unosi spojrzenie.",4,1.3,5,20],
  ["Wiewiórka","Podobne uniesienie jak kocie oko, ale najdłuższe rzęsy bliżej środka — nie ściąga kącika w dół.",3,1.6,6,19],
  ["Laleczka (Doll eye)","Najdłuższe rzęsy pośrodku, krótsze przy kącikach — optycznie zaokrągla i otwiera oko.",3,3,6,18],
  ["Otwarte oko","Mocne wydłużenie w centralnej części — stosować ostrożnie przy oczach już okrągłych.",5,5,5,19],
];
const EXTRA_STYLE_CHIPS=["Eyeliner","Inny"];
const CURL_OPTIONS=["J","B","C","CC","D","D+","L","L+"];

function buildReferenceIcon(name,caption,pAmp,qAmp,minLen,maxLen){
  const vbW=240,vbH=150, cx=vbW/2, cy=80;
  const outline=eyeOutlinePath(cx,cy,170,34,25,2.2,2.7,2.4,2.4);
  const ticks=tickMarks(cx-85,cx+85,cy,34,2.2,2.7,pAmp,qAmp,13,minLen,maxLen);
  let tickSvg="";
  ticks.forEach(t=>{ tickSvg+=`<line x1="${t[0].toFixed(1)}" y1="${t[1].toFixed(1)}" x2="${t[2].toFixed(1)}" y2="${t[3].toFixed(1)}" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>`; });
  return `<div class="ref-card">
    <svg viewBox="0 0 ${vbW} ${vbH}">
      ${tickSvg}
      <path d="${outline}" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy-2}" r="15" fill="none" stroke="var(--ink)" stroke-width="1.3" opacity=".5"/>
      <circle cx="${cx}" cy="${cy-2}" r="6.3" fill="var(--ink)" opacity=".5"/>
      <text x="${cx-85-12}" y="${cy+5}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)" font-family="Work Sans, sans-serif">W</text>
      <text x="${cx+85+12}" y="${cy+5}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--muted)" font-family="Work Sans, sans-serif">Z</text>
    </svg>
    <div class="rname">${name}</div>
    <div class="rcap">${caption}</div>
  </div>`;
}
document.getElementById("refGrid").innerHTML = STYLES.map(s=>buildReferenceIcon(...s)).join("");

/* ===================== Auth screen ===================== */
const authScreen=document.getElementById("authScreen");
const appRoot=document.getElementById("appRoot");
const formOtp=document.getElementById("formOtp");

function showMsg(el,text,ok){
  el.innerHTML = text ? `<div class="msg ${ok?'ok':'err'}">${text}</div>` : "";
}

/* ===================== Logowanie linkiem z e-maila (magic link, tylko zaproszeni) ===================== */
const otpSendBtn=document.getElementById("otpSendBtn");
const otpEmailInput=document.getElementById("otpEmail");

formOtp.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg=document.getElementById("otpMsg");
  showMsg(msg,"");
  const email=otpEmailInput.value.trim();
  if(!email){ showMsg(msg,"Wpisz adres e-mail."); return; }
  otpSendBtn.disabled=true;
  // shouldCreateUser:false => link wysyłany TYLKO do adresów, które administratorka już dodała
  // w Supabase (Authentication → Users). Dla nieznanego adresu Supabase i tak odpowiada "sukcesem"
  // (żeby nie zdradzać, czy dany e-mail ma konto) — po prostu żaden mail wtedy nie przyjdzie.
  const {error}=await sb.auth.signInWithOtp({ email, options:{ shouldCreateUser:false, emailRedirectTo:window.location.href } });
  otpSendBtn.disabled=false;
  if(error){ showMsg(msg,error.message); return; }
  showMsg(msg,"Jeśli ten adres ma dostęp do aplikacji, wysłaliśmy na niego link logowania — sprawdź skrzynkę (też SPAM).",true);
});

/* ===================== Session handling ===================== */
let currentUser=null;

sb.auth.onAuthStateChange((event,session)=>{
  if(session && session.user){
    currentUser=session.user;
    authScreen.hidden=true;
    appRoot.hidden=false;
    document.getElementById("accountEmail").textContent = currentUser.email;
    boot();
  } else {
    currentUser=null;
    appRoot.hidden=true;
    authScreen.hidden=false;
  }
});

/* ===================== Nav ===================== */
const navClients=document.getElementById("navClients");
const navStyles=document.getElementById("navStyles");
const navSettings=document.getElementById("navSettings");
const mainArea=document.getElementById("mainArea");
const stylesArea=document.getElementById("stylesArea");
const settingsArea=document.getElementById("settingsArea");
function setNav(which){
  [navClients,navStyles,navSettings].forEach(b=>b.classList.remove("active"));
  [mainArea,stylesArea,settingsArea].forEach(a=>a.hidden=true);
  if(which==="clients"){ navClients.classList.add("active"); mainArea.hidden=false; }
  if(which==="styles"){ navStyles.classList.add("active"); stylesArea.hidden=false; }
  if(which==="settings"){ navSettings.classList.add("active"); settingsArea.hidden=false; }
}
navClients.onclick=()=>setNav("clients");
navStyles.onclick=()=>setNav("styles");
navSettings.onclick=()=>setNav("settings");

/* ===================== Status banner ===================== */
const statusBanner=document.getElementById("statusBanner");
function showBanner(text){ if(!text){ statusBanner.hidden=true; return; } statusBanner.textContent=text; statusBanner.hidden=false; }

/* ===================== Boot: load client list ===================== */
let clientsCache=[];
let activeClientId=null;
let booted=false;

async function boot(){
  if(booted) return; booted=true;
  await refreshClients();
}

async function refreshClients(){
  const {data,error} = await sb.from("clients").select("*").order("sort_key",{ascending:true});
  if(error){ showBanner("Nie udało się wczytać klientek: "+error.message); return; }
  clientsCache = data || [];
  renderClientList();
  if(activeClientId){
    const still = clientsCache.find(c=>c.id===activeClientId);
    if(!still){ activeClientId=null; renderClientForm(null); }
  }
}

function initials(first,last){
  const a=(first||"").trim()[0]||"", b=(last||"").trim()[0]||"";
  return (a+b).toUpperCase() || "?";
}
function sortKeyOf(first,last){ return ((last||"").trim()+" "+(first||"").trim()).trim().toLowerCase(); }
function escapeAttr(v){ return String(v==null?"":v).replace(/"/g,"&quot;"); }
function escapeHtml(v){ return String(v==null?"":v).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

function renderEmptyList(msg){ document.getElementById("clientList").innerHTML = `<div class="empty-list">${msg}</div>`; }

function renderClientList(){
  const q=(document.getElementById("searchInput").value||"").trim().toLowerCase();
  const list = clientsCache.filter(c=>{
    if(!q) return true;
    const hay=((c.first_name||"")+" "+(c.last_name||"")+" "+(c.phone||"")).toLowerCase();
    return hay.includes(q);
  });
  if(list.length===0){
    renderEmptyList(clientsCache.length===0 ? "Brak klientek. Dodaj pierwszą przyciskiem powyżej." : "Brak wyników dla tego wyszukiwania.");
    return;
  }
  let html="", lastLetter="";
  list.forEach(c=>{
    const letter=((c.last_name||c.first_name||"?").trim()[0]||"?").toUpperCase();
    if(letter!==lastLetter){ html+=`<div class="letter-head">${letter}</div>`; lastLetter=letter; }
    const lv=c.last_visit||{};
    const sub = lv.date ? ("ost. wizyta: "+lv.date+(lv.style?" · "+lv.style:"")) : "brak wizyt";
    html+=`<button class="client-row${c.id===activeClientId?" active":""}" data-id="${c.id}">
      <span class="avatar">${initials(c.first_name,c.last_name)}</span>
      <span class="meta"><div class="name">${(c.first_name||"")+" "+(c.last_name||"")}</div><div class="sub">${sub}</div></span>
    </button>`;
  });
  const el=document.getElementById("clientList");
  el.innerHTML=html;
  el.querySelectorAll(".client-row").forEach(btn=>{ btn.onclick=()=>openClient(btn.getAttribute("data-id")); });
}
document.getElementById("searchInput").addEventListener("input", renderClientList);

const detailRoot=document.getElementById("clientDetailRoot");

function openClient(id){
  activeClientId=id;
  document.getElementById("mainArea").classList.add("show-detail");
  renderClientList();
  const c=clientsCache.find(x=>x.id===id);
  renderClientForm(c||null);
}
function openNewClient(){
  activeClientId=null;
  document.getElementById("mainArea").classList.add("show-detail");
  renderClientList();
  renderClientForm(null);
}
document.getElementById("btnNewClient").onclick=openNewClient;
document.getElementById("btnNewClient2").onclick=openNewClient;
function closeDetail(){ document.getElementById("mainArea").classList.remove("show-detail"); }

/* ===================== Canvas drawing state ===================== */
let strokes=[], currentStroke=null, brushColor="#2A2320", brushSize=4, showPrevMap=false, prevImg=null;

function renderClientForm(client){
  const isNew=!client;
  const lv=(client && client.last_visit) || {};
  detailRoot.innerHTML = `
    <button class="back-btn" id="backBtn">‹ Wszystkie klientki</button>
    <div class="card">
      <h2>${isNew?"Nowa klientka":"Dane klientki"}</h2>
      <div class="field-row">
        <div class="field"><label>Imię</label><input id="fFirst" value="${client?escapeAttr(client.first_name):""}" placeholder="np. Kasia"></div>
        <div class="field"><label>Nazwisko</label><input id="fLast" value="${client?escapeAttr(client.last_name):""}" placeholder="np. Nowak"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Telefon</label><input id="fPhone" value="${client?escapeAttr(client.phone):""}" placeholder="np. 600 000 000"></div>
        <div class="field"><label>Kształt oka</label><input id="fEyeShape" value="${escapeAttr(lv.eyeShape||"")}" placeholder="np. migdałowe"></div>
      </div>
    </div>
    <div class="card">
      <h2>Mapka i szczegóły stylizacji</h2>
      <div class="chip-row" id="styleChips"></div>
      <input id="fCustomStyle" hidden placeholder="Wpisz swój efekt…">
      <div class="field-row">
        <div class="field"><label>Grubość</label><input id="fThickness" value="${escapeAttr(lv.thickness||"")}" placeholder="np. 0.07 mm"></div>
        <div class="field"><label>Skręt</label><select id="fCurl"><option value="">—</option>${CURL_OPTIONS.map(o=>`<option value="${o}" ${lv.curl===o?"selected":""}>${o}</option>`).join("")}</select></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Długość</label><input id="fLength" value="${escapeAttr(lv.length||"")}" placeholder="np. 8–13 mm"></div>
        <div class="field"><label>Kolor</label><input id="fColor" value="${escapeAttr(lv.color||"")}" placeholder="np. czarny"></div>
      </div>
      <div class="canvas-wrap">
        <div class="canvas-toolbar">
          <div class="swatch-row" id="swatchRow"></div>
          <input type="range" id="brushSize" min="1" max="10" value="${brushSize}">
          <button class="btn subtle small" id="btnUndo">Cofnij</button>
          <button class="btn subtle small" id="btnClear">Wyczyść</button>
        </div>
        <canvas id="mapCanvas" width="640" height="360"></canvas>
        ${lv.mapImagePath ? `<div class="toggle-row"><input type="checkbox" id="chkPrevMap"><label for="chkPrevMap">Pokaż poprzednią mapkę jako podkład</label></div>` : ""}
      </div>
      <div class="field" style="margin-top:12px;">
        <label>Uwagi</label>
        <textarea id="fNotes" placeholder="np. reaguje na klej, prosi o mocniejszy efekt na zewnętrznym kąciku…">${client?escapeHtml(lv.notes||""):""}</textarea>
      </div>
      <div class="actions-row">
        ${!isNew?`<button class="btn subtle" id="btnDelete">Usuń klientkę</button>`:""}
        <button class="btn" id="btnSave">${isNew?"Dodaj klientkę":"Zapisz wizytę"}</button>
      </div>
    </div>
    ${!isNew?`<div class="card" id="historyCard"><h2>Historia wizyt</h2><div id="historyList">Wczytywanie…</div></div>`:""}
  `;

  document.getElementById("backBtn").onclick=closeDetail;

  const chipRow=document.getElementById("styleChips");
  const customInput=document.getElementById("fCustomStyle");
  const styleNames=STYLES.map(s=>s[0]).concat(EXTRA_STYLE_CHIPS);
  const knownStyle = styleNames.includes(lv.style) ? lv.style : (lv.style ? "Inny" : "");
  let selectedStyle=knownStyle;
  if(selectedStyle==="Inny") customInput.value=lv.style||"";
  customInput.hidden = selectedStyle!=="Inny";
  chipRow.innerHTML = styleNames.map(n=>`<span class="chip${n===selectedStyle?" selected":""}" data-n="${n}">${n}</span>`).join("");
  chipRow.querySelectorAll(".chip").forEach(ch=>{
    ch.onclick=()=>{
      const n=ch.getAttribute("data-n");
      selectedStyle=(selectedStyle===n)?"":n;
      chipRow.querySelectorAll(".chip").forEach(c2=>c2.classList.toggle("selected",c2.getAttribute("data-n")===selectedStyle));
      customInput.hidden = selectedStyle!=="Inny";
      if(selectedStyle==="Inny") customInput.focus();
    };
  });

  strokes=[]; currentStroke=null; prevImg=null; showPrevMap=false;
  const canvas=document.getElementById("mapCanvas");
  const ctx=canvas.getContext("2d");

  const swatches=["#2A2320","#9C4F61","#8A7B73","#5C7A5E","#B8793A"];
  const swatchRow=document.getElementById("swatchRow");
  swatchRow.innerHTML=swatches.map((c,i)=>`<span class="swatch${i===0?" selected":""}" style="background:${c}" data-c="${c}"></span>`).join("");
  brushColor=swatches[0];
  swatchRow.querySelectorAll(".swatch").forEach(sw=>{
    sw.onclick=()=>{ brushColor=sw.getAttribute("data-c"); swatchRow.querySelectorAll(".swatch").forEach(s2=>s2.classList.remove("selected")); sw.classList.add("selected"); };
  });
  document.getElementById("brushSize").oninput=(e)=>{ brushSize=+e.target.value; };

  if(lv.mapImagePath){
    const chk=document.getElementById("chkPrevMap");
    if(chk){
      chk.onchange=async ()=>{
        showPrevMap=chk.checked;
        if(showPrevMap && !prevImg){
          const {data,error}=await sb.storage.from("lash-maps").createSignedUrl(lv.mapImagePath,3600);
          if(error || !data){ showPrevMap=false; chk.checked=false; return; }
          const img=new Image();
          img.crossOrigin="anonymous";
          img.onload=()=>{ prevImg=img; redrawCanvas(ctx,canvas); };
          img.onerror=()=>{ showPrevMap=false; chk.checked=false; };
          img.src=data.signedUrl;
        } else {
          redrawCanvas(ctx,canvas);
        }
      };
    }
  }

  function getPos(evt){
    const rect=canvas.getBoundingClientRect();
    const scaleX=canvas.width/rect.width, scaleY=canvas.height/rect.height;
    const cx=(evt.touches?evt.touches[0].clientX:evt.clientX)-rect.left;
    const cy=(evt.touches?evt.touches[0].clientY:evt.clientY)-rect.top;
    return [cx*scaleX, cy*scaleY];
  }
  function startStroke(evt){ evt.preventDefault(); currentStroke={color:brushColor,size:brushSize,pts:[getPos(evt)]}; }
  function moveStroke(evt){ if(!currentStroke) return; evt.preventDefault(); currentStroke.pts.push(getPos(evt)); redrawCanvas(ctx,canvas); }
  function endStroke(){ if(currentStroke && currentStroke.pts.length>1){ strokes.push(currentStroke); } currentStroke=null; }
  canvas.addEventListener("pointerdown",startStroke);
  canvas.addEventListener("pointermove",moveStroke);
  window.addEventListener("pointerup",endStroke);
  document.getElementById("btnUndo").onclick=()=>{ strokes.pop(); redrawCanvas(ctx,canvas); };
  document.getElementById("btnClear").onclick=()=>{ strokes=[]; redrawCanvas(ctx,canvas); };
  redrawCanvas(ctx,canvas);

  if(!isNew) loadHistory(client.id);

  document.getElementById("btnSave").onclick=()=>saveClient({
    isNew, client,
    first: document.getElementById("fFirst").value.trim(),
    last: document.getElementById("fLast").value.trim(),
    phone: document.getElementById("fPhone").value.trim(),
    eyeShape: document.getElementById("fEyeShape").value.trim(),
    thickness: document.getElementById("fThickness").value.trim(),
    curl: document.getElementById("fCurl").value,
    length: document.getElementById("fLength").value.trim(),
    color: document.getElementById("fColor").value.trim(),
    notes: document.getElementById("fNotes").value.trim(),
    getStyle: ()=> selectedStyle==="Inny" ? (document.getElementById("fCustomStyle").value.trim()||"Inny") : selectedStyle,
    canvas,
  });

  if(!isNew){
    const delBtn=document.getElementById("btnDelete");
    if(delBtn) delBtn.onclick=()=>deleteClient(client.id);
  }
}

function redrawCanvas(ctx,canvas){
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const styles=getComputedStyle(document.documentElement);
  ctx.fillStyle=styles.getPropertyValue("--surface").trim()||"#fff";
  ctx.fillRect(0,0,w,h);
  if(showPrevMap && prevImg){ ctx.globalAlpha=0.28; ctx.drawImage(prevImg,0,0,w,h); ctx.globalAlpha=1; }
  const cx=w/2, cy=h*0.56;
  const outline=eyeOutlinePath(cx,cy,w*0.72,h*0.26,h*0.19,2.2,2.7,2.4,2.4);
  const p=new Path2D(outline);
  ctx.strokeStyle=(styles.getPropertyValue("--muted").trim()||"#8A7B73");
  ctx.globalAlpha=0.55; ctx.lineWidth=2; ctx.stroke(p);
  ctx.beginPath(); ctx.ellipse(cx,cy-h*0.03,h*0.11,h*0.11,0,0,7); ctx.stroke();
  ctx.globalAlpha=1;
  const halfW=(w*0.72)/2;
  ctx.font="700 14px 'Work Sans', sans-serif";
  ctx.fillStyle=styles.getPropertyValue("--muted").trim()||"#8A7B73";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText("W", cx-halfW-16, cy);
  ctx.fillText("Z", cx+halfW+16, cy);
  const all=currentStroke?strokes.concat([currentStroke]):strokes;
  all.forEach(s=>{
    if(s.pts.length<2) return;
    ctx.beginPath(); ctx.moveTo(s.pts[0][0],s.pts[0][1]);
    for(let i=1;i<s.pts.length;i++) ctx.lineTo(s.pts[i][0],s.pts[i][1]);
    ctx.strokeStyle=s.color; ctx.lineWidth=s.size; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.globalAlpha=1; ctx.stroke();
  });
}

/* ===================== Save / delete ===================== */
async function saveClient(payload){
  const saveBtn=document.getElementById("btnSave");
  saveBtn.disabled=true;
  const original=saveBtn.textContent;
  saveBtn.textContent="Zapisywanie…";
  try{
    const todayISO=new Date().toISOString().slice(0,10);

    let clientId = payload.client ? payload.client.id : null;
    if(payload.isNew){
      const {data,error}=await sb.from("clients").insert({
        user_id: currentUser.id,
        first_name: payload.first, last_name: payload.last, phone: payload.phone,
        sort_key: sortKeyOf(payload.first,payload.last),
      }).select().single();
      if(error) throw error;
      clientId=data.id;
    }

    let mapImagePath=null;
    if(strokes.length>0){
      const blob=await new Promise(res=>payload.canvas.toBlob(res,"image/png"));
      if(blob){
        const path=`${currentUser.id}/${clientId}/${Date.now()}.png`;
        const {error:upErr}=await sb.storage.from("lash-maps").upload(path, blob, {contentType:"image/png"});
        if(!upErr) mapImagePath=path;
      }
    } else if(payload.client && payload.client.last_visit){
      mapImagePath = payload.client.last_visit.mapImagePath || null;
    }

    const visit={
      date: todayISO, style: payload.getStyle(), eyeShape: payload.eyeShape,
      thickness: payload.thickness, curl: payload.curl, length: payload.length,
      color: payload.color, notes: payload.notes, mapImagePath,
    };

    const {error:updErr}=await sb.from("clients").update({
      first_name: payload.first, last_name: payload.last, phone: payload.phone,
      sort_key: sortKeyOf(payload.first,payload.last),
      last_visit: visit,
    }).eq("id", clientId);
    if(updErr) throw updErr;

    const {error:visitErr}=await sb.from("visits").insert({
      client_id: clientId, user_id: currentUser.id,
      visit_date: todayISO, style: visit.style, eye_shape: visit.eyeShape,
      thickness: visit.thickness, curl: visit.curl, length: visit.length,
      color: visit.color, notes: visit.notes, map_image_path: mapImagePath,
    });
    if(visitErr) throw visitErr;

    await refreshClients();
    openClient(clientId);
  }catch(err){
    showBanner("Nie udało się zapisać: "+(err&&err.message||"spróbuj ponownie."));
  }finally{
    saveBtn.disabled=false;
    saveBtn.textContent=original;
  }
}

async function deleteClient(id){
  const btn=document.getElementById("btnDelete");
  if(btn.textContent!=="Na pewno usunąć?"){
    btn.textContent="Na pewno usunąć?";
    setTimeout(()=>{ if(btn && btn.isConnected) btn.textContent="Usuń klientkę"; },3000);
    return;
  }
  try{
    const {error}=await sb.from("clients").delete().eq("id",id);
    if(error) throw error;
    activeClientId=null;
    closeDetail();
    await refreshClients();
    renderClientForm(null);
  }catch(err){
    showBanner("Nie udało się usunąć: "+(err&&err.message||"spróbuj ponownie."));
  }
}

async function loadHistory(clientId){
  const list=document.getElementById("historyList");
  const {data,error}=await sb.from("visits").select("*").eq("client_id",clientId).order("created_at",{ascending:false}).limit(20);
  if(!list) return;
  if(error){ list.innerHTML='<p style="font-size:13px;color:var(--muted);">Nie udało się wczytać historii.</p>'; return; }
  if(!data || data.length===0){ list.innerHTML='<p style="font-size:13px;color:var(--muted);">Brak zapisanych wizyt.</p>'; return; }

  const rows=await Promise.all(data.map(async v=>{
    let imgSrc=null;
    if(v.map_image_path){
      const {data:signed}=await sb.storage.from("lash-maps").createSignedUrl(v.map_image_path,3600);
      if(signed) imgSrc=signed.signedUrl;
    }
    const img = imgSrc ? `<img class="history-thumb" src="${imgSrc}" alt="mapka">` : `<div class="history-thumb"></div>`;
    const details=[v.style,v.thickness,v.curl,v.length,v.color].filter(Boolean).join(" · ");
    return `<div class="history-item">${img}<div class="history-meta"><div class="history-date">${v.visit_date||""}</div><div>${details||"—"}</div>${v.notes?`<div>${escapeHtml(v.notes)}</div>`:""}</div></div>`;
  }));
  list.innerHTML=rows.join("");
}

/* ===================== Settings / RODO ===================== */
document.getElementById("btnLogout").onclick=async ()=>{ await sb.auth.signOut(); };

document.getElementById("btnExport").onclick=async ()=>{
  const msg=document.getElementById("settingsMsg");
  showMsg(msg,"Przygotowuję plik…",true);
  try{
    const {data:clients,error:e1}=await sb.from("clients").select("*");
    if(e1) throw e1;
    const {data:visits,error:e2}=await sb.from("visits").select("*");
    if(e2) throw e2;
    const payload={
      exported_at: new Date().toISOString(),
      account_email: currentUser.email,
      clients: clients||[],
      visits: visits||[],
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="mapownik-moje-dane.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showMsg(msg,"Plik pobrany.",true);
  }catch(err){
    showMsg(msg,"Nie udało się przygotować eksportu: "+(err&&err.message||""));
  }
};

document.getElementById("btnWipe").onclick=async ()=>{
  const btn=document.getElementById("btnWipe");
  const msg=document.getElementById("settingsMsg");
  if(btn.textContent!=="Na pewno? Kliknij ponownie"){
    btn.textContent="Na pewno? Kliknij ponownie";
    setTimeout(()=>{ if(btn.isConnected) btn.textContent="Usuń dane"; },4000);
    return;
  }
  btn.disabled=true;
  showMsg(msg,"Usuwanie danych…",true);
  try{
    // usuń pliki mapek z Storage
    const {data:folders}=await sb.storage.from("lash-maps").list(currentUser.id);
    if(folders && folders.length){
      for(const folder of folders){
        const {data:files}=await sb.storage.from("lash-maps").list(`${currentUser.id}/${folder.name}`);
        if(files && files.length){
          const paths=files.map(f=>`${currentUser.id}/${folder.name}/${f.name}`);
          await sb.storage.from("lash-maps").remove(paths);
        }
      }
    }
    // usuń klientki (wizyty kasują się kaskadowo)
    const {error}=await sb.from("clients").delete().neq("id","00000000-0000-0000-0000-000000000000");
    if(error) throw error;
    await refreshClients();
    activeClientId=null; closeDetail(); renderClientForm(null);
    showMsg(msg,"Wszystkie dane klientek zostały usunięte.",true);
  }catch(err){
    showMsg(msg,"Nie udało się usunąć wszystkich danych: "+(err&&err.message||""));
  }finally{
    btn.disabled=false;
    btn.textContent="Usuń dane";
  }
};

document.getElementById("btnCloseAccount").onclick=()=>{
  const msg=document.getElementById("settingsMsg");
  showMsg(msg, `Aby trwale zamknąć konto (usunięcie loginu), napisz na ${escapeHtml(SUPPORT_EMAIL)} z adresu powiązanego z kontem — usuniemy je w ciągu 30 dni zgodnie z regulaminem.`, true);
};

})();
