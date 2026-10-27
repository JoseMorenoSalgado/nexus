import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { validateSnapshotManifest, validRelativeSnapshotPath, verifySnapshotContent } from "./snapshot";

test("rejects unsafe backup paths", () => {
  for (const path of ["../.env", "/etc/passwd", "a/../../b", "a//b", "https://example.com/x", "a\\\\b"]) {
    assert.equal(validRelativeSnapshotPath(path), false, path);
  }
});
test("validates snapshot metadata and SHA256", () => {
  const content = Buffer.from("test backup");
  const database = { path: "db/dump.sql", bytes: content.length, sha256: createHash("sha256").update(content).digest("hex") };
  const manifest = { schemaVersion: 1, snapshotId: "snap_20261023", createdAt: "2026-10-23T12:00:00Z", appVersion: "1.0.0", database, files: [] };
  assert.equal(validateSnapshotManifest(manifest).snapshotId, manifest.snapshotId);
  assert.equal(verifySnapshotContent(content, database), true);
  assert.equal(verifySnapshotContent(Buffer.from("changed"), database), false);
  assert.throws(() => validateSnapshotManifest({ ...manifest, files: [database] }));
});
