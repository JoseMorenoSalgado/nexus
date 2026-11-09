import {isStandaloneMode} from "@/lib/standalone/mode";
import {notFound,redirect} from "next/navigation";

export const dynamic="force-dynamic";

export default function StandaloneLogin(){
 if(!isStandaloneMode())notFound();
 redirect("/admin/acceso");
}
