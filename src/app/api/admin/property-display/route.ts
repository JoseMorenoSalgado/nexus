import {NextRequest,NextResponse} from "next/server";
import {currentAdmin} from "@/lib/auth";
import {propertyRedirect,validMutationOrigin} from "@/lib/admin-property-request";
import {savePropertyDisplay} from "@/lib/property-display-settings";
const destination="/admin/personalizar/propiedades";
export async function POST(req:NextRequest){
 if(process.env.NEXUS_STANDALONE!=="true")return new NextResponse(null,{status:404});
 const admin=await currentAdmin();
 if(!admin?.roles.includes("admin")||!validMutationOrigin(req,destination))return new NextResponse(null,{status:403});
 try{const form=await req.formData();
 await savePropertyDisplay({showInquiry:form.get("showInquiry")==="on",showPdfName:form.get("showPdfName")==="on",showPdfQr:form.get("showPdfQr")==="on"});
 return propertyRedirect(destination+"?saved=1");}catch{return propertyRedirect(destination+"?error=1");}
}
