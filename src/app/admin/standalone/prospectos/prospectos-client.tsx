"use client";
import {useCallback,useEffect,useState} from "react";
type Agent={id:string;name:string};
type PropertyOption={id:string;refCode:string;title:string};
type Lead={id:string;name:string;phone:string;email:string|null;message:string|null;createdAt:string;assignedAgentId:string|null;crm:{status:string;nextContactAt:string|null}|null;property:{title:string;refCode:string}|null};
type History={notes:{id:string;authorName:string;body:string;createdAt:string}[];assignments:{id:string;fromAgentName:string|null;toAgentName:string|null;changedByName:string;createdAt:string}[]};
export default function ProspectosClient({agents,canAssign,properties}:{agents:Agent[];canAssign:boolean;properties:PropertyOption[]}){
 const [leads,setLeads]=useState<Lead[]>([]);
 const [page,setPage]=useState(1);
 const [total,setTotal]=useState(0);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [saving,setSaving]=useState<string|null>(null);
 const [history,setHistory]=useState<Record<string,History>>({});
 const [expanded,setExpanded]=useState<string|null>(null);
 const [creating,setCreating]=useState(false);
 const refresh=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const response=await fetch("/api/admin/leads?page="+page,{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"No se pudieron cargar los prospectos");
   setLeads(data.leads);setTotal(data.total);
  }catch(e){setError(e instanceof Error?e.message:"Error de conexión");}
  finally{setLoading(false);}
 },[page]);
 useEffect(()=>{void refresh();},[refresh]);
 async function showHistory(id:string){
  if(expanded===id){setExpanded(null);return;}
  setError("");
  try{const response=await fetch("/api/admin/leads/"+encodeURIComponent(id)+"/history",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo cargar el historial");setHistory(prev=>({...prev,[id]:data}));setExpanded(id);}catch(e){setError(e instanceof Error?e.message:"Error al cargar historial");}
 }
 async function update(id:string,body:Record<string,unknown>){
  setSaving(id);setError("");
  try{
   const response=await fetch("/api/admin/leads/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"No se pudo guardar");
   await refresh();
   if(expanded===id){const response=await fetch("/api/admin/leads/"+encodeURIComponent(id)+"/history",{cache:"no-store"});if(response.ok){const data=await response.json();setHistory(prev=>({...prev,[id]:data}));}}
  }catch(e){setError(e instanceof Error?e.message:"Error al guardar");}
  finally{setSaving(null);}
 }
 async function createLead(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setCreating(true);setError("");
  const form=event.currentTarget;
  const fields=new FormData(form);
  const body={name:String(fields.get("name")||""),phone:String(fields.get("phone")||""),email:String(fields.get("email")||""),message:String(fields.get("message")||""),source:"manual",propertyId:String(fields.get("propertyId")||""),...(canAssign?{assignedAgentId:String(fields.get("assignedAgentId")||"")}:{}),consent:fields.get("consent")==="on"};
  try{const response=await fetch("/api/admin/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error||"No se pudo registrar el prospecto");form.reset();setPage(1);await refresh();}
  catch(e){setError(e instanceof Error?e.message:"Error al registrar el prospecto");}
  finally{setCreating(false);}
 }
 return <section aria-label="Listado de prospectos">
  <details className="admin-panel" style={{marginBottom:20}}><summary><strong>Registrar nuevo prospecto</strong></summary>
   <form className="admin-form" onSubmit={e=>void createLead(e)}>
    <div className="admin-form-grid"><label>Nombre completo<input name="name" required minLength={2} maxLength={120}/></label><label>Teléfono<input name="phone" type="tel" required minLength={7} maxLength={30}/></label></div>
    <label>Correo electrónico<input name="email" type="email" maxLength={180}/></label>
    <label>Propiedad de interés<select name="propertyId" defaultValue=""><option value="">Consulta general (sin propiedad)</option>{properties.map(p=><option key={p.id} value={p.id}>{p.refCode} · {p.title}</option>)}</select></label>
    {canAssign&&<label>Agente responsable<select name="assignedAgentId" defaultValue=""><option value="">Automático según la propiedad</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
    <label>Observaciones<textarea name="message" maxLength={2000}/></label>
    <label className="property-check"><input type="checkbox" name="consent" required/> Confirmo que el cliente autorizó el contacto.</label>
    <button className="btn btn-red" type="submit" disabled={creating}>{creating?"Registrando…":"Guardar prospecto"}</button>
   </form>
  </details>
  {error&&<p role="alert" style={{color:"#b42318"}}>{error}</p>}
  {loading?<p>Cargando prospectos…</p>:leads.length===0?<p>No hay prospectos asignados.</p>:(
   <div style={{display:"grid",gap:16}}>
    {leads.map(lead=><article key={lead.id} style={{border:"1px solid #d0d5dd",borderRadius:12,padding:16}}>
     <h2 style={{margin:"0 0 8px",fontSize:"1.2rem"}}>{lead.name}</h2>
     <p>{lead.phone}{lead.email?" · "+lead.email:""}</p>
     {lead.property&&<p>Propiedad: {lead.property.refCode} — {lead.property.title}</p>}
     {lead.message&&<p>{lead.message}</p>}
     <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
      <label>Estado comercial{" "}
       <select aria-label={"Estado de "+lead.name} value={lead.crm?.status||"nuevo"} disabled={saving===lead.id} onChange={e=>void update(lead.id,{status:e.target.value})}>
        {["nuevo","contactado","seguimiento","calificado","cerrado","descartado"].map(s=><option key={s} value={s}>{s}</option>)}
       </select>
      </label>
      <label>Próximo contacto{" "}<input type="date" aria-label={"Próximo contacto de "+lead.name} value={lead.crm?.nextContactAt?lead.crm.nextContactAt.slice(0,10):""} disabled={saving===lead.id} onChange={e=>void update(lead.id,{nextContactAt:e.target.value||null})}/></label>
      {canAssign&&<label>Agente responsable{" "}
       <select aria-label={"Agente de "+lead.name} value={lead.assignedAgentId||""} disabled={saving===lead.id} onChange={e=>void update(lead.id,{assignedAgentId:e.target.value||null})}>
        <option value="">Sin asignar</option>{agents.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
       </select>
      </label>}
     </div>
     <button type="button" aria-expanded={expanded===lead.id} onClick={()=>void showHistory(lead.id)} style={{marginTop:12}}>{expanded===lead.id?"Ocultar historial":"Ver historial"}</button>
     {expanded===lead.id&&history[lead.id]&&<div aria-label={"Historial de "+lead.name}>
      <h3>Notas de seguimiento</h3>
      {history[lead.id].notes.length===0?<p>Sin notas.</p>:<ul>{history[lead.id].notes.map(n=><li key={n.id}><strong>{n.authorName}</strong> · {new Date(n.createdAt).toLocaleString("es-NI")}: {n.body}</li>)}</ul>}
      <h3>Asignaciones</h3>
      {history[lead.id].assignments.length===0?<p>Sin cambios de responsable.</p>:<ul>{history[lead.id].assignments.map(a=><li key={a.id}>{new Date(a.createdAt).toLocaleString("es-NI")}: {a.fromAgentName||"Sin asignar"} → {a.toAgentName||"Sin asignar"} (por {a.changedByName})</li>)}</ul>}
     </div>}
     <form onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const input=form.elements.namedItem("note") as HTMLInputElement;const note=input.value.trim();if(note){void update(lead.id,{note}).then(()=>{input.value="";});}}} style={{marginTop:12}}>
      <label>Nota de seguimiento <input name="note" maxLength={2000} required disabled={saving===lead.id}/></label>{" "}
      <button type="submit" disabled={saving===lead.id}>Guardar nota</button>
     </form>
    </article>)}
   </div>)}
  <nav aria-label="Paginación de prospectos" style={{display:"flex",gap:12,alignItems:"center",marginTop:16}}>
   <button disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Anterior</button>
   <span>Página {page} · {total} prospectos</span>
   <button disabled={page*25>=total||loading} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
  </nav>
 </section>;
}
