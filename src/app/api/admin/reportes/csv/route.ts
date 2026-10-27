import {NextRequest} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {tenantModuleEnabled} from "@/lib/tenant-modules";
import {generateReport,resolveReportPeriod} from "@/lib/real-estate-reports";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function csvCell(value:string|number|boolean){
 let text=String(value);
 // Guard against formula injection from property names in spreadsheet software.
 if(/^[\s\u0000-\u001f]*[=+\-@]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function line(values:Array<string|number|boolean>){return values.map(csvCell).join(",");}
export async function GET(req:NextRequest){
 const admin=await requireAdmin();
 if(!await tenantModuleEnabled(admin.tenantId,"analytics"))return new Response("Módulo desactivado",{status:403});
 if(!admin.roles.some(r=>["admin","editor"].includes(r)))return new Response("No autorizado",{status:403});
 const days=resolveReportPeriod(new URL(req.url).searchParams.get("periodo")||undefined);
 const report=await generateReport(admin.tenantId,days);
 const lines=[
  line(["Reporte inmobiliario",admin.tenantName]),
  line(["Inicio UTC",report.from]),line(["Fin UTC",report.through]),
  line(["Métrica","Cantidad"]),
  line(["Vistas del sitio",report.views]),line(["Vistas de inmuebles",report.detailViews]),
  line(["Clics WhatsApp",report.whatsapp]),line(["Consultas web",report.webLeads]),
  line(["Contactos manuales",report.otherLeads]),
  line(["Cierres registrados",report.crmActive?report.closed:"CRM no activado"]),
  "",
  line(["Referencia","Inmueble","Ciudad","Publicada","Vistas de ficha","Clics WhatsApp","Consultas web","Otros contactos","Cierres"]),
  ...report.properties.map(p=>line([p.refCode,p.title,p.city,p.published?"Sí":"No",p.views,p.whatsapp,p.webLeads,p.otherLeads,report.crmActive?p.closed:""]))
 ];
 return new Response("\uFEFF"+lines.join("\r\n"),{
  headers:{"Content-Type":"text/csv; charset=utf-8",
   "Content-Disposition":'attachment; filename="reporte-inmobiliario-'+days+'-dias.csv"',
   "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}
 });
}
