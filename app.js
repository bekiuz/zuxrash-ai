(function () {
"use strict";
const STORAGE_KEY = "zuxrash-ai-workflow-v1";
const NODE_WIDTH = 220;
const stage = document.getElementById("canvas-stage");
const nodesLayer = document.getElementById("nodes-layer");
const connectionsLayer = document.getElementById("connections-layer");
const inspectorBody = document.getElementById("inspector-body");
const inspectorTitle = document.getElementById("inspector-title");
const inspectorSubtitle = document.getElementById("inspector-subtitle");
const addMenu = document.getElementById("add-menu");
const toastRegion = document.getElementById("toast-region");
const runInput = document.getElementById("run-input");
const typeInfo = {
 trigger:{label:"Boshlash",subtitle:"Workflow boshlanish nuqtasi.",icon:"▶",kind:"TRIGGER",color:"trigger",description:"Yangi jarayon shu nuqtadan boshlanadi."},
 ai:{label:"AI javob",subtitle:"AI vazifasi va prompt sozlamalari.",icon:"✦",kind:"AI STEP",color:"ai",description:"Foydalanuvchi topshirig‘ini tahlil qilib, javob tayyorlaydi."},
 telegram:{label:"Telegram xabar",subtitle:"Telegram xabari uchun qadam.",icon:"➤",kind:"INTEGRATION",color:"telegram",description:"Tayyor natijani Telegram bot orqali yuborish uchun mo‘ljallangan."},
 condition:{label:"Shart",subtitle:"Natijaga qarab keyingi qadamni tanlash.",icon:"◇",kind:"LOGIC",color:"condition",description:"Natijani shart bilan tekshirish uchun qadam."},
 delay:{label:"Kutish",subtitle:"Jarayon orasiga kutish vaqtini qo‘shish.",icon:"◷",kind:"UTILITY",color:"delay",description:"Keyingi qadamdan oldin kutish vaqtini belgilaydi."},
 end:{label:"Yakunlash",subtitle:"Workflow oxirini bildiradi.",icon:"■",kind:"END",color:"end",description:"Jarayonning tugash nuqtasi."}
};
function makeNode(id,type,x,y,label,description){
 const info=typeInfo[type]||typeInfo.ai;
 return {id:id,type:type,label:label||info.label,description:description||info.description,x:x,y:y,settings:{prompt:type==="ai"?"Foydalanuvchi so‘rovini tushun, aniq va foydali javob tayyorla.":"",message:type==="telegram"?"Assalomu alaykum! Sizning natijangiz tayyor.":"",condition:type==="condition"?"Natija bo‘sh emas":"",delay:type==="delay"?"5":""}};
}
function createDefaultState(){return {name:"ZUXRASH demo workflow",nodes:[makeNode("trigger-1","trigger",70,220,"Boshlash","Workflow ishga tushirilganda boshlanadi."),makeNode("ai-1","ai",350,220,"AI javob","Kiritilgan vazifani AI yordamida tahlil qilish."),makeNode("telegram-1","telegram",630,220,"Telegram xabar","Tayyor javobni Telegram’ga yuborish."),makeNode("end-1","end",910,220,"Yakunlash","Workflow yakunlanadi.")],edges:[{id:"edge-1",from:"trigger-1",to:"ai-1"},{id:"edge-2",from:"ai-1",to:"telegram-1"},{id:"edge-3",from:"telegram-1",to:"end-1"}]};}
function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return createDefaultState();const parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.nodes)||!Array.isArray(parsed.edges)||!parsed.nodes.length)return createDefaultState();return {name:parsed.name||"Yangi workflow",nodes:parsed.nodes,edges:parsed.edges};}catch(error){return createDefaultState();}}
let state=loadState();
let selectedNodeId=state.nodes[0]?state.nodes[0].id:null;
let pendingSourceId=null;
let isRunning=false;
let dragState=null;
let lastRunToken=0;
function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char];});}
function selectedNode(){return state.nodes.find(function(node){return node.id===selectedNodeId;})||null;}
function findNode(id){return state.nodes.find(function(node){return node.id===id;})||null;}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));document.getElementById("save-state").textContent="Avto-saqlash yoqilgan";}catch(error){document.getElementById("save-state").textContent="Saqlash mavjud emas";}document.getElementById("step-count").textContent=String(state.nodes.length);document.getElementById("breadcrumb-title").textContent=state.name;}
function showToast(message){const toast=document.createElement("div");toast.className="toast";toast.textContent=message;toastRegion.appendChild(toast);window.setTimeout(function(){toast.style.opacity="0";toast.style.transform="translateY(5px)";window.setTimeout(function(){toast.remove();},220);},2800);}
function drawNodes(){
 nodesLayer.innerHTML=state.nodes.map(function(node){
  const info=typeInfo[node.type]||typeInfo.ai;
  const selected=node.id===selectedNodeId?" selected":"";
  const runtime=node.runtimeState?" "+node.runtimeState:"";
  const pending=pendingSourceId===node.id?" pending":"";
  const status=node.runtimeState==="complete"?"✓ Bajarildi":node.runtimeState==="running"?"● Bajarilmoqda":"● Tayyor";
  return '<article class="node-card'+selected+runtime+'" data-node-id="'+escapeHtml(node.id)+'" style="left:'+Number(node.x)+'px;top:'+Number(node.y)+'px">'+
  '<button class="port port-input" data-port="input" data-node-id="'+escapeHtml(node.id)+'" aria-label="Kirish nuqtasi"></button>'+
  '<button class="port port-output'+pending+'" data-port="output" data-node-id="'+escapeHtml(node.id)+'" aria-label="Chiqish nuqtasi"></button>'+
  '<div class="node-header" data-drag-handle="true"><span class="node-icon '+info.color+'">'+info.icon+'</span><span class="node-heading"><strong>'+escapeHtml(node.label)+'</strong><small>'+info.kind+'</small></span><span class="node-actions"><span class="node-status"></span><button class="node-delete" type="button" data-delete-node="'+escapeHtml(node.id)+'" aria-label="Qadamni o‘chirish">×</button></span></div>'+
  '<div class="node-body">'+escapeHtml(node.description||info.description)+'</div>'+
  '<div class="node-bottom"><span class="node-kind">'+info.label+'</span><span>'+status+'</span></div></article>';
 }).join("");
 drawConnections();
 persist();
}
function drawConnections(){
 connectionsLayer.setAttribute("viewBox","0 0 1320 760");
 connectionsLayer.innerHTML=state.edges.map(function(edge){
  const from=findNode(edge.from),to=findNode(edge.to);
  if(!from||!to)return "";
  const sx=Number(from.x)+NODE_WIDTH,sy=Number(from.y)+51,tx=Number(to.x),ty=Number(to.y)+51;
  const bend=Math.max(45,Math.abs(tx-sx)*.45),cx1=sx+bend,cx2=tx-bend;
  const active=from.runtimeState==="complete"&&to.runtimeState==="complete"?" active":"";
  return '<path class="connection-path'+active+'" d="M '+sx+' '+sy+' C '+cx1+' '+sy+', '+cx2+' '+ty+', '+tx+' '+ty+'"></path><circle class="connection-dot" cx="'+tx+'" cy="'+ty+'" r="3"></circle>';
 }).join("");
}
function field(label,key,value,help,multiline){
 const input=multiline?'<textarea class="field-textarea" data-field="'+key+'" rows="5">'+escapeHtml(value)+'</textarea>':'<input class="field-input" data-field="'+key+'" value="'+escapeHtml(value)+'" maxlength="160">';
 return '<label class="field-group"><span class="field-label">'+label+'</span>'+input+(help?'<span class="field-help">'+help+'</span>':"")+'</label>';
}
function renderInspector(){
 const node=selectedNode();
 if(!node){inspectorTitle.textContent="Qadam tanlanmagan";inspectorSubtitle.textContent="Sozlash uchun workflow ichidan blok tanlang.";inspectorBody.innerHTML='<div class="field-static">Yangi qadam qo‘shish tugmasi orqali workflow’ni kengaytiring.</div>';return;}
 const info=typeInfo[node.type]||typeInfo.ai;
 inspectorTitle.textContent=node.label||info.label;inspectorSubtitle.textContent=info.subtitle;
 let html=field("Qadam nomi","label",node.label,"Bu nom workflow blokida ko‘rinadi.",false);
 html+=field("Izoh","description",node.description,"",true);
 if(node.type==="ai")html+=field("AI prompt","setting-prompt",node.settings&&node.settings.prompt||"","Hozircha prompt saqlanadi; tashqi AI modeli ulanmagan.",true);
 else if(node.type==="telegram")html+=field("Xabar matni","setting-message",node.settings&&node.settings.message||"","Bot tokeni va chat ID integratsiya bosqichida qo‘shiladi.",true);
 else if(node.type==="condition")html+=field("Tekshiriladigan shart","setting-condition",node.settings&&node.settings.condition||"","Hozircha bu shart demo rejimida saqlanadi.",true);
 else if(node.type==="delay")html+=field("Kutish (soniya)","setting-delay",node.settings&&node.settings.delay||"5","Demo testda kutish vaqti haqiqiy taymer sifatida ishlatilmaydi.",false);
 else if(node.type==="trigger")html+='<div class="field-group"><span class="field-label">Trigger turi</span><div class="field-static">Qo‘lda ishga tushirish <span style="color:#7fd9b3">· Faol</span></div><span class="field-help">Jadval va webhook triggerlari keyingi versiyada qo‘shiladi.</span></div>';
 else html+='<div class="field-group"><span class="field-label">Holat</span><div class="field-static">Ushbu blok workflow tugaganini bildiradi.</div></div>';
 if(node.runtimeOutput)html+='<div class="field-group"><span class="field-label">Oxirgi demo natija</span><div class="field-static">' + escapeHtml(node.runtimeOutput) + '</div></div>';
 html+='<div class="inspector-actions"><button class="button button-quiet" id="duplicate-node" type="button">⧉ Nusxalash</button><button class="button button-danger" id="delete-selected-node" type="button">O‘chirish</button></div>';
 html+='<div class="field-group" style="margin-top:16px"><span class="field-label">Qadam identifikatori</span><div class="field-static">'+escapeHtml(node.id)+'</div></div>';
 inspectorBody.innerHTML=html;
}
function rerender(){drawNodes();renderInspector();}
function connect(fromId,toId){
 if(!fromId||!toId||fromId===toId){showToast("Qadamni o‘ziga ulab bo‘lmaydi.");return false;}
 if(state.edges.some(function(edge){return edge.from===fromId&&edge.to===toId;})){showToast("Bu ulanish allaqachon mavjud.");return false;}
 state.edges.push({id:"edge-"+Date.now().toString(36),from:fromId,to:toId});return true;
}
function addNode(type){
 const info=typeInfo[type]||typeInfo.ai,index=state.nodes.length;
 const id=type+"-"+Date.now().toString(36),x=Math.min(70+(index%4)*265,1050),y=80+Math.floor(index/4)*155+(index%2)*35;
 state.nodes.push(makeNode(id,type,x,y));selectedNodeId=id;addMenu.hidden=true;rerender();showToast(info.label+" qadami qo‘shildi.");
}
function deleteNode(id){
 if(state.nodes.length<=1){showToast("Kamida bitta qadam qolishi kerak.");return;}
 state.nodes=state.nodes.filter(function(node){return node.id!==id;});
 state.edges=state.edges.filter(function(edge){return edge.from!==id&&edge.to!==id;});
 if(selectedNodeId===id)selectedNodeId=state.nodes[0].id;if(pendingSourceId===id)pendingSourceId=null;rerender();showToast("Qadam o‘chirildi.");
}
function exportWorkflow(){
 const data={app:"ZUXRASH AI",formatVersion:1,exportedAt:new Date().toISOString(),workflow:state};
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 const safeName=(state.name||"zuxrash-workflow").toLowerCase().replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"")||"zuxrash-workflow";
 link.href=url;link.download=safeName+".json";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);showToast("Workflow JSON fayli tayyor.");
}
function delay(ms){return new Promise(function(resolve){window.setTimeout(resolve,ms);});}
function processTemplate(template, context) {
 return String(template || "").replace(/\{\{\s*(input|previous|output|workflow)\s*\}\}/gi,function(_,key){
  const normalized=key.toLowerCase();
  if(normalized==="workflow")return String(context.workflow||"");
  if(normalized==="input")return String(context.input||"");
  return String(context.previous||context.output||"");
 });
}
function evaluateCondition(expression,value){
 const exp=String(expression||"").trim().toLowerCase();
 const text=String(value==null?"":value).trim();
 if(!exp||exp.indexOf("bo‘sh emas")>=0||exp.indexOf("bo'sh emas")>=0||exp==="not-empty"||exp==="not empty")return text.length>0;
 if(exp.indexOf("bo‘sh")>=0||exp.indexOf("bo'sh")>=0||exp==="empty")return text.length===0;
 if(exp.indexOf("contains:")===0)return text.toLowerCase().indexOf(exp.slice(9).trim())>=0;
 if(exp.indexOf("equals:")===0)return text.toLowerCase()===exp.slice(7).trim();
 if(exp.indexOf("starts-with:")===0)return text.toLowerCase().indexOf(exp.slice(12).trim())===0;
 return text.toLowerCase().indexOf(exp)>=0;
}
async function runWorkflow(){
 if(isRunning)return;
 if(!state.nodes.length){showToast("Avval workflow’ga qadam qo‘shing.");return;}
 isRunning=true;
 const token=++lastRunToken;
 const runButton=document.getElementById("run-button");
 const logList=document.getElementById("run-log-list");
 const summary=document.getElementById("run-summary");
 const outputPanel=document.getElementById("run-output");
 const outputText=document.getElementById("run-output-text");
 const inputText=String(runInput.value||"").trim();
 const context={input:inputText,previous:inputText,output:inputText,workflow:state.name||"ZUXRASH AI",lastIntegration:""};
 try{localStorage.setItem("zuxrash-ai-run-input-v1",runInput.value||"");}catch(error){}
 runButton.disabled=true;
 runButton.innerHTML='<span class="play-symbol">◌</span> Test bajarilmoqda…';
 state.nodes.forEach(function(node){delete node.runtimeState;delete node.runtimeOutput;});
 drawNodes();
 logList.innerHTML="";
 summary.innerHTML='<span class="summary-dot neutral"></span><span>Workflow sinovdan o‘tkazilmoqda…</span>';
 outputPanel.hidden=true;
 function addLog(text,className){
  const item=document.createElement("li");
  item.className=className||"";
  item.textContent=text;
  logList.appendChild(item);
  logList.scrollTop=logList.scrollHeight;
 }
 try{
  const incoming=new Set(state.edges.map(function(edge){return edge.to;}));
  const start=state.nodes.find(function(node){return node.type==="trigger"&&!incoming.has(node.id);})||
   state.nodes.find(function(node){return !incoming.has(node.id);})||state.nodes[0];
  let current=start;
  const seen=new Set();
  let executed=0;
  let reachedEnd=false;
  while(current){
   if(token!==lastRunToken)break;
   if(seen.has(current.id))throw new Error("Ulanishlarda sikl aniqlandi. Workflow’ni to‘xtatish uchun siklni uzing.");
   if(executed>=state.nodes.length)throw new Error("Xavfsizlik limiti: qadamlar sonidan ortiq bajarilish to‘xtatildi.");
   seen.add(current.id);
   executed+=1;
   const node=current;
   const info=typeInfo[node.type]||typeInfo.ai;
   node.runtimeState="running";
   selectedNodeId=node.id;
   drawNodes();
   renderInspector();
   addLog("Bajarilmoqda: "+node.label,"log-running");
   await delay(260);
   if(token!==lastRunToken)break;

   let branchResult=null;
   if(node.type==="trigger"){
    context.previous=context.input;
    context.output=context.input;
    node.runtimeOutput=context.input||"(bo‘sh kiruvchi matn)";
   }else if(node.type==="ai"){
    const configuredPrompt=processTemplate((node.settings&&node.settings.prompt)||"So‘rovga javob ber.",context);
    context.previous="Demo natija (haqiqiy AI API ulanmagan): "+(context.input||"Matn kiritilmadi.");
    context.output=context.previous;
    node.runtimeOutput=context.previous;
    addLog("AI prompt saqlangan; tashqi modelga so‘rov yuborilmadi.","log-success");
   }else if(node.type==="telegram"){
    const message=processTemplate((node.settings&&node.settings.message)||"{{previous}}",context);
    context.lastIntegration=message;
    context.previous="Telegram xabari tayyorlandi, lekin yuborilmadi: "+message;
    context.output=context.previous;
    node.runtimeOutput=context.previous;
    addLog("Telegram ulanishi yo‘q — xabar faqat tayyorlandi.","log-error");
   }else if(node.type==="condition"){
    const expression=(node.settings&&node.settings.condition)||"not-empty";
    branchResult=evaluateCondition(expression,context.previous);
    node.runtimeOutput="Shart "+(branchResult?"bajarildi":"bajarilmadi")+" ("+expression+")";
    addLog("Shart natijasi: "+(branchResult?"HA":"YO‘Q"),branchResult?"log-success":"log-error");
   }else if(node.type==="delay"){
    const seconds=Math.max(0,Math.min(10,Number((node.settings&&node.settings.delay)||0)||0));
    node.runtimeOutput="Demo kutish: "+seconds+" soniya";
    if(seconds>0){
     addLog("Kutilyapti: "+seconds+" soniya","log-running");
     await delay(seconds*1000);
     if(token!==lastRunToken)break;
    }
   }else if(node.type==="end"){
    node.runtimeOutput=context.previous||"Workflow bajarildi, natija bo‘sh.";
    reachedEnd=true;
   }else{
    node.runtimeOutput=context.previous;
   }

   node.runtimeState="complete";
   drawNodes();
   addLog("Tayyor: "+node.label,"log-success");
   if(node.type==="end")break;

   const outgoing=state.edges.filter(function(edge){return edge.from===node.id;});
   let nextEdge=null;
   if(node.type==="condition"){
    nextEdge=branchResult?outgoing[0]:outgoing[1]||null;
    if(!nextEdge)addLog(branchResult?"Shart uchun HA yo‘li ulanmagan.":"Shart uchun YO‘Q yo‘li ulanmagan.","log-error");
   }else{
    nextEdge=outgoing[0]||null;
    if(outgoing.length>1)addLog("Eslatma: bu blokda bir nechta chiqish bor; faqat birinchi ulanish tanlandi.","log-error");
   }
   current=nextEdge?findNode(nextEdge.to):null;
  }

  const unvisited=state.nodes.filter(function(node){return !seen.has(node.id);});
  if(unvisited.length)addLog(unvisited.length+" ta qadam ushbu yo‘lda bajarilmadi (uzilgan yoki boshqa shoxda).","log-error");
  const lastNode=state.nodes.slice().reverse().find(function(node){return node.runtimeOutput;});
  const finalOutput=(lastNode&&lastNode.runtimeOutput)||context.previous||"Natija yaratilmagan.";
  outputText.textContent=finalOutput;
  outputPanel.hidden=false;
  if(token===lastRunToken){
   summary.innerHTML='<span class="summary-dot success"></span><span>Demo test yakunlandi · '+executed+' ta qadam bajarildi'+(reachedEnd?" · yakunlandi":"")+'</span>';
   addLog("Sinov tugadi. Tashqi AI yoki Telegram API chaqirilmadi.","log-success");
   showToast("Workflow test yakunlandi. Natijani o‘ng panelda ko‘r.");
  }
 }catch(error){
  summary.innerHTML='<span class="summary-dot error"></span><span>Test xatolik bilan to‘xtadi</span>';
  addLog("Xatolik: "+(error&&error.message?error.message:"Noma’lum xatolik"),"log-error");
  outputText.textContent=error&&error.message?error.message:"Noma’lum xatolik";
  outputPanel.hidden=false;
  showToast("Workflow testida xatolik yuz berdi.");
 }finally{
  isRunning=false;
  runButton.disabled=false;
  runButton.innerHTML='<span class="play-symbol">▶</span> Testni ishga tushirish';
  persist();
 }
}
nodesLayer.addEventListener("click",function(event){
 const deleteButton=event.target.closest("[data-delete-node]");
 if(deleteButton){event.stopPropagation();deleteNode(deleteButton.getAttribute("data-delete-node"));return;}
 const port=event.target.closest("[data-port]");
 if(port){
  event.stopPropagation();const nodeId=port.getAttribute("data-node-id"),portType=port.getAttribute("data-port");
  if(portType==="output"){pendingSourceId=nodeId;drawNodes();showToast("Endi boshqa qadamning kirish nuqtasini bosing.");return;}
  if(pendingSourceId){const source=pendingSourceId;pendingSourceId=null;if(connect(source,nodeId)){drawNodes();showToast("Qadamlar muvaffaqiyatli ulandi.");}else drawNodes();}
  else showToast("Avval birinchi qadamning o‘ng tomonidagi nuqtasini bosing.");return;
 }
 const card=event.target.closest("[data-node-id]");if(card){selectedNodeId=card.getAttribute("data-node-id");drawNodes();renderInspector();}
});
nodesLayer.addEventListener("pointerdown",function(event){
 const header=event.target.closest("[data-drag-handle]");if(!header||event.target.closest("button"))return;
 const card=header.closest("[data-node-id]");if(!card)return;const node=findNode(card.getAttribute("data-node-id"));if(!node)return;
 dragState={id:node.id,startX:event.clientX,startY:event.clientY,nodeX:Number(node.x),nodeY:Number(node.y),moved:false};
 if(header.setPointerCapture&&event.pointerId!=null){try{header.setPointerCapture(event.pointerId);}catch(error){/* Pointer capture is optional. */}}
 event.preventDefault();
});
document.addEventListener("pointermove",function(event){
 if(!dragState)return;const node=findNode(dragState.id);if(!node)return;
 const dx=event.clientX-dragState.startX,dy=event.clientY-dragState.startY;if(Math.abs(dx)+Math.abs(dy)>3)dragState.moved=true;
 node.x=Math.max(12,Math.min(1080,dragState.nodeX+dx));node.y=Math.max(15,Math.min(630,dragState.nodeY+dy));
 const card=nodesLayer.querySelector('[data-node-id="'+node.id+'"]');if(card){card.style.left=node.x+"px";card.style.top=node.y+"px";}drawConnections();
});
document.addEventListener("pointerup",function(){
 if(!dragState)return;const wasMoved=dragState.moved,id=dragState.id;dragState=null;selectedNodeId=id;if(wasMoved)drawNodes();else renderInspector();
});
inspectorBody.addEventListener("input",function(event){
 const input=event.target.closest("[data-field]"),node=selectedNode();if(!input||!node)return;const key=input.getAttribute("data-field");
 if(key==="label"||key==="description"){
  node[key]=input.value;inspectorTitle.textContent=node.label||typeInfo[node.type].label;
  const card=nodesLayer.querySelector('[data-node-id="'+node.id+'"]');if(card){const strong=card.querySelector(".node-heading strong"),body=card.querySelector(".node-body");if(strong)strong.textContent=node.label;if(body)body.textContent=node.description;}
  document.getElementById("breadcrumb-title").textContent=state.name;drawConnections();
 }else{node.settings=node.settings||{};node.settings[key.replace("setting-","")]=input.value;}
 persist();
});
inspectorBody.addEventListener("click",function(event){
 if(event.target.closest("#delete-selected-node"))deleteNode(selectedNodeId);
 if(event.target.closest("#duplicate-node")){
  const node=selectedNode();if(!node)return;const copy=JSON.parse(JSON.stringify(node));copy.id=node.type+"-"+Date.now().toString(36);copy.label=node.label+" nusxa";copy.x=Math.min(1080,Number(node.x)+45);copy.y=Math.min(630,Number(node.y)+45);delete copy.runtimeState;state.nodes.push(copy);selectedNodeId=copy.id;rerender();showToast("Qadam nusxalandi. Yangi blokni joylashtirishingiz mumkin.");
 }
});
try{const savedRunInput=localStorage.getItem("zuxrash-ai-run-input-v1");if(savedRunInput!==null)runInput.value=savedRunInput;}catch(error){}
runInput.addEventListener("input",function(){try{localStorage.setItem("zuxrash-ai-run-input-v1",runInput.value);}catch(error){}});
document.getElementById("workflow-name").value=state.name;
document.getElementById("workflow-name").addEventListener("input",function(event){state.name=event.target.value||"Yangi workflow";document.getElementById("breadcrumb-title").textContent=state.name;persist();});
document.getElementById("run-button").addEventListener("click",runWorkflow);
document.getElementById("export-button").addEventListener("click",exportWorkflow);
document.getElementById("export-sidebar").addEventListener("click",exportWorkflow);
document.getElementById("add-step-button").addEventListener("click",function(event){
 event.stopPropagation();const rect=event.currentTarget.getBoundingClientRect();addMenu.style.left=Math.max(12,Math.min(window.innerWidth-272,rect.left))+"px";addMenu.style.bottom=Math.max(12,window.innerHeight-rect.top+8)+"px";addMenu.hidden=!addMenu.hidden;
});
addMenu.addEventListener("click",function(event){const option=event.target.closest("[data-add-type]");if(option)addNode(option.getAttribute("data-add-type"));});
document.addEventListener("click",function(event){
 if(!addMenu.hidden&&!event.target.closest("#add-menu")&&!event.target.closest("#add-step-button"))addMenu.hidden=true;
 const comingSoon=event.target.closest("[data-coming-soon]");if(comingSoon){event.preventDefault();showToast("Bu bo‘lim keyingi versiyada qo‘shiladi.");}
});
document.getElementById("recenter-button").addEventListener("click",function(){document.getElementById("canvas-scroll").scrollTo({left:0,top:0,behavior:"smooth"});showToast("Canvas boshlang‘ich holatga qaytdi.");});
window.addEventListener("resize",function(){if(!addMenu.hidden)addMenu.hidden=true;drawConnections();});
rerender();document.getElementById("workflow-name").value=state.name;persist();
})();