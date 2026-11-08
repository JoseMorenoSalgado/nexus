"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
type Lead={id:string;name:string};
type Event={id:string;title:string;type:string;startsAt:string;durationMinutes:number;status:string;location:string|null;meetingUrl:string|null;lead:{name:string}};
export default function AgendaClient(){
 const [events,setEvents]=useState<Event[]>([]);
 const [leads,setLeads]=useState<Lead[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);
  try{const response=await fetch("/api/admin/standalone/agenda",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo cargar la agenda");setEvents(data.events);setLeads(data.leads);}catch(e){setError(e instanceof Error?e.message:"Error de conexión");}finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function create(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setError("");
  const form=e.currentTarget;const fields=new FormData(form);
  const date=String(fields.get("startsAt")||"");
  if(!date||Number.isNaN(new Date(date).getTime())){setError("Selecciona una fecha válida");setSaving(false);return;}
  const body={leadId:String(fields.get("leadId")||""),title:String(fields.get("title")||""),type:String(fields.get("type")||"llamada"),startsAt:new Date(date).toISOString(),durationMinutes:Number(fields.get("durationMinutes")||60),location:String(fields.get("location")||"")};
  try{const response=await fetch("/api/admin/standalone/agenda",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo programar");form.reset();await load();}catch(e){setError(e instanceof Error?e.message:"Error al guardar");}finally{setSaving(false);}
 }
 return <section className="agenda-dashboard">
  {error&&<p role="alert" className="admin-error">{error}</p>}
  <details className="admin-panel agenda-create-panel"><summary>Programar nueva actividad</summary>
   {leads.length?<form className="admin-form" onSubmit={e=>void create(e)}>
    <label>Prospecto<select name="leadId" required>{leads.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></label>
    <label>Título<input name="title" minLength={3} maxLength={160} required/></label>
    <div className="admin-form-grid"><label>Tipo<select name="type"><option value="llamada">Llamada</option><option value="visita">Visita</option><option value="reunion">Reunión</option><option value="seguimiento">Seguimiento</option></select></label><label>Fecha y hora<input name="startsAt" type="datetime-local" required/></label></div>
    <label>Duración (minutos)<input name="durationMinutes" type="number" min={5} max={480} defaultValue={60} required/></label>
    <label>Lugar<input name="location" maxLength={300}/></label>
    <button className="btn btn-red" disabled={saving}>{saving?"Guardando…":"Programar actividad"}</button>
   </form>:<p>Registra un prospecto antes de programar actividades.</p>}
  </details>
  <div className="admin-panel"><h2>Actividades programadas</h2>
   {loading?<p>Cargando agenda…</p>:events.length===0?<p>No hay actividades registradas.</p>:<div className="agenda-event-list">{events.map(event=><article key={event.id} className="agenda-event"><div className="agenda-event-main"><strong>{event.title}</strong><p>{event.lead.name} · {event.type} · {new Date(event.startsAt).toLocaleString("es-NI")} · {event.durationMinutes} minutos</p><p>Estado: {event.status}{event.location?" · "+event.location:""}</p></div></article>)}</div>}
  </div>
 </section>;
}
