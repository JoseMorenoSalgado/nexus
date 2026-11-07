import {NextResponse} from "next/server";
import {destroyStandaloneSession} from "@/lib/standalone/auth";
export async function POST(request:Request){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")return new Response(null,{status:404});
 const origin=request.headers.get("origin");
 const expected=process.env.SITE_URL;
 if(!origin||!expected||new URL(origin).origin!==new URL(expected).origin)return new Response(null,{status:403});
 await destroyStandaloneSession();
 return NextResponse.redirect(new URL("/standalone/acceso",request.url),{status:303});
}
