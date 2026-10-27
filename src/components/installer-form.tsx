"use client";
import {useState,type FormEvent} from "react";
import {ArrowLeft,ArrowRight,CheckCircle2,Database,ShieldCheck,Building2,GraduationCap,ShoppingBag,BriefcaseBusiness} from "lucide-react";
import {SITE_TEMPLATES,type SiteTemplateKey} from "@/lib/site-template-registry";
import {defaultEnabledModules,modulesForSector,type ModuleKey} from "@/lib/tenant-modules-registry";

type Values={
 dbType:"mariadb"|"mysql"|"postgresql";dbHost:string;dbPort:string;dbName:string;dbUser:string;dbPassword:string;
 institution:string;institutionEmail:string;adminName:string;adminEmail:string;adminPassword:string;templateKey:SiteTemplateKey;modules:ModuleKey[];
};
const sectorIcons={
 "real-estate":Building2,
 education:GraduationCap,
 services:BriefcaseBusiness,
 ecommerce:ShoppingBag
} satisfies Record<SiteTemplateKey,typeof Building2>;
const defaults:Values={
 dbType:"mariadb",dbHost:"db",dbPort:"3306",dbName:"webappecloud",dbUser:"webappecloud",dbPassword:"",
 institution:"",institutionEmail:"",adminName:"",adminEmail:"",adminPassword:"",templateKey:"real-estate",modules:defaultEnabledModules("real-estate")
};
export default function InstallerForm({domain}:{domain:string}){
 const [step,setStep]=useState<1|2>(1),[values,setValues]=useState(defaults);
 const [error,setError]=useState(""),[busy,setBusy]=useState(false),[complete,setComplete]=useState(false);
 const selectSector=(key:SiteTemplateKey)=>setValues(v=>({...v,templateKey:key,modules:defaultEnabledModules(key)}));
 const availableModules=modulesForSector(values.templateKey);
 const moduleCount=availableModules.filter(x=>x.implemented&&values.modules.includes(x.key)).length;
 function change(name:Exclude<keyof Values,"modules">,value:string){setValues(v=>({...v,[name]:value}));}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError("");
  if(step===1){setStep(2);return;}
  if(values.adminPassword.length<14){setError("La contraseña administrativa debe tener al menos 14 caracteres.");return;}
  setBusy(true);
  try{
   const r=await fetch("/api/install",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify(values)});
   const json=await r.json();
   if(!r.ok)throw Error(json.error||"Error durante la instalación");
   setComplete(true);setValues(v=>({...v,dbPassword:"",adminPassword:""}));
  }catch(e){setError(e instanceof Error?e.message:"No fue posible completar la instalación.");}
  finally{setBusy(false);}
 }
 const input=(name:Exclude<keyof Values,"modules">,label:string,options:{type?:string;required?:boolean;hint?:string;minLength?:number;autoComplete?:string;placeholder?:string}={})=><label className="wizard-field" key={name}>
   <span>{label}</span>
   <input value={values[name]} type={options.type||"text"} required={options.required!==false} minLength={options.minLength} autoComplete={options.autoComplete||"off"} placeholder={options.placeholder} onChange={e=>change(name,e.target.value)} disabled={busy}/>
   {options.hint&&<small>{options.hint}</small>}
 </label>;
 if(complete)return <div className="wizard-success">
  <CheckCircle2 size={48} color="#0a9e5a"/>
  <h2>Instalación completada</h2>
  <p>La base de datos, la institución y el administrador han sido creados. El asistente ha quedado bloqueado.</p>
  <a className="btn btn-red" href="/admin/acceso?installed=1">Entrar al panel administrativo <ArrowRight size={17}/></a>
 </div>;
 return <form className="install-form" onSubmit={submit}>
  <div className="install-steps"><span className={step===1?"current":"completed"}><Database size={17}/> 1. Base de datos</span><span className={step===2?"current":""}><Building2 size={17}/> 2. Negocio y herramientas</span></div>
  {step===1?<section>
    <h2>Conexión a la base de datos</h2>
    <label className="wizard-field"><span>Motor de base de datos</span>
     <select value={values.dbType} className="wizard-db-select" onChange={e=>{
      const next=e.target.value as Values["dbType"];
      setValues(v=>({...v,dbType:next,dbPort:next==="postgresql"?"5432":"3306",dbHost:v.dbHost==="db"&&next==="postgresql"?"postgres":v.dbHost==="postgres"&&next!=="postgresql"?"db":v.dbHost}));
     }}>
      <option value="mariadb">MariaDB</option><option value="mysql">MySQL</option><option value="postgresql">PostgreSQL</option>
     </select>
    </label>
    <p>Utiliza una base de datos <strong>vacía</strong> que hayas creado previamente en cPanel o Dockploy. Sus credenciales no se guardan en GitHub.</p>
    <div className="wizard-grid">{input("dbHost","Servidor de base de datos",{hint:"En Docker, utiliza el nombre del servicio alcanzable por red (por ejemplo: db o postgres)."})}{input("dbPort","Puerto",{hint:"3306 para MySQL/MariaDB; 5432 para PostgreSQL."})}</div>
    {input("dbName","Nombre de la base de datos")}
    {input("dbUser","Usuario de la base de datos")}
    {input("dbPassword","Contraseña de la base de datos",{type:"password",autoComplete:"new-password"})}
    <p className="wizard-warning"><ShieldCheck size={18}/> Tu sesión inicial se autorizó automáticamente en este navegador. El usuario SQL necesita permisos para crear tablas en una base vacía. No reutilices la base de datos de Edvorya.</p>
    <button className="btn btn-red" type="submit">Continuar <ArrowRight size={16}/></button>
  </section>:<section>
    <h2>Configura tu espacio de trabajo</h2>
    <p>Primero elige tu actividad. Configuraremos el sitio y el panel con las herramientas de ese sector.</p>
    <fieldset className="wizard-sector" disabled={busy}>
     <legend>¿Para qué utilizarás WebAppECloud?</legend>
     <div className="wizard-sector-grid">
      {SITE_TEMPLATES.map(template=>{
       const Icon=sectorIcons[template.key];
       const checked=values.templateKey===template.key;
       return <label className={"wizard-sector-option"+(checked?" is-selected":"")} key={template.key}>
        <input type="radio" name="businessSector" value={template.key} checked={checked} onChange={()=>selectSector(template.key)}/>
        <span className="wizard-sector-symbol"><Icon size={21} aria-hidden="true"/></span>
        <span className="wizard-sector-copy"><strong>{template.label}</strong><small>{template.description}</small></span>
        <CheckCircle2 size={19} className="wizard-sector-check" aria-hidden="true"/>
       </label>;
      })}
     </div>
     <p className="wizard-sector-hint">Podrás cambiar la plantilla más adelante sin borrar tu información.</p>
    </fieldset>
    <div className="wizard-organization">
     <h3>Datos del negocio</h3>
     {input("institution","Nombre de la institución o empresa",{minLength:3})}
     {input("institutionEmail","Correo institucional",{type:"email",autoComplete:"email"})}
     <div className="wizard-domain"><span>Dominio detectado:</span> <strong>{domain}</strong></div>
    </div>
    <div className="wizard-module-step">
     <div className="wizard-modules-heading"><h3>Herramientas disponibles</h3><span aria-live="polite">{moduleCount} activas</span></div>
     <p>Selecciona las funciones que utilizarás. Las opciones «Próximamente» no se activarán hasta su lanzamiento.</p>
     <div className="wizard-module-options">
      {availableModules.map(module=><label className="wizard-module-choice" key={module.key}>
       <input type="checkbox" checked={values.modules.includes(module.key)} disabled={!module.implemented||module.mandatory}
        onChange={e=>setValues(v=>({...v,modules:e.target.checked?[...v.modules,module.key]:v.modules.filter(k=>k!==module.key)}))}/>
       <span><strong>{module.label}</strong><small>{module.description}</small></span>
       <span className="wizard-module-state">{!module.implemented?"Próximamente":module.mandatory?"Esencial":values.modules.includes(module.key)?"Activo":"Opcional"}</span>
      </label>)}
     </div>
    </div>
    <h3>Administrador del sitio</h3>
    {input("adminName","Nombre del administrador",{minLength:2,autoComplete:"name"})}
    {input("adminEmail","Correo del administrador",{type:"email",autoComplete:"email"})}
    {input("adminPassword","Contraseña del administrador",{type:"password",minLength:14,autoComplete:"new-password",hint:"Mínimo 14 caracteres. Se guarda un hash seguro, nunca el texto original."})}
    <div className="wizard-actions"><button className="btn wizard-back" type="button" onClick={()=>setStep(1)} disabled={busy}><ArrowLeft size={16}/> Atrás</button><button className="btn btn-red" type="submit" disabled={busy}>{busy?"Configurando...":"Instalar plataforma"} <CheckCircle2 size={16}/></button></div>
  </section>}
  {error&&<div className="wizard-error" role="alert">{error}</div>}
 </form>;
}
