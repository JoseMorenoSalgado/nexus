"use client";
import {useState} from "react";
import {ArrowDown,ArrowUp,Plus,Minus,RotateCcw,Eye} from "lucide-react";
import {type PageDefinition,type SiteMenuItem} from "@/lib/site-pages";
type Item={id:string;label:string};
export function SiteMenuEditor({pages,current}:{pages:PageDefinition[];current:SiteMenuItem[]}){
 const available=pages.filter(x=>x.published);
 const [items,setItems]=useState<Item[]>(current.map(x=>({id:x.id,label:x.label})));
 const selectedIds=new Set(items.map(x=>x.id));
 const addable=available.filter(p=>!selectedIds.has(p.id));
 const initial=current.map(x=>({id:x.id,label:x.label}));
 const changed=JSON.stringify(items)!==JSON.stringify(initial);
 const move=(i:number,delta:number)=>{const j=i+delta;if(j<0||j>=items.length)return;
  const list=[...items];[list[i],list[j]]=[list[j],list[i]];setItems(list);
 };
 return <form className="site-menu-editor" action="/api/admin/site-menu" method="post">
  <details className="cms-menu-preview cms-menu-preview-collapsible">
   <summary><Eye size={16}/> Así se verá el menú</summary>
   <div>{items.length?items.map(x=><span key={x.id}>{x.label}</span>):<em>El menú no contiene enlaces.</em>}</div>
  </details>
  <input type="hidden" name="items" value={JSON.stringify(items)}/>
  <div className="site-menu-list">
   {items.map((item,i)=><div className="site-menu-edit-row" key={item.id}>
    <div className="site-menu-edit-field"><label htmlFor={"menu-label-"+i}>Texto del menú</label>
     <input id={"menu-label-"+i} maxLength={48} minLength={2} required value={item.label} onChange={e=>setItems(items.map((v,n)=>n===i?{...v,label:e.target.value}:v))}/>
     <small>{available.find(p=>p.id===item.id)?.href||"Página"}</small>
    </div>
    <div className="site-menu-controls">
     <button type="button" onClick={()=>move(i,-1)} disabled={i===0} aria-label={"Subir "+item.label}><ArrowUp size={17}/></button>
     <button type="button" onClick={()=>move(i,1)} disabled={i===items.length-1} aria-label={"Bajar "+item.label}><ArrowDown size={17}/></button>
     <button type="button" onClick={()=>setItems(items.filter(v=>v.id!==item.id))} aria-label={"Quitar "+item.label+" del menú"} className="cms-menu-remove"><Minus size={17}/><span>Quitar</span></button>
    </div>
   </div>)}
   {!items.length&&<p className="property-help">Menú sin enlaces. Puedes añadir páginas publicadas desde abajo.</p>}
  </div>
  <div className="site-menu-available"><h3>Agregar páginas publicadas</h3><p className="property-help">Solo aparecen las páginas que ya publicaste.</p>
   <div>{addable.length?addable.map(p=><button className="site-menu-add" type="button" key={p.id}
    onClick={()=>setItems([...items,{id:p.id,label:p.title}])}><Plus size={16}/>{p.title}</button>):<p className="property-help">Todas las páginas publicadas ya están en el menú.</p>}</div>
  </div>
  <div className="cms-menu-save-actions">
   <button className="btn btn-red" type="submit">Guardar menú principal</button>
   <button className="btn wizard-back" type="button" disabled={!changed} onClick={()=>setItems(initial)}><RotateCcw size={16}/> Deshacer cambios</button>
   {changed&&<span className="cms-unsaved" role="status">Tienes cambios sin guardar</span>}
  </div>
 </form>;
}
