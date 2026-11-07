"use client";
import {useState} from "react";
type Kind="property.create"|"lead.create"|"agenda.create"|"agent.create";
const fields:Record<Kind,{name:string;label:string;type?:string}[]>={
 "property.create":[{name:"title",label:"Título"},{name:"slug",label:"URL (slug)"},{name:"city",label:"Ciudad"},{name:"type",label:"Tipo"},{name:"operation",label:"Operación: venta o alquiler"},{name:"price",label:"Precio",type:"number"},{name:"description",label:"Descripción"}],
 "lead.create":[{name:"name",label:"Nombre"},{name:"phone",label:"Teléfono"},{name:"email",label:"Correo",type:"email"},{name:"propertyId",label:"ID de propiedad (opcional)"}],
 "agenda.create":[{name:"leadId",label:"ID del prospecto"},{name:"title",label:"Título"},{name:"startsAt",label:"Fecha y hora",type:"datetime-local"},{name:"location",label:"Lugar"}],
 "agent.create":[{name:"name",label:"Nombre"},{name:"email",label:"Correo",type:"email"},{name:"password",label:"Contraseña (12 caracteres mínimo)",type:"password"}]
};
export function StandaloneOperations(){
 const [kind,setKind]=useState<Kind>("property.create");
 const [message,setMessage]=useState("");
 const [busy,setBusy]=useState(false);
 async function submit(data:FormData){
  setBusy(true);setMessage("");
  try{
   const body:Record<string,unknown>={action:kind};
   for(const [key,value] of data.entries())body[key]=String(value);
   const response=await fetch("/api/standalone/manage",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const result=await response.json();
   setMessage(response.ok?"Guardado correctamente. ID: "+String(result.item?.id||""):String(result.error||"No se pudo guardar"));
  }catch{setMessage("No se pudo conectar con el servidor");}
  finally{setBusy(false);}
 }
 return <section className="mt-8 max-w-xl">
  <label className="block font-medium">Operación
   <select className="mt-2 block w-full rounded border p-3" value={kind} onChange={event=>{setKind(event.target.value as Kind);setMessage("");}}>
    <option value="property.create">Crear propiedad</option><option value="lead.create">Registrar prospecto</option>
    <option value="agenda.create">Crear cita</option><option value="agent.create">Crear agente</option>
   </select>
  </label>
  <form key={kind} action={submit} className="mt-6 flex flex-col gap-4">
   {fields[kind].map(field=><label key={field.name} className="block">{field.label}
    <input name={field.name} type={field.type||"text"} required={!["description","email","propertyId","location"].includes(field.name)}
     className="mt-1 block w-full rounded border p-3" minLength={field.name==="password"?12:undefined}/>
   </label>)}
   <button disabled={busy} className="rounded bg-black p-3 text-white disabled:opacity-50" type="submit">{busy?"Guardando…":"Guardar"}</button>
  </form>
  {message&&<p role="status" className="mt-4">{message}</p>}
 </section>;
}
