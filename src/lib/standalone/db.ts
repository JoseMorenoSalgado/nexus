import "server-only";
import {getStandalonePrisma} from "@/lib/prisma-standalone";

/** Compatibility alias: all independent routes share one Prisma client. */
export function standalonePrisma() {
  return getStandalonePrisma();
}
