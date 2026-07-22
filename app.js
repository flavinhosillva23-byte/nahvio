const cfg=window.WEDDING_CONFIG||{};
const $=id=>document.getElementById(id);
if(!cfg.supabaseUrl||cfg.supabaseUrl.includes("COLE_AQUI")||!cfg.supabaseAnonKey||cfg.supabaseAnonKey.includes("COLE_AQUI")){
  $("setupError").classList.remove("hidden"); throw new Error("Supabase não configurado");
}
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const state={settings:null,guests:[],tables:[],finance:[],gifts:[],tasks:[],edit:null,channel:null};
const n=v=>Number(v||0);
const money=v=>n(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const dateBR=v=>v?new Date(v+"T12:00:00").toLocaleDateString("pt-BR"):"";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const people=g=>n(g.adults)+n(g.children_0_8)+n(g.children_9_12);
const weight=g=>n(g.adults)*n(state.settings.adultWeight)+n(g.children_0_8)*n(state.settings.child08Weight)+n(g.children_9_12)*n(state.settings.child912Weight);
const seats=g=>(state.settings.adultSeat?n(g.adults):0)+(state.settings.child08Seat?n(g.children_0_8):0)+(state.settings.child912Seat?n(g.children_9_12):0);
function toast(text){$("toast").textContent=text;$("toast").classList.remove("hidden");clearTimeout(toast.t);toast.t=setTimeout(()=>$("toast").classList.add("hidden"),2800)}
function notice(t){$("authNotice").textContent=t;$("authNotice").classList.remove("hidden")}
function badge(s){return `<span class="badge ${s==="Confirmado"||s==="Pago"?"ok":s==="Recusado"||s==="Atrasado"?"no":s==="Pendente"?"wait":"neutral"}">${esc(s)}</span>`}
async function auth(){const {data:{session}}=await db.auth.getSession();session?showApp():$("authScreen").classList.remove("hidden")}
$("loginBtn").onclick=async()=>{const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});error?notice(error.message):showApp()};
$("signupBtn").onclick=async()=>{const {error}=await db.auth.signUp({email:$("email").value.trim(),password:$("password").value});notice(error?error.message:"Conta criada. Confira seu e-mail se for solicitado.")};
$("logoutBtn").onclick=async()=>{await db.auth.signOut();location.reload()};
$("refreshBtn").onclick=()=>loadAll(true);
async function showApp(){$("authScreen").classList.add("hidden");$("app").classList.remove("hidden");await loadAll();subscribe()}
async function loadAll(manual=false){
  $("syncText").textContent="Atualizando...";
  const [s,g,t,f,p,c]=await Promise.all([
    db.from("settings").select("*").eq("key","general").single(),
    db.from("guests").select("*").order("name"),
    db.from("wedding_tables").select("*").order("name"),
    db.from("finance").select("*").order("created_at",{ascending:false}),
    db.from("gifts").select("*").order("created_at",{ascending:false}),
    db.from("tasks").select("*").order("due_date",{ascending:true})
  ]);
  if(s.error){alert("Erro ao carregar configurações: "+s.error.message);return}
  state.settings=s.data.value;state.guests=g.data||[];state.tables=t.data||[];state.finance=f.data||[];state.gifts=p.data||[];state.tasks=c.data||[];
  render();$("syncText").textContent="Sincronizado";if(manual)toast("Dados atualizados.");
}
function subscribe(){
  if(state.channel) return;
  state.channel=db.channel("planner").on("postgres_changes",{event:"*",schema:"public"},()=>loadAll()).subscribe();
}
const pages=[["dashboard","⌂","Dashboard"],["guests","♟","Convidados"],["tables","◉","Mesas"],["finance","R$","Financeiro"],["gifts","◇","Presentes"],["tasks","✓","Checklist"],["settings","⚙","Configurações"]];
function render(){
  $("nav").innerHTML=pages.map((p,i)=>`<button class="${i===0?"active":""}" data-page="${p[0]}">${p[1]} ${p[2]}</button>`).join("");
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>openPage(b.dataset.page,b.textContent.replace(/^[^\s]+\s/,"")));
  renderBrand();renderDashboard();renderGuests();renderTables();renderFinance();renderGifts();renderTasks();renderSettings();
}
function openPage(id,title){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(id).classList.add("active");document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));$("pageTitle").textContent=title;$("sidebar").classList.remove("open");window.scrollTo(0,0)}
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
function renderBrand(){const s=state.settings;$("brandTitle").textContent=s.appTitle;$("brandCouple").textContent=s.coupleNames;$("heroCouple").textContent=s.coupleNames;$("heroSubtitle").textContent=s.subtitle;$("brandDate").textContent=dateBR(s.weddingDate)+" • "+s.weddingTime;$("weddingLabel").textContent=new Date(s.weddingDate+"T"+s.weddingTime).toLocaleString("pt-BR",{dateStyle:"long",timeStyle:"short"})}
function tick(){
  if(!state.settings)return;
  const wedding=new Date(state.settings.weddingDate+"T"+state.settings.weddingTime+":00-03:00");
  let x=Math.max(0,wedding-Date.now());
  const d=Math.floor(x/86400000);x%=86400000;
  const h=Math.floor(x/3600000);x%=3600000;
  const m=Math.floor(x/60000);
  const s=Math.floor((x%60000)/1000);
  $("days").textContent=d;$("daysBig").textContent=d;
  $("hours").textContent=String(h).padStart(2,"0");
  $("minutes").textContent=String(m).padStart(2,"0");
  $("seconds").textContent=String(s).padStart(2,"0");
  const start=new Date("2024-01-28T00:00:00-03:00");
  const total=Math.max(1,wedding-start);
  const elapsed=Math.max(0,Math.min(total,Date.now()-start));
  const pct=Math.round(elapsed/total*100);
  $("journeyPercent").textContent=pct+"% concluído";
  $("journeyBar").style.width=pct+"%";
  const heart=$(".journey-bar i"); if(heart) heart.style.left=`calc(${pct}% - 8px)`;
}
setInterval(tick,1000);
function renderDashboard(){
  const gs=state.guests;
  const conf=gs.filter(g=>g.rsvp_status==="Confirmado");
  const pend=gs.filter(g=>g.rsvp_status==="Pendente");
  const ref=gs.filter(g=>g.rsvp_status==="Recusado");
  const p=gs.reduce((a,g)=>a+people(g),0);
  const w=gs.reduce((a,g)=>a+weight(g),0);
  const st=conf.reduce((a,g)=>a+seats(g),0);
  const nt=conf.filter(g=>!g.table_name).reduce((a,g)=>a+seats(g),0);

  $("kPeople").textContent=p;
  $("kConfirmed").textContent=conf.reduce((a,g)=>a+people(g),0)+" confirmadas";
  $("kWeight").textContent=w.toLocaleString("pt-BR");
  $("kLimit").textContent="de "+state.settings.guestLimit;
  $("kSeats").textContent=st;
  $("kNoTable").textContent="Sem mesa: "+nt;

  const planned=state.finance.reduce((a,x)=>a+n(x.planned),0);
  const paid=state.finance.reduce((a,x)=>a+n(x.paid),0);
  const remaining=Math.max(0,planned-paid);
  $("kBalance").textContent=money(remaining);
  $("kPaid").textContent=money(paid)+" pagos";

  const pct=gs.length?Math.round(conf.length/gs.length*100):0;
  $("confirmTitle").textContent=pct+"% das famílias confirmadas";
  $("confirmChip").textContent=gs.length+" famílias";
  $("confirmBar").style.width=pct+"%";
  $("confirmDetails").textContent=`${conf.length} confirmadas, ${pend.length} pendentes e ${ref.length} recusadas.`;
  $("confirmDonutValue").textContent=pct+"%";
  $("confirmDonut").style.background=`conic-gradient(#13804f 0 ${pct}%, #f6be3e ${pct}% ${pct+(gs.length?Math.round(pend.length/gs.length*100):0)}%, #f04e78 0)`;
  $("confirmLegend").innerHTML=`
    <div><i class="dot green-dot"></i><span>Confirmadas</span><strong>${conf.length} famílias</strong></div>
    <div><i class="dot yellow-dot"></i><span>Pendentes</span><strong>${pend.length} famílias</strong></div>
    <div><i class="dot pink-dot"></i><span>Recusadas</span><strong>${ref.length} famílias</strong></div>`;

  const adults=gs.reduce((a,g)=>a+n(g.adults),0);
  const c08=gs.reduce((a,g)=>a+n(g.children_0_8),0);
  const c912=gs.reduce((a,g)=>a+n(g.children_9_12),0);
  $("categorySummary").textContent=`${adults} adultos, ${c08} crianças de 0 a 8 e ${c912} crianças de 9 a 12.`;
  $("categoryBreakdown").innerHTML=`
    <div><span><i class="mini-ico teal">●</i> Adultos</span><strong>${adults}</strong></div>
    <div><span><i class="mini-ico orange">●</i> Crianças 0 a 8 anos</span><strong>${c08}</strong></div>
    <div><span><i class="mini-ico purple">●</i> Crianças 9 a 12 anos</span><strong>${c912}</strong></div>
    <div><span><i class="mini-ico violet">⚖</i> Total equivalente</span><strong>${w.toLocaleString("pt-BR")}</strong></div>`;

  const cap=state.tables.reduce((a,t)=>a+n(t.capacity),0);
  const usedTables=state.tables.filter(t=>tableUsage(t)>0).length;
  $("tableSummary").textContent=`${state.tables.length} mesas, ${cap} lugares e ${cap-st} lugares disponíveis considerando apenas confirmados.`;
  $("tableBreakdown").innerHTML=`
    <div><span><i class="mini-ico green">♟</i> Mesas cadastradas</span><strong>${state.tables.length}</strong></div>
    <div><span><i class="mini-ico teal">♟</i> Mesas utilizadas</span><strong>${usedTables}</strong></div>
    <div><span><i class="mini-ico orange">●</i> Lugares ocupados</span><strong>${st}</strong></div>
    <div><span><i class="mini-ico purple">●</i> Lugares disponíveis</span><strong>${Math.max(0,cap-st)}</strong></div>`;

  const today=new Date().toISOString().slice(0,10);
  const done=state.tasks.filter(t=>t.completed).length;
  const late=state.tasks.filter(t=>!t.completed&&t.due_date&&t.due_date<today);
  const open=state.tasks.filter(t=>!t.completed&&!late.includes(t));
  const tp=state.tasks.length?Math.round(done/state.tasks.length*100):0;
  $("taskBar").style.width=tp+"%";
  $("taskSummary").textContent=`${done} de ${state.tasks.length} tarefas concluídas.`;
  $("taskDonutValue").textContent=tp+"%";
  $("taskDonut").style.background=`conic-gradient(#168a63 0 ${tp}%, #f6be3e ${tp}% ${Math.min(100,tp+(state.tasks.length?Math.round(open.length/state.tasks.length*100):0))}%, #f04e78 0)`;
  $("taskLegend").innerHTML=`
    <div><i class="dot green-dot"></i><span>Concluídas</span><strong>${done}</strong></div>
    <div><i class="dot yellow-dot"></i><span>Pendentes</span><strong>${open.length}</strong></div>
    <div><i class="dot pink-dot"></i><span>Atrasadas</span><strong>${late.length}</strong></div>
    <small>${state.tasks.length} tarefas no total</small>`;

  const nextTasks=state.tasks.filter(t=>!t.completed).sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999")).slice(0,3);
  $("nextTasksList").innerHTML=nextTasks.length?nextTasks.map(t=>`<div><span>○ ${esc(t.title)}</span><strong>${t.due_date?dateBR(t.due_date):"Sem data"}</strong></div>`).join(""):`<p class="empty-note">Nenhuma tarefa pendente.</p>`;

  const dueSoon=state.finance.filter(x=>n(x.paid)<n(x.planned)).sort((a,b)=>(a.due_date||"9999").localeCompare(b.due_date||"9999")).slice(0,3);
  $("nextPaymentsList").innerHTML=dueSoon.length?dueSoon.map(x=>`<div><span>${esc(x.description)}</span><small>${x.due_date?dateBR(x.due_date):"Sem data"}</small><strong>${money(n(x.planned)-n(x.paid))}</strong></div>`).join(""):`<p class="empty-note">Nenhum pagamento pendente.</p>`;

  const latest=[...conf].sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||""))).slice(0,3);
  $("latestConfirmationsList").innerHTML=latest.length?latest.map(g=>`<div><span>✓ ${esc(g.name)}</span><strong>${g.updated_at?new Date(g.updated_at).toLocaleDateString("pt-BR"):"Confirmado"}</strong></div>`).join(""):`<p class="empty-note">Nenhuma confirmação ainda.</p>`;

  const paidPct=planned?Math.round(paid/planned*100):0;
  $("financeDonut").style.background=`conic-gradient(#8b60e8 0 ${paidPct}%, #f05a83 ${paidPct}% 100%)`;
  $("financeLegend").innerHTML=`
    <div><i class="dot violet-dot"></i><span>Previsto</span><strong>${money(planned)}</strong></div>
    <div><i class="dot green-dot"></i><span>Pago</span><strong>${money(paid)}</strong></div>
    <div><i class="dot pink-dot"></i><span>Restante</span><strong>${money(remaining)}</strong></div>
    <small>Total previsto ${money(planned)}</small>`;

  const alerts=[];
  if(nt)alerts.push(`<div class="alert-item"><span>${nt} assentos confirmados ainda estão sem mesa.</span><strong>Organizar mesas</strong></div>`);
  if(late.length)alerts.push(`<div class="alert-item late"><span>${late.length} tarefa(s) atrasada(s).</span><strong>Revisar checklist</strong></div>`);
  dueSoon.slice(0,2).forEach(x=>alerts.push(`<div class="alert-item"><span>${esc(x.description)} ${x.due_date?"vence em "+dateBR(x.due_date):"está pendente"}.</span><strong>${money(n(x.planned)-n(x.paid))}</strong></div>`));
  if(!alerts.length)alerts.push(`<div class="alert-item"><span>Tudo em ordem por aqui.</span><strong>Sem pendências urgentes</strong></div>`);
  $("dashboardAlerts").innerHTML=alerts.join("");
  tick();
}
function guestFiltered(){
  const q=$("guestSearch").value.toLowerCase(),side=$("guestSideFilter").value,status=$("guestStatusFilter").value,inv=$("guestInviteFilter").value;
  return state.guests.filter(g=>(g.name+" "+g.side).toLowerCase().includes(q)&&(!side||g.side===side)&&(!status||g.rsvp_status===status)&&(!inv||g.invitation_status===inv));
}
function renderGuests(){
  const rows=guestFiltered();$("guestSummary").innerHTML=`<span class="summary-pill">Famílias <strong>${rows.length}</strong></span><span class="summary-pill">Pessoas <strong>${rows.reduce((a,g)=>a+people(g),0)}</strong></span><span class="summary-pill">Equivalente <strong>${rows.reduce((a,g)=>a+weight(g),0).toLocaleString("pt-BR")}</strong></span>`;
  $("guestRows").innerHTML=rows.map(g=>`<tr><td><strong>${esc(g.name)}</strong></td><td>${esc(g.side)}</td><td>${g.adults}</td><td>${g.children_0_8}</td><td>${g.children_9_12}</td><td>${weight(g).toLocaleString("pt-BR")}</td><td>${seats(g)}</td><td>${esc(g.invitation_status)}</td><td>${badge(g.rsvp_status)}</td><td>${esc(g.table_name||"Sem mesa")}</td><td><button class="secondary" onclick="guestModal('${g.id}')">Editar</button> <button class="danger" onclick="removeRow('guests','${g.id}')">Excluir</button></td></tr>`).join("")||`<tr><td colspan="11">Nenhum convidado encontrado.</td></tr>`;
}
["guestSearch","guestSideFilter","guestStatusFilter","guestInviteFilter"].forEach(id=>$(id).oninput=renderGuests);
$("addGuestBtn").onclick=()=>guestModal();
function modal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
$("closeModal").onclick=()=>$("modal").classList.add("hidden");$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.add("hidden")};
window.guestModal=id=>{const g=state.guests.find(x=>x.id===id)||{name:"",side:"Flávio",adults:1,children_0_8:0,children_9_12:0,invitation_status:"Não enviado",rsvp_status:"Pendente",table_name:"",notes:""};state.edit=id;modal(id?"Editar convidado":"Novo convidado",`<div class="form"><label class="full">Nome ou família<input id="gName" value="${esc(g.name)}"></label><label>Lado<select id="gSide">${["Flávio","Nathália","Ambos"].map(x=>`<option ${x===g.side?"selected":""}>${x}</option>`)}</select></label><label>Adultos<input id="gAdults" type="number" min="0" value="${g.adults}"></label><label>0 a 8<input id="g08" type="number" min="0" value="${g.children_0_8}"></label><label>9 a 12<input id="g912" type="number" min="0" value="${g.children_9_12}"></label><label>Convite<select id="gInv">${["Não enviado","Enviado"].map(x=>`<option ${x===g.invitation_status?"selected":""}>${x}</option>`)}</select></label><label>Confirmação<select id="gRsvp">${["Pendente","Confirmado","Recusado"].map(x=>`<option ${x===g.rsvp_status?"selected":""}>${x}</option>`)}</select></label><label>Mesa<select id="gTable"><option value="">Sem mesa</option>${state.tables.map(t=>`<option ${t.name===g.table_name?"selected":""}>${esc(t.name)}</option>`)}</select></label><label class="full">Observações<textarea id="gNotes">${esc(g.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveGuest()">Salvar</button></div>`)};
window.saveGuest=async()=>{if(!$("gName").value.trim())return toast("Informe o nome ou família.");const obj={name:$("gName").value.trim(),side:$("gSide").value,adults:+$("gAdults").value,children_0_8:+$("g08").value,children_9_12:+$("g912").value,invitation_status:$("gInv").value,rsvp_status:$("gRsvp").value,table_name:$("gTable").value||null,notes:$("gNotes").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("guests").update(obj).eq("id",state.edit):await db.from("guests").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Convidado salvo.")}};
function tableUsage(t){return state.guests.filter(g=>g.rsvp_status==="Confirmado"&&g.table_name===t.name).reduce((a,g)=>a+seats(g),0)}
function renderTables(){
  $("tableCards").innerHTML=state.tables.map(t=>{const o=tableUsage(t),pct=t.capacity?Math.min(100,Math.round(o/t.capacity*100)):0;return `<article class="table-card"><h4>${esc(t.name)}</h4><div><strong>${o}</strong> de ${t.capacity} lugares</div><div class="mini-bar"><span style="width:${pct}%"></span></div><small>${o>t.capacity?"Lotação excedida":t.capacity-o+" disponíveis"}</small></article>`}).join("")||`<p class="muted">Nenhuma mesa cadastrada.</p>`;
  $("tableRows").innerHTML=state.tables.map(t=>{const o=tableUsage(t),d=n(t.capacity)-o,s=o>t.capacity?"Lotada":o===t.capacity?"Completa":"Disponível";return `<tr><td>${esc(t.name)}</td><td>${t.capacity}</td><td>${o}</td><td>${d}</td><td>${badge(s)}</td><td><button class="secondary" onclick="tableModal('${t.id}')">Editar</button> <button class="danger" onclick="removeRow('wedding_tables','${t.id}')">Excluir</button></td></tr>`}).join("")||`<tr><td colspan="6">Nenhuma mesa.</td></tr>`;
}
$("addTableBtn").onclick=()=>tableModal();window.tableModal=id=>{const t=state.tables.find(x=>x.id===id)||{name:"Mesa "+(state.tables.length+1),capacity:state.settings.defaultTableCapacity};state.edit=id;modal(id?"Editar mesa":"Nova mesa",`<div class="form"><label>Nome<input id="tName" value="${esc(t.name)}"></label><label>Capacidade<input id="tCap" type="number" min="1" value="${t.capacity}"></label></div><div class="actions"><button class="primary" onclick="saveTable()">Salvar</button></div>`)};
window.saveTable=async()=>{const o={name:$("tName").value.trim(),capacity:+$("tCap").value};if(!o.name||o.capacity<1)return toast("Preencha nome e capacidade.");const r=state.edit?await db.from("wedding_tables").update(o).eq("id",state.edit):await db.from("wedding_tables").insert(o);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Mesa salva.")}};
function renderFinance(){const q=$("financeSearch").value.toLowerCase(),rows=state.finance.filter(x=>(x.description+" "+x.category).toLowerCase().includes(q)),planned=rows.reduce((a,x)=>a+n(x.planned),0),paid=rows.reduce((a,x)=>a+n(x.paid),0);$("financeSummary").innerHTML=`<span class="summary-pill">Previsto <strong>${money(planned)}</strong></span><span class="summary-pill">Pago <strong>${money(paid)}</strong></span><span class="summary-pill">Restante <strong>${money(planned-paid)}</strong></span>`;$("financeRows").innerHTML=rows.map(x=>{const rem=n(x.planned)-n(x.paid),today=new Date().toISOString().slice(0,10),status=rem<=0?"Pago":x.due_date&&x.due_date<today?"Atrasado":"Pendente";return `<tr><td>${esc(x.description)}</td><td>${esc(x.category)}</td><td>${money(x.planned)}</td><td>${money(x.paid)}</td><td>${money(rem)}</td><td>${dateBR(x.due_date)}</td><td>${badge(status)}</td><td><button class="secondary" onclick="financeModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('finance','${x.id}')">Excluir</button></td></tr>`}).join("")||`<tr><td colspan="8">Nenhum lançamento.</td></tr>`}
$("financeSearch").oninput=renderFinance;$("addFinanceBtn").onclick=()=>financeModal();window.financeModal=id=>{const x=state.finance.find(y=>y.id===id)||{description:"",category:"",planned:0,paid:0,due_date:""};state.edit=id;modal(id?"Editar lançamento":"Novo lançamento",`<div class="form"><label class="full">Descrição<input id="fDesc" value="${esc(x.description)}"></label><label>Categoria<input id="fCat" value="${esc(x.category)}"></label><label>Previsto<input id="fPlan" type="number" step=".01" min="0" value="${x.planned}"></label><label>Pago<input id="fPaid" type="number" step=".01" min="0" value="${x.paid}"></label><label>Vencimento<input id="fDue" type="date" value="${x.due_date||""}"></label></div><div class="actions"><button class="primary" onclick="saveFinance()">Salvar</button></div>`)};
window.saveFinance=async()=>{const o={description:$("fDesc").value.trim(),category:$("fCat").value.trim(),planned:+$("fPlan").value,paid:+$("fPaid").value,due_date:$("fDue").value||null};if(!o.description)return toast("Informe a descrição.");const r=state.edit?await db.from("finance").update(o).eq("id",state.edit):await db.from("finance").insert(o);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Lançamento salvo.")}};
function renderGifts(){const q=$("giftSearch").value.toLowerCase(),rows=state.gifts.filter(x=>(x.item+" "+x.given_by).toLowerCase().includes(q));$("giftSummary").innerHTML=`<span class="summary-pill">Total <strong>${rows.length}</strong></span><span class="summary-pill">Recebidos <strong>${rows.filter(x=>x.received).length}</strong></span><span class="summary-pill">A agradecer <strong>${rows.filter(x=>x.received&&!x.thanked).length}</strong></span>`;$("giftRows").innerHTML=rows.map(x=>`<tr><td>${esc(x.item)}</td><td>${esc(x.given_by)}</td><td>${badge(x.received?"Recebido":"Pendente")}</td><td>${badge(x.thanked?"Enviado":"Pendente")}</td><td><button class="secondary" onclick="giftModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('gifts','${x.id}')">Excluir</button></td></tr>`).join("")||`<tr><td colspan="5">Nenhum presente.</td></tr>`}
$("giftSearch").oninput=renderGifts;$("addGiftBtn").onclick=()=>giftModal();window.giftModal=id=>{const x=state.gifts.find(y=>y.id===id)||{item:"",given_by:"",received:false,thanked:false};state.edit=id;modal(id?"Editar presente":"Novo presente",`<div class="form"><label class="full">Presente<input id="pItem" value="${esc(x.item)}"></label><label class="full">Quem deu<input id="pFrom" value="${esc(x.given_by)}"></label><label>Recebido<select id="pRec"><option value="false">Não</option><option value="true" ${x.received?"selected":""}>Sim</option></select></label><label>Agradecimento<select id="pThanks"><option value="false">Pendente</option><option value="true" ${x.thanked?"selected":""}>Enviado</option></select></label></div><div class="actions"><button class="primary" onclick="saveGift()">Salvar</button></div>`)};
window.saveGift=async()=>{const o={item:$("pItem").value.trim(),given_by:$("pFrom").value.trim(),received:$("pRec").value==="true",thanked:$("pThanks").value==="true"};if(!o.item)return toast("Informe o presente.");const r=state.edit?await db.from("gifts").update(o).eq("id",state.edit):await db.from("gifts").insert(o);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Presente salvo.")}};
function renderTasks(){const f=$("taskFilter").value,today=new Date().toISOString().slice(0,10),rows=state.tasks.filter(x=>!f||(f==="open"&&!x.completed)||(f==="done"&&x.completed)||(f==="late"&&!x.completed&&x.due_date&&x.due_date<today));$("taskSummaryTop").innerHTML=`<span class="summary-pill">Total <strong>${state.tasks.length}</strong></span><span class="summary-pill">Concluídas <strong>${state.tasks.filter(x=>x.completed).length}</strong></span><span class="summary-pill">Atrasadas <strong>${state.tasks.filter(x=>!x.completed&&x.due_date&&x.due_date<today).length}</strong></span>`;$("taskList").innerHTML=rows.map(x=>{const late=!x.completed&&x.due_date&&x.due_date<today;return `<div class="task-row ${x.completed?"done":late?"late":""}"><input type="checkbox" ${x.completed?"checked":""} onchange="toggleTask('${x.id}',this.checked)"><div class="task-main"><strong>${esc(x.title)}</strong><small>${x.due_date?"Prazo: "+dateBR(x.due_date):"Sem prazo"}${late?" • Atrasada":""}</small></div><button class="danger" onclick="removeRow('tasks','${x.id}')">Excluir</button></div>`}).join("")||`<p style="padding:16px">Nenhuma tarefa nesta visão.</p>`}
$("taskFilter").oninput=renderTasks;$("addTaskBtn").onclick=()=>{state.edit=null;modal("Nova tarefa",`<div class="form"><label class="full">Tarefa<input id="cTitle"></label><label>Data<input id="cDue" type="date"></label></div><div class="actions"><button class="primary" onclick="saveTask()">Salvar</button></div>`)};
window.saveTask=async()=>{const title=$("cTitle").value.trim();if(!title)return toast("Informe a tarefa.");const r=await db.from("tasks").insert({title,due_date:$("cDue").value||null});if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Tarefa adicionada.")}};
window.toggleTask=async(id,v)=>{const {error}=await db.from("tasks").update({completed:v}).eq("id",id);if(error)alert(error.message);else toast(v?"Tarefa concluída.":"Tarefa reaberta.")};
window.removeRow=async(table,id)=>{if(confirm("Excluir este item? Essa ação não pode ser desfeita.")){const {error}=await db.from(table).delete().eq("id",id);if(error)alert(error.message);else toast("Item excluído.")}};
function renderSettings(){const s=state.settings;$("sAppTitle").value=s.appTitle;$("sCoupleNames").value=s.coupleNames;$("sDate").value=s.weddingDate;$("sTime").value=s.weddingTime;$("sSubtitle").value=s.subtitle;$("sGuestLimit").value=s.guestLimit;$("sCapacity").value=s.defaultTableCapacity;$("sAdultWeight").value=s.adultWeight;$("sChild08Weight").value=s.child08Weight;$("sChild912Weight").value=s.child912Weight;$("sAdultSeat").value=String(s.adultSeat);$("sChild08Seat").value=String(s.child08Seat);$("sChild912Seat").value=String(s.child912Seat)}
$("saveSettingsBtn").onclick=async()=>{const value={appTitle:$("sAppTitle").value,coupleNames:$("sCoupleNames").value,weddingDate:$("sDate").value,weddingTime:$("sTime").value,subtitle:$("sSubtitle").value,guestLimit:+$("sGuestLimit").value,defaultTableCapacity:+$("sCapacity").value,adultWeight:+$("sAdultWeight").value,child08Weight:+$("sChild08Weight").value,child912Weight:+$("sChild912Weight").value,adultSeat:$("sAdultSeat").value==="true",child08Seat:$("sChild08Seat").value==="true",child912Seat:$("sChild912Seat").value==="true"};const {error}=await db.from("settings").update({value,updated_at:new Date().toISOString()}).eq("key","general");error?alert(error.message):toast("Configurações salvas.")};
function csv(name,headers,rows){const text="\ufeff"+[headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("exportGuestsBtn").onclick=()=>csv("convidados_nahvio.csv",["Nome","Lado","Adultos","0 a 8","9 a 12","Equivalente","Assentos","Convite","Confirmação","Mesa","Observações"],guestFiltered().map(g=>[g.name,g.side,g.adults,g.children_0_8,g.children_9_12,weight(g),seats(g),g.invitation_status,g.rsvp_status,g.table_name||"",g.notes||""]));
$("exportFinanceBtn").onclick=()=>csv("financeiro_nahvio.csv",["Descrição","Categoria","Previsto","Pago","Restante","Vencimento"],state.finance.map(x=>[x.description,x.category,x.planned,x.paid,n(x.planned)-n(x.paid),x.due_date||""]));
auth();