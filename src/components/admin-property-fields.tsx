type Data={
 refCode:string;title:string;city:string;neighborhood:string|null;type:string;operation:string;
 price:number;bedrooms:number|null;bathrooms:number|null;areaM2:number|null;
 description:string;featured:boolean;published:boolean;assignedAgentId?:string|null;
};

/** The initial view keeps all required fields visible for native form validation.
 * Only optional commercial/promotion settings live in a disclosure.
 */
export function AdminPropertyFields({property,agents=[]}:{property?:Data;agents?:{id:string;name:string;email:string}[]}){
 const value=(key:keyof Data,fallback:string|number=""):string|number=>{
  const x=property?.[key];
  return typeof x==="string"||typeof x==="number"?x:fallback;
 };
 return <>
  <section className="property-form-section property-fields-essential" aria-labelledby="property-main-heading">
   <div className="editor-section-heading"><div><h2 id="property-main-heading">Información principal</h2><p>Datos que verán los visitantes en el catálogo y la ficha.</p></div><span className="editor-section-step">1</span></div>
   <div className="admin-form-grid">
    <label>Referencia *<input name="refCode" placeholder="NX-102" defaultValue={value("refCode")} minLength={3} maxLength={40} required/></label>
    <label>Título de la propiedad *<input name="title" placeholder="Casa moderna en Zona Ejecutiva" defaultValue={value("title")} minLength={5} maxLength={140} required/></label>
   </div>
   <div className="admin-form-grid">
    <label>Ciudad *<input name="city" defaultValue={value("city","Managua")} maxLength={80} required/></label>
    <label>Zona o residencial<input name="neighborhood" defaultValue={value("neighborhood")} placeholder="Las Colinas" maxLength={80}/></label>
   </div>
   <div className="admin-form-grid">
    <label>Operación<select name="operation" defaultValue={value("operation","venta")}>
      <option value="venta">En venta</option><option value="alquiler">En alquiler</option>
    </select></label>
    <label>Tipo de inmueble<select name="type" defaultValue={value("type","Casa")}>
      {["Casa","Apartamento","Terreno","Local","Otro"].map(t=><option key={t} value={t}>{t}</option>)}
    </select></label>
   </div>
   <label>Precio en USD *<input name="price" inputMode="decimal" type="number" min="0.01" max="99999999999" step="0.01" defaultValue={value("price")} required/></label>
   <label>Descripción *<textarea name="description" minLength={10} maxLength={8000} defaultValue={value("description")} placeholder="Características, servicios y beneficios del inmueble" required/></label>
  </section>
  <section className="property-form-section property-fields-essential" aria-labelledby="property-details-heading">
   <div className="editor-section-heading"><div><h2 id="property-details-heading">Características y publicación</h2><p>Completa los datos básicos y decide si el inmueble estará visible.</p></div><span className="editor-section-step">2</span></div>
   <div className="admin-form-grid property-form-grid-three">
    <label>Superficie (m²)<input name="areaM2" type="number" min="0" max="10000000" defaultValue={value("areaM2",0)} required/></label>
    <label>Habitaciones<input name="bedrooms" type="number" min="0" max="10000000" defaultValue={value("bedrooms",0)} required/></label>
    <label>Baños<input name="bathrooms" type="number" min="0" max="10000000" defaultValue={value("bathrooms",0)} required/></label>
   </div>
   <label className="property-check"><input type="checkbox" name="published" defaultChecked={Boolean(property?.published)}/> Publicar en la página web</label>
   <p className="property-help">Si queda en borrador, no aparecerá en el catálogo ni se podrá descargar su ficha pública.</p>
  </section>
  <details className="editor-disclosure property-form-section">
   <summary><span><strong>Más opciones</strong><small>Agente responsable y propiedad destacada</small></span><span className="editor-chevron" aria-hidden="true">⌄</span></summary>
   <div className="editor-disclosure-body">
    <label>Agente responsable<select name="assignedAgentId" defaultValue={property?.assignedAgentId||""}><option value="">Sin asignar</option>{agents.map(agent=><option key={agent.id} value={agent.id}>{agent.name} — {agent.email}</option>)}</select></label>
    <label className="property-check"><input type="checkbox" name="featured" defaultChecked={Boolean(property?.featured)}/> Destacar en la página principal</label>
    <p className="property-help">Estas opciones son opcionales y podrás modificarlas después.</p>
   </div>
  </details>
 </>;
}
