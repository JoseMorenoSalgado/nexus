/** Shared catalog: only implemented capabilities may be activated.
 * This file is safe for React client components; no database or secrets.
 */
import {type SiteTemplateKey} from "@/lib/site-template-registry";

export type ModuleKey =
  "website"|"inquiries"|"properties"|"agenda"|"closings"|"analytics"|
  "moodle"|"billing"|"catalog"|"orders";

export type ModuleSpec={
 key:ModuleKey;
 label:string;
 description:string;
 sectors:readonly SiteTemplateKey[];
 enabledByDefault:readonly SiteTemplateKey[];
 implemented:boolean;
 mandatory?:boolean;
};

const all:readonly SiteTemplateKey[]=["real-estate","education","services","ecommerce"];
export const MODULE_CATALOG:readonly ModuleSpec[]=[
 {key:"website",label:"Sitio web y editor",description:"Inicio, páginas, identidad visual y navegación.",sectors:all,enabledByDefault:all,implemented:true,mandatory:true},
 {key:"inquiries",label:"Consultas y prospectos",description:"Solicitudes de visitantes y seguimiento desde el panel.",sectors:all,enabledByDefault:all,implemented:true},
 {key:"properties",label:"Propiedades",description:"Catálogo inmobiliario, fichas e imágenes.",sectors:["real-estate"],enabledByDefault:["real-estate"],implemented:true},
 {key:"agenda",label:"Agenda comercial",description:"Actividades de seguimiento de prospectos.",sectors:["real-estate"],enabledByDefault:["real-estate"],implemented:true},
 {key:"closings",label:"Ventas y alquileres",description:"Cierres y comisiones inmobiliarias.",sectors:["real-estate"],enabledByDefault:["real-estate"],implemented:true},
 {key:"analytics",label:"Reportes inmobiliarios",description:"Indicadores y rendimiento comercial.",sectors:["real-estate"],enabledByDefault:["real-estate"],implemented:true},
 {key:"moodle",label:"Conexión con Moodle",description:"Vinculación segura con aulas, cursos y usuarios de Moodle.",sectors:["education"],enabledByDefault:[],implemented:false},
 {key:"billing",label:"Facturas y cobros",description:"Emisión, estados de pago y descarga de facturas.",sectors:all,enabledByDefault:[],implemented:false},
 {key:"catalog",label:"Catálogo de productos",description:"Productos, precios, fotografías e inventario.",sectors:["ecommerce"],enabledByDefault:[],implemented:false},
 {key:"orders",label:"Pedidos",description:"Carrito, pedidos y seguimiento de compras.",sectors:["ecommerce"],enabledByDefault:[],implemented:false}
];
export function modulesForSector(sector:SiteTemplateKey){
 return MODULE_CATALOG.filter(x=>x.sectors.some(s=>s===sector));
}
export function defaultEnabledModules(sector:SiteTemplateKey):ModuleKey[]{
 return MODULE_CATALOG.filter(x=>x.implemented&&x.enabledByDefault.some(s=>s===sector)).map(x=>x.key);
}
/** Invalid persisted options are discarded. User-submitted invalid options throw.
 * An empty selection is valid and leaves only mandatory modules active.
 */
export function normalizeEnabledModules(sector:SiteTemplateKey,raw:unknown,strict=false):ModuleKey[]{
 if(raw===undefined||raw===null)return defaultEnabledModules(sector);
 if(!Array.isArray(raw)){
  if(strict)throw new Error("MODULES_INVALID");
  return defaultEnabledModules(sector);
 }
 const requested=new Set<ModuleKey>();
 for(const value of raw){
  const entry=MODULE_CATALOG.find(x=>x.key===value);
  if(!entry||!entry.implemented||!entry.sectors.some(s=>s===sector)){
   if(strict)throw new Error("MODULES_INVALID");
   continue;
  }
  requested.add(entry.key);
 }
 return MODULE_CATALOG.filter(x=>x.implemented&&x.sectors.some(s=>s===sector)&&(x.mandatory||requested.has(x.key))).map(x=>x.key);
}
