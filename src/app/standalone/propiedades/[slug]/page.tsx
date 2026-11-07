import {notFound} from "next/navigation";
import {findStandalonePublishedProperty,getStandaloneSiteConfig} from "@/lib/standalone/repositories";
export const dynamic="force-dynamic";
export default async function StandaloneProperty({params}:{params:Promise<{slug:string}>}){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 const {slug}=await params;
 const [property,site]=await Promise.all([findStandalonePublishedProperty(slug),getStandaloneSiteConfig()]);
 if(!property||!site)notFound();
 return <main className="mx-auto max-w-4xl px-5 py-12">
  <p>{site.name}</p><h1 className="mt-4 text-3xl font-bold">{property.title}</h1>
  <p className="mt-2">{property.city} · {property.neighborhood||""}</p>
  <p className="my-6 text-2xl font-semibold">US$ {Number(property.price).toLocaleString("en-US")}</p>
  <p className="whitespace-pre-wrap">{property.description}</p>
  <p className="mt-6">Referencia: {property.refCode}</p>
 </main>;
}
