"use client";
import Link from "next/link";
import {signOut} from "@/app/admin/actions";
import {type SiteTemplateKey} from "@/lib/site-template-registry";
import {defaultEnabledModules,type ModuleKey} from "@/lib/tenant-modules-registry";
import {useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {
 LayoutDashboard,Building2,UsersRound,Settings,CalendarDays,FileText,
 ChartNoAxesCombined,Menu,ChevronDown,ShieldCheck,UserRound,
 X,Bell,HandCoins,ExternalLink,LogOut,type LucideIcon
} from "lucide-react";

type Entry={href:string;label:string;Icon:LucideIcon};
const primary:Entry[]=[
 {href:"/admin",label:"Resumen",Icon:LayoutDashboard},
 {href:"/admin/propiedades",label:"Propiedades",Icon:Building2},
 {href:"/admin/leads",label:"Prospectos",Icon:UsersRound},
 {href:"/admin/agenda",label:"Agenda",Icon:CalendarDays},
 {href:"/admin/cierres",label:"Ventas y alquileres",Icon:HandCoins}
];
const secondary:Entry[]=[
 {href:"/admin/notificaciones",label:"Notificaciones",Icon:Bell},
 {href:"/admin/reportes",label:"Reportes",Icon:ChartNoAxesCombined}
];
function selectedLink(pathname:string,href:string){
 return href==="/admin"?pathname===href:href==="/admin/personalizar/inicio"?pathname.startsWith("/admin/personalizar"):pathname===href||pathname.startsWith(href+"/");
}
export function AdminNav({role="admin",roles=[role],userId,userName,notificationCount=0,templateKey="real-estate",enabledModules}:{
 role?:string;roles?:string[];userId?:string;userName:string;notificationCount?:number;templateKey?:SiteTemplateKey;enabledModules?:ModuleKey[]
}){
 const pathname=usePathname();
 const [mobileOpen,setMobileOpen]=useState(false);
 const menuTrigger=useRef<HTMLButtonElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const drawer=useRef<HTMLElement>(null);
 useEffect(()=>{setMobileOpen(false);},[pathname]);
 useEffect(()=>{
  if(!mobileOpen)return;
  // Mantener la vista detrás inmóvil y el cierre accesible por teclado.
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  const close=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){
    setMobileOpen(false);
    menuTrigger.current?.focus();
   }
   if(event.key==="Tab"&&drawer.current){
    const focusables=[...drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
    if(!focusables.length)return;
    const first=focusables[0],last=focusables[focusables.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener("keydown",close);
  return ()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",close);
  };
 },[mobileOpen]);
 const has=(r:string)=>roles.includes(r);
 const manager=has("admin")||has("editor");
 const agent=has("agente");
 const realEstate=templateKey==="real-estate";
 const enabled=new Set(enabledModules??defaultEnabledModules(templateKey));
 const entryModule:Record<string,ModuleKey>={"/admin/propiedades":"properties","/admin/leads":"inquiries","/admin/agenda":"agenda","/admin/cierres":"closings","/admin/reportes":"analytics"};
 const allowed=(entry:Entry)=>!entryModule[entry.href]||enabled.has(entryModule[entry.href]);
 const main=primary.filter(x=>(manager||(agent&&["/admin","/admin/leads","/admin/agenda","/admin/cierres"].includes(x.href))||x.href==="/admin")
  &&(realEstate||["/admin","/admin/leads","/admin/personalizar/inicio"].includes(x.href)))
  .filter(allowed)
  .map(x=>!realEstate&&x.href==="/admin/leads"?{...x,label:"Consultas"}:x);
 const tools=secondary.filter(x=>realEstate&&(manager||(agent&&x.href==="/admin/notificaciones"))).filter(allowed);
 if(manager)tools.unshift({href:"/admin/personalizar/inicio",label:"Mi sitio web",Icon:FileText});
 if(has("admin")){
  if(realEstate&&enabled.has("properties"))tools.push({href:"/admin/clientes-agentes",label:"Equipo y usuarios",Icon:ShieldCheck});
  tools.push({href:"/admin/modulos",label:"Módulos",Icon:Settings});
  tools.push({href:"/admin/sistema",label:"Estado técnico",Icon:Settings});
 }
 if(realEstate&&enabled.has("analytics")&&agent&&!manager){
  tools.push({href:"/admin/reportes/agentes",label:"Mi rendimiento",Icon:ChartNoAxesCombined});
 }
 if(realEstate&&enabled.has("properties")&&agent&&userId){
  tools.push({href:"/admin/clientes-agentes/agentes/"+encodeURIComponent(userId),label:"Mi perfil comercial",Icon:UserRound});
 }
 const notifyBadge=(x:Entry)=>x.href==="/admin/notificaciones"&&notificationCount>0
  ? <span className="admin-nav-count" aria-label={notificationCount+" pendientes"}>{notificationCount>99?"99+":notificationCount}</span>:null;
 const entries=(links:Entry[],close:()=>void)=>links.map(x=>{
  const active=selectedLink(pathname,x.href);
  return <Link href={x.href} key={x.href} onClick={close} className={active?"active":undefined}
   aria-current={active?"page":undefined}><x.Icon size={18} aria-hidden="true"/><span>{x.label}</span>{notifyBadge(x)}</Link>;
 });
 // Una sola fuente de enlaces para escritorio y móvil, sin mostrar accesos repetidos.
 const pinned=main.filter(x=>x.href==="/admin");
 const mobileMain=main.filter(x=>!pinned.some(y=>y.href===x.href));
 const toolActive=tools.some(x=>selectedLink(pathname,x.href));
 return <>
  <nav className="admin-nav admin-nav-desktop admin-nav-simplified" aria-label="Menú de administración">
   <span className="admin-nav-section-label">Trabajo diario</span>
   {entries(main,()=>{})}
   {tools.length>0&&<details className="admin-nav-more" key={toolActive?"current-tools":"other-tools"} open={toolActive}>
    <summary><Settings size={18} aria-hidden="true"/><span>Más opciones</span><ChevronDown size={16} aria-hidden="true"/></summary>
    <div className="admin-nav-more-content">{entries(tools,()=>{})}</div>
   </details>}
   <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-nav-website">
    <ExternalLink size={17} aria-hidden="true"/><span>Ver página pública</span>
   </Link>
   <div className="admin-account-desktop">
    <span className="admin-account-name">{userName}</span>
    <form action={signOut}><button type="submit"><LogOut size={17} aria-hidden="true"/> Cerrar sesión</button></form>
   </div>
  </nav>
  <div className="admin-nav-mobile">
   <button type="button" ref={menuTrigger} className="admin-mobile-trigger" onClick={()=>setMobileOpen(v=>!v)} aria-expanded={mobileOpen} aria-controls="admin-mobile-drawer">
    <Menu size={20}/> Menú <ChevronDown size={16}/>
   </button>
   {mobileOpen&&<>
    <button type="button" className="admin-mobile-overlay" onClick={()=>setMobileOpen(false)} aria-label="Cerrar navegación"/>
    <aside ref={drawer} id="admin-mobile-drawer" className="admin-mobile-drawer" role="dialog" aria-modal="true" aria-label="Navegación del panel">
     <div className="admin-mobile-drawer-head"><strong>Navegación</strong><button type="button" ref={closeButton} onClick={()=>{setMobileOpen(false);menuTrigger.current?.focus();}} aria-label="Cerrar menú"><X size={20}/></button></div>
     <nav className="admin-mobile-site-shortcuts" aria-label="Accesos principales">
      {entries(pinned,()=>setMobileOpen(false))}
     </nav>
     <nav className="admin-nav admin-nav-mobile-list" aria-label="Navegación móvil">
      {mobileMain.length>0&&<><span className="admin-nav-section-label">Trabajo diario</span>{entries(mobileMain,()=>setMobileOpen(false))}</>}
      {tools.length>0&&<><span className="admin-nav-section-label">Más opciones</span>{entries(tools,()=>setMobileOpen(false))}</>}
      <Link href="/" target="_blank" rel="noopener noreferrer" onClick={()=>setMobileOpen(false)}><ExternalLink size={17}/>Ver página pública</Link>
     </nav>
     <div className="admin-mobile-account">
      <span className="admin-mobile-account-label">Sesión actual</span>
      <strong>{userName}</strong>
      <form action={signOut}><button type="submit"><LogOut size={17} aria-hidden="true"/> Cerrar sesión</button></form>
     </div>
    </aside>
   </>}
  </div>
 </>;
}
