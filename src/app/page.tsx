import {installerAvailable,hasDatabaseConfig} from "@/lib/server-config";
import {redirect} from "next/navigation";
import {RealEstateHome} from "@/components/templates/real-estate-home";
export const dynamic="force-dynamic";
export default function Home(){
 if(!hasDatabaseConfig()&&installerAvailable())redirect("/instalar");
 if(process.env.NEXUS_STANDALONE==="true")redirect("/standalone");
 return <RealEstateHome/>;
}
