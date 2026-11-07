import {notFound,redirect} from "next/navigation";
import {authenticateStandalone,currentStandaloneAdmin} from "@/lib/standalone/auth";
export const dynamic="force-dynamic";
async function login(formData:FormData){
 "use server";
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 const email=String(formData.get("email")||"").slice(0,254);
 const password=String(formData.get("password")||"");
 if(password.length>1024)redirect("/standalone/acceso?error=1");
 const valid=await authenticateStandalone(email,password);
 if(!valid)redirect("/standalone/acceso?error=1");
 redirect("/standalone/admin");
}
export default async function StandaloneLogin({searchParams}:{searchParams:Promise<{error?:string}>}){
 if(process.env.NEXUS_STANDALONE_MODE!=="true")notFound();
 if(await currentStandaloneAdmin())redirect("/standalone/admin");
 const {error}=await searchParams;
 return <main className="mx-auto max-w-md px-5 py-16">
  <h1 className="text-2xl font-bold">Acceso administrativo</h1>
  {error==="1"&&<p role="alert" className="my-4 text-red-700">Credenciales incorrectas.</p>}
  <form action={login} className="mt-8 flex flex-col gap-4">
   <label>Correo electrónico<input className="block w-full rounded border p-3" type="email" name="email" required autoComplete="username"/></label>
   <label>Contraseña<input className="block w-full rounded border p-3" type="password" name="password" required autoComplete="current-password"/></label>
   <button className="rounded bg-black p-3 text-white" type="submit">Iniciar sesión</button>
  </form>
 </main>;
}
