import Link from "next/link";
import {FileText,ListTree,Palette,PanelTop,Images} from "lucide-react";

/** A single navigation for all customization screens; never mix independent editors. */
export function SiteCustomizerNav({current}:{current:"overview"|"pages"|"media"|"menu"|"identity"}){
 const links=[
  {key:"overview" as const,href:"/admin/personalizar/inicio",label:"Mi sitio web",Icon:PanelTop},
  {key:"pages" as const,href:"/admin/personalizar/paginas",label:"Páginas",Icon:FileText},
  {key:"identity" as const,href:"/admin/personalizar/identidad",label:"Logotipo y colores",Icon:Palette},
  {key:"menu" as const,href:"/admin/personalizar/menu",label:"Menú",Icon:ListTree},
  {key:"media" as const,href:"/admin/personalizar/medios",label:"Biblioteca",Icon:Images}
 ];
 return <nav aria-label="Herramientas de personalización" className="cms-toolbar cms-toolbar-unified">
  {links.map(({key,href,label,Icon})=><Link key={key} href={href} className={current===key?"cms-toolbar-current":undefined} aria-current={current===key?"page":undefined}>
   <Icon size={17} aria-hidden="true"/><span>{label}</span>
  </Link>)}
 </nav>;
}
