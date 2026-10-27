import {PageSectionContent} from "@/components/page-section-content";
import {type BuiltinPageSlug,readExtraSections} from "@/lib/page-extras";

/** Adds *only* explicitly saved sections; no empty placeholder or layout shift. */
export async function PageExtraSections({tenantId,slug,demo=false}:{tenantId:string;slug:BuiltinPageSlug;demo?:boolean}){
 if(demo)return null;
 const sections=await readExtraSections(tenantId,slug);
 if(!sections.length)return null;
 return <section className="nexus-section cms-public-additions" aria-label="Contenido adicional"><div className="container">
  <PageSectionContent slug={slug} body="" sections={sections}/>
 </div></section>;
}
