const cfg=window.WEDDING_CONFIG||{};
const $=id=>document.getElementById(id);
if(!cfg.supabaseUrl||cfg.supabaseUrl.includes("COLE_AQUI")||!cfg.supabaseAnonKey||cfg.supabaseAnonKey.includes("COLE_AQUI")){
  $("setupError").classList.remove("hidden"); throw new Error("Supabase não configurado");
}
const db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
const state={settings:null,guests:[],tables:[],seats:[],seatsReady:false,finance:[],gifts:[],tasks:[],showerSettings:null,showerGuests:[],showerGifts:[],showerTasks:[],showerGames:[],showerFinance:[],showerSchedule:[],documents:[],edit:null,channel:null};
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

function onlyDigits(v){return String(v||"").replace(/\D/g,"")}
function formatCPF(v){const d=onlyDigits(v).slice(0,11);return d.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
function validCPF(v){
  const cpf=onlyDigits(v);
  if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
  const calc=len=>{let sum=0;for(let i=0;i<len;i++)sum+=+cpf[i]*(len+1-i);const r=(sum*10)%11;return r===10?0:r};
  return calc(9)===+cpf[9]&&calc(10)===+cpf[10];
}
function showerGuestFiltered(){
  const q=($("showerGuestSearch")?.value||"").toLowerCase(),st=$("showerGuestStatus")?.value||"";
  return state.showerGuests.filter(g=>(`${g.full_name} ${g.cpf||""} ${g.phone||""}`).toLowerCase().includes(q)&&(!st||g.rsvp_status===st));
}
function renderShower(){
  if(!$("shower-dashboard"))return;
  const s=state.showerSettings||{};
  document.documentElement.style.setProperty("--shower-primary",s.primaryColor||"#f05a83");
  document.documentElement.style.setProperty("--shower-secondary",s.secondaryColor||"#8b60e8");
  $("showerTitle").textContent=s.eventName||"Chá de Cozinha";
  $("showerEventInfo").textContent=[s.eventDate?dateBR(s.eventDate):"",s.eventTime||"",s.location||""].filter(Boolean).join(" • ")||"Configure a data e o local do evento.";
  const event=s.eventDate?new Date(`${s.eventDate}T${s.eventTime||"00:00"}:00-03:00`):null;
  $("showerDays").textContent=event?Math.max(0,Math.ceil((event-Date.now())/86400000)):0;
  const confirmed=state.showerGuests.filter(g=>g.rsvp_status==="Confirmado");
  const totalPeople=state.showerGuests.reduce((a,g)=>a+1+n(g.companions),0);
  const confirmedPeople=confirmed.reduce((a,g)=>a+1+n(g.companions),0);
  $("showerKGuests").textContent=totalPeople;
  $("showerKConfirmed").textContent=`${confirmedPeople} confirmados • ${state.showerGuests.length} cadastros`;
  const received=state.showerGifts.filter(x=>x.status==="Recebido").length,reserved=state.showerGifts.filter(x=>x.status==="Reservado").length;
  $("showerKGifts").textContent=state.showerGifts.length;
  $("showerKGiftStatus").textContent=`${received} recebidos • ${reserved} reservados`;
  const done=state.showerTasks.filter(x=>x.completed).length,tp=state.showerTasks.length?Math.round(done/state.showerTasks.length*100):0;
  $("showerKTasks").textContent=tp+"%";$("showerKTaskStatus").textContent=`${done} de ${state.showerTasks.length} concluídas`;
  const planned=state.showerFinance.reduce((a,x)=>a+n(x.planned),0),paid=state.showerFinance.reduce((a,x)=>a+n(x.paid),0);
  $("showerKFinance").textContent=money(Math.max(0,planned-paid));$("showerKFinanceStatus").textContent=`${money(paid)} pagos`;
  const nextTasks=state.showerTasks.filter(x=>!x.completed).slice(0,4);
  $("showerNextTasks").closest(".premium-panel").classList.toggle("panel-empty",!nextTasks.length);$("showerNextTasks").innerHTML=nextTasks.length?nextTasks.map(x=>`<div><span>○ ${esc(x.title)}</span><strong>${x.due_date?dateBR(x.due_date):"Sem data"}</strong></div>`).join(""):`<p class="empty-note">Nenhuma tarefa pendente.</p>`;
  $("showerGameBreakdown").innerHTML=`<div><span>Planejadas</span><strong>${state.showerGames.filter(x=>x.status==="Planejada").length}</strong></div><div><span>Preparadas</span><strong>${state.showerGames.filter(x=>x.status==="Preparada").length}</strong></div><div><span>Realizadas</span><strong>${state.showerGames.filter(x=>x.status==="Realizada").length}</strong></div>`;
  $("showerNextSchedule").closest(".premium-panel").classList.toggle("panel-empty",!state.showerSchedule.length);$("showerNextSchedule").innerHTML=state.showerSchedule.slice(0,4).map(x=>`<div><span>${esc(x.title)}</span><strong>${esc(x.time||"")}</strong></div>`).join("")||`<p class="empty-note">Nenhuma etapa cadastrada.</p>`;
  renderShowerGuests();renderShowerGifts();renderShowerTasks();renderShowerGames();renderShowerFinance();renderShowerSchedule();renderShowerSettings();
}
function renderShowerGuests(){
  const rows=showerGuestFiltered(),showCpf=state.showerSettings?.showCpf!==false;
  $("showerGuestSummary").innerHTML=`<span class="summary-pill">Cadastros <strong>${rows.length}</strong></span><span class="summary-pill">Confirmados <strong>${rows.filter(x=>x.rsvp_status==="Confirmado").length}</strong></span><span class="summary-pill">Pessoas confirmadas <strong>${rows.filter(x=>x.rsvp_status==="Confirmado").reduce((a,g)=>a+1+n(g.companions),0)}</strong></span>`;
  $("showerGuestRows").innerHTML=rows.map(g=>`<tr class="${g.rsvp_status==="Confirmado"?"guest-confirmed":g.rsvp_status==="Recusado"?"guest-declined":"guest-pending"}"><td><strong>${esc(g.full_name)}</strong></td><td>${showCpf?esc(formatCPF(g.cpf||"")):"•••.•••.•••-••"}</td><td>${esc(g.phone||"")}</td><td>${1+n(g.companions)}</td><td>${badge(g.rsvp_status)}</td><td>${esc(g.notes||"")}</td><td><button class="secondary" onclick="showerGuestModal('${g.id}')">Editar</button> <button class="danger" onclick="removeRow('shower_guests','${g.id}')">Excluir</button></td></tr>`).join("")||`<tr><td colspan="7">Nenhum convidado cadastrado.</td></tr>`;
}
window.showerGuestModal=id=>{const g=state.showerGuests.find(x=>x.id===id)||{full_name:"",cpf:"",phone:"",companions:0,rsvp_status:"Pendente",notes:""};state.edit=id;modal(id?"Editar convidado do chá":"Novo convidado do chá",`<div class="form"><label class="full">Nome completo<input id="sgName" value="${esc(g.full_name)}"></label><label>CPF<input id="sgCpf" inputmode="numeric" maxlength="14" value="${esc(formatCPF(g.cpf||""))}" oninput="this.value=formatCPF(this.value)"></label><label>Telefone<input id="sgPhone" value="${esc(g.phone||"")}"></label><label>Acompanhantes<input id="sgComp" type="number" min="0" max="${n(state.showerSettings.maxCompanions)||20}" value="${n(g.companions)}"></label><label>Confirmação<select id="sgRsvp">${["Pendente","Confirmado","Recusado"].map(x=>`<option ${x===g.rsvp_status?"selected":""}>${x}</option>`)}</select></label><label class="full">Observações<textarea id="sgNotes">${esc(g.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveShowerGuest()">Salvar convidado</button></div>`)};
window.saveShowerGuest=async()=>{const name=$("sgName").value.trim(),cpf=onlyDigits($("sgCpf").value);if(!name)return toast("Informe o nome completo.");if(state.showerSettings.cpfRequired&&!cpf)return toast("O CPF é obrigatório.");if(cpf&&!validCPF(cpf))return toast("Informe um CPF válido.");const obj={full_name:name,cpf:cpf||null,phone:$("sgPhone").value.trim(),companions:+$("sgComp").value,rsvp_status:$("sgRsvp").value,notes:$("sgNotes").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("shower_guests").update(obj).eq("id",state.edit):await db.from("shower_guests").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Convidado salvo.");await loadAll()}};
function renderShowerGifts(){const q=($("showerGiftSearch")?.value||"").toLowerCase(),f=$("showerGiftFilter")?.value||"",rows=state.showerGifts.filter(x=>(`${x.item} ${x.given_by||""}`).toLowerCase().includes(q)&&(!f||x.status===f));$("showerGiftSummary").innerHTML=`<span class="summary-pill">Total <strong>${rows.length}</strong></span><span class="summary-pill">Reservados <strong>${rows.filter(x=>x.status==="Reservado").length}</strong></span><span class="summary-pill">Recebidos <strong>${rows.filter(x=>x.status==="Recebido").length}</strong></span>`;$("showerGiftRows").innerHTML=rows.map(x=>`<tr><td><strong>${esc(x.item)}</strong></td><td>${esc(x.category||"")}</td><td>${badge(x.status)}</td><td>${esc(x.given_by||"")}</td><td>${money(x.estimated_value)}</td><td>${esc(x.notes||"")}</td><td><button class="secondary" onclick="showerGiftModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('shower_gifts','${x.id}')">Excluir</button></td></tr>`).join("")||`<tr><td colspan="7">Nenhum presente cadastrado.</td></tr>`}
window.showerGiftModal=id=>{const x=state.showerGifts.find(v=>v.id===id)||{item:"",category:"Cozinha",status:"Disponível",given_by:"",estimated_value:0,notes:""};state.edit=id;modal(id?"Editar presente":"Novo presente",`<div class="form"><label class="full">Presente<input id="shgItem" value="${esc(x.item)}"></label><label>Categoria<input id="shgCat" value="${esc(x.category||"")}"></label><label>Status<select id="shgStatus">${["Disponível","Reservado","Recebido"].map(v=>`<option ${v===x.status?"selected":""}>${v}</option>`)}</select></label><label>Quem reservou ou presenteou<input id="shgBy" value="${esc(x.given_by||"")}"></label><label>Valor estimado<input id="shgValue" type="number" step=".01" value="${n(x.estimated_value)}"></label><label class="full">Observações<textarea id="shgNotes">${esc(x.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveShowerGift()">Salvar presente</button></div>`)};
window.saveShowerGift=async()=>{if(!$("shgItem").value.trim())return toast("Informe o presente.");const obj={item:$("shgItem").value.trim(),category:$("shgCat").value.trim(),status:$("shgStatus").value,given_by:$("shgBy").value.trim(),estimated_value:+$("shgValue").value,notes:$("shgNotes").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("shower_gifts").update(obj).eq("id",state.edit):await db.from("shower_gifts").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Presente salvo.")}};
function renderShowerTasks(){const f=$("showerTaskFilter")?.value||"",today=new Date().toISOString().slice(0,10),rows=state.showerTasks.filter(x=>!f||(f==="done"&&x.completed)||(f==="open"&&!x.completed)||(f==="late"&&!x.completed&&x.due_date&&x.due_date<today));$("showerTaskSummary").innerHTML=`<span class="summary-pill">Total <strong>${rows.length}</strong></span><span class="summary-pill">Concluídas <strong>${rows.filter(x=>x.completed).length}</strong></span>`;$("showerTaskList").innerHTML=rows.map(x=>`<div class="task-row ${x.completed?"done":""}"><input type="checkbox" ${x.completed?"checked":""} onchange="toggleShowerTask('${x.id}',this.checked)"><div class="task-main"><strong>${esc(x.title)}</strong><small>${x.due_date?dateBR(x.due_date):"Sem prazo"} • ${esc(x.priority||"Normal")}</small>${x.notes?`<p>${esc(x.notes)}</p>`:""}</div><button class="secondary" onclick="showerTaskModal('${x.id}')">Editar</button><button class="danger" onclick="removeRow('shower_tasks','${x.id}')">Excluir</button></div>`).join("")||`<p style="padding:16px">Nenhuma tarefa.</p>`}
window.showerTaskModal=id=>{const x=state.showerTasks.find(v=>v.id===id)||{title:"",due_date:"",priority:"Normal",notes:"",completed:false};state.edit=id;modal(id?"Editar tarefa do chá":"Nova tarefa do chá",`<div class="form"><label class="full">Tarefa<input id="shtTitle" value="${esc(x.title)}"></label><label>Prazo<input id="shtDue" type="date" value="${x.due_date||""}"></label><label>Prioridade<select id="shtPriority">${["Baixa","Normal","Alta"].map(v=>`<option ${v===x.priority?"selected":""}>${v}</option>`)}</select></label><label class="full">Observações<textarea id="shtNotes">${esc(x.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveShowerTask()">Salvar tarefa</button></div>`)};
window.saveShowerTask=async()=>{if(!$("shtTitle").value.trim())return toast("Informe a tarefa.");const obj={title:$("shtTitle").value.trim(),due_date:$("shtDue").value||null,priority:$("shtPriority").value,notes:$("shtNotes").value,completed:false,updated_at:new Date().toISOString()};const r=state.edit?await db.from("shower_tasks").update(obj).eq("id",state.edit):await db.from("shower_tasks").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Tarefa salva.")}};
window.toggleShowerTask=async(id,v)=>{const {error}=await db.from("shower_tasks").update({completed:v,updated_at:new Date().toISOString()}).eq("id",id);if(error)alert(error.message)};

function showerGameFiltered(){
  const q=($("showerGameSearch")?.value||"").toLowerCase(),st=$("showerGameStatus")?.value||"";
  return state.showerGames.filter(x=>(`${x.title} ${x.responsible||""} ${x.materials||""}`).toLowerCase().includes(q)&&(!st||x.status===st));
}
function renderShowerGames(){
  if(!$("showerGameList"))return;
  const rows=showerGameFiltered();
  $("showerGameSummary").innerHTML=`<span class="summary-pill">Total <strong>${rows.length}</strong></span><span class="summary-pill">Preparadas <strong>${rows.filter(x=>x.status==="Preparada").length}</strong></span><span class="summary-pill">Duração prevista <strong>${rows.reduce((a,x)=>a+n(x.duration_minutes),0)} min</strong></span>`;
  $("showerGameList").innerHTML=rows.map((x,i)=>`<article class="card game-card">
    <div class="game-card-top"><span class="game-order">${n(x.position_index)||i+1}</span><div><h4>${esc(x.title)}</h4><p>${esc(x.description||"")}</p></div>${badge(x.status)}</div>
    <div class="game-meta">
      <span><strong>Duração</strong>${n(x.duration_minutes)||0} min</span>
      <span><strong>Responsável</strong>${esc(x.responsible||"Não definido")}</span>
      <span><strong>Horário</strong>${esc(x.planned_time||"Não definido")}</span>
      <span><strong>Participantes</strong>${esc(x.participants||"Todos")}</span>
    </div>
    ${x.materials?`<div class="game-detail"><strong>Materiais</strong><p>${esc(x.materials)}</p></div>`:""}
    ${x.prize?`<div class="game-detail"><strong>Prêmio</strong><p>${esc(x.prize)}</p></div>`:""}
    <div class="game-actions">
      <button class="secondary" onclick="moveShowerGame('${x.id}',-1)" title="Mover para cima">↑</button>
      <button class="secondary" onclick="moveShowerGame('${x.id}',1)" title="Mover para baixo">↓</button>
      <button class="secondary" onclick="showerGameModal('${x.id}')">Editar</button>
      <button class="secondary" onclick="addGameToSchedule('${x.id}')">Adicionar ao cronograma</button>
      ${x.status!=="Realizada"?`<button class="secondary" onclick="setShowerGameStatus('${x.id}','Realizada')">Marcar realizada</button>`:""}
      <button class="danger" onclick="removeRow('shower_games','${x.id}')">Excluir</button>
    </div>
  </article>`).join("")||`<div class="card empty-room"><strong>Nenhuma brincadeira encontrada</strong><span>Cadastre uma atividade para o chá.</span></div>`;
  const materials=[...new Set(state.showerGames.flatMap(x=>String(x.materials||"").split(/[,;\n]+/).map(v=>v.trim()).filter(Boolean)))];
  $("showerMaterialList").innerHTML=materials.length?materials.map(x=>`<label class="material-item"><input type="checkbox"><span>${esc(x)}</span></label>`).join(""):`<p class="empty-note">Os materiais informados nas brincadeiras aparecerão aqui automaticamente.</p>`;
}
window.showerGameModal=id=>{
  const x=state.showerGames.find(v=>v.id===id)||{title:"",description:"",instructions:"",materials:"",duration_minutes:15,responsible:"",planned_time:"",participants:"Todos",prize:"",notes:"",status:"Planejada",position_index:state.showerGames.length+1};
  state.edit=id;
  modal(id?"Editar brincadeira":"Nova brincadeira",`<div class="form">
    <label class="full">Nome da brincadeira<input id="shgmTitle" value="${esc(x.title)}"></label>
    <label class="full">Descrição<input id="shgmDesc" value="${esc(x.description||"")}"></label>
    <label>Duração em minutos<input id="shgmDuration" type="number" min="1" value="${n(x.duration_minutes)||15}"></label>
    <label>Responsável<input id="shgmResponsible" value="${esc(x.responsible||"")}"></label>
    <label>Horário planejado<input id="shgmTime" type="time" value="${x.planned_time||""}"></label>
    <label>Participantes<input id="shgmParticipants" value="${esc(x.participants||"Todos")}"></label>
    <label>Status<select id="shgmStatus">${["Planejada","Preparada","Realizada","Cancelada"].map(v=>`<option ${v===x.status?"selected":""}>${v}</option>`)}</select></label>
    <label>Ordem<input id="shgmPosition" type="number" min="1" value="${n(x.position_index)||1}"></label>
    <label class="full">Materiais necessários<textarea id="shgmMaterials" placeholder="Separe os itens por vírgula ou linha">${esc(x.materials||"")}</textarea></label>
    <label class="full">Como funciona<textarea id="shgmInstructions">${esc(x.instructions||"")}</textarea></label>
    <label class="full">Prêmio, se houver<input id="shgmPrize" value="${esc(x.prize||"")}"></label>
    <label class="full">Observações<textarea id="shgmNotes">${esc(x.notes||"")}</textarea></label>
  </div><div class="actions"><button class="primary" onclick="saveShowerGame()">Salvar brincadeira</button></div>`);
};
window.saveShowerGame=async()=>{
  if(!$("shgmTitle").value.trim())return toast("Informe o nome da brincadeira.");
  const obj={title:$("shgmTitle").value.trim(),description:$("shgmDesc").value.trim(),instructions:$("shgmInstructions").value,materials:$("shgmMaterials").value,duration_minutes:+$("shgmDuration").value,responsible:$("shgmResponsible").value.trim(),planned_time:$("shgmTime").value||null,participants:$("shgmParticipants").value.trim(),prize:$("shgmPrize").value.trim(),notes:$("shgmNotes").value,status:$("shgmStatus").value,position_index:+$("shgmPosition").value,updated_at:new Date().toISOString()};
  const r=state.edit?await db.from("shower_games").update(obj).eq("id",state.edit):await db.from("shower_games").insert(obj);
  if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Brincadeira salva.")}
};
window.setShowerGameStatus=async(id,status)=>{const {error}=await db.from("shower_games").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error)alert(error.message);else toast("Status atualizado.")};
window.moveShowerGame=async(id,dir)=>{
  const ordered=[...state.showerGames].sort((a,b)=>n(a.position_index)-n(b.position_index));
  const i=ordered.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=ordered.length)return;
  const a=ordered[i],b=ordered[j],pa=n(a.position_index)||i+1,pb=n(b.position_index)||j+1;
  const [ra,rb]=await Promise.all([db.from("shower_games").update({position_index:pb}).eq("id",a.id),db.from("shower_games").update({position_index:pa}).eq("id",b.id)]);
  if(ra.error||rb.error)alert((ra.error||rb.error).message);
};
window.addGameToSchedule=async id=>{
  const x=state.showerGames.find(v=>v.id===id);if(!x)return;
  const exists=state.showerSchedule.some(v=>v.game_id===id);
  if(exists)return toast("Essa brincadeira já está no cronograma.");
  const {error}=await db.from("shower_schedule").insert({time:x.planned_time||null,title:x.title,notes:`Brincadeira • ${x.duration_minutes||15} minutos`,position_index:state.showerSchedule.length+1,game_id:id});
  if(error)alert(error.message);else toast("Brincadeira adicionada ao cronograma.");
};
function exportShowerGamesPDF(){
  if(!state.showerGames.length)return toast("Não há brincadeiras cadastradas.");
  const {jsPDF}=window.jspdf||{};if(!jsPDF)return toast("A biblioteca de PDF não carregou.");
  const doc=new jsPDF({unit:"mm",format:"a4"}),s=state.showerSettings||{};let y=18;
  const header=()=>{doc.setFont("helvetica","bold");doc.setFontSize(17);doc.text(s.eventName||"Chá de Cozinha",15,18);doc.setFontSize(11);doc.text("Roteiro das brincadeiras",15,25);doc.line(15,30,195,30);y=38};
  header();
  [...state.showerGames].sort((a,b)=>n(a.position_index)-n(b.position_index)).forEach((x,i)=>{
    const lines=[
      `${i+1}. ${x.title}`,
      `Horário: ${x.planned_time||"A definir"}   Duração: ${x.duration_minutes||0} min   Status: ${x.status}`,
      `Responsável: ${x.responsible||"A definir"}`,
      `Materiais: ${x.materials||"Nenhum informado"}`,
      `Como funciona: ${x.instructions||x.description||"Sem instruções"}`,
      x.prize?`Prêmio: ${x.prize}`:""
    ].filter(Boolean);
    const wrapped=lines.flatMap((line,idx)=>doc.splitTextToSize(line,idx===0?180:175));
    const height=wrapped.length*5+7;
    if(y+height>282){doc.addPage();header()}
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(wrapped[0],15,y);y+=6;
    doc.setFont("helvetica","normal");doc.setFontSize(9.5);
    wrapped.slice(1).forEach(line=>{doc.text(line,20,y);y+=5});
    y+=5;
  });
  doc.save(`${(s.eventName||"cha_de_cozinha").toLowerCase().replace(/\s+/g,"_")}_roteiro_brincadeiras.pdf`);
  toast("Roteiro das brincadeiras gerado.");
}

function renderShowerFinance(){const q=($("showerFinanceSearch")?.value||"").toLowerCase(),rows=state.showerFinance.filter(x=>(`${x.description} ${x.category}`).toLowerCase().includes(q)),planned=rows.reduce((a,x)=>a+n(x.planned),0),paid=rows.reduce((a,x)=>a+n(x.paid),0);$("showerFinanceSummary").innerHTML=`<span class="summary-pill">Previsto <strong>${money(planned)}</strong></span><span class="summary-pill">Pago <strong>${money(paid)}</strong></span><span class="summary-pill">Restante <strong>${money(planned-paid)}</strong></span>`;$("showerFinanceRows").innerHTML=rows.map(x=>`<tr><td>${esc(x.description)}</td><td>${esc(x.category)}</td><td>${money(x.planned)}</td><td>${money(x.paid)}</td><td>${money(n(x.planned)-n(x.paid))}</td><td>${dateBR(x.due_date)}</td><td><button class="secondary" onclick="showerFinanceModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('shower_finance','${x.id}')">Excluir</button></td></tr>`).join("")||`<tr><td colspan="7">Nenhum lançamento.</td></tr>`}
window.showerFinanceModal=id=>{const x=state.showerFinance.find(v=>v.id===id)||{description:"",category:"Outros",planned:0,paid:0,due_date:"",notes:""};state.edit=id;modal(id?"Editar lançamento":"Novo lançamento do chá",`<div class="form"><label class="full">Descrição<input id="shfDesc" value="${esc(x.description)}"></label><label>Categoria<input id="shfCat" value="${esc(x.category)}"></label><label>Previsto<input id="shfPlanned" type="number" step=".01" value="${n(x.planned)}"></label><label>Pago<input id="shfPaid" type="number" step=".01" value="${n(x.paid)}"></label><label>Vencimento<input id="shfDue" type="date" value="${x.due_date||""}"></label><label class="full">Observações<textarea id="shfNotes">${esc(x.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveShowerFinance()">Salvar lançamento</button></div>`)};
window.saveShowerFinance=async()=>{if(!$("shfDesc").value.trim())return toast("Informe a descrição.");const obj={description:$("shfDesc").value.trim(),category:$("shfCat").value.trim(),planned:+$("shfPlanned").value,paid:+$("shfPaid").value,due_date:$("shfDue").value||null,notes:$("shfNotes").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("shower_finance").update(obj).eq("id",state.edit):await db.from("shower_finance").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Lançamento salvo.")}};
function renderShowerSchedule(){$("showerScheduleList").innerHTML=state.showerSchedule.map(x=>`<article class="card schedule-item"><div class="schedule-time">${esc(x.time||"--:--")}</div><div><strong>${esc(x.title)}</strong><p>${esc(x.notes||"")}</p></div><div><button class="secondary" onclick="showerScheduleModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('shower_schedule','${x.id}')">Excluir</button></div></article>`).join("")||`<div class="card empty-room"><strong>Nenhuma etapa cadastrada</strong><span>Adicione os horários e atividades do chá.</span></div>`}
window.showerScheduleModal=id=>{const x=state.showerSchedule.find(v=>v.id===id)||{time:"14:00",title:"",notes:"",position_index:state.showerSchedule.length+1};state.edit=id;modal(id?"Editar etapa":"Nova etapa",`<div class="form"><label>Horário<input id="shsTime" type="time" value="${x.time||""}"></label><label>Ordem<input id="shsPos" type="number" min="1" value="${n(x.position_index)||1}"></label><label class="full">Atividade<input id="shsTitle" value="${esc(x.title)}"></label><label class="full">Observações<textarea id="shsNotes">${esc(x.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveShowerSchedule()">Salvar etapa</button></div>`)};
window.saveShowerSchedule=async()=>{if(!$("shsTitle").value.trim())return toast("Informe a atividade.");const obj={time:$("shsTime").value,title:$("shsTitle").value.trim(),notes:$("shsNotes").value,position_index:+$("shsPos").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("shower_schedule").update(obj).eq("id",state.edit):await db.from("shower_schedule").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Etapa salva.")}};
function renderShowerSettings(){const s=state.showerSettings||{};const map={shName:s.eventName,shMenuLabel:s.menuLabel||"Chá de Cozinha",shEventIcon:s.eventIcon||"🎁",shDate:s.eventDate,shTime:s.eventTime,shEndTime:s.endTime,shLocation:s.location,shAddress:s.address,shMaps:s.mapsLink,shBudget:s.budget,shGuestLimit:s.guestLimit,shMaxCompanions:s.maxCompanions,shPrimaryColor:s.primaryColor,shSecondaryColor:s.secondaryColor,shConfirmMessage:s.confirmMessage,shDeclineMessage:s.declineMessage,shNotes:s.notes};Object.entries(map).forEach(([id,v])=>{if($(id))$(id).value=v??""});$("shCpfRequired").value=String(!!s.cpfRequired);$("shShowCpf").value=String(s.showCpf!==false);$("shAllowCompanions").value=String(s.allowCompanions!==false);$("shShowTasks").value=String(s.showTasks!==false);$("shShowFinance").value=String(s.showFinance!==false)}
function exportShowerPDF(){
  const confirmed=state.showerGuests.filter(x=>x.rsvp_status==="Confirmado").sort((a,b)=>a.full_name.localeCompare(b.full_name,"pt-BR"));
  if(!confirmed.length)return toast("Não há convidados confirmados.");
  modal("Exportar lista de confirmados",`<div class="form one"><label>Modelo do PDF<select id="pdfMode"><option value="gate">Portaria: nome completo e CPF</option><option value="contact">Contato: nome completo e telefone</option><option value="complete">Lista completa</option></select></label><label>Ordenação<select id="pdfOrder"><option value="name">Ordem alfabética</option><option value="confirmed">Ordem de confirmação</option></select></label></div><div class="notice">Somente convidados com status <strong>Confirmado</strong> serão incluídos.</div><div class="actions"><button class="primary" onclick="generateShowerPDF()">Gerar PDF</button></div>`);
}
window.generateShowerPDF=()=>{
  const {jsPDF}=window.jspdf||{};if(!jsPDF)return toast("A biblioteca de PDF não carregou.");
  const mode=$("pdfMode").value,order=$("pdfOrder").value,s=state.showerSettings;
  let rows=state.showerGuests.filter(x=>x.rsvp_status==="Confirmado");
  rows.sort(order==="confirmed"?(a,b)=>String(a.updated_at||"").localeCompare(String(b.updated_at||"")):(a,b)=>a.full_name.localeCompare(b.full_name,"pt-BR"));
  const doc=new jsPDF({unit:"mm",format:"a4"});let y=18,page=1;
  const title=s.eventName||"Chá de Cozinha";
  const header=()=>{doc.setFont("helvetica","bold");doc.setFontSize(17);doc.text(title,15,18);doc.setFontSize(11);doc.setFont("helvetica","normal");doc.text("Lista de convidados confirmados",15,25);doc.text([s.eventDate?`Data: ${dateBR(s.eventDate)}`:"",s.location?`Local: ${s.location}`:""].filter(Boolean).join("   "),15,31);doc.line(15,35,195,35);y=43};
  header();
  rows.forEach((g,i)=>{
    if(y>277){doc.addPage();page++;header()}
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(`${i+1}. ${g.full_name}`,15,y);y+=5;
    doc.setFont("helvetica","normal");doc.setFontSize(10);
    if(mode==="gate")doc.text(`CPF: ${g.cpf?formatCPF(g.cpf):"Não informado"}`,20,y);
    if(mode==="contact")doc.text(`Telefone: ${g.phone||"Não informado"}`,20,y);
    if(mode==="complete"){doc.text(`CPF: ${g.cpf?formatCPF(g.cpf):"Não informado"}   Telefone: ${g.phone||"Não informado"}`,20,y);y+=5;doc.text(`Pessoas: ${1+n(g.companions)}${g.notes?`   Observações: ${g.notes}`:""}`,20,y)}
    y+=8;
  });
  if(y>275){doc.addPage();header()}
  doc.setFont("helvetica","bold");doc.text(`Total de cadastros confirmados: ${rows.length}`,15,y+2);doc.text(`Total de pessoas: ${rows.reduce((a,g)=>a+1+n(g.companions),0)}`,15,y+8);
  doc.save(`${(title||"cha_de_cozinha").toLowerCase().replace(/\s+/g,"_")}_confirmados.pdf`);$("modal").classList.add("hidden");toast("PDF gerado.");
}

async function auth(){const {data:{session}}=await db.auth.getSession();session?showApp():$("authScreen").classList.remove("hidden")}
$("loginBtn").onclick=async()=>{const {error}=await db.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});error?notice(error.message):showApp()};
$("signupBtn").onclick=async()=>{const {error}=await db.auth.signUp({email:$("email").value.trim(),password:$("password").value});notice(error?error.message:"Conta criada. Confira seu e-mail se for solicitado.")};
$("logoutBtn").onclick=async()=>{await db.auth.signOut();location.reload()};
$("refreshBtn").onclick=()=>loadAll(true);
async function showApp(){$("authScreen").classList.add("hidden");$("app").classList.remove("hidden");await loadAll();subscribe()}
async function loadAll(manual=false){
  $("syncText").textContent="Atualizando...";
  const [s,g,t,z,f,p,c,ss,sg,sf,st,sgm,sfi,ssc,docs]=await Promise.all([
    db.from("settings").select("*").eq("key","general").single(),
    db.from("guests").select("*").order("name"),
    db.from("wedding_tables").select("*").order("name"),
    db.from("table_seats").select("*"),
    db.from("finance").select("*").order("created_at",{ascending:false}),
    db.from("gifts").select("*").order("created_at",{ascending:false}),
    db.from("tasks").select("*").order("due_date",{ascending:true}),
    db.from("shower_settings").select("*").eq("key","general").maybeSingle(),
    db.from("shower_guests").select("*").order("full_name"),
    db.from("shower_gifts").select("*").order("created_at",{ascending:false}),
    db.from("shower_tasks").select("*").order("due_date",{ascending:true}),
    db.from("shower_games").select("*").order("position_index",{ascending:true}),
    db.from("shower_finance").select("*").order("created_at",{ascending:false}),
    db.from("shower_schedule").select("*").order("position_index",{ascending:true}),
    db.from("documents").select("*").order("created_at",{ascending:false})
  ]);
  if(s.error){alert("Erro ao carregar configurações: "+s.error.message);return}
  state.settings=s.data.value;state.guests=g.data||[];state.tables=(t.data||[]).sort((a,b)=>n(a.position_index)-n(b.position_index)||String(a.name).localeCompare(String(b.name),"pt-BR",{numeric:true}));state.seatsReady=!z.error;state.seats=z.data||[];state.finance=f.data||[];state.gifts=p.data||[];state.tasks=c.data||[];
  state.showerSettings=ss.data?.value||{eventName:"Chá de Cozinha",menuLabel:"Chá de Cozinha",eventIcon:"🎁",eventDate:"2026-08-08",eventTime:"15:00",endTime:"18:00",location:"",address:"",mapsLink:"",budget:0,guestLimit:0,cpfRequired:false,showCpf:true,allowCompanions:true,maxCompanions:3,showTasks:true,showFinance:true,primaryColor:"#f05a83",secondaryColor:"#8b60e8",confirmMessage:"Presença confirmada!",declineMessage:"Sentiremos sua falta.",notes:""};
  state.showerGuests=sg.data||[];state.showerGifts=sf.data||[];state.showerTasks=st.data||[];state.showerGames=sgm.data||[];state.showerFinance=sfi.data||[];state.showerSchedule=ssc.data||[];state.documents=docs.data||[];
  render();$("syncText").textContent="Sincronizado";if(manual)toast("Dados atualizados.");
}
function subscribe(){
  if(state.channel) return;
  state.channel=db.channel("planner").on("postgres_changes",{event:"*",schema:"public"},()=>loadAll()).subscribe();
}
const pages=[
  {id:"dashboard",icon:"⌂",label:"Dashboard"},
  {id:"guests",icon:"♟",label:"Convidados"},
  {id:"tables",icon:"◉",label:"Mesas"},
  {id:"finance",icon:"R$",label:"Financeiro"},
  {id:"gifts",icon:"◇",label:"Presentes"},
  {id:"tasks",icon:"✓",label:"Checklist"},
  {id:"documents",icon:"▣",label:"Documentos"},
  {id:"reports",icon:"▤",label:"Relatórios"},
  {id:"ceremony",icon:"▶",label:"Modo cerimônia"},
  {id:"assistant",icon:"✦",label:"Assistente"},
  {group:"Chá de Cozinha",groupId:"shower",icon:"🎁"},
  {id:"shower-dashboard",icon:"🎁",label:"Visão geral",sub:true},
  {id:"shower-guests",icon:"👥",label:"Convidados",sub:true},
  {id:"shower-gifts",icon:"◇",label:"Presentes",sub:true},
  {id:"shower-games",icon:"🎲",label:"Brincadeiras",sub:true},
  {id:"shower-tasks",icon:"✓",label:"Checklist",sub:true},
  {id:"shower-schedule",icon:"◷",label:"Cronograma",sub:true},
  {id:"shower-finance",icon:"R$",label:"Financeiro",sub:true},
  {id:"shower-settings",icon:"⚙",label:"Configurações",sub:true},
  {group:"Casamento",groupId:"wedding",icon:"💍"},
  {id:"settings",icon:"⚙",label:"Configurações"}
];
function render(){
  $("nav").innerHTML=pages.map((p,i)=>{
    if(p.group){
      const open=p.groupId==="shower"||p.groupId==="wedding";
      return `<button class="nav-group-toggle ${open?"open":""}" data-nav-group="${p.groupId}">
        <span class="nav-group-label"><span>${p.icon||""}</span>${p.group}</span>
        <span class="nav-chevron">⌄</span>
      </button>`;
    }
    const parent=p.sub?"shower":"wedding";
    return `<button class="${p.id==="dashboard"?"active":""} ${p.sub?"nav-sub":""}" data-nav-parent="${parent}" data-page="${p.id}" data-title="${p.label}"><span>${p.icon}</span>${p.label}</button>`;
  }).join("");
  document.querySelectorAll("#nav [data-page]").forEach(b=>b.onclick=e=>{
    e.preventDefault();
    openPage(b.dataset.page,b.dataset.title);
  });
  document.querySelectorAll("#nav [data-nav-group]").forEach(b=>b.onclick=e=>{e.stopPropagation();
    b.classList.toggle("open");
    document.querySelectorAll(`#nav [data-nav-parent="${b.dataset.navGroup}"]`).forEach(x=>x.classList.toggle("nav-collapsed",!b.classList.contains("open")));
  });
  renderBrand();renderDashboard();renderGuests();renderTables();renderFinance();renderGifts();renderTasks();renderDocuments();renderReports();renderCeremony();renderAssistant();renderShower();renderSettings();
}
function openPage(id,title){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const target=$(id);if(!target)return;
  target.classList.add("active");
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  $("pageTitle").textContent=title;
  if($("pageContext")){
    const isShower=id.startsWith("shower-");
    $("pageContext").innerHTML=`<span>${isShower?"🎁 Chá de Cozinha":"💍 Casamento"}</span><strong>${esc(title||"")}</strong>`;
  }
  closeMobileMenu();
  window.scrollTo(0,0);
}

function isMobileMenu(){return window.matchMedia("(max-width: 980px)").matches}
function setMobileMenu(open){
  const sidebar=$("sidebar"),button=$("menuBtn"),overlay=$("sidebarOverlay");
  const shouldOpen=Boolean(open&&isMobileMenu());
  document.body.classList.toggle("sidebar-open",shouldOpen);
  sidebar?.classList.toggle("open",shouldOpen);
  button?.setAttribute("aria-expanded",String(shouldOpen));
  sidebar?.setAttribute("aria-hidden",String(isMobileMenu()&&!shouldOpen));
  if(overlay)overlay.tabIndex=shouldOpen?0:-1;
}
function closeMobileMenu(){setMobileMenu(false)}
function initMobileMenu(){
  const button=$("menuBtn"),close=$("mobileMenuCloseBtn"),overlay=$("sidebarOverlay"),sidebar=$("sidebar");
  button?.addEventListener("click",e=>{
    e.preventDefault();
    e.stopPropagation();
    setMobileMenu(!document.body.classList.contains("sidebar-open"));
  });
  close?.addEventListener("click",e=>{e.preventDefault();closeMobileMenu()});
  overlay?.addEventListener("click",e=>{e.preventDefault();closeMobileMenu()});
  sidebar?.addEventListener("click",e=>e.stopPropagation());
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMobileMenu()});
  window.addEventListener("resize",()=>{if(!isMobileMenu())closeMobileMenu()});
  setMobileMenu(false);
}
initMobileMenu();

function applyTheme(theme){document.body.dataset.theme=theme||"classic"}
function renderBrand(){const s=state.settings;applyTheme(s.theme||"classic");$("brandTitle").textContent=s.appTitle;$("brandCouple").textContent=s.coupleNames;$("heroCouple").textContent=s.coupleNames;if($("heroSubtitle"))$("heroSubtitle").textContent=s.subtitle;$("brandDate").textContent=dateBR(s.weddingDate)+" • "+s.weddingTime;$("weddingLabel").textContent=new Date(s.weddingDate+"T"+s.weddingTime).toLocaleString("pt-BR",{dateStyle:"long",timeStyle:"short"})}
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
  $("kConfirmed").textContent=`${conf.reduce((a,g)=>a+people(g),0)} confirmados • ${gs.length} famílias`;

  const pct=gs.length?Math.round(conf.length/gs.length*100):0;
  $("kRsvp").textContent=pct+"%";
  $("kPending").textContent=`${pend.length} famílias pendentes`;

  const totalTables=state.tables.length;
  const organizedTables=state.tables.filter(t=>tableUsage(t)>0).length;
  const fullyOrganizedTables=state.tables.filter(t=>tableUsage(t)>=n(t.capacity)).length;
  $("kTables").textContent=`${organizedTables} de ${totalTables}`;
  $("kTableStatus").textContent=totalTables
    ? `${fullyOrganizedTables} completas • ${Math.max(0,totalTables-organizedTables)} vazias`
    : "Nenhuma mesa cadastrada";

  const planned=state.finance.reduce((a,x)=>a+n(x.planned),0);
  const paid=state.finance.reduce((a,x)=>a+n(x.paid),0);
  const remaining=Math.max(0,planned-paid);
  $("kBalance").textContent=money(remaining);
  $("kPaid").textContent=planned?`${Math.round((paid/planned)*100)}% do orçamento pago`:`${money(paid)} pagos`;
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
    <div><span><i class="mini-ico violet">⚖</i> Equivalência em adultos</span><strong>${w.toLocaleString("pt-BR")}</strong></div>`;

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
  if(nt)alerts.push(`<div class="alert-item"><span>${nt} convidados confirmados ainda estão sem mesa.</span><strong>Organizar mesas</strong></div>`);
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
  const rows=guestFiltered();
  $("guestSummary").innerHTML=`<span class="summary-pill">Famílias <strong>${rows.length}</strong></span><span class="summary-pill">Pessoas <strong>${rows.reduce((a,g)=>a+people(g),0)}</strong></span><span class="summary-pill">Equivalência em adultos <strong>${rows.reduce((a,g)=>a+weight(g),0).toLocaleString("pt-BR")}</strong></span>`;
  $("guestRows").innerHTML=rows.map(g=>{
    const rowClass=g.rsvp_status==="Confirmado"?"guest-confirmed":g.rsvp_status==="Recusado"?"guest-declined":"guest-pending";
    return `<tr class="${rowClass}"><td><strong>${esc(g.name)}</strong></td><td>${esc(g.side)}</td><td>${g.adults}</td><td>${g.children_0_8}</td><td>${g.children_9_12}</td><td>${weight(g).toLocaleString("pt-BR")}</td><td>${seats(g)}</td><td>${esc(g.invitation_status)}</td><td>${badge(g.rsvp_status)}</td><td>${esc(g.table_name||"Sem mesa")}</td><td><button class="secondary" onclick="guestModal('${g.id}')">Editar</button> <button class="danger" onclick="removeRow('guests','${g.id}')">Excluir</button></td></tr>`
  }).join("")||`<tr><td colspan="11">Nenhum convidado encontrado.</td></tr>`;
}
["guestSearch","guestSideFilter","guestStatusFilter","guestInviteFilter"].forEach(id=>$(id).oninput=renderGuests);
$("addGuestBtn").onclick=()=>guestModal();
function modal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
$("closeModal").onclick=()=>$("modal").classList.add("hidden");$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.add("hidden")};
window.guestModal=id=>{const g=state.guests.find(x=>x.id===id)||{name:"",side:"Flávio",adults:1,children_0_8:0,children_9_12:0,invitation_status:"Não enviado",rsvp_status:"Pendente",table_name:"",notes:""};state.edit=id;modal(id?"Editar convidado":"Novo convidado",`<div class="form"><label class="full">Nome ou família<input id="gName" value="${esc(g.name)}"></label><label>Lado<select id="gSide">${["Flávio","Nathália","Ambos"].map(x=>`<option ${x===g.side?"selected":""}>${x}</option>`)}</select></label><label>Adultos<input id="gAdults" type="number" min="0" value="${g.adults}"></label><label>0 a 8<input id="g08" type="number" min="0" value="${g.children_0_8}"></label><label>9 a 12<input id="g912" type="number" min="0" value="${g.children_9_12}"></label><label>Convite<select id="gInv">${["Não enviado","Enviado"].map(x=>`<option ${x===g.invitation_status?"selected":""}>${x}</option>`)}</select></label><label>Confirmação<select id="gRsvp">${["Pendente","Confirmado","Recusado"].map(x=>`<option ${x===g.rsvp_status?"selected":""}>${x}</option>`)}</select></label><label>Mesa<select id="gTable"><option value="">Sem mesa</option>${state.tables.map(t=>`<option ${t.name===g.table_name?"selected":""}>${esc(t.name)}</option>`)}</select></label><label class="full">Observações<textarea id="gNotes">${esc(g.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveGuest()">Salvar</button></div>`)};
window.saveGuest=async()=>{if(!$("gName").value.trim())return toast("Informe o nome ou família.");const obj={name:$("gName").value.trim(),side:$("gSide").value,adults:+$("gAdults").value,children_0_8:+$("g08").value,children_9_12:+$("g912").value,invitation_status:$("gInv").value,rsvp_status:$("gRsvp").value,table_name:$("gTable").value||null,notes:$("gNotes").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("guests").update(obj).eq("id",state.edit):await db.from("guests").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Convidado salvo.");await loadAll()}};
function tableUsage(t){
  if(state.seatsReady)return state.seats.filter(s=>s.table_id===t.id&&s.guest_label).length;
  return state.guests.filter(g=>g.rsvp_status==="Confirmado"&&g.table_name===t.name).reduce((a,g)=>a+seats(g),0);
}
function guestSeatOptions(){
  const options=[];
  state.guests.forEach(g=>{
    const total=Math.max(1,people(g));
    for(let i=1;i<=total;i++)options.push({key:`${g.id}|${i}`,guestId:g.id,label:total===1?g.name:`${g.name} • Pessoa ${i}`,status:g.rsvp_status});
  });
  return options;
}
function seatPosition(i,total){
  const angle=(Math.PI*2*i/total)-Math.PI/2;
  return {left:50+43*Math.cos(angle),top:50+43*Math.sin(angle)};
}
function renderTables(){
  const total=state.tables.reduce((a,t)=>a+n(t.capacity),0),used=state.tables.reduce((a,t)=>a+tableUsage(t),0);
  $("tableMapSummary").innerHTML=`<span class="summary-pill">Mesas <strong>${state.tables.length}</strong></span><span class="summary-pill">Pessoas posicionadas <strong>${used}</strong></span><span class="summary-pill">Lugares livres <strong>${Math.max(0,total-used)}</strong></span>`;
  $("tablesSetupNotice").classList.toggle("hidden",state.seatsReady);
  if(!state.seatsReady)$("tablesSetupNotice").innerHTML=`Para salvar cada pessoa em um lugar específico, execute o arquivo <strong>ATUALIZAR_SUPABASE.sql</strong> no Supabase. O mapa já pode ser visualizado, mas os lugares individuais só serão salvos depois dessa atualização.`;
  $("tableCards").innerHTML=state.tables.map(t=>{
    const cap=Math.max(1,n(t.capacity)),occupied=tableUsage(t),seatEls=Array.from({length:cap},(_,i)=>{
      const num=i+1,pos=seatPosition(i,cap),seat=state.seats.find(s=>s.table_id===t.id&&n(s.seat_number)===num),label=seat?.guest_label||"";
      return `<button class="seat-point ${label?"occupied":""}" data-seat-table="${t.id}" data-seat-number="${num}" style="left:${pos.left}%;top:${pos.top}%" onclick="seatModal('${t.id}',${num})" title="${label?esc(label):`Lugar ${num} vazio`}"><span>${label?esc(label):"+"}</span><small>${num}</small></button>`;
    }).join("");
    return `<article class="room-table-card" draggable="true" data-table-id="${t.id}">
      <div class="table-card-head"><button class="drag-handle" title="Arrastar mesa">⋮⋮</button><div><strong>${esc(t.name)}</strong><small>${occupied} de ${cap} lugares</small></div><button class="icon-edit" onclick="tableModal('${t.id}')">Editar</button></div>
      <div class="round-table-map">${seatEls}<div class="table-center"><strong>${esc(t.name)}</strong><span>${occupied}/${cap}</span></div></div>
    </article>`;
  }).join("")||`<div class="empty-room"><strong>Nenhuma mesa cadastrada.</strong><p>Crie uma mesa ou use o botão “Criar 15 mesas”.</p></div>`;
  enableTableDrag();
  if($("unassignedGuestTray")){
    const assigned=new Set(state.seats.filter(x=>x.guest_id).map(x=>`${x.guest_id}|${x.guest_index||1}`));
    const opts=guestSeatOptions().filter(x=>!assigned.has(x.key));
    $("unassignedGuestTray").innerHTML=opts.length?opts.map(x=>`<button class="drag-guest" draggable="true" data-guest-key="${x.key}" data-guest-label="${esc(x.label)}"><span>${esc(x.label)}</span><small>${esc(x.status)}</small></button>`).join(""):`<span class="empty-note">Todos já possuem lugar.</span>`;
    document.querySelectorAll(".drag-guest").forEach(el=>el.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/guest-key",el.dataset.guestKey);e.dataTransfer.setData("text/guest-label",el.dataset.guestLabel)}));
    document.querySelectorAll(".seat-point").forEach(seat=>{
      seat.addEventListener("dragover",e=>{e.preventDefault();seat.classList.add("drop-ready")});
      seat.addEventListener("dragleave",()=>seat.classList.remove("drop-ready"));
      seat.addEventListener("drop",async e=>{
        e.preventDefault();seat.classList.remove("drop-ready");
        const key=e.dataTransfer.getData("text/guest-key"),label=e.dataTransfer.getData("text/guest-label");if(!key||!state.seatsReady)return;
        const [guest_id,guest_index]=key.split("|"),table_id=seat.dataset.seatTable,seat_number=+seat.dataset.seatNumber;
        const occupied=state.seats.find(x=>x.table_id===table_id&&n(x.seat_number)===seat_number&&x.guest_label);
        if(occupied&&!confirm(`Substituir ${occupied.guest_label}?`))return;
        const existing=state.seats.find(x=>`${x.guest_id}|${x.guest_index||1}`===key);if(existing)await db.from("table_seats").delete().eq("id",existing.id);
        const {error}=await db.from("table_seats").upsert({table_id,seat_number,guest_id,guest_index:+guest_index,guest_label:label},{onConflict:"table_id,seat_number"});
        if(error)alert(error.message);else{toast(`${label} foi colocado na mesa.`);await loadAll()}
      });
    });
  }
}
function enableTableDrag(){
  let dragged=null;
  document.querySelectorAll(".room-table-card").forEach(card=>{
    card.ondragstart=()=>{dragged=card;card.classList.add("dragging")};
    card.ondragend=()=>{card.classList.remove("dragging");dragged=null};
    card.ondragover=e=>e.preventDefault();
    card.ondrop=async e=>{
      e.preventDefault();if(!dragged||dragged===card)return;
      const cards=[...$("tableCards").children],from=cards.indexOf(dragged),to=cards.indexOf(card);
      if(from<to)card.after(dragged);else card.before(dragged);
      const ordered=[...document.querySelectorAll(".room-table-card")];
      const updates=ordered.map((x,i)=>db.from("wedding_tables").update({position_index:i+1}).eq("id",x.dataset.tableId));
      const results=await Promise.all(updates);if(results.some(r=>r.error))toast("Execute a atualização do Supabase para salvar a posição das mesas.");else toast("Posição das mesas salva.");
    };
  });
}
$("addTableBtn").onclick=()=>tableModal();
$("create15TablesBtn").onclick=async()=>{
  if(state.tables.length>=15)return toast("Já existem 15 mesas ou mais.");
  const rows=[];for(let i=state.tables.length+1;i<=15;i++)rows.push({name:`Mesa ${i}`,capacity:10,position_index:i});
  const {error}=await db.from("wedding_tables").insert(rows);if(error)alert(error.message);else toast("Foram criadas 15 mesas com 10 lugares cada.");
};
window.tableModal=id=>{
  const t=state.tables.find(x=>x.id===id)||{name:"Mesa "+(state.tables.length+1),capacity:10,position_index:state.tables.length+1};state.edit=id;
  modal(id?"Editar mesa":"Nova mesa",`<div class="form"><label>Nome<input id="tName" value="${esc(t.name)}"></label><label>Quantidade de lugares<input id="tCap" type="number" min="1" max="20" value="${t.capacity}"></label><label>Posição no mapa<input id="tPos" type="number" min="1" value="${t.position_index||state.tables.length+1}"></label></div><div class="actions">${id?`<button class="danger" onclick="removeRow('wedding_tables','${id}')">Excluir mesa</button>`:""}<button class="primary" onclick="saveTable()">Salvar mesa</button></div>`)
};
window.saveTable=async()=>{
  const o={name:$("tName").value.trim(),capacity:+$("tCap").value,position_index:+$("tPos").value};if(!o.name||o.capacity<1)return toast("Preencha o nome e a quantidade de lugares.");
  const r=state.edit?await db.from("wedding_tables").update(o).eq("id",state.edit):await db.from("wedding_tables").insert(o);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Mesa salva.")}
};
window.seatModal=(tableId,seatNumber)=>{
  const table=state.tables.find(t=>t.id===tableId),seat=state.seats.find(s=>s.table_id===tableId&&n(s.seat_number)===seatNumber),opts=guestSeatOptions();state.edit={tableId,seatNumber};
  const selectedKey=seat?`${seat.guest_id}|${seat.guest_index||1}`:"";
  modal(`${table.name} • Lugar ${seatNumber}`,`<div class="seat-editor"><p class="muted">Escolha uma pessoa da lista ou escreva o nome exatamente como deseja mostrar no mapa.</p><label>Pessoa ou família<select id="seatGuest"><option value="">Lugar vazio</option>${opts.map(o=>`<option value="${o.key}" data-label="${esc(o.label)}" ${o.key===selectedKey?"selected":""}>${esc(o.label)} • ${o.status}</option>`).join("")}</select></label><label>Nome exibido<input id="seatLabel" value="${esc(seat?.guest_label||"")}" placeholder="Exemplo: João Silva"></label></div><div class="actions">${seat?`<button class="danger" onclick="clearSeat()">Remover deste lugar</button>`:""}<button class="primary" onclick="saveSeat()">Salvar lugar</button></div>`);
  $("seatGuest").onchange=e=>{const op=e.target.selectedOptions[0];$("seatLabel").value=op?.dataset.label||""};
};
window.saveSeat=async()=>{
  if(!state.seatsReady)return toast("Execute primeiro o arquivo ATUALIZAR_SUPABASE.sql.");
  const [guestId,index]=($("seatGuest").value||"|").split("|");
  const label=$("seatLabel").value.trim();
  const {tableId,seatNumber}=state.edit;
  const table=state.tables.find(t=>t.id===tableId);
  if(!label)return clearSeat();

  if(guestId){
    const existing=state.seats.find(s=>
      s.guest_id===guestId &&
      n(s.guest_index)===n(index||1) &&
      !(s.table_id===tableId&&n(s.seat_number)===seatNumber)
    );
    if(existing){
      const oldTable=state.tables.find(t=>t.id===existing.table_id);
      const move=confirm(`${label} já está em ${oldTable?.name||"outra mesa"}, lugar ${existing.seat_number}. Deseja mover para ${table.name}, lugar ${seatNumber}?`);
      if(!move)return;
      const removed=await db.from("table_seats").delete().eq("id",existing.id);
      if(removed.error)return alert(removed.error.message);
    }
  }

  const obj={
    table_id:tableId,
    seat_number:seatNumber,
    guest_id:guestId||null,
    guest_index:+index||1,
    guest_label:label,
    updated_at:new Date().toISOString()
  };
  const {error}=await db.from("table_seats").upsert(obj,{onConflict:"table_id,seat_number"});
  if(error)return alert(error.message);
  if(guestId)await db.from("guests").update({table_name:table.name,updated_at:new Date().toISOString()}).eq("id",guestId);
  $("modal").classList.add("hidden");
  toast("Lugar salvo.");
};
window.clearSeat=async()=>{
  if(!state.seatsReady)return toast("Execute primeiro o arquivo ATUALIZAR_SUPABASE.sql.");
  const {tableId,seatNumber}=state.edit,old=state.seats.find(s=>s.table_id===tableId&&n(s.seat_number)===seatNumber);
  const {error}=await db.from("table_seats").delete().eq("table_id",tableId).eq("seat_number",seatNumber);if(error)return alert(error.message);
  if(old?.guest_id){const remaining=state.seats.filter(s=>s.guest_id===old.guest_id&&!(s.table_id===tableId&&n(s.seat_number)===seatNumber));if(!remaining.length)await db.from("guests").update({table_name:null,updated_at:new Date().toISOString()}).eq("id",old.guest_id)}
  $("modal").classList.add("hidden");toast("Lugar liberado.");
};
function renderFinance(){const q=$("financeSearch").value.toLowerCase(),rows=state.finance.filter(x=>(x.description+" "+x.category).toLowerCase().includes(q)),planned=rows.reduce((a,x)=>a+n(x.planned),0),paid=rows.reduce((a,x)=>a+n(x.paid),0);$("financeSummary").innerHTML=`<span class="summary-pill">Previsto <strong>${money(planned)}</strong></span><span class="summary-pill">Pago <strong>${money(paid)}</strong></span><span class="summary-pill">Restante <strong>${money(planned-paid)}</strong></span>`;$("financeRows").innerHTML=rows.map(x=>{const rem=n(x.planned)-n(x.paid),today=new Date().toISOString().slice(0,10),status=rem<=0?"Pago":x.due_date&&x.due_date<today?"Atrasado":"Pendente";return `<tr><td>${esc(x.description)}</td><td>${esc(x.category)}</td><td>${money(x.planned)}</td><td>${money(x.paid)}</td><td>${money(rem)}</td><td>${dateBR(x.due_date)}</td><td>${badge(status)}</td><td><button class="secondary" onclick="financeModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('finance','${x.id}')">Excluir</button></td></tr>`}).join("")||`<tr><td colspan="8">Nenhum lançamento.</td></tr>`}
$("financeSearch").oninput=renderFinance;$("addFinanceBtn").onclick=()=>financeModal();window.financeModal=id=>{const x=state.finance.find(y=>y.id===id)||{description:"",category:"",planned:0,paid:0,due_date:""};state.edit=id;modal(id?"Editar lançamento":"Novo lançamento",`<div class="form"><label class="full">Descrição<input id="fDesc" value="${esc(x.description)}"></label><label>Categoria<input id="fCat" value="${esc(x.category)}"></label><label>Previsto<input id="fPlan" type="number" step=".01" min="0" value="${x.planned}"></label><label>Pago<input id="fPaid" type="number" step=".01" min="0" value="${x.paid}"></label><label>Vencimento<input id="fDue" type="date" value="${x.due_date||""}"></label></div><div class="actions"><button class="primary" onclick="saveFinance()">Salvar</button></div>`)};
window.saveFinance=async()=>{const o={description:$("fDesc").value.trim(),category:$("fCat").value.trim(),planned:+$("fPlan").value,paid:+$("fPaid").value,due_date:$("fDue").value||null};if(!o.description)return toast("Informe a descrição.");const r=state.edit?await db.from("finance").update(o).eq("id",state.edit):await db.from("finance").insert(o);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Lançamento salvo.")}};
function renderGifts(){const q=$("giftSearch").value.toLowerCase(),rows=state.gifts.filter(x=>(x.item+" "+x.given_by).toLowerCase().includes(q));$("giftSummary").innerHTML=`<span class="summary-pill">Total <strong>${rows.length}</strong></span><span class="summary-pill">Recebidos <strong>${rows.filter(x=>x.received).length}</strong></span><span class="summary-pill">A agradecer <strong>${rows.filter(x=>x.received&&!x.thanked).length}</strong></span>`;$("giftRows").innerHTML=rows.map(x=>`<tr><td>${esc(x.item)}</td><td>${esc(x.given_by)}</td><td>${badge(x.received?"Recebido":"Pendente")}</td><td>${badge(x.thanked?"Enviado":"Pendente")}</td><td><button class="secondary" onclick="giftModal('${x.id}')">Editar</button> <button class="danger" onclick="removeRow('gifts','${x.id}')">Excluir</button></td></tr>`).join("")||`<tr><td colspan="5">Nenhum presente.</td></tr>`}
$("giftSearch").oninput=renderGifts;$("addGiftBtn").onclick=()=>giftModal();window.giftModal=id=>{const x=state.gifts.find(y=>y.id===id)||{item:"",given_by:"",received:false,thanked:false};state.edit=id;modal(id?"Editar presente":"Novo presente",`<div class="form"><label class="full">Presente<input id="pItem" value="${esc(x.item)}"></label><label class="full">Quem deu<input id="pFrom" value="${esc(x.given_by)}"></label><label>Recebido<select id="pRec"><option value="false">Não</option><option value="true" ${x.received?"selected":""}>Sim</option></select></label><label>Agradecimento<select id="pThanks"><option value="false">Pendente</option><option value="true" ${x.thanked?"selected":""}>Enviado</option></select></label></div><div class="actions"><button class="primary" onclick="saveGift()">Salvar</button></div>`)};
window.saveGift=async()=>{const o={item:$("pItem").value.trim(),given_by:$("pFrom").value.trim(),received:$("pRec").value==="true",thanked:$("pThanks").value==="true"};if(!o.item)return toast("Informe o presente.");const r=state.edit?await db.from("gifts").update(o).eq("id",state.edit):await db.from("gifts").insert(o);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast("Presente salvo.")}};
function renderTasks(){
  const f=$("taskFilter").value,today=new Date().toISOString().slice(0,10),rows=state.tasks.filter(x=>!f||(f==="open"&&!x.completed)||(f==="done"&&x.completed)||(f==="late"&&!x.completed&&x.due_date&&x.due_date<today));
  $("taskSummaryTop").innerHTML=`<span class="summary-pill">Total <strong>${state.tasks.length}</strong></span><span class="summary-pill">Concluídas <strong>${state.tasks.filter(x=>x.completed).length}</strong></span><span class="summary-pill">Atrasadas <strong>${state.tasks.filter(x=>!x.completed&&x.due_date&&x.due_date<today).length}</strong></span>`;
  $("taskList").innerHTML=rows.map(x=>{const late=!x.completed&&x.due_date&&x.due_date<today;return `<div class="task-row ${x.completed?"done":late?"late":""}"><input type="checkbox" ${x.completed?"checked":""} onchange="toggleTask('${x.id}',this.checked)"><div class="task-main"><div class="task-title-line"><strong>${esc(x.title)}</strong>${x.priority?`<span class="priority priority-${esc(x.priority.toLowerCase())}">${esc(x.priority)}</span>`:""}</div><small>${x.due_date?"Prazo: "+dateBR(x.due_date):"Sem prazo"}${late?" • Atrasada":""}</small>${x.notes?`<p>${esc(x.notes)}</p>`:""}</div><button class="secondary" onclick="taskModal('${x.id}')">Editar</button><button class="danger" onclick="removeRow('tasks','${x.id}')">Excluir</button></div>`}).join("")||`<p style="padding:16px">Nenhuma tarefa nesta visão.</p>`
}
$("taskFilter").oninput=renderTasks;$("addTaskBtn").onclick=()=>taskModal();
window.taskModal=id=>{const x=state.tasks.find(t=>t.id===id)||{title:"",due_date:"",priority:"Normal",notes:"",completed:false};state.edit=id;modal(id?"Editar tarefa":"Nova tarefa",`<div class="form"><label class="full">Tarefa<input id="cTitle" value="${esc(x.title)}"></label><label>Data<input id="cDue" type="date" value="${x.due_date||""}"></label><label>Prioridade<select id="cPriority">${["Baixa","Normal","Alta"].map(p=>`<option ${p===(x.priority||"Normal")?"selected":""}>${p}</option>`)}</select></label><label class="full">Observações<textarea id="cNotes">${esc(x.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveTask()">Salvar tarefa</button></div>`)};
window.saveTask=async()=>{const title=$("cTitle").value.trim();if(!title)return toast("Informe a tarefa.");const obj={title,due_date:$("cDue").value||null,priority:$("cPriority").value,notes:$("cNotes").value.trim()};const r=state.edit?await db.from("tasks").update(obj).eq("id",state.edit):await db.from("tasks").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");toast(state.edit?"Tarefa atualizada.":"Tarefa adicionada.")}};
window.toggleTask=async(id,v)=>{const {error}=await db.from("tasks").update({completed:v}).eq("id",id);if(error)alert(error.message);else toast(v?"Tarefa concluída.":"Tarefa reaberta.")};
window.removeRow=async(table,id)=>{if(confirm("Excluir este item? Essa ação não pode ser desfeita.")){const {error}=await db.from(table).delete().eq("id",id);if(error)alert(error.message);else toast("Item excluído.")}};

function renderDocuments(){
  if(!$("documentGrid"))return;const q=($("documentSearch")?.value||"").toLowerCase(),cat=$("documentCategory")?.value||"";
  const rows=state.documents.filter(x=>(`${x.title} ${x.provider||""}`).toLowerCase().includes(q)&&(!cat||x.category===cat));
  $("documentSummary").innerHTML=`<span class="summary-pill">Total <strong>${rows.length}</strong></span><span class="summary-pill">Contratos <strong>${rows.filter(x=>x.category==="Contrato").length}</strong></span>`;
  $("documentGrid").innerHTML=rows.map(x=>`<article class="card document-card"><div class="document-icon">▣</div><div><span class="badge neutral">${esc(x.category)}</span><h4>${esc(x.title)}</h4><p>${esc(x.provider||"")}</p><small>${esc(x.notes||"")}</small></div><div class="document-actions">${x.url?`<a class="secondary button-link" href="${esc(x.url)}" target="_blank">Abrir</a>`:""}<button class="secondary" onclick="documentModal('${x.id}')">Editar</button><button class="danger" onclick="removeRow('documents','${x.id}')">Excluir</button></div></article>`).join("")||`<div class="card empty-room"><strong>Nenhum documento cadastrado.</strong></div>`;
}
window.documentModal=id=>{const x=state.documents.find(v=>v.id===id)||{title:"",category:"Contrato",provider:"",url:"",notes:""};state.edit=id;modal(id?"Editar documento":"Novo documento",`<div class="form"><label class="full">Título<input id="docTitle" value="${esc(x.title)}"></label><label>Categoria<select id="docCat">${["Contrato","Comprovante","Orçamento","Lista","Outro"].map(v=>`<option ${v===x.category?"selected":""}>${v}</option>`)}</select></label><label>Fornecedor<input id="docProvider" value="${esc(x.provider||"")}"></label><label class="full">Link<input id="docUrl" value="${esc(x.url||"")}"></label><label class="full">Observações<textarea id="docNotes">${esc(x.notes||"")}</textarea></label></div><div class="actions"><button class="primary" onclick="saveDocument()">Salvar</button></div>`)};
window.saveDocument=async()=>{if(!$("docTitle").value.trim())return toast("Informe o título.");const obj={title:$("docTitle").value.trim(),category:$("docCat").value,provider:$("docProvider").value.trim(),url:$("docUrl").value.trim(),notes:$("docNotes").value,updated_at:new Date().toISOString()};const r=state.edit?await db.from("documents").update(obj).eq("id",state.edit):await db.from("documents").insert(obj);if(r.error)alert(r.error.message);else{$("modal").classList.add("hidden");await loadAll()}};
function renderReports(){}
function pdfDoc(title,subtitle){const {jsPDF}=window.jspdf||{};if(!jsPDF)return null;const d=new jsPDF({unit:"mm",format:"a4"});d.setFont("helvetica","bold");d.setFontSize(17);d.text(title,15,18);d.setFont("helvetica","normal");d.setFontSize(10);d.text(subtitle,15,25);d.line(15,30,195,30);return d}
function savePdf(doc,lines,name){let y=39;lines.forEach(line=>{const w=doc.splitTextToSize(String(line),178);if(y+w.length*5>282){doc.addPage();y=18}doc.text(w,16,y);y+=w.length*5+2});doc.save(name)}
function reportWeddingGuests(){const d=pdfDoc("Nahvio • Convidados","Resumo do casamento");if(!d)return;savePdf(d,state.guests.map(g=>`${g.name} • ${g.rsvp_status} • ${people(g)} pessoa(s) • ${g.table_name||"Sem mesa"}`),"nahvio_convidados.pdf")}
function reportFinance(){const d=pdfDoc("Nahvio • Financeiro","Resumo de pagamentos");if(!d)return;const p=state.finance.reduce((a,x)=>a+n(x.planned),0),pg=state.finance.reduce((a,x)=>a+n(x.paid),0);savePdf(d,[`Previsto: ${money(p)}`,`Pago: ${money(pg)}`,`Restante: ${money(p-pg)}`,"",...state.finance.map(x=>`${x.description} • ${money(x.paid)} pago`)],"nahvio_financeiro.pdf")}
function reportPending(){const d=pdfDoc("Nahvio • Pendências","Itens que precisam de atenção");if(!d)return;const today=new Date().toISOString().slice(0,10),l=[];state.guests.filter(x=>x.rsvp_status==="Pendente").forEach(x=>l.push(`Convidado pendente: ${x.name}`));state.tasks.filter(x=>!x.completed&&x.due_date&&x.due_date<today).forEach(x=>l.push(`Tarefa atrasada: ${x.title}`));state.tables.filter(x=>tableUsage(x)===0).forEach(x=>l.push(`Mesa vazia: ${x.name}`));savePdf(d,l.length?l:["Nenhuma pendência."],"nahvio_pendencias.pdf")}
function reportShower(){const d=pdfDoc("Nahvio • Chá de Cozinha",`${dateBR(state.showerSettings.eventDate)} às ${state.showerSettings.eventTime}`);if(!d)return;savePdf(d,[`Cadastros: ${state.showerGuests.length}`,`Confirmados: ${state.showerGuests.filter(x=>x.rsvp_status==="Confirmado").length}`,"",...state.showerGames.map(x=>`${x.position_index}. ${x.title} • ${x.status}`)],"nahvio_cha.pdf")}
function renderCeremony(){if(!$("ceremonyChecklist"))return;$("ceremonyChecklist").innerHTML=state.tasks.filter(x=>!x.completed).slice(0,8).map(x=>`<label><input type="checkbox"><span>${esc(x.title)}</span></label>`).join("")||`<p class="empty-note">Nenhuma tarefa pendente.</p>`;updateCeremony()}
function updateCeremony(){if(!$("ceremonyTime"))return;const now=new Date();$("ceremonyDate").textContent=now.toLocaleDateString("pt-BR",{dateStyle:"full"});$("ceremonyTime").textContent=now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});const wt=state.settings?.weddingTime||"16:30",mins=now.getHours()*60+now.getMinutes(),base=[{time:wt,title:"Cerimônia",notes:"Início da cerimônia"},{time:"17:30",title:"Fotos",notes:"Fotos com familiares"},{time:"18:30",title:"Recepção",notes:"Recepção dos convidados"},{time:"20:00",title:"Jantar",notes:"Serviço principal"}].map(x=>({...x,min:+x.time.split(":")[0]*60 + +x.time.split(":")[1]}));const cur=[...base].reverse().find(x=>x.min<=mins),next=base.find(x=>x.min>mins);$("ceremonyNowTitle").textContent=cur?.title||"Preparação";$("ceremonyNowNotes").textContent=cur?.notes||"Aguardando o início.";$("ceremonyNextTitle").textContent=next?.title||"Encerramento";$("ceremonyNextNotes").textContent=next?`${next.time} • ${next.notes}`:"Sem próxima etapa.";const wedding=new Date(`${state.settings.weddingDate}T${wt}:00-03:00`);$("ceremonyCountdown").textContent=wedding>now?`Faltam ${Math.ceil((wedding-now)/86400000)} dias`:"Evento em andamento ou concluído"}
function renderAssistant(){}
function answerAssistant(){const q=($("assistantQuestion").value||"").toLowerCase();let a;if(q.includes("não responder")||q.includes("pendente")&&q.includes("convid")){const r=state.guests.filter(x=>x.rsvp_status==="Pendente");a=`Há ${r.length} convite(s) pendente(s): ${r.slice(0,8).map(x=>x.name).join(", ")}.`}else if(q.includes("falta pagar")||q.includes("restante")){const p=state.finance.reduce((s,x)=>s+n(x.planned),0),pg=state.finance.reduce((s,x)=>s+n(x.paid),0);a=`Ainda falta pagar ${money(Math.max(0,p-pg))}.`}else if(q.includes("mesa")&&q.includes("vazia")){const r=state.tables.filter(x=>tableUsage(x)===0);a=r.length?`Mesas vazias: ${r.map(x=>x.name).join(", ")}.`:"Não há mesas vazias."}else if(q.includes("tarefa")&&q.includes("atras")){const t=new Date().toISOString().slice(0,10),r=state.tasks.filter(x=>!x.completed&&x.due_date&&x.due_date<t);a=r.length?`Tarefas atrasadas: ${r.map(x=>x.title).join(", ")}.`:"Não há tarefas atrasadas."}else if(q.includes("chá")&&q.includes("convid"))a=`O chá tem ${state.showerGuests.length} cadastros e ${state.showerGuests.filter(x=>x.rsvp_status==="Confirmado").length} confirmados.`;else a="Posso responder sobre convidados pendentes, valor restante, mesas vazias, tarefas atrasadas e convidados do chá.";$("assistantAnswer").textContent=a}

function renderSettings(){const s=state.settings;$("sAppTitle").value=s.appTitle;$("sCoupleNames").value=s.coupleNames;$("sDate").value=s.weddingDate;$("sTime").value=s.weddingTime;$("sSubtitle").value=s.subtitle;$("sGuestLimit").value=s.guestLimit;$("sCapacity").value=s.defaultTableCapacity;$("sAdultWeight").value=s.adultWeight;$("sChild08Weight").value=s.child08Weight;$("sChild912Weight").value=s.child912Weight;$("sAdultSeat").value=String(s.adultSeat);$("sChild08Seat").value=String(s.child08Seat);$("sChild912Seat").value=String(s.child912Seat)}
$("saveSettingsBtn").onclick=async()=>{const value={appTitle:$("sAppTitle").value,coupleNames:$("sCoupleNames").value,weddingDate:$("sDate").value,weddingTime:$("sTime").value,subtitle:$("sSubtitle").value,guestLimit:+$("sGuestLimit").value,defaultTableCapacity:+$("sCapacity").value,adultWeight:+$("sAdultWeight").value,child08Weight:+$("sChild08Weight").value,child912Weight:+$("sChild912Weight").value,adultSeat:$("sAdultSeat").value==="true",child08Seat:$("sChild08Seat").value==="true",child912Seat:$("sChild912Seat").value==="true"};const {error}=await db.from("settings").update({value,updated_at:new Date().toISOString()}).eq("key","general");error?alert(error.message):toast("Configurações salvas.")};
function csv(name,headers,rows){const text="\ufeff"+[headers,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$("exportGuestsBtn").onclick=()=>csv("convidados_nahvio.csv",["Nome","Lado","Adultos","0 a 8","9 a 12","Equivalência em adultos","Lugares","Convite","Confirmação","Mesa","Observações"],guestFiltered().map(g=>[g.name,g.side,g.adults,g.children_0_8,g.children_9_12,weight(g),seats(g),g.invitation_status,g.rsvp_status,g.table_name||"",g.notes||""]));
$("exportFinanceBtn").onclick=()=>csv("financeiro_nahvio.csv",["Descrição","Categoria","Previsto","Pago","Restante","Vencimento"],state.finance.map(x=>[x.description,x.category,x.planned,x.paid,n(x.planned)-n(x.paid),x.due_date||""]));
auth();


["showerGameSearch","showerGameStatus"].forEach(id=>{if($(id))$(id).oninput=renderShowerGames});
if($("addShowerGameBtn"))$("addShowerGameBtn").onclick=()=>showerGameModal();
if($("exportShowerGamesPdfBtn"))$("exportShowerGamesPdfBtn").onclick=exportShowerGamesPDF;
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-open-page]");
  if(!b)return;
  const page=pages.find(x=>x.id===b.dataset.openPage);
  openPage(b.dataset.openPage,page?.label||"Chá de Cozinha");
});

["showerGuestSearch","showerGuestStatus"].forEach(id=>{if($(id))$(id).oninput=renderShowerGuests});
["showerGiftSearch","showerGiftFilter"].forEach(id=>{if($(id))$(id).oninput=renderShowerGifts});
if($("showerTaskFilter"))$("showerTaskFilter").oninput=renderShowerTasks;
if($("showerFinanceSearch"))$("showerFinanceSearch").oninput=renderShowerFinance;
if($("addShowerGuestBtn"))$("addShowerGuestBtn").onclick=()=>showerGuestModal();
if($("addShowerGiftBtn"))$("addShowerGiftBtn").onclick=()=>showerGiftModal();
if($("addShowerTaskBtn"))$("addShowerTaskBtn").onclick=()=>showerTaskModal();
if($("addShowerFinanceBtn"))$("addShowerFinanceBtn").onclick=()=>showerFinanceModal();
if($("addShowerScheduleBtn"))$("addShowerScheduleBtn").onclick=()=>showerScheduleModal();
if($("exportShowerPdfBtn"))$("exportShowerPdfBtn").onclick=exportShowerPDF;
if($("importWeddingGuestsBtn"))$("importWeddingGuestsBtn").onclick=()=>{
  const imported=new Set(state.showerGuests.map(x=>x.full_name.trim().toLowerCase()));
  const options=state.guests.map(g=>{
    const already=imported.has(String(g.name||"").trim().toLowerCase());
    return `<label class="import-option ${already?"already-imported":""}" data-import-name="${esc(String(g.name||"").toLowerCase())}" data-import-status="${esc(String(g.rsvp_status||"").toLowerCase())}">
      <input type="checkbox" value="${g.id}" ${already?"disabled":""}>
      <span>${esc(g.name)}</span>
      <small>${already?"Já importado":esc(g.rsvp_status)}</small>
    </label>`;
  }).join("");
  modal("Importar convidados do casamento",`
    <p class="muted">Pesquise e selecione quem também será convidado para o chá. Os cadastros continuarão independentes.</p>
    <div class="import-toolbar">
      <input id="importGuestSearch" class="search" placeholder="Pesquisar convidado">
      <select id="importGuestStatus">
        <option value="">Todos os status</option>
        <option value="confirmado">Confirmado</option>
        <option value="pendente">Pendente</option>
        <option value="recusado">Recusado</option>
      </select>
    </div>
    <div class="import-actions-row">
      <button type="button" class="secondary" id="selectVisibleGuestsBtn">Selecionar visíveis</button>
      <button type="button" class="secondary" id="clearImportedSelectionBtn">Limpar seleção</button>
      <span id="importSelectedCount">0 selecionados</span>
    </div>
    <div class="import-list">${options}</div>
    <div class="actions"><button class="primary" onclick="importWeddingGuests()">Importar selecionados</button></div>
  `);
  const applyFilter=()=>{
    const q=($("importGuestSearch")?.value||"").trim().toLowerCase();
    const status=$("importGuestStatus")?.value||"";
    document.querySelectorAll(".import-option").forEach(row=>{
      const matchName=!q||row.dataset.importName.includes(q);
      const matchStatus=!status||row.dataset.importStatus===status;
      row.hidden=!(matchName&&matchStatus);
    });
  };
  const updateCount=()=>{
    const count=document.querySelectorAll(".import-option input:checked").length;
    if($("importSelectedCount"))$("importSelectedCount").textContent=`${count} selecionado${count===1?"":"s"}`;
  };
  $("importGuestSearch").oninput=applyFilter;
  $("importGuestStatus").onchange=applyFilter;
  document.querySelectorAll(".import-option input").forEach(x=>x.onchange=updateCount);
  $("selectVisibleGuestsBtn").onclick=()=>{
    document.querySelectorAll(".import-option:not([hidden]) input:not(:disabled)").forEach(x=>x.checked=true);
    updateCount();
  };
  $("clearImportedSelectionBtn").onclick=()=>{
    document.querySelectorAll(".import-option input:checked").forEach(x=>x.checked=false);
    updateCount();
  };
};
window.importWeddingGuests=async()=>{
  const ids=[...document.querySelectorAll(".import-option input:checked")].map(x=>x.value);
  if(!ids.length)return toast("Selecione pelo menos uma pessoa.");
  const existing=new Set(state.showerGuests.map(x=>x.full_name.toLowerCase()));
  const rows=state.guests.filter(g=>ids.includes(g.id)&&!existing.has(g.name.toLowerCase())).map(g=>({full_name:g.name,cpf:null,phone:"",companions:Math.max(0,people(g)-1),rsvp_status:g.rsvp_status==="Recusado"?"Pendente":g.rsvp_status,notes:"Importado da lista do casamento"}));
  if(!rows.length)return toast("Os selecionados já foram importados.");
  const {error}=await db.from("shower_guests").insert(rows);if(error)alert(error.message);else{$("modal").classList.add("hidden");toast(`${rows.length} convidado(s) importado(s).`);await loadAll()}
};
if($("saveShowerSettingsBtn"))$("saveShowerSettingsBtn").onclick=async()=>{
  const value={eventName:$("shName").value.trim()||"Chá de Cozinha",menuLabel:$("shMenuLabel").value.trim()||"Chá de Cozinha",eventIcon:$("shEventIcon").value.trim()||"🎁",eventDate:$("shDate").value,eventTime:$("shTime").value,endTime:$("shEndTime").value,location:$("shLocation").value.trim(),address:$("shAddress").value.trim(),mapsLink:$("shMaps").value.trim(),budget:+$("shBudget").value,guestLimit:+$("shGuestLimit").value,cpfRequired:$("shCpfRequired").value==="true",showCpf:$("shShowCpf").value==="true",allowCompanions:$("shAllowCompanions").value==="true",maxCompanions:+$("shMaxCompanions").value,showTasks:$("shShowTasks").value==="true",showFinance:$("shShowFinance").value==="true",primaryColor:$("shPrimaryColor").value,secondaryColor:$("shSecondaryColor").value,confirmMessage:$("shConfirmMessage").value,declineMessage:$("shDeclineMessage").value,notes:$("shNotes").value};
  const {error}=await db.from("shower_settings").upsert({key:"general",value,updated_at:new Date().toISOString()},{onConflict:"key"});error?alert(error.message):toast("Configurações do chá salvas.");
};




document.addEventListener("click",e=>{const b=e.target.closest("[data-alert-page]");if(b){const p=pages.find(x=>x.id===b.dataset.alertPage);openPage(b.dataset.alertPage,p?.label||"Página")}});
["documentSearch","documentCategory"].forEach(id=>{if($(id))$(id).oninput=renderDocuments});
if($("addDocumentBtn"))$("addDocumentBtn").onclick=()=>documentModal();
if($("reportWeddingGuestsBtn"))$("reportWeddingGuestsBtn").onclick=reportWeddingGuests;
if($("reportFinanceBtn"))$("reportFinanceBtn").onclick=reportFinance;
if($("reportPendingBtn"))$("reportPendingBtn").onclick=reportPending;
if($("reportShowerBtn"))$("reportShowerBtn").onclick=reportShower;
if($("assistantAskBtn"))$("assistantAskBtn").onclick=answerAssistant;
if($("assistantQuestion"))$("assistantQuestion").onkeydown=e=>{if(e.key==="Enter")answerAssistant()};
document.querySelectorAll("[data-assistant-question]").forEach(b=>b.onclick=()=>{$("assistantQuestion").value=b.dataset.assistantQuestion;answerAssistant()});
if($("ceremonyFullscreenBtn"))$("ceremonyFullscreenBtn").onclick=()=>document.body.classList.toggle("ceremony-display");
setInterval(updateCeremony,30000);


