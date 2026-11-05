import {BrandImage} from "@/components/brand-image";
import Link from "next/link";
import {Layers3} from "lucide-react";
import {type PublicTenant} from "@/lib/demo";
import {sitePresentation} from "@/lib/site-presentation";
import {type SiteTemplateKey} from "@/lib/site-template-registry";

/** Reusable organization branding; customer-specific identity is selected by its presentation preset. */
export function SiteBrand({tenant,templateKey="real-estate"}:{tenant:PublicTenant;templateKey?:SiteTemplateKey}){
 const brand=sitePresentation(tenant,templateKey);
 return <Link className="brand nexus-brand" href="/" aria-label={"Inicio · "+tenant.name}>
  <span className="brand-icon">{tenant.logoUrl?
   <BrandImage key={tenant.logoUrl} src={tenant.logoUrl} fallback={brand.fallbackLogo}/>:
   brand.fallbackLogo?<BrandImage src={brand.fallbackLogo}/>:<Layers3 size={28} aria-hidden="true"/>}</span>
  <span><strong>{brand.name}</strong><small>{brand.subtitle}</small></span>
 </Link>;
}
