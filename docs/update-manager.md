# WebAppECloud — Private Update Manager (phase 1)

This branch adds a **read-only** manifest client and release classification types. No installation or automatic execution is enabled.

## Configuration

Set `WEBAPPECLOUD_UPDATE_MANIFEST_URL` to a trusted HTTPS endpoint controlled by Elearning Cloud. Until configured, the checker reports an unavailable update service; it must not display a fabricated success state.

Manifest example:

```json
{
  "schemaVersion": 1,
  "releases": [{
    "version": "1.1.0",
    "category": "security",
    "severity": "high",
    "channel": "beta",
    "title": "Security maintenance",
    "notes": "Summary of verified fixes",
    "publishedAt": "2026-10-23T00:00:00Z"
  }]
}
```

## Security gates before production

- Authenticate installations and authorize release channels via WHMCS or a dedicated API.
- Digitally sign manifests and release archives; verify signatures using pinned public keys.
- Implement safe, bounded archive extraction, backup, database migration strategy, controlled Docker deployment restart, health check and recovery.
- Use per-installation credentials and a background job with least privilege.
- Integrate dashboard route, authorization and audit trail after inspecting the app's actual navigation/auth structure.
- Do not enable automatic updates before integration tests and rollback testing.

The initial client only checks metadata; it does not fetch or install any package.
