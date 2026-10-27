import { requireRole } from "@/lib/auth";
import UpdateManagerDemo from "@/components/update-manager/UpdateManagerDemo";

export const dynamic = "force-dynamic";

/** Administration-only simulation; no update packages or backups are executed. */
export default async function ActualizacionesPage() {
  await requireRole(["admin"]);
  return <main className="min-h-screen bg-white p-4 text-slate-900 md:p-8">
    <UpdateManagerDemo />
  </main>;
}
