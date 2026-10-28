import {hasSiteAsset,heroKindForPage} from "@/lib/site-assets";

/** Decorative image for editable built-in page banners; no DOM scripts or SQL writes. */
export async function PageHeroMedia({tenantId,slug}:{tenantId:string;slug:string}){
 const kind=heroKindForPage(slug);
 if(!kind||!await hasSiteAsset(tenantId,kind))return null;
 return <img className="nexus-inner-page-photo" src={"/api/site-media/"+kind}
  width={1920} height={1080} alt="" aria-hidden="true" loading="eager" decoding="async"/>;
}
