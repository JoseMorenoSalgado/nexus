"use client";
import {useEffect,useRef,useState} from "react";
import {AGENDA_DURATIONS,AGENDA_TYPES} from "@/lib/agenda-constants";

type LeadOption={id:string;name:string;propertyRef:string|null;agentName:string|null};
function localInput(iso:string){
 const d=new Date(iso);
 if(!Number.isFinite(d.getTime()))return "";
 const pad=(n:number)=>String(n).padStart(2,"0");
 return [d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join("-")+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
}
export function AgendaCreateForm({leads,defaultLeadId,mailEnabled=false}:{leads:LeadOption[];defaultLeadId?:string;mailEnabled?:boolean}){
 const [activityType,setActivityType]=useState("visita");
 const [local,setLocal]=useState("");
 const [error,setError]=useState("");
 const iso=useRef<HTMLInputElement>(null);
 const toUTC=()=>{
  const parsed=new Date(local);
  if(!local||!Number.isFinite(parsed.getTime())){setError("Selecciona una fecha y hora válidas.");return false;}
  if(iso.current)iso.current.value=parsed.toISOString();
  return true;
 };
 return <form method="post" action="/api/admin/agenda" className="agenda-create-form" onSubmit={event=>{setError("");if(!toUTC())event.preventDefault();}}>
  <div className="admin-form-grid">
   <label>Prospecto *<select name="leadId" required defaultValue={defaultLeadId||""}>
    <option value="">Selecciona un prospecto</option>
    {leads.map(l=><option key={l.id} value={l.id}>{l.name} · {l.propertyRef||"Consulta general"}{l.agentName?" · "+l.agentName:""}</option>)}
   </select></label>
   <label>Tipo de actividad *<select name="type" required value={activityType} onChange={event=>setActivityType(event.target.value)}>
    {AGENDA_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
   </select></label>
  </div>
  <div className="admin-form-grid">
   <label>Título *<input name="title" placeholder="Ej.: Visita a la propiedad con el cliente" minLength={3} maxLength={140} required/></label>
   <label>Lugar (opcional)<input name="location" maxLength={180} placeholder="Dirección de la propiedad u oficina"/></label>
  </div>
  <div className="admin-form-grid">
   <label>Fecha y hora local *<input type="datetime-local" value={local} onChange={event=>setLocal(event.target.value)} required/></label>
   <label>Duración <select name="durationMinutes" defaultValue="60">{AGENDA_DURATIONS.map(n=><option key={n} value={n}>{n} minutos</option>)}</select></label>
  </div>
  {activityType==="reunion"&&<label>Enlace de videoconferencia (opcional)
   <input type="url" name="meetingUrl" maxLength={500} pattern="https://.+" placeholder="https://meet.google.com/..." autoComplete="url"/>
   <small>Google Meet, Zoom, Microsoft Teams u otro enlace HTTPS. No se crea la reunión automáticamente.</small>
  </label>}
  <label>Observaciones<textarea name="notes" maxLength={2000} rows={3} placeholder="Información relevante para la gestión comercial"/></label>
  {mailEnabled?<label className="agenda-email-option"><input type="checkbox" name="notifyByEmail" defaultChecked/> Enviar aviso de esta actividad al correo configurado para NEXUS</label>
   :<p className="property-help">El aviso por correo estará disponible cuando se configure SMTP en Plesk.</p>}
  <input ref={iso} name="startsAt" type="hidden"/>
  <p className="property-help">La fecha se guarda en UTC y se muestra en la zona horaria del dispositivo. Las actividades siguen al prospecto cuando cambia su agente responsable.</p>
  {error&&<p role="alert" className="admin-error">{error}</p>}
  <button className="btn btn-red" type="submit">Programar actividad</button>
 </form>;
}

export function AgendaRescheduleForm({id,startsAt,durationMinutes,month,meetingUrl,mailEnabled=false,type}:{id:string;startsAt:string;durationMinutes:number;month:string;meetingUrl?:string|null;mailEnabled?:boolean;type:string}){
 const [local,setLocal]=useState("");
 const [error,setError]=useState("");
 const iso=useRef<HTMLInputElement>(null);
 useEffect(()=>{setLocal(localInput(startsAt));},[startsAt]);
 return <form method="post" action={"/api/admin/agenda/"+encodeURIComponent(id)} className="agenda-reschedule"
  onSubmit={e=>{const d=new Date(local);if(!local||!Number.isFinite(d.getTime())){e.preventDefault();setError("Fecha u hora inválida.");return;}if(iso.current)iso.current.value=d.toISOString();}}>
  <input type="hidden" name="intent" value="reschedule"/><input type="hidden" name="mes" value={month}/><input name="startsAt" ref={iso} type="hidden"/>
  <label>Reprogramar<input type="datetime-local" required value={local} onChange={e=>setLocal(e.target.value)}/></label>
  <label>Duración<select name="durationMinutes" defaultValue={durationMinutes}>{AGENDA_DURATIONS.map(n=><option key={n} value={n}>{n} min</option>)}</select></label>
  {type==="reunion"&&<label>Enlace de videoconferencia (opcional)<input type="url" name="meetingUrl" maxLength={500} pattern="https://.+" defaultValue={meetingUrl||""} placeholder="https://meet.google.com/..."/></label>}
  {mailEnabled&&<label className="agenda-email-option"><input type="checkbox" name="notifyByEmail" defaultChecked/> Notificar nueva fecha por correo</label>}
  <button type="submit" className="btn wizard-back">Guardar nueva fecha</button>
  {error&&<small role="alert">{error}</small>}
 </form>;
}
