/** CSS for authenticated dashboard, team, CMS editor, and admin access only.
 * Keep public CSS and shared installation essentials in the root layout.
 */
import type {Metadata} from "next";
import "../styles/legacy/real-estate-admin.css";
import "../styles/legacy/cms.css";
import "../styles/legacy/commercial-workflows.css";
import "../admin-tidy.css";
import "../inventory-tidy.css";
import "../editor-tidy.css";
import "../cms-tidy.css";
import "../template-editor.css";
import "../page-editor-blocks.css";

export const metadata:Metadata={robots:{index:false,follow:false,noarchive:true}};
export default function AdminLayout({children}:{children:React.ReactNode}){
 return <>{children}</>;
}
