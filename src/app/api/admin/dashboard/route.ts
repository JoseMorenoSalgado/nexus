import {isStandaloneMode} from "@/lib/standalone/mode";
import {NextResponse} from "next/server";
import {currentStandaloneAdmin} from "@/lib/standalone/auth";
import {listStandaloneAdminProperties,listStandaloneLeads,listStandaloneAgents,listStandaloneAgenda,getStandaloneSiteConfig} from "@/lib/standalone/repositories";

/**
 * Integration endpoint for new-install standalone dashboard.
 * Explicit opt-in prevents legacy production from touching the new schema.
 * Authenticated administrators only; never expose customer data publicly.
 */
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!isStandaloneMode())return new Response(null,{status:404});
 const admin=await currentStandaloneAdmin();
 if(!admin)return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!admin.roles.some(role=>["admin","superadmin"].includes(role)))return NextResponse.json({error:"Forbidden"},{status:403});
 const section=new URL(request.url).searchParams.get("section")||"summary";
 try{
  if(section==="summary"){
   const [site,properties,leads,agents,agenda]=await Promise.all([
    getStandaloneSiteConfig(),listStandaloneAdminProperties(),listStandaloneLeads(),listStandaloneAgents(),listStandaloneAgenda()
   ]);
   return NextResponse.json({site:{name:site?.name||""},counts:{
    properties:properties.length,leads:leads.length,agents:agents.length,agenda:agenda.length
   }});
  }
  if(section==="properties")return NextResponse.json({items:await listStandaloneAdminProperties()});
  if(section==="leads")return NextResponse.json({items:await listStandaloneLeads()});
  if(section==="agents")return NextResponse.json({items:await listStandaloneAgents()});
  if(section==="agenda")return NextResponse.json({items:await listStandaloneAgenda()});
  return NextResponse.json({error:"Unknown section"},{status:400});
 }catch(error){
  console.error("Standalone dashboard integration failure",error instanceof Error?error.name:"unknown");
  return NextResponse.json({error:"Standalone database unavailable"},{status:503});
 }
}
