/** Run only inside the application container; never pass credentials as arguments. */
import {existsSync,mkdirSync,openSync,closeSync,writeFileSync,unlinkSync,linkSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {homedir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export async function restoreInstallation({url,host,directory,createClient}) {
  if (!url || !host) throw new Error('Define DATABASE_URL y RECOVERY_HOST en el entorno privado del contenedor.');
  const protocol=new URL(url).protocol;
  if (!['mysql:','postgres:','postgresql:'].includes(protocol)) throw new Error('Motor SQL no compatible.');
  const hostname=host.trim().toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'');
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(hostname)) throw new Error('RECOVERY_HOST debe ser un dominio, sin protocolo ni ruta.');
  mkdirSync(directory,{recursive:true,mode:0o700});
  const target=join(directory,'installation.json');
  if (existsSync(target)) throw new Error('Ya existe configuración. No se sobrescribió.');
  const lock=join(directory,'.installer.lock');
  const fd=openSync(lock,'wx',0o600);
  const temporary=join(directory,'.recovery-'+randomUUID());
  let db;
  try {
    db=await createClient(protocol,url);
    const domain=await db.domain.findUnique({where:{hostname},include:{tenant:true}});
    if (!domain?.tenant.active) throw new Error('El dominio no pertenece a una institución activa en esta base.');
    const admin=await db.adminUser.findFirst({where:{tenantId:domain.tenantId,active:true,role:'admin'},select:{id:true}});
    if (!admin) throw new Error('No existe un administrador activo para este dominio.');
    // Check the tables required by public pages and sign-in before restoring.
    await db.property.count({where:{tenantId:domain.tenantId}});
    await db.photo.count();
    await db.adminSession.count();
    await db.adminLoginThrottle.count();
    writeFileSync(temporary,JSON.stringify({version:1,databaseUrl:url,installedAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
    // Atomic publication without overwriting an installation created concurrently.
    linkSync(temporary,target);
  } finally {
    try { if (db) await db.$disconnect(); }
    finally {
      if (existsSync(temporary)) unlinkSync(temporary);
      closeSync(fd);
      unlinkSync(lock);
    }
  }
}

if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    await restoreInstallation({
      url:process.env.DATABASE_URL?.trim(),host:process.env.RECOVERY_HOST,
      directory:resolve(process.env.APP_CONFIG_DIR||join(homedir(),'nexus-runtime')),
      createClient:async(protocol,url)=>{
        const module=protocol==='mysql:'?await import('@prisma/client'):await import('../src/generated/postgres/index.js');
        return new module.PrismaClient({datasources:{db:{url}},log:[]});
      }
    });
    console.log('Conexión restaurada. Se conservaron los datos y contraseñas. Comprueba la web y el acceso administrativo.');
  } catch (error) {
    // Prisma errors can include the SQL connection string: do not print them.
    const safeMessages=['Define DATABASE_URL','Motor SQL','RECOVERY_HOST','Ya existe configuración','El dominio no pertenece','No existe un administrador'];
    const message=error instanceof Error?error.message:'';
    console.error(safeMessages.some(prefix=>message.startsWith(prefix))?message:'No se restauró la conexión. Revisa conexión SQL, tablas, permisos y bloqueo de instalación.');
    process.exitCode=1;
  }
}
