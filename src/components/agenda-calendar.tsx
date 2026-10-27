"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {AGENDA_TYPES} from "@/lib/agenda-constants";
export type AgendaCalendarItem={id:string;title:string;type:string;status:string;startsAt:string;leadName:string;leadId:string};
export type AgendaView="mes"|"semana"|"dia";
const pad=(n:number)=>String(n).padStart(2,"0");
function dateKey(d:Date){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function dayAtLocalNoon(value:string){
 const [y,m,d]=value.split("-").map(Number);
 return new Date(y,m-1,d,12);
}
function plusDays(d:Date,n:number){const next=new Date(d);next.setDate(next.getDate()+n);return next;}
function weekStart(d:Date){return plusDays(d,-((d.getDay()+6)%7));}
function rangeLabel(d:Date){return d.toLocaleDateString("es",{day:"numeric",month:"long",year:"numeric"});}
function activityLink(e:AgendaCalendarItem){
 const d=new Date(e.startsAt),month=dateKey(d).slice(0,7);
 return "/admin/agenda?mes="+month+"&vista=mes#agenda-"+encodeURIComponent(e.id);
}
export function AgendaLocalDate({iso}:{iso:string}){
 const [ready,setReady]=useState(false);
 useEffect(()=>setReady(true),[]);
 return <time dateTime={iso} suppressHydrationWarning>{ready?new Intl.DateTimeFormat("es",{dateStyle:"medium",timeStyle:"short"}).format(new Date(iso)):"Horario local al abrir"}</time>;
}
function TimeEntry({event}:{event:AgendaCalendarItem}){
 const when=new Date(event.startsAt);
 return <article className={"agenda-time-entry agenda-"+event.status}>
  <div className="agenda-time-bubble">{when.toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}</div>
  <div className="agenda-time-data">
   <strong>{event.title}</strong><span>{event.leadName} · {AGENDA_TYPES.find(t=>t.value===event.type)?.label||"Actividad"}</span>
   <small>{event.status==="realizada"?"Realizada":event.status==="cancelada"?"Cancelada":"Pendiente"}</small>
  </div><Link href={activityLink(event)} className="inline-link">Ver y gestionar →</Link>
 </article>;
}
export function AgendaCalendar({month,events,view="mes",date}:{month:string;events:AgendaCalendarItem[];view?:AgendaView;date?:string}){
 const [ready,setReady]=useState(false);
 useEffect(()=>setReady(true),[]);
 const [year,mm]=month.split("-").map(Number),m=mm-1;
 const defaultDay=ready&&dateKey(new Date()).slice(0,7)===month?dateKey(new Date()):month+"-01";
 const activeDay=dayAtLocalNoon(date||defaultDay);
 const safeDay=Number.isFinite(activeDay.getTime())?activeDay:new Date(year,m,1,12);
 const firstDay=(new Date(year,m,1).getDay()+6)%7;
 const count=new Date(year,m+1,0).getDate();
 const before=new Date(year,m-1,1),after=new Date(year,m+1,1);
 const days=Array.from({length:Math.ceil((firstDay+count)/7)*7},(_,i)=>i-firstDay+1);
 const week=weekStart(safeDay);
 const current=ready?dateKey(new Date()):"";
 const months=(value:Date)=>dateKey(value).slice(0,7);
 const viewLink=(target:Date,mode:AgendaView)=>"/admin/agenda?mes="+months(target)+"&vista="+mode+"&fecha="+dateKey(target);
 const prev=view==="mes"?new Date(year,m-1,1,12):plusDays(safeDay,view==="semana"?-7:-1);
 const next=view==="mes"?new Date(year,m+1,1,12):plusDays(safeDay,view==="semana"?7:1);
 const byDay=new Map<string,AgendaCalendarItem[]>();
 if(ready)for(const ev of events){
  const k=dateKey(new Date(ev.startsAt)),bucket=byDay.get(k)||[];
  bucket.push(ev);byDay.set(k,bucket);
 }
 const monthName=new Date(year,m,1).toLocaleDateString("es",{month:"long",year:"numeric"});
 const label=view==="mes"?monthName:view==="dia"?rangeLabel(safeDay):
  rangeLabel(week)+" — "+rangeLabel(plusDays(week,6));
 const focused=view==="dia"?[safeDay]:Array.from({length:7},(_,i)=>plusDays(week,i));
 return <section className="admin-panel agenda-calendar">
  <header className="agenda-calendar-top">
   <div><h2>Calendario comercial</h2><p>{label} · horario de tu dispositivo</p></div>
   <nav aria-label="Navegar calendario">
    <Link href={viewLink(prev,view)} aria-label={view==="mes"?"Mes anterior":"Período anterior"}>←</Link>
    <Link href={viewLink(new Date(),view)} aria-label="Ir a hoy">Hoy</Link>
    <Link href={viewLink(next,view)} aria-label={view==="mes"?"Mes siguiente":"Período siguiente"}>→</Link>
   </nav>
  </header>
  <div className="agenda-view-switch" aria-label="Vista de la agenda">
   {([["dia","Día"],["semana","Semana"],["mes","Mes"]] as const).map(([key,text])=>
    <Link key={key} href={viewLink(view==="mes"?new Date(year,m,1,12):safeDay,key)}
     className={view===key?"active":""} aria-current={view===key?"page":undefined}>{text}</Link>)}
  </div>
  {!ready?<p className="property-help">Cargando calendario en la hora local del dispositivo…</p>:
   view==="mes"?<div className="agenda-calendar-scroll"><div className="agenda-calendar-grid">
    {["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(day=><strong key={day} className="agenda-weekday">{day}</strong>)}
    {days.map((n,i)=>{
     const outside=n<1||n>count;
     const d=new Date(year,m,n,12),key=dateKey(d),dayEvents=outside?[]:byDay.get(key)||[];
     return <div key={key+"-"+i} className={"agenda-calendar-day"+(outside?" agenda-outside":"")+(current===key?" agenda-today":"")}>
      <Link className="agenda-day-number" href={viewLink(d,"dia")} aria-label={"Abrir día "+key}>{d.getDate()}</Link>
      {dayEvents.slice(0,3).map(ev=><Link key={ev.id} href={activityLink(ev)}
       className={"agenda-day-event agenda-"+ev.type+" agenda-"+ev.status} title={ev.title+" · "+ev.leadName}>
       <span>{new Date(ev.startsAt).toLocaleTimeString("es",{hour:"2-digit",minute:"2-digit"})}</span> {ev.title}
      </Link>)}
      {dayEvents.length>3&&<Link href={viewLink(d,"dia")} className="agenda-extra-events">+{dayEvents.length-3} actividades</Link>}
     </div>;
    })}
   </div></div>:
   <div className={"agenda-focused-days agenda-focused-"+view}>
    {focused.map(d=>{
     const k=dateKey(d),sessions=byDay.get(k)||[];
     return <section key={k} className={"agenda-focused-day"+(k===current?" agenda-focused-today":"")}>
      <div className="agenda-focused-day-head"><strong>{d.toLocaleDateString("es",{weekday:"long",day:"numeric",month:"long"})}</strong><span>{sessions.length} {sessions.length===1?"actividad":"actividades"}</span></div>
      {sessions.length?<div className="agenda-time-list">{sessions.map(ev=><TimeEntry key={ev.id} event={ev}/>)}</div>:
       <p className="property-help">Sin actividades programadas.</p>}
     </section>;
    })}
   </div>}
  <div className="agenda-calendar-legend">{AGENDA_TYPES.map(t=><span key={t.value} className={"agenda-"+t.value}>{t.label}</span>)}</div>
 </section>;
}
