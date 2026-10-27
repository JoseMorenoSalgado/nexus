export type UpdateSeverity = "critical" | "high" | "medium" | "low";
export type UpdateCategory = "security" | "bugfix" | "performance" | "feature";
export type UpdateChannel = "beta" | "stable";
export interface UpdateRelease {
  version: string;
  category: UpdateCategory;
  severity?: UpdateSeverity;
  channel: UpdateChannel;
  title: string;
  notes: string;
  publishedAt: string;
  packageSha256?: string;
}
export interface UpdateManifest {
  schemaVersion: 1;
  releases: UpdateRelease[];
}
