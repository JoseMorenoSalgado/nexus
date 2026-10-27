/** Both MySQL and MariaDB share Prisma's mysql provider. */
export type DatabaseEngine="mysql"|"postgresql";
export function engineFromUrl(url:string):DatabaseEngine{
 const protocol=new URL(url).protocol.toLowerCase();
 if(protocol==="mysql:")return "mysql";
 if(protocol==="postgres:"||protocol==="postgresql:")return "postgresql";
 throw new Error("Motor de base de datos no compatible");
}
export function prismaSchemaFor(engine:DatabaseEngine){
 return engine==="postgresql"?"prisma/schema.postgres.prisma":"prisma/schema.prisma";
}
