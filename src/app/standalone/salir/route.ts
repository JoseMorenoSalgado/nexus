import type {NextRequest} from "next/server";
import {POST as logout} from "@/app/api/admin/logout/route";
import {isStandaloneMode} from "@/lib/standalone/mode";

export function POST(request:NextRequest){
 if(!isStandaloneMode())return new Response(null,{status:404});
 return logout(request);
}
