"use client";

import {useState} from "react";
import {CheckCircle2,RotateCcw,LockKeyhole} from "lucide-react";
import {type ModuleSpec,type ModuleKey} from "@/lib/tenant-modules-registry";

/** Tenant-scoped preference form: server re-validates everything on submission. */
export function ModuleSettingsForm({modules,initialEnabled}:{modules:readonly ModuleSpec[];initialEnabled:ModuleKey[]}){
 const [selected,setSelected]=useState<ModuleKey[]>(initialEnabled);
 const implemented=modules.filter(m=>m.implemented);
 const planned=modules.filter(m=>!m.implemented);
 const current=(key:ModuleKey)=>selected.includes(key);
 const dirty=implemented.some(m=>current(m.key)!==initialEnabled.includes(m.key));
 const enabledCount=implemented.filter(m=>current(m.key)).length;
 const toggle=(key:ModuleKey,checked:boolean)=>setSelected(previous=>
  checked?[...previous.filter(x=>x!==key),key]:previous.filter(x=>x!==key));
 const row=(module:ModuleSpec)=>{
  const checked=current(module.key),pending=!module.implemented;
  return <label className={"module-card"+(checked?" is-on":"")+(pending?" module-soon":"")} key={module.key}>
   <span className="module-card-main">
    <strong>{module.label}</strong>
    <small>{module.description}</small>
    <span className="module-status" aria-hidden="true">{pending?"Próximamente":module.mandatory?"Siempre activo":checked?"Activo":"Desactivado"}</span>
   </span>
   {module.mandatory?
    <span className="module-locked" title="Este módulo es esencial"><LockKeyhole size={17} aria-hidden="true"/><span>Esencial</span></span>:
    <input type="checkbox" className="module-switch-input" name="modules" value={module.key}
     checked={checked} disabled={pending} onChange={event=>toggle(module.key,event.target.checked)}
     aria-label={pending?module.label+" — próximamente":"Activar "+module.label}/>}
  </label>;
 };
 return <form method="post" action="/api/admin/modules" className="module-form">
  <div className="module-overview">
   <div><strong>{enabledCount} de {implemented.length}</strong><span> herramientas disponibles activas</span></div>
   <small aria-live="polite">{dirty?"Hay cambios pendientes de guardar.":"Tu configuración está actualizada."}</small>
  </div>
  <fieldset className="module-fieldset">
   <legend>Disponibles ahora</legend>
   <div className="module-grid">{implemented.map(row)}</div>
  </fieldset>
  {planned.length>0&&<fieldset className="module-fieldset">
   <legend>En desarrollo</legend>
   <p className="module-fieldset-description">Estas funciones aparecerán aquí cuando estén disponibles. No pueden activarse todavía.</p>
   <div className="module-grid module-grid-planned">{planned.map(row)}</div>
  </fieldset>}
  <p className="module-form-note">Los cambios afectan únicamente a esta empresa y no eliminan datos. Los accesos de cada módulo siguen sujetos a los permisos de usuario.</p>
  <div className="module-form-actions">
   <button className="btn btn-red" type="submit" disabled={!dirty}><CheckCircle2 size={17}/> Guardar cambios</button>
   <button className="btn wizard-back" type="button" disabled={!dirty} onClick={()=>setSelected(initialEnabled)}><RotateCcw size={16}/> Descartar cambios</button>
  </div>
 </form>;
}
