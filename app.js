(function(){
"use strict";
const KEY="zuxrash-ai-saved-plans-v1";
const TYPES={
 telegram_bot:{label:"Telegram bot",icon:"➤",summary:"Telegram orqali xizmat ko‘rsatadigan bot.",technologies:["Python","aiogram","SQLite yoki Supabase"],features:["/start menyusi va qulay navigatsiya","Foydalanuvchi so‘rovlarini qabul qilish","Asosiy xizmat yoki buyurtma oqimi","Admin boshqaruvi va xabarlar","Xatolarni qayd etish va sinov"],steps:["Talablar va bot menyusini belgilash","Bot tuzilmasi va ma’lumotlar modelini yaratish","Asosiy buyruq va funksiyalarni kodlash","Sinash va xavfsiz serverga joylash"]},
 ai_assistant:{label:"AI yordamchi",icon:"✦",summary:"Vazifalarni bajarishga mo‘ljallangan AI yordamchi.",technologies:["Web interfeys","AI API backend","Xavfsiz ma’lumot saqlash"],features:["Savol-javob uchun chat interfeysi","Yordamchining rol va ko‘rsatmalarini sozlash","Matnni AI modeliga yuborish","Javob va suhbat tarixini ko‘rsatish","API xatolari va limitlarni boshqarish"],steps:["Yordamchining vazifasini belgilash","Chat interfeysi va backend API yaratish","AI provayderini server orqali ulash","Xavfsizlik va javob sifatini sinash"]},
 automation:{label:"Avtomatlashtirish",icon:"⤳",summary:"Takroriy vazifalarni qoidalar asosida bajaradigan tizim.",technologies:["Workflow engine","Webhook yoki API","Log va ma’lumot saqlash"],features:["Ishni boshlatuvchi trigger","Ketma-ket bajariladigan qadamlar","Shartga qarab turli yo‘llarni tanlash","Boshqa xizmatlar bilan integratsiya","Natija va xatolarni kuzatish"],steps:["Jarayonni bosqichlarga ajratish","Trigger, qadam va shartlarni belgilash","Kerakli API integratsiyalarini yozish","Test, monitoring va ishga tushirish"]}
};
const idea=document.getElementById("idea-input"),charCount=document.getElementById("char-count"),planOutput=document.getElementById("plan-output");
let selectedType="telegram_bot",activePlan=null;
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function loadPlans(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[];}catch(e){return [];}}
function savePlans(plans){try{localStorage.setItem(KEY,JSON.stringify(plans));}catch(e){toast("Brauzerda saqlash imkoni bo‘lmadi.");}document.getElementById("saved-count").textContent=String(plans.length);}
function toast(msg){const el=document.createElement("div");el.className="toast";el.textContent=msg;document.getElementById("toasts").appendChild(el);setTimeout(function(){el.style.opacity="0";setTimeout(function(){el.remove();},200);},2600);}
function titleFrom(text,type){const part=text.split(/[.!?\n]/).map(function(x){return x.trim();}).filter(Boolean)[0]||TYPES[type].label;let title=part.replace(/^(menga|men uchun|bizga|biz uchun|kerak|yaratib ber|qilib ber)\s+/i,"").trim();if(title.length>65)title=title.slice(0,62).trim()+"…";return title.charAt(0).toLocaleUpperCase("uz-UZ")+title.slice(1);}
function makePlan(text,type){
 const cfg=TYPES[type],low=text.toLocaleLowerCase("uz-UZ"),features=cfg.features.slice();
 if(type==="telegram_bot"){
  if(/o‘quv|oquv|kurs|dars/.test(low))features.splice(2,0,"Kurslar, dars jadvali va o‘quvchi ma’lumotlari");
  if(/buyurtma|fast food|ovqat|menyu/.test(low))features.splice(2,0,"Menyu va buyurtma holatini boshqarish");
  if(/to‘lov|tolov|payment/.test(low))features.push("To‘lov holatini qayd etish (providerga bog‘liq)");
 }else if(type==="ai_assistant"){
  if(/hujjat|fayl|pdf/.test(low))features.splice(2,0,"Yuklangan hujjatlarni o‘qish va tahlil qilish (fayl turiga qarab)");
  if(/ovoz|gapir|voice/.test(low))features.push("Ovoz uchun alohida speech-to-text va text-to-speech integratsiyasi");
 }else{
  if(low.includes("telegram"))features.push("Telegram bot bilan xabar almashish");
  if(low.includes("email")||low.includes("pochta"))features.push("Tashqi email provayderi bilan integratsiya");
 }
 return {id:"plan-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,6),title:titleFrom(text,type),idea:text,type:type,typeLabel:cfg.label,summary:cfg.summary,features:Array.from(new Set(features)),steps:cfg.steps.slice(),technologies:cfg.technologies.slice(),createdAt:new Date().toISOString(),demo:true};
}
function showPlan(plan,scroll){
 activePlan=plan;
 document.getElementById("plan-title").textContent=plan.title;
 document.getElementById("plan-summary").textContent=plan.summary+" G‘oya: "+plan.idea;
 document.getElementById("plan-type").textContent=plan.typeLabel;
 document.getElementById("features").innerHTML=plan.features.map(function(x){return "<li>"+esc(x)+"</li>";}).join("");
 document.getElementById("steps").innerHTML=plan.steps.map(function(x){return "<li>"+esc(x)+"</li>";}).join("");
 document.getElementById("technologies").innerHTML=plan.technologies.map(function(x){return "<span>"+esc(x)+"</span>";}).join("");
 planOutput.hidden=false;
 if(scroll)planOutput.scrollIntoView({behavior:"smooth",block:"start"});
}
function createPlan(){
 const text=idea.value.trim(),err=document.getElementById("form-error");
 if(text.length<8){err.textContent="G‘oyangni biroz batafsilroq yoz. Bot yoki yordamchi nima qilishi kerak?";err.hidden=false;idea.focus();return;}
 err.hidden=true;
 const plan=makePlan(text,selectedType),plans=loadPlans().filter(function(p){return p.idea!==plan.idea||p.type!==plan.type;});
 plans.unshift(plan);savePlans(plans.slice(0,30));showPlan(plan,true);renderSaved();toast("Reja tayyor. Bu hali demo shablon.");
}
function downloadPlan(){
 if(!activePlan)return;
 const obj={product:"ZUXRASH AI",schemaVersion:1,exportedAt:new Date().toISOString(),note:"Bu demo reja, tayyor kod yoki deploy qilingan bot emas.",project:activePlan};
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=(activePlan.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"zuxrash-plan")+".json";document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);toast("JSON fayl yuklab olindi.");
}
async function copyPlan(){
 if(!activePlan)return;
 const text="ZUXRASH AI — LOYIHA REJASI\nLoyiha: "+activePlan.title+"\nTuri: "+activePlan.typeLabel+"\nG‘oya: "+activePlan.idea+"\n\nIMKONIYATLAR\n"+activePlan.features.map(function(x,i){return (i+1)+". "+x;}).join("\n")+"\n\nBOSQICHLAR\n"+activePlan.steps.map(function(x,i){return (i+1)+". "+x;}).join("\n")+"\n\nTexnologiyalar: "+activePlan.technologies.join(", ")+"\nEslatma: bu demo reja.";
 try{await navigator.clipboard.writeText(text);toast("Reja nusxalandi.");}
 catch(e){const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();const ok=document.execCommand("copy");area.remove();toast(ok?"Reja nusxalandi.":"Nusxalab bo‘lmadi.");}
}
function renderSaved(){
 const plans=loadPlans(),list=document.getElementById("saved-list");
 document.getElementById("saved-count").textContent=String(plans.length);
 document.getElementById("saved-empty").hidden=plans.length>0;
 list.innerHTML=plans.map(function(p){
  const cfg=TYPES[p.type]||TYPES.telegram_bot;
  return '<article class="saved-item" data-plan-id="'+esc(p.id)+'"><div class="saved-item-icon">'+cfg.icon+'</div><div class="saved-main"><b>'+esc(p.title)+'</b><p>'+esc(p.typeLabel||cfg.label)+' · '+esc(p.idea)+'</p></div><div class="saved-actions"><button type="button" data-open="'+esc(p.id)+'">Ochish</button><button type="button" data-remove="'+esc(p.id)+'">O‘chirish</button></div></article>';
 }).join("");
}
function switchView(name){
 const builder=name==="builder";
 document.getElementById("builder-view").hidden=!builder;document.getElementById("saved-view").hidden=builder;
 document.getElementById("crumb-current").textContent=builder?"Loyiha yaratish":"Saqlangan rejalar";
 document.querySelectorAll("[data-view]").forEach(function(b){b.classList.toggle("active",b.getAttribute("data-view")===name);});
 if(!builder)renderSaved();
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-type]").forEach(function(button){
 button.addEventListener("click",function(){selectedType=button.getAttribute("data-type");document.querySelectorAll("[data-type]").forEach(function(b){const on=b===button;b.classList.toggle("selected",on);b.setAttribute("aria-pressed",on?"true":"false");});});
});
idea.addEventListener("input",function(){charCount.textContent=idea.value.length+" / 2000";document.getElementById("form-error").hidden=true;});
document.querySelectorAll("[data-example]").forEach(function(button){
 button.addEventListener("click",function(){idea.value=button.getAttribute("data-example");charCount.textContent=idea.value.length+" / 2000";const kind=button.getAttribute("data-example-type")||"telegram_bot";document.querySelector('[data-type="'+kind+'"]').click();idea.focus();toast("Misol tanlandi — xohlasang o‘zgartir.");});
});
document.getElementById("create-plan").addEventListener("click",createPlan);
idea.addEventListener("keydown",function(e){if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();createPlan();}});
document.getElementById("new-plan").addEventListener("click",function(){idea.value="";charCount.textContent="0 / 2000";planOutput.hidden=true;idea.focus();window.scrollTo({top:0,behavior:"smooth"});});
document.getElementById("download-plan").addEventListener("click",downloadPlan);
document.getElementById("copy-plan").addEventListener("click",copyPlan);
document.querySelectorAll("[data-view]").forEach(function(b){b.addEventListener("click",function(){switchView(b.getAttribute("data-view"));});});
document.getElementById("go-create").addEventListener("click",function(){switchView("builder");});
document.getElementById("saved-list").addEventListener("click",function(e){
 const open=e.target.closest("[data-open]");
 if(open){const plan=loadPlans().find(function(p){return p.id===open.getAttribute("data-open");});if(plan){switchView("builder");idea.value=plan.idea;charCount.textContent=idea.value.length+" / 2000";document.querySelector('[data-type="'+plan.type+'"]').click();showPlan(plan,false);window.scrollTo({top:0,behavior:"smooth"});}return;}
 const remove=e.target.closest("[data-remove]");
 if(remove){savePlans(loadPlans().filter(function(p){return p.id!==remove.getAttribute("data-remove");}));renderSaved();toast("Reja o‘chirildi.");}
});
document.getElementById("saved-count").textContent=String(loadPlans().length);
renderSaved();
})();