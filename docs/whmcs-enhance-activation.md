# Nexus ↔ Elearning Cloud WHMCS/Enhance — activation contract v1

Status: **Nexus adapter implemented; WHMCS endpoint not yet implemented or tested end-to-end.**

## Configuration (server only)
Set in Enhance Node.js environment (never commit real values):
- `WHMCS_ACTIVATION_URL=https://<trusted-whmcs-domain>/.../activation/consume`
- `WHMCS_ACTIVATION_SECRET=<high-entropy-shared-secret>`

Both are required to enable WHMCS activation. If absent, the existing private 64-character installer token remains the only accepted activation credential. No browser ever receives the shared secret.

## WHMCS endpoint contract
Nexus sends POST JSON with an `Authorization: Bearer <shared-secret>` header and an 8-second timeout. Redirects are not followed.

Request:
```json
{"version":1,"action":"consume","code":"<one-time-code>","cms":"nexus","domain":"nexusrealestatenicaragua.com","requestId":"<uuid>"}
```

WHMCS MUST authenticate the request, verify that the code is unexpired, unused, tied to an **active** owned service, CMS `nexus`, and the **exact registered domain**, then atomically mark it consumed. Respond HTTP 200:
```json
{"valid":true,"consumed":true,"cms":"nexus","domain":"nexusrealestatenicaragua.com","serviceId":"293"}
```

All invalid, expired, replayed or mismatched codes must return non-200 or `valid:false`. Never return customer credentials or secrets. Validate the domain against the service record, not only the request payload. Require CSRF protection and session authorization when generating codes in the WHMCS client portal. Apply rate limiting and audit logging without code values.

**Current limitation:** the consumption and local session creation are separate systems; if WHMCS consumes the code but the local installer is busy, a new code is required. For a later release, implement idempotent redemption bound to requestId and a short-lived reservation protocol.

## Acceptance checklist
- [ ] Implement the WHMCS module endpoint and generation UI.
- [ ] Confirm service/domain ownership and atomic single-use consumption.
- [ ] Configure endpoint and shared secret securely in Enhance.
- [ ] Test invalid/expired/replayed codes and wrong domains.
- [ ] Test Enhance reverse proxy and origin headers.
- [ ] Test installation lock, completion, and rollback.
- [ ] Run build and integration tests before merging and deploying.

This integration does **not** provide a CMS environment-variable editor; that requires a separately authorized and validated API.
