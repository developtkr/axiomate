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
- **Durable browser workspace** restores text projects, evidence links, and writing preferences from IndexedDB and supports explicit save or `Ctrl/⌘S`.
- **Live collaboration** syncs CodeMirror edits and collaborator presence through an encrypted Yjs/WebRTC room link.
- **Bring your own model** supports OpenAI, OpenRouter, and custom OpenAI-compatible gateways.
- **Optional cloud workspace** uses Clerk sign-in and owner-isolated Neon snapshots while keeping source PDFs local.
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
10. copy a live editing link and co-edit the main LaTeX file from another browser;
11. optionally sign in and save or reopen a private project snapshot.
12. sign in and compile the imported text project into a real PDF in an isolated Vercel Sandbox.

The semantic preview updates immediately while you write. Signed-in web users can run a real `latexmk` PDF compile in an isolated Vercel Sandbox; the desktop runtime additionally opens and saves local folders and compiles without uploading the project.

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

The cloud button uses Clerk for sign-in and Neon Postgres for manual project snapshots. Every Function verifies the Clerk session and adds the verified Clerk user ID to its Neon query; the browser cannot choose an owner ID. LaTeX files, evidence links, and the writing profile are included. Imported source PDF bytes and extracted full text remain local. This is personal save/open/delete functionality, not yet a team role or durable collaboration server.

### Configure Clerk and Neon

The app stays in Guest/Local-only mode when these services are not configured.

1. Create a Clerk application and copy its publishable and secret keys.
2. Provision Neon through the Vercel Marketplace and connect it to the Axiomate Vercel project.
3. Configure `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `DATABASE_URL` for Preview and Production. The Vercel Marketplace's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is mapped to the Vite key automatically. `CLERK_JWT_KEY` is optional and enables networkless session verification.
4. Add `http://localhost:5173` and `https://axiomate-delta.vercel.app` as allowed application origins in Clerk. Add any stable custom Preview origin you intend to use.
5. Pull the development variables, then apply the single schema migration:

```bash
vercel env pull .env.local
psql "$DATABASE_URL" -f neon/migrations/001_projects.sql
```

`DATABASE_URL`, `CLERK_SECRET_KEY`, and `CLERK_JWT_KEY` are server-only values and must never use the `VITE_` prefix. The managed review path additionally uses Vercel AI Gateway and the optional `AXIOMATE_GATEWAY_MODEL` setting. Configure an AI Gateway budget before enabling it for external users.

To enable web PDF compilation, create the reusable TeX snapshot once and add the printed value as `AXIOMATE_TEX_SNAPSHOT_ID` in Vercel Development, Preview, and Production:

```bash
vercel env pull .env.local
npm run sandbox:prepare
vercel env add AXIOMATE_TEX_SNAPSHOT_ID
```

The compile Function requires a verified Clerk session, disables network access and shell escape, limits input/output size and execution time, and destroys each isolated Sandbox after the request.

Clerk requires a custom domain for its production instance. Until one is connected to Vercel and configured in Clerk, use Clerk's development instance only for local and Preview testing; Guest mode remains available on the production `vercel.app` URL.

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
- The web compiler runs only for authenticated users inside an isolated Vercel Sandbox with network access and shell escape disabled.
- File reads and writes are constrained to the selected project root.
- Model suggestions are untrusted until schema validation and user approval.
- Shared edits use Yjs CRDT updates; the alpha room link acts as the collaboration secret.
- Cloud snapshots are explicit rather than automatic; every Neon query is scoped to the verified Clerk user ID.
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
   ├── Optional cloud ─ Clerk auth + owner-isolated Neon snapshots
   │
   ├── Web compile ─ Clerk auth → isolated Vercel Sandbox → PDF
   └── Verified patch ─ diff → user approval → compile
```

The web app is built with React, TypeScript, CodeMirror 6, PDF.js, Yjs, WebRTC, KaTeX, Vite, Vercel Functions, optional Clerk authentication, and optional Neon Postgres. The desktop shell uses Electron with a context-isolated preload bridge.

## Current alpha limitations

- The LaTeX parser is intentionally conservative and does not cover every macro package.
- The live web preview is semantic HTML/KaTeX; signed-in users can explicitly compile a real PDF. The alpha compiler supports imported text files but not binary figures yet.
- The reusable web compiler image currently uses the TeX packages available in its Amazon Linux snapshot; unusual packages may need to be added to the snapshot script.
- PDF import currently supports text-based PDFs; scanned documents require OCR before import.
- Passage attachment records provenance but does not yet perform automatic semantic entailment grading.
- Symbolic equivalence and numerical sanity checks are not yet formal proof systems.
- Account-based team roles, durable collaboration-server retention, and shared PDF storage are deliberately out of the alpha scope; the room link remains the collaboration access secret.

The detailed product and implementation plan is available in [`outputs/AI_NATIVE_RESEARCH_IDE_DEVELOPMENT_PLAN.md`](outputs/AI_NATIVE_RESEARCH_IDE_DEVELOPMENT_PLAN.md).

## Contributing

Bug reports, LaTeX fixtures, linter rules, and venue profiles are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Apache License 2.0. See [LICENSE](LICENSE).
