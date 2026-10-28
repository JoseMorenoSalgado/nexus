import {redirect} from "next/navigation";
/** Legacy entry point now opens the unified website administration hub. */
export default function LegacySiteContent(){redirect("/admin/personalizar/inicio");}
