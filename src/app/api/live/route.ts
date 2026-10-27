import {NextResponse} from "next/server";
import {APP_RELEASE} from "@/lib/release";
export const dynamic="force-dynamic";
export function GET(){return NextResponse.json({status:"online",service:"webappecloud",release:APP_RELEASE},{headers:{"Cache-Control":"no-store, max-age=0"}});}
