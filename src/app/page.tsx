import {redirect} from "next/navigation";
import {RealEstateHome} from "@/components/templates/real-estate-home";
export const dynamic="force-dynamic";
export default function Home(){if(process.env.NEXUS_STANDALONE_MODE==="true")redirect("/standalone");return <RealEstateHome/>;}
