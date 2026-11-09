import Link from "next/link";
import {ArrowUpRight, ChevronDown, KeyRound, MapPinHouse} from "lucide-react";

const questions = [
 {
  question: "¿Qué reviso antes de agendar una visita?",
  answer: "Confirma el precio, la disponibilidad, la ubicación aproximada y qué incluye el inmueble. Ten a mano la referencia de la ficha para que sea más fácil identificarlo."
 },
 {
  question: "¿Qué información preparo si quiero vender o alquilar?",
  answer: "Reúne la ubicación, el área, las características principales, el precio esperado y fotos recientes. Indica si el inmueble está ocupado y cuándo se puede visitar."
 },
 {
  question: "¿Qué hago si todavía no encuentro una opción adecuada?",
  answer: "Comparte las zonas que te interesan, tu presupuesto y los requisitos indispensables. Eso ayuda a identificar opciones que se ajusten mejor a tu búsqueda."
 }
];

export function NexusHomeGuide({catalogueVisible, contactVisible}: {
 catalogueVisible: boolean;
 contactVisible: boolean;
}) {
 return <section className="nexus-section nexus-home-guide" aria-labelledby="nexus-guide-title">
  <div className="container">
   <div className="nexus-section-heading">
    <div>
     <span className="nexus-section-kicker">Guía inmobiliaria</span>
     <h2 id="nexus-guide-title">Antes de dar el <em>siguiente paso</em></h2>
     <p>Prepara la información que te ayudará a comparar opciones o presentar tu inmueble.</p>
    </div>
   </div>
   <div className="nexus-guide-grid">
    <article className="nexus-guide-card" aria-labelledby="nexus-guide-search">
     <KeyRound size={25} aria-hidden="true"/>
     <h3 id="nexus-guide-search">Quiero comprar o alquilar</h3>
     <ul>
      <li>Define tu presupuesto y las zonas que te interesan.</li>
      <li>Separa lo indispensable de lo que puedes negociar.</li>
      <li>Guarda la referencia de las propiedades que quieras visitar.</li>
     </ul>
     {catalogueVisible&&<Link className="nexus-text-link" href="/propiedades">Buscar propiedades <ArrowUpRight size={17} aria-hidden="true"/></Link>}
    </article>
    <article className="nexus-guide-card" id="para-propietarios" aria-labelledby="nexus-guide-owner">
     <MapPinHouse size={25} aria-hidden="true"/>
     <h3 id="nexus-guide-owner">Quiero ofrecer mi propiedad</h3>
     <ul>
      <li>Prepara fotos recientes de los espacios principales.</li>
      <li>Anota la ubicación, el área y el precio que esperas.</li>
      <li>Indica si deseas vender o alquilar y cuándo se puede visitar.</li>
     </ul>
     {contactVisible&&<Link className="nexus-text-link" href="/contacto">Consultar sobre mi propiedad <ArrowUpRight size={17} aria-hidden="true"/></Link>}
    </article>
   </div>
   <div className="nexus-guide-questions" aria-labelledby="nexus-guide-questions-title">
    <h3 id="nexus-guide-questions-title">Preguntas frecuentes</h3>
    <div>
     {questions.map(({question,answer})=><details key={question}>
      <summary>{question}<ChevronDown size={18} aria-hidden="true"/></summary>
      <p>{answer}</p>
     </details>)}
    </div>
   </div>
  </div>
 </section>;
}
