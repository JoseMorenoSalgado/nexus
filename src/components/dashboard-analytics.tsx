"use client";
import {useState} from "react";
import dynamic from "next/dynamic";
import {BarChart3,ChevronDown} from "lucide-react";
import type {MetricDay} from "@/lib/dashboard-metrics";

/** Los gráficos y Recharts solo se descargan cuando se solicitan. */
const TrafficChart=dynamic(()=>import("@/components/dashboard-charts").then(m=>m.TrafficChart),{
 ssr:false,loading:()=> <p className="admin-empty">Cargando gráfica...</p>
});
const TypesChart=dynamic(()=>import("@/components/dashboard-charts").then(m=>m.TypesChart),{
 ssr:false,loading:()=> <p className="admin-empty">Cargando distribución...</p>
});
export function DashboardAnalytics({chart,types}:{chart:MetricDay[];types:{name:string;value:number}[]}){
 const [expanded,setExpanded]=useState(false);
 return <details className="dashboard-details" onToggle={e=>setExpanded(e.currentTarget.open)}>
  <summary><BarChart3 size={19} aria-hidden="true"/> Estadísticas detalladas <ChevronDown size={18} aria-hidden="true"/></summary>
  {expanded&&<div className="dashboard-details-inner">
   <p className="dashboard-simple-intro">Visitas, contactos y tipos de inmuebles de los últimos 14 días.</p>
   <div className="admin-panels">
    <section className="admin-panel"><h2>Actividad del sitio</h2><TrafficChart data={chart}/></section>
    <section className="admin-panel"><h2>Tipos de propiedades</h2><TypesChart data={types}/></section>
   </div>
   <p className="admin-empty">Las visitas y clics no son conversaciones confirmadas.</p>
  </div>}
 </details>;
}
