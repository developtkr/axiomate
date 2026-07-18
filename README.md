# Axiomate

**Research, reason, write — with evidence attached.**

Axiomate is an open-source, local-first research IDE for LaTeX papers. It reviews evidence, argument structure, mathematical notation, and writing as one connected system instead of adding a generic chat panel to an editor.

> Alpha software. Keep your paper in Git and review every proposed patch.

**Live alpha:** <https://axiomate-delta.vercel.app>

**Desktop alpha:** <https://github.com/developtkr/axiomate/releases/latest>

## Why Axiomate

AI can make scientific prose fluent without making it true. Axiomate is designed around a stricter rule: an unverified claim must never look verified.

- **Claim Ledger** connects factual claims to source passages or project results.
- **Local PDF evidence** extracts page-aware passages in the browser and links an exact passage to a claim without uploading the PDF.
- **Argument map** exposes missing research questions, gaps, contributions, methods, experiments, results, limitations, and conclusions.
- **Mathematical co-worker** tracks symbols and proactively flags notation, definition, sign, and equation–text mismatches.
- **Verified patches** show the reason, affected locations, and exact diff before changing LaTeX.
- **Local-first workspace** keeps `.tex`, `.bib`, figures, and Git as the source of truth.
- **Live collaboration** syncs CodeMirror edits and collaborator presence through an encrypted Yjs/WebRTC room link.
- **Bring your own model** supports OpenAI, OpenRouter, and custom OpenAI-compatible gateways.
- **Optional cloud workspace** adds passwordless email login and explicit, owner-isolated LaTeX snapshots while keeping source PDFs local.
- **Managed review** routes signed-in reviews through an authenticated Vercel Function and Vercel AI Gateway when no BYOK provider is selected.
- **Inspectable AI** records review, patch, and compile runs without storing the LLM key, and applies project writing profiles to local and model review.

## Alpha demo

The deployed web app opens a complete sample paper and runs deterministic analysis locally. You can:

1. edit the LaTeX source;
2. inspect a live semantic paper preview;
3. filter evidence, logic, math, and writing findings;
4. apply a scoped patch and see the paper update;
5. import your own text-based LaTeX project for the browser session;
6. add a text-based source PDF, inspect page passages, and attach one to a claim;
7. inspect the paper-wide argument map and review run history;
8. configure a venue, voice, English variant, and phrases to avoid;
9. optionally connect an OpenAI-compatible model for a second-pass review;
10. copy a live editing link and co-edit the main LaTeX file from another browser.
11. optionally sign in and save or reopen a private project snapshot.

The desktop runtime additionally opens and saves local folders and compiles a full PDF with `latexmk` while shell escape is disabled.

### Connect OpenRouter or a custom gateway

1. Open **Settings** in the top-right toolbar.
2. Choose OpenAI, OpenRouter, or Custom.
3. Enter the gateway host, exact model ID, and LLM key.
4. Select **Connect model**, then run **Run review** in the co-worker panel.

OpenRouter model IDs such as `openai/...`, `anthropic/...`, and `google/...` are passed through unchanged. The current main `.tex` file and active writing profile are sent only when you explicitly run a model review. Imported source PDFs stay local and are not included in that request. The key remains in memory for the current session and is never committed or written to the paper project.

### Attach local PDF evidence

Open **Sources**, select **Add source PDF**, and choose a text-based PDF. Axiomate extracts page text in the browser, lets you select a claim and exact passage, and updates that claim's evidence status. The PDF bytes and extracted text are not uploaded or shared with collaborators in the alpha.

### Share and co-edit

Select **Share** to create and copy a secret room link. Opening the link in another browser synchronizes the main LaTeX document, presence, and remote cursors. The alpha uses Yjs with WebRTC and browser IndexedDB, so the creator should stay online while a new collaborator joins. Anyone with the link can edit; account-based roles and durable server persistence are planned before team production use.

### Optional cloud workspace

The cloud button supports passwordless email login and manual project snapshots when the Supabase Vercel Marketplace integration is configured. Row Level Security restricts each snapshot to its owner. LaTeX files, evidence links, and the writing profile are included; imported source PDF bytes and extracted text remain local. This is personal backup/open functionality, not yet a team role or durable collaboration server.

## Run locally

Requirements:

- Node.js 22
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

Create unsigned macOS alpha artifacts locally:

```bash
npm run desktop:package
```

The generated DMG and ZIP are written to `release/`. Because alpha builds are not notarized, macOS may require an explicit user approval to open them.

Build and test:

```bash
npm test
npm run lint
npm run build
```

## Safety model

- Model keys entered in the app are held in memory for the current session only.
- Deterministic checks run locally.
- Source PDFs are parsed locally and are not sent to the configured model gateway.
- The desktop compiler disables shell escape and limits compile time.
- File reads and writes are constrained to the selected project root.
- Model suggestions are untrusted until schema validation and user approval.
- Shared edits use Yjs CRDT updates; the alpha room link acts as the collaboration secret.
- Cloud snapshots are explicit rather than automatic and are isolated by owner policies.
- Axiomate does not claim to prove mathematical correctness or eliminate hallucinations.

See [SECURITY.md](SECURITY.md) for threat-model and reporting details.

## Architecture

```text
LaTeX project
   │
   ├── Paper model ── sections, claims, citations, equations, symbols
   │
   ├── Local checks ─ evidence, argument map, math, writing profile
   ├── PDF.js sources ─ page text → passage → claim link
   ├── Yjs workspace ─ offline cache, presence, live editing
   │
   ├── Optional model review ─ BYOK endpoint or authenticated Vercel AI Gateway
   ├── Optional cloud ─ email auth + owner-isolated manual snapshots
   │
   └── Verified patch ─ diff → user approval → compile
```

The web app is built with React, TypeScript, CodeMirror 6, PDF.js, Yjs, WebRTC, KaTeX, Vite, Vercel Functions, and an optional Supabase Marketplace resource. The desktop shell uses Electron with a context-isolated preload bridge.

## Current alpha limitations

- The LaTeX parser is intentionally conservative and does not cover every macro package.
- The web preview is semantic HTML/KaTeX, not a complete TeX engine.
- PDF import currently supports text-based PDFs; scanned documents require OCR before import.
- Passage attachment records provenance but does not yet perform automatic semantic entailment grading.
- Symbolic equivalence and numerical sanity checks are not yet formal proof systems.
- Account-based team roles, durable collaboration-server retention, and shared PDF storage are deliberately out of the alpha scope; the room link remains the collaboration access secret.

The detailed product and implementation plan is available in [`outputs/AI_NATIVE_RESEARCH_IDE_DEVELOPMENT_PLAN.md`](outputs/AI_NATIVE_RESEARCH_IDE_DEVELOPMENT_PLAN.md).

## Contributing

Bug reports, LaTeX fixtures, linter rules, and venue profiles are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Apache License 2.0. See [LICENSE](LICENSE).
