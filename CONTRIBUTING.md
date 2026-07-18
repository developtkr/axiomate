# Contributing to Axiomate

Thanks for helping build a safer research-writing tool.

## Development

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Create a focused branch.
4. Run `npm test`, `npm run lint`, and `npm run build`.
5. Open a pull request that explains the user impact and validation performed.

## Useful contributions

- minimized LaTeX parser fixtures;
- deterministic paper-linter rules;
- citation-support evaluation cases;
- mathematical notation consistency checks;
- accessible UI improvements;
- venue profiles based on publicly documented requirements.

Do not submit copyrighted papers, private manuscripts, API keys, or generated bibliography entries that have not been verified against a real source.

## Design constraints

- `.tex` and `.bib` remain the source of truth.
- AI changes are proposed as patches and require user approval.
- Uncertainty must be visible; do not turn model confidence into a correctness claim.
- Prefer a small deterministic rule over a broad model prompt when both solve the same problem.
