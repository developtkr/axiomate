# Security Policy

## Supported versions

Axiomate is currently alpha software. Security fixes are applied to the latest `main` branch.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub Security Advisories instead of opening a public issue. Include reproduction steps, affected files, and the expected impact.

## Current trust boundaries

- LaTeX projects, PDFs, bibliography data, and model output are untrusted input.
- The renderer cannot access Node.js directly.
- Desktop file operations are exposed through a narrow, context-isolated bridge.
- Project writes are constrained to the selected root and symbolic links are not imported.
- `latexmk` runs with shell escape disabled, a time limit, and a reduced environment.
- Web `latexmk` runs only after Clerk authentication in a per-request Vercel Sandbox restored from a fixed snapshot. Network access and shell escape are disabled, project paths are validated, request/PDF sizes and execution time are bounded, and the Sandbox is stopped after the request.
- API keys entered in the UI are retained in memory only and excluded from run history.
- Cloud APIs verify Clerk session tokens before querying Neon, and every project query includes the verified Clerk user ID.
- Neon credentials and Clerk secret keys are server-only; imported PDF bytes and extracted full text are excluded from cloud snapshots.

The desktop alpha is intended for trusted local projects. The web compiler is the multi-tenant path and must keep its Clerk gate, fixed snapshot, network denial, path validation, resource bounds, and per-request Sandbox isolation enabled.
