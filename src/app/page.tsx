import {getPublicContext} from "@/lib/tenant";
import {getSiteTemplate} from "@/lib/site-template-store";
import {RealEstateHome} from "@/components/templates/real-estate-home";
import {OrganizationHome} from "@/components/templates/organization-site";
export const dynamic="force-dynamic";
export default async function Home(){
 const context=await getPublicContext({loadProperties:false});
 const template=await getSiteTemplate(context.tenant.id);
 if(template.key==="real-estate")return <RealEstateHome/>;
 return <OrganizationHome tenant={context.tenant} demo={context.demo} heroImage={context.heroImage} template={template}/>;
}
