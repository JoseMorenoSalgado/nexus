import {installerAvailable,hasDatabaseConfig} from "@/lib/server-config";
import {redirect} from "next/navigation";
import StandaloneHome from "@/app/_standalone/home";
import {RealEstateHome} from "@/components/templates/real-estate-home";
export const dynamic="force-dynamic";
export default function Home(){
 if(!hasDatabaseConfig()&&installerAvailable())redirect("/instalar");
 if(process.env.NEXUS_STANDALONE==="true")return <StandaloneHome/>;
 return <RealEstateHome/>;
}
