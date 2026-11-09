"use client";
import {useState} from "react";
type Lead={id:string;name:string;status:string;assignedAgentId:string};
type Agent={id:string;name:string};
type Agenda={id:string;title:string;leadId:string;startsAt:string;location:string};
type Kind="lead.create"|"lead.update"|"lead.assign"|"agenda.create"|"agenda.update"|"agent.create";
const field=(name:string,label:string,type="text",required=true)=>({name,label,type,required});
const fields:Record<Kind,ReturnType<typeof field>[]> ={
 "lead.create":[field("name","Nombre"),field("phone","Teléfono"),field("email","Correo","email",false)],
 "lead.update":[],
 "lead.assign":[],
 "agenda.create":[field("title","Título"),field("startsAt","Fecha y hora","datetime-local"),field("location","Lugar","text",false)],
 "agenda.update":[field("title","Título"),field("startsAt","Fecha y hora","datetime-local"),field("location","Lugar","text",false)],
 "agent.create":[field("name","Nombre"),field("email","Correo","email"),field("password","Contraseña (mínimo 12 caracteres)","password")]
};
const kinds:Kind[]=["lead.create","lead.update","lead.assign","agenda.create","agenda.update","agent.create"];
const labels=["Crear prospecto","Cambiar estado CRM","Asignar agente al prospecto","Crear cita","Editar cita","Crear agente"];
export function StandaloneOperations({leads,agents,agenda}:{leads:Lead[];agents:Agent[];agenda:Agenda[]}){
 const [kind,setKind]=useState<Kind>("lead.create"),[selected,setSelected]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const event=agenda.find(a=>a.id===selected);
 const leadAction=kind.startsWith("lead.");
 const lead=leads.find(item=>item.id===selected);
 const needsExisting=!["lead.create","agenda.create","agent.create"].includes(kind);
 async function submit(form:FormData){
  setBusy(true);setMessage("");
  try{
   const body:Record<string,unknown>={action:kind};
   for(const [key,value] of form.entries())body[key]=String(value);
   if(needsExisting)body.id=selected;
   if(kind==="agenda.create")body.leadId=String(form.get("leadId")||"");
   const response=await fetch("/api/admin/operaciones",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const result:unknown=await response.json();
   const receipt=result&&typeof result==="object"?result as Record<string,unknown>:{};
   if(!response.ok){setMessage("Error al guardar ("+response.status+"): "+String(receipt.error||"No se pudo guardar")+(typeof receipt.requestId==="string"?" · Ref. "+receipt.requestId:""));return;}
   setMessage("Operación guardada correctamente.");
  }catch(error){console.error("[NEXUS] Error en formulario de gestión",error);setMessage("No se pudo procesar la respuesta del servidor. Revisa la consola y los logs de Enhance.");}finally{setBusy(false);}
 }
 return <section className="mt-8 max-w-3xl">
  <label className="block font-medium">Acción<select className="mt-2 block w-full rounded border p-3" value={kind} onChange={e=>{setKind(e.target.value as Kind);setSelected("");setMessage("");}}>{kinds.map((k,i)=><option key={k} value={k}>{labels[i]}</option>)}</select></label>
  {needsExisting&&<label className="mt-4 block">Registro<select required className="mt-2 block w-full rounded border p-3" value={selected} onChange={e=>setSelected(e.target.value)}>
   <option value="">Seleccionar…</option>
   {(leadAction?leads:agenda).map(item=><option key={item.id} value={item.id}>{("name" in item?item.name:item.title)}</option>)}
  </select></label>}
  <form key={kind+selected} action={submit} className="mt-6 flex flex-col gap-4">
   {fields[kind].map(f=><label key={f.name} className="block">{f.label}<input name={f.name} type={f.type} required={f.required} minLength={f.name==="password"?12:undefined} defaultValue={kind==="agenda.update"&&event?(f.name==="startsAt"?event.startsAt.slice(0,16):f.name==="title"?event.title:event.location):undefined} className="mt-1 block w-full rounded border p-3"/></label>)}
   {(kind==="lead.update")&&<label>Estado<select name="status" defaultValue={lead?.status||"nuevo"} className="mt-1 block w-full rounded border p-3">{["nuevo","contactado","seguimiento","cerrado","descartado"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
   {kind==="lead.assign"&&<label>Agente<select name="agentId" defaultValue={lead?.assignedAgentId||""} className="mt-1 block w-full rounded border p-3"><option value="">Sin asignar</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
   {kind==="agenda.create"&&<label>Prospecto<select name="leadId" required className="mt-1 block w-full rounded border p-3"><option value="">Seleccionar</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
   <button disabled={busy||(needsExisting&&!selected)} type="submit" className="rounded bg-black p-3 text-white disabled:opacity-50">{busy?"Guardando…":"Guardar cambios"}</button>
  </form>
  {message&&<div className="mt-4" role="status"><p>{message}</p>{message.startsWith("Operación guardada")&&<a className="mt-2 inline-block underline" href="/admin/operaciones">Actualizar registros</a>}</div>}
 </section>;
}
