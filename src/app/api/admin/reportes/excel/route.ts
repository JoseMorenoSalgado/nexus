import ExcelJS from "exceljs";
import {currentAdmin} from "@/lib/auth";
import {getStandalonePrisma} from "@/lib/prisma-standalone";
import {reportPeriod} from "@/lib/report-period";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};

export async function GET(request:Request){
 if(process.env.NEXUS_STANDALONE!=="true")return new Response(null,{status:404,headers});
 const admin=await currentAdmin();
 if(!admin)return new Response("Inicia sesión para descargar el reporte.",{status:401,headers});
 if(!admin.roles.some(role=>role==="admin"||role==="editor")){
  return new Response("No tienes permiso para descargar reportes.",{status:403,headers});
 }

 const query=new URL(request.url).searchParams;
 const kind=query.get("tipo");
 if(kind!=="propiedades"&&kind!=="prospectos")return new Response("Reporte desconocido.",{status:400,headers});
 const {days,from}=reportPeriod(query.get("periodo"));
 const db=getStandalonePrisma();
 const workbook=new ExcelJS.Workbook();
 const sheet=workbook.addWorksheet(kind==="propiedades"?"Propiedades":"Prospectos",{views:[{state:"frozen",ySplit:1}]});

 if(kind==="propiedades"){
  sheet.addRow(["Referencia","Propiedad","Ciudad","Zona","Tipo","Operación","Precio USD","Estado","Agente"]);
  const properties=await db.property.findMany({
   orderBy:[{createdAt:"desc"},{id:"asc"}],
   select:{refCode:true,title:true,city:true,neighborhood:true,type:true,operation:true,price:true,published:true,
    assignedAgent:{select:{name:true}}}
  });
  for(const property of properties){
   sheet.addRow([property.refCode,property.title,property.city,property.neighborhood??"",property.type,
    property.operation,Number(property.price),property.published?"Publicada":"Borrador",property.assignedAgent?.name??""]);
  }
  sheet.getColumn(7).numFmt="#,##0.00";
 }else{
  sheet.addRow(["Nombre","Teléfono","Correo","Canal","Estado","Referencia","Propiedad","Interés externo","Agente","Registro UTC"]);
  const prospects=await db.lead.findMany({
   where:{createdAt:{gte:from}},orderBy:[{createdAt:"desc"},{id:"asc"}],
   select:{name:true,phone:true,email:true,source:true,externalPropertyInterest:true,createdAt:true,
    crm:{select:{status:true}},property:{select:{refCode:true,title:true}},assignedAgent:{select:{name:true}}}
  });
  for(const prospect of prospects){
   sheet.addRow([prospect.name,prospect.phone,prospect.email??"",prospect.source,prospect.crm?.status??"",
    prospect.property?.refCode??"",prospect.property?.title??"",prospect.externalPropertyInterest??"",
    prospect.assignedAgent?.name??"",prospect.createdAt]);
  }
  sheet.getColumn(10).numFmt="yyyy-mm-dd hh:mm";
 }

 // ExcelJS writes string values as text, including user input that begins with '='.
 sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};
 sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF292C30"}};
 sheet.columns.forEach(column=>{column.width=25;});
 sheet.autoFilter={from:{row:1,column:1},to:{row:sheet.rowCount,column:sheet.columnCount}};
 const file=await workbook.xlsx.writeBuffer();
 const filename=kind==="prospectos"?kind+"-"+days+"-dias":kind;
 return new Response(new Uint8Array(file),{headers:{
  ...headers,
  "Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "Content-Disposition":'attachment; filename="'+filename+'.xlsx"'
 }});
}
