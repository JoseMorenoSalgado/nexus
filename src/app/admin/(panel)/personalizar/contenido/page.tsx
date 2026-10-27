import {redirect} from "next/navigation";
/** Redirect the old all-in-one editor to the independent page editor. */
export default function LegacySiteContent(){redirect("/admin/personalizar/paginas");}
