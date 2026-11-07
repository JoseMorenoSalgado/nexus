import Link from "next/link";
import {notFound} from "next/navigation";
import {getStandalonePublicContext} from "@/lib/standalone/public-context";
export const dynamic="force-dynamic";
export default async function StandaloneHome(){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 const context=await getStandalonePublicContext();
 if(!context)notFound();
 return <main className="mx-auto max-w-6xl px-5 py-12">
  <header className="mb-10"><h1 className="text-3xl font-bold">{context.tenant.name}</h1>
  <p className="mt-2">{context.tenant.tagline}</p></header>
  <h2 className="mb-6 text-2xl font-semibold">Propiedades disponibles</h2>
  <div className="grid gap-6 md:grid-cols-3">{context.properties.map(p=>
   <article key={p.id} className="rounded-xl border p-5">
    <h3 className="font-semibold">{p.title}</h3><p>{p.city} · {p.operation}</p>
    <p className="mt-2 font-semibold">US$ {p.price.toLocaleString("en-US")}</p>
    <Link className="mt-4 inline-block underline" href={`/standalone/propiedades/${encodeURIComponent(p.slug)}`}>Ver propiedad</Link>
   </article>)}</div>
 </main>;
}
