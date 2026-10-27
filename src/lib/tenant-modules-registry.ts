/** NEXUS exposes only implemented tools belonging to the real-estate business. */
import {type SiteTemplateKey} from "@/lib/site-template-registry";
export type ModuleKey="website"|"inquiries"|"properties"|"agenda"|"closings"|"analytics";
export type ModuleSpec={
 key:ModuleKey;label:string;description:string;
 sectors:readonly SiteTemplateKey[];enabledByDefault:readonly SiteTemplateKey[];
 implemented:boolean;mandatory?:boolean;
};
const estate:readonly SiteTemplateKey[]=["real-estate"];
export const MODULE_CATALOG:readonly ModuleSpec[]=[
 {key:"website",label:"Sitio inmobiliario y editor",description:"Inicio, páginas, identidad visual y navegación.",sectors:estate,enabledByDefault:estate,implemented:true,mandatory:true},
 {key:"inquiries",label:"Prospectos y CRM",description:"Consultas de visitantes y seguimiento comercial.",sectors:estate,enabledByDefault:estate,implemented:true},
 {key:"properties",label:"Propiedades",description:"Catálogo, fichas PDF y fotografías de inmuebles.",sectors:estate,enabledByDefault:estate,implemented:true},
 {key:"agenda",label:"Agenda comercial",description:"Visitas, reuniones y seguimiento de prospectos.",sectors:estate,enabledByDefault:estate,implemented:true},
 {key:"closings",label:"Ventas, alquileres y comisiones",description:"Operaciones y comisiones inmobiliarias.",sectors:estate,enabledByDefault:estate,implemented:true},
 {key:"analytics",label:"Reportes inmobiliarios",description:"Indicadores comerciales y desempeño de agentes.",sectors:estate,enabledByDefault:estate,implemented:true}
];
export function modulesForSector(_sector:SiteTemplateKey){return MODULE_CATALOG;}
export function defaultEnabledModules(_sector:SiteTemplateKey):ModuleKey[]{return MODULE_CATALOG.map(x=>x.key);}
export function normalizeEnabledModules(sector:SiteTemplateKey,raw:unknown,strict=false):ModuleKey[]{
 if(raw===undefined||raw===null)return defaultEnabledModules(sector);
 if(!Array.isArray(raw)){if(strict)throw Error("MODULES_INVALID");return defaultEnabledModules(sector);}
 const requested=new Set<ModuleKey>();
 for(const value of raw){
  const entry=MODULE_CATALOG.find(x=>x.key===value);
  if(!entry){if(strict)throw Error("MODULES_INVALID");continue;}
  requested.add(entry.key);
 }
 return MODULE_CATALOG.filter(x=>x.mandatory||requested.has(x.key)).map(x=>x.key);
}
