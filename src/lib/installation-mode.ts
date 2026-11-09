/** Single source of truth for independent installations.
 * NEXUS_STANDALONE_MODE is a deprecated alias and must not enable routes on its own.
 */
export function isStandaloneMode(): boolean {
  return process.env.NEXUS_STANDALONE === "true";
}
