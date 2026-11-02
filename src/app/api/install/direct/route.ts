import {NextResponse} from "next/server";
import {installerAvailable} from "@/lib/server-config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
 return new NextResponse(null,{status:303,headers:{Location:installerAvailable()?"/instalar?paso=activar":"/admin/acceso","Cache-Control":"no-store"}});
}
