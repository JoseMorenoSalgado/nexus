/**
 * Vista previa explícita y limitada a un único dominio.
 * Nunca muestra datos privados ni sustituye la autorización multi-tenant.
 */
export function normalizeSiteHost(value: string) {
  return value.toLowerCase().trim().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function isPreviewHost(value: string) {
  const allowed = process.env.SITE_PREVIEW_HOST?.trim();
  return process.env.SITE_PREVIEW_MODE === "true"
    && Boolean(allowed)
    && normalizeSiteHost(value) === normalizeSiteHost(allowed || "");
}
