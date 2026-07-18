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
- API keys entered in the UI are retained in memory only and excluded from run history.

The desktop alpha is intended for trusted local projects. Do not expose its compiler as a multi-tenant service without an additional operating-system or container sandbox.
