import Link from "next/link";
import {mediaVariantUrl} from "@/lib/media-url";
import {MapPin,BedDouble,Bath,Maximize2,ArrowUpRight} from "lucide-react";
import {formatPrice,type PublicProperty} from "@/lib/demo";
export function PropertyCard({property:p}:{property:PublicProperty}){
 return <article className="property-card">
  <Link href={`/propiedades/${p.slug}`} className="property-photo">{p.image?<img src={mediaVariantUrl(p.image,"card")} alt={p.title} width={720} height={480} loading="lazy" decoding="async"/>:<span className="photo-empty">Fotografía próximamente</span>}<span className="property-status">{p.operation==="venta"?"En venta":"En alquiler"}</span></Link>
  <div className="property-content"><div className="property-price">{formatPrice(p)}</div><h3><Link href={`/propiedades/${p.slug}`}>{p.title}</Link></h3><p className="subline"><MapPin size={15}/>{p.neighborhood}, {p.city}</p><div className="property-features"><span><BedDouble size={16}/>{p.bedrooms}</span><span><Bath size={16}/>{p.bathrooms}</span><span><Maximize2 size={16}/>{p.areaM2} m²</span><Link href={`/propiedades/${p.slug}`} aria-label={`Ver ${p.title}`}><ArrowUpRight size={18}/></Link></div></div>
 </article>;
}
