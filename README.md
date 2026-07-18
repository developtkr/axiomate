# Axiomate

**Research, reason, write — with evidence attached.**

Axiomate is an open-source, local-first research IDE for LaTeX papers. It reviews evidence, argument structure, mathematical notation, and writing as one connected system instead of adding a generic chat panel to an editor.

> Alpha software. Keep your paper in Git and review every proposed patch.

## Why Axiomate

AI can make scientific prose fluent without making it true. Axiomate is designed around a stricter rule: an unverified claim must never look verified.

- **Claim Ledger** connects factual claims to source passages or project results.
- **Argument review** finds contributions that are not evaluated and conclusions that exceed the evidence.
- **Mathematical co-worker** tracks symbols and proactively flags notation, definition, sign, and equation–text mismatches.
- **Verified patches** show the reason, affected locations, and exact diff before changing LaTeX.
- **Local-first workspace** keeps `.tex`, `.bib`, figures, and Git as the source of truth.
- **Live collaboration** syncs CodeMirror edits and collaborator presence through an encrypted Yjs/WebRTC room link.
- **Bring your own model** supports OpenAI, OpenRouter, and custom OpenAI-compatible gateways.

## Alpha demo

The deployed web app opens a complete sample paper and runs deterministic analysis locally. You can:

1. edit the LaTeX source;
2. inspect a live semantic paper preview;
3. filter evidence, logic, math, and writing findings;
4. apply a scoped patch and see the paper update;
5. import your own text-based LaTeX project for the browser session;
6. optionally connect an OpenAI-compatible model for a second-pass review.
7. copy a live editing link and co-edit the main LaTeX file from another browser.

The desktop runtime additionally opens and saves local folders and compiles a full PDF with `latexmk` while shell escape is disabled.

### Connect OpenRouter or a custom gateway

1. Open **Settings** in the top-right toolbar.
2. Choose OpenAI, OpenRouter, or Custom.
3. Enter the gateway host, exact model ID, and LLM key.
4. Select **Connect model**, then run **Run review** in the co-worker panel.

OpenRouter model IDs such as `openai/...`, `anthropic/...`, and `google/...` are passed through unchanged. The current main `.tex` file is sent only when you explicitly run a model review. The key remains in memory for the current session and is never committed or written to the paper project.

### Share and co-edit

Select **Share** to create and copy a secret room link. Opening the link in another browser synchronizes the main LaTeX document, presence, and remote cursors. The alpha uses Yjs with WebRTC and browser IndexedDB, so the creator should stay online while a new collaborator joins. Anyone with the link can edit; account-based roles and durable server persistence are planned before team production use.

## Run locally

Requirements:

- Node.js 20 or newer
- npm 10 or newer
- `latexmk` plus a TeX distribution for desktop PDF compilation

```bash
git clone https://github.com/developtkr/axiomate.git
cd axiomate
npm install
npm run dev
```

Open the desktop runtime:

```bash
npm run desktop
```

Build and test:

```bash
npm test
npm run lint
npm run build
```

## Safety model

- Model keys entered in the app are held in memory for the current session only.
- Deterministic checks run locally.
- The desktop compiler disables shell escape and limits compile time.
- File reads and writes are constrained to the selected project root.
- Model suggestions are untrusted until schema validation and user approval.
- Shared edits use Yjs CRDT updates; the alpha room link acts as the collaboration secret.
- Axiomate does not claim to prove mathematical correctness or eliminate hallucinations.

See [SECURITY.md](SECURITY.md) for threat-model and reporting details.

## Architecture

```text
LaTeX project
   │
   ├── Paper model ── sections, claims, citations, equations, symbols
   │
   ├── Local checks ─ evidence, argument, math, writing
   ├── Yjs workspace ─ offline cache, presence, live editing
   │
   ├── Optional model review ─ OpenAI-compatible endpoint
   │
   └── Verified patch ─ diff → user approval → compile
```

The web app is built with React, TypeScript, CodeMirror 6, Yjs, WebRTC, KaTeX, and Vite. The desktop shell uses Electron with a context-isolated preload bridge.

## Current alpha limitations

- The LaTeX parser is intentionally conservative and does not cover every macro package.
- The web preview is semantic HTML/KaTeX, not a complete TeX engine.
- Citation entailment in the sample is based on registered evidence passages; PDF ingestion is planned next.
- Symbolic equivalence and numerical sanity checks are not yet formal proof systems.
- Account-based team roles and cloud project storage are deliberately out of the alpha scope.
- The alpha supports link-based live editing, but not account-based team roles or server-side document retention yet.

The detailed product and implementation plan is available in [`outputs/AI_NATIVE_RESEARCH_IDE_DEVELOPMENT_PLAN.md`](outputs/AI_NATIVE_RESEARCH_IDE_DEVELOPMENT_PLAN.md).

## Contributing

Bug reports, LaTeX fixtures, linter rules, and venue profiles are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Apache License 2.0. See [LICENSE](LICENSE).
