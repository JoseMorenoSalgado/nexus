"use client";
import {useState} from "react";
import Link from "next/link";
type Property={id:string;title:string;slug:string;city:string;neighborhood:string;type:string;operation:string;price:number;description:string;published:boolean;assignedAgentId:string;bedrooms:number;bathrooms:number;areaM2:number;photos:{id:string;url:string}[]};
type Lead={id:string;name:string;status:string;assignedAgentId:string};
type Agent={id:string;name:string};
type Agenda={id:string;title:string;leadId:string;startsAt:string;location:string};
type Kind="property.create"|"property.update"|"property.delete"|"property.photo.add"|"property.photo.delete"|"lead.create"|"lead.update"|"lead.assign"|"agenda.create"|"agenda.update"|"agent.create";
const field=(name:string,label:string,type="text",required=true)=>({name,label,type,required});
const fields:Record<Kind,ReturnType<typeof field>[]> ={
 "property.create":[field("title","Título"),field("slug","URL (slug)"),field("city","Ciudad"),field("neighborhood","Sector","text",false),field("type","Tipo"),field("operation","Operación: venta o alquiler"),field("price","Precio","number"),field("bedrooms","Habitaciones","number",false),field("bathrooms","Baños","number",false),field("areaM2","Área m²","number",false),field("description","Descripción","text",false)],
 "property.update":[field("title","Título"),field("city","Ciudad"),field("neighborhood","Sector","text",false),field("type","Tipo"),field("operation","Operación: venta o alquiler"),field("price","Precio","number"),field("bedrooms","Habitaciones","number",false),field("bathrooms","Baños","number",false),field("areaM2","Área m²","number",false),field("description","Descripción","text",false)],
 "property.delete":[field("confirmation","Escribe la referencia para confirmar")],
 "property.photo.add":[field("url","URL HTTPS de fotografía"),field("alt","Descripción de fotografía","text",false)],
 "property.photo.delete":[],
 "lead.create":[field("name","Nombre"),field("phone","Teléfono"),field("email","Correo","email",false)],
 "lead.update":[],
 "lead.assign":[],
 "agenda.create":[field("title","Título"),field("startsAt","Fecha y hora","datetime-local"),field("location","Lugar","text",false)],
 "agenda.update":[field("title","Título"),field("startsAt","Fecha y hora","datetime-local"),field("location","Lugar","text",false)],
 "agent.create":[field("name","Nombre"),field("email","Correo","email"),field("password","Contraseña (mínimo 12 caracteres)","password")]
};
const kinds:Kind[]=["property.create","property.update","property.delete","property.photo.add","property.photo.delete","lead.create","lead.update","lead.assign","agenda.create","agenda.update","agent.create"];
const labels=["Crear propiedad","Editar propiedad","Eliminar propiedad","Añadir fotografía","Eliminar fotografía","Crear prospecto","Cambiar estado CRM","Asignar agente al prospecto","Crear cita","Editar cita","Crear agente"];
export function StandaloneOperations({properties,leads,agents,agenda}:{properties:Property[];leads:Lead[];agents:Agent[];agenda:Agenda[]}){
 const [kind,setKind]=useState<Kind>("property.create"),[selected,setSelected]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const [createdProperty,setCreatedProperty]=useState<{slug:string;refCode:string;published:boolean}|null>(null);
 const property=properties.find(p=>p.id===selected);
 const lead=leads.find(l=>l.id===selected);
 const event=agenda.find(a=>a.id===selected);
 const propertyAction=kind.startsWith("property.");
 const leadAction=kind.startsWith("lead.");
 const agendaAction=kind.startsWith("agenda.");
 const needsExisting=!["property.create","lead.create","agenda.create","agent.create"].includes(kind);
 async function submit(form:FormData){
  setBusy(true);setMessage("");setCreatedProperty(null);
  try{
   const body:Record<string,unknown>={action:kind};
   for(const [key,value] of form.entries())body[key]=String(value);
   if(needsExisting)body.id=selected;
   if(propertyAction&&kind!=="property.create")body.propertyId=selected;
   if(kind==="property.photo.delete")body.photoId=String(form.get("photoId")||"");
   if(kind==="property.update"||kind==="property.create")body.published=form.has("published");
   if(kind==="agenda.create")body.leadId=String(form.get("leadId")||"");
   const response=await fetch("/api/standalone/manage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const result:unknown=await response.json();
   const receipt=result&&typeof result==="object"?result as Record<string,unknown>:{};
   if(!response.ok){setMessage("Error al guardar ("+response.status+"): "+String(receipt.error||"No se pudo guardar")+(typeof receipt.requestId==="string"?" · Ref. "+receipt.requestId:""));return;}
   if(kind==="property.create"){
    const created=receipt.property&&typeof receipt.property==="object"?receipt.property as Record<string,unknown>:null;
    if(created&&typeof created.slug==="string"){
     setCreatedProperty({slug:created.slug,refCode:String(created.refCode||""),published:created.published===true});
     setMessage(created.published===true?"Propiedad creada y publicada correctamente.":"Propiedad creada correctamente en borrador.");
    }else setMessage("La solicitud se completó, pero no se recibió la confirmación de la propiedad.");
   }else setMessage("Operación guardada correctamente.");
   // Do not trigger a new React server render as part of the mutation.
   // A separate explicit refresh lets users keep the successful save confirmation.
  }catch(error){console.error("[NEXUS] Error en formulario de gestión",error);setMessage("No se pudo procesar la respuesta del servidor. Revisa la consola y los logs de Enhance.");}finally{setBusy(false);}
 }
 return <section className="mt-8 max-w-3xl">
  <label className="block font-medium">Acción<select className="mt-2 block w-full rounded border p-3" value={kind} onChange={e=>{setKind(e.target.value as Kind);setSelected("");setMessage("");setCreatedProperty(null);}}>{kinds.map((k,i)=><option key={k} value={k}>{labels[i]}</option>)}</select></label>
  {needsExisting&&<label className="mt-4 block">Registro<select required className="mt-2 block w-full rounded border p-3" value={selected} onChange={e=>setSelected(e.target.value)}>
   <option value="">Seleccionar…</option>
   {(propertyAction?properties:leadAction?leads:agenda).map(item=><option key={item.id} value={item.id}>{("name" in item?item.name:item.title)}</option>)}
  </select></label>}
  <form key={kind+selected} action={submit} className="mt-6 flex flex-col gap-4">
   {fields[kind].map(f=><label key={f.name} className="block">{f.label}<input name={f.name} type={f.type} required={f.required} minLength={f.name==="password"?12:undefined} defaultValue={kind==="property.update"&&property?String((property as unknown as Record<string,unknown>)[f.name]||""):kind==="agenda.update"&&event?(f.name==="startsAt"?event.startsAt.slice(0,16):f.name==="title"?event.title:event.location):undefined} className="mt-1 block w-full rounded border p-3"/></label>)}
   {(kind==="property.create"||kind==="property.update")&&<><label><input type="checkbox" name="published" defaultChecked={property?.published||false}/> Publicar en el sitio web</label><label>Agente asignado<select name="assignedAgentId" defaultValue={property?.assignedAgentId||""} className="mt-1 block w-full rounded border p-3"><option value="">Sin asignar</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label></>}
   {kind==="property.photo.delete"&&<label>Fotografía<select name="photoId" required className="mt-1 block w-full rounded border p-3"><option value="">Seleccionar</option>{property?.photos.map(p=><option key={p.id} value={p.id}>{p.url.slice(0,90)}</option>)}</select></label>}
   {(kind==="lead.update")&&<label>Estado<select name="status" defaultValue={lead?.status||"nuevo"} className="mt-1 block w-full rounded border p-3">{["nuevo","contactado","seguimiento","cerrado","descartado"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>}
   {kind==="lead.assign"&&<label>Agente<select name="agentId" defaultValue={lead?.assignedAgentId||""} className="mt-1 block w-full rounded border p-3"><option value="">Sin asignar</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
   {kind==="agenda.create"&&<label>Prospecto<select name="leadId" required className="mt-1 block w-full rounded border p-3"><option value="">Seleccionar</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
   {kind==="property.delete"&&<p role="alert">Esta acción eliminará la propiedad y sus fotografías. No se puede deshacer.</p>}
   <button disabled={busy||(needsExisting&&!selected)} type="submit" className="rounded bg-black p-3 text-white disabled:opacity-50">{busy?"Guardando…":kind==="property.delete"?"Eliminar definitivamente":"Guardar cambios"}</button>
  </form>
  {property&&<p className="mt-3"><Link href={`/propiedades/${property.slug}`} target="_blank">Ver ficha pública (solo si está publicada)</Link></p>}
  {createdProperty&&<div className="mt-4 rounded border p-4" role="status"><p>Referencia: <strong>{createdProperty.refCode}</strong></p><p>Estado: <strong>{createdProperty.published?"Publicada":"Borrador"}</strong></p>{createdProperty.published&&<p><Link className="underline" href={`/propiedades/${encodeURIComponent(createdProperty.slug)}`} target="_blank">Abrir ficha pública de esta propiedad</Link></p>}</div>}
  {message&&<div className="mt-4" role="status"><p>{message}</p>{message.startsWith("Operación guardada")&&<a className="mt-2 inline-block underline" href="/standalone/admin/operaciones">Actualizar listado de propiedades</a>}</div>}
 </section>;
}
