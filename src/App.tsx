import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Code2,
  Columns2,
  FileOutput,
  Github,
  LoaderCircle,
  PanelLeftClose,
  Play,
  RotateCcw,
  Save,
  Settings,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAxiomateAuth } from "./auth/useAxiomateAuth";
import { CloudWorkspaceDialog } from "./components/CloudWorkspaceDialog";
import { CoWorkerPanel } from "./components/CoWorkerPanel";
import { EditorPane } from "./components/EditorPane";
import { PaperPreview } from "./components/PaperPreview";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ScoreStrip } from "./components/ScoreStrip";
import { SettingsDialog } from "./components/SettingsDialog";
import { SourceInspector } from "./components/SourceInspector";
import { sampleEvidence, sampleProject } from "./data/sampleProject";
import { useCollaboration } from "./hooks/useCollaboration";
import { useCloudWorkspace } from "./hooks/useCloudWorkspace";
import { requestManagedReview, requestModelReview, type ProviderConfig } from "./lib/aiProvider";
import { loadLocalWorkspace, saveLocalWorkspace } from "./lib/localWorkspace";
import { extractPdfSource } from "./lib/pdfSource";
import { analyzePaper, applySuggestion } from "./lib/paperAnalysis";
import { requestWebCompile } from "./lib/webCompile";
import type { Evidence, PaperProject, ProjectFile, ResearchSource, ReviewRun, StyleProfile, Suggestion } from "./types";

type WorkspaceView = "source" | "split" | "preview";
type SidebarTab = "files" | "outline" | "argument" | "claims" | "sources";

const githubUrl = "https://github.com/developtkr/axiomate";
const collaborationColors = ["#83d6b6", "#d9ad66", "#76a9d8", "#c99ad6", "#d87373"];
const defaultStyleProfile: StyleProfile = {
  venue: "generic",
  voice: "balanced",
  english: "american",
  avoidPhrases: "clearly, obviously",
};

function fileType(path: string): ProjectFile["type"] {
  if (path.endsWith(".tex")) return "tex";
  if (path.endsWith(".bib")) return "bib";
  return "other";
}

function findMainFile(files: ProjectFile[]) {
  return files.find((file) => file.content.includes("\\documentclass"))?.path ?? files.find((file) => file.type === "tex")?.path ?? files[0]?.path ?? "main.tex";
}

export function App() {
  const [project, setProject] = useState<PaperProject>(sampleProject);
  const [activeFile, setActiveFile] = useState(sampleProject.mainFile);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("files");
  const [view, setView] = useState<WorkspaceView>("split");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>();
  const [toast, setToast] = useState("Demo project loaded · Local analysis mode");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [activeCloudId, setActiveCloudId] = useState<string>();
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>();
  const [modelSuggestions, setModelSuggestions] = useState<Suggestion[]>([]);
  const [reviewRuns, setReviewRuns] = useState<ReviewRun[]>([]);
  const [styleProfile, setStyleProfile] = useState<StyleProfile>(defaultStyleProfile);
  const [evidence, setEvidence] = useState<Evidence[]>(sampleEvidence);
  const [researchSources, setResearchSources] = useState<ResearchSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<ResearchSource>();
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ file: string; line: number; id: number }>();
  const [collaborationRoom, setCollaborationRoom] = useState(() => {
    const roomId = new URLSearchParams(window.location.search).get("room");
    return roomId ? { id: roomId, isHost: false } : undefined;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const pdfUrlRef = useRef<string | undefined>(undefined);
  const auth = useAxiomateAuth();
  const cloud = useCloudWorkspace({ signedIn: auth.signedIn, getToken: auth.getToken });

  const discardPdf = useCallback(() => {
    if (pdfUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = undefined;
    setPdfDataUrl(undefined);
  }, []);

  const showPdf = useCallback((url: string) => {
    if (pdfUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(pdfUrlRef.current);
    pdfUrlRef.current = url;
    setPdfDataUrl(url);
  }, []);

  useEffect(() => () => {
    if (pdfUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(pdfUrlRef.current);
  }, []);

  useEffect(() => {
    if (window.axiomate || collaborationRoom) {
      setWorkspaceReady(true);
      return;
    }
    let active = true;
    void loadLocalWorkspace()
      .then((saved) => {
        if (!active || !saved) return;
        setProject(saved.project);
        setActiveFile(saved.project.mainFile);
        setEvidence(saved.evidence);
        setStyleProfile(saved.styleProfile);
        setToast(`Restored browser workspace · saved ${new Date(saved.updatedAt).toLocaleString()}`);
      })
      .catch(() => setToast("Browser storage is unavailable · edits remain in this tab"))
      .finally(() => active && setWorkspaceReady(true));
    return () => { active = false; };
  }, [collaborationRoom]);

  useEffect(() => {
    if (!workspaceReady || window.axiomate || collaborationRoom) return;
    setIsDirty(true);
    const timer = window.setTimeout(() => {
      void saveLocalWorkspace({ project, evidence, styleProfile, updatedAt: new Date().toISOString() })
        .then(() => setIsDirty(false))
        .catch(() => setIsDirty(true));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [collaborationRoom, evidence, project, styleProfile, workspaceReady]);

  const currentFile = project.files.find((file) => file.path === activeFile) ?? project.files[0];
  const mainFile = project.files.find((file) => file.path === project.mainFile) ?? currentFile;
  const analysis = useMemo(
    () => analyzePaper(mainFile?.content ?? "", mainFile?.path ?? "main.tex", evidence, styleProfile),
    [evidence, mainFile?.content, mainFile?.path, styleProfile],
  );
  const suggestions = [...analysis.suggestions, ...modelSuggestions].filter((suggestion) => !dismissed.includes(suggestion.id));
  const collaborationUser = useMemo(() => {
    const id = Math.floor(Math.random() * 900 + 100);
    return { name: `Researcher ${id}`, color: collaborationColors[id % collaborationColors.length] };
  }, []);
  const syncCollaborativeText = useCallback((content: string) => {
    setProject((previous) => ({
      ...previous,
      files: previous.files.map((file) => (file.path === previous.mainFile ? { ...file, content } : file)),
    }));
    discardPdf();
    setIsDirty(true);
  }, [discardPdf]);
  const collaboration = useCollaboration({
    roomId: collaborationRoom?.id,
    isHost: collaborationRoom?.isHost ?? false,
    initialText: mainFile?.content ?? "",
    user: collaborationUser,
    onTextChange: syncCollaborativeText,
  });

  function recordRun(run: Omit<ReviewRun, "id" | "createdAt">) {
    setReviewRuns((previous) => [{ ...run, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...previous].slice(0, 30));
  }

  function updateCurrentFile(content: string) {
    setProject((previous) => ({
      ...previous,
      files: previous.files.map((file) => (file.path === activeFile ? { ...file, content } : file)),
    }));
    discardPdf();
    setIsDirty(true);
  }

  async function openProject() {
    if (window.axiomate) {
      const opened = await window.axiomate.openProject();
      if (opened) {
        setProject(opened);
        setActiveFile(opened.mainFile);
        setActiveCloudId(undefined);
        setDismissed([]);
        discardPdf();
        setToast(`Opened ${opened.name} · Files stay on this device`);
      }
      return;
    }
    fileInputRef.current?.click();
  }

  async function importBrowserFiles(files: FileList | null) {
    if (!files?.length) return;
    const allowed = [...files].filter((file) => /\.(tex|bib|sty|cls|md)$/i.test(file.name));
    const imported = await Promise.all(
      allowed.map(async (file) => ({
        path: file.webkitRelativePath || file.name,
        content: await file.text(),
        type: fileType(file.name),
      })),
    );
    if (!imported.length) {
      setToast("No supported LaTeX files found");
      return;
    }
    const main = findMainFile(imported);
    const name = imported[0].path.split("/")[0] || "local-paper";
    setProject({ name, mainFile: main, files: imported });
    setActiveFile(main);
    setActiveCloudId(undefined);
    setDismissed([]);
    discardPdf();
    setIsDirty(true);
    setToast(`Imported ${imported.length} files · Browser-local session`);
  }

  async function importSourcePdfs(files: FileList | null) {
    if (!files?.length) return;
    setToast(`Reading ${files.length} PDF${files.length === 1 ? "" : "s"} locally…`);
    const imported: ResearchSource[] = [];
    for (const file of [...files]) {
      try {
        imported.push(await extractPdfSource(file));
      } catch (error) {
        setToast(error instanceof Error ? error.message : `Could not read ${file.name}`);
      }
    }
    if (imported.length) {
      setResearchSources((previous) => [...previous, ...imported]);
      setSelectedSource(imported[0]);
      setSidebarTab("sources");
      setToast(`Indexed ${imported.length} PDF source${imported.length === 1 ? "" : "s"} locally · nothing uploaded`);
    }
    if (sourceInputRef.current) sourceInputRef.current.value = "";
  }

  function attachPassage(claimId: string, pageNumber: number, passage: string) {
    if (!selectedSource) return;
    const linked: Evidence = {
      id: `evidence-${crypto.randomUUID()}`,
      sourceId: selectedSource.id,
      claimId,
      citeKey: `source:${selectedSource.fileName}`,
      title: selectedSource.title,
      authors: selectedSource.authors ?? "Imported source",
      year: selectedSource.year,
      page: pageNumber,
      passage,
    };
    setEvidence((previous) => [...previous.filter((item) => item.claimId !== claimId), linked]);
    setIsDirty(true);
    setToast(`Attached page ${pageNumber} as evidence · claim status updated`);
  }

  async function saveFile() {
    if (!currentFile) return;
    if (!window.axiomate || !project.rootPath) {
      try {
        await saveLocalWorkspace({ project, evidence, styleProfile, updatedAt: new Date().toISOString() });
        setIsDirty(false);
        setToast(`Saved ${project.name} in this browser · Ctrl/⌘S works`);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Browser save failed");
      }
      return;
    }
    const result = await window.axiomate.saveFile(project.rootPath, currentFile.path, currentFile.content);
    setToast(result.ok ? `Saved ${currentFile.path}` : result.error ?? "Save failed");
  }

  async function shareProject() {
    const id = collaborationRoom?.id ?? crypto.randomUUID().replaceAll("-", "").slice(0, 18);
    if (!collaborationRoom) {
      setCollaborationRoom({ id, isHost: true });
      const url = new URL(window.location.href);
      url.searchParams.set("room", id);
      window.history.replaceState({}, "", url);
    }
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("room", id);
    try {
      await navigator.clipboard.writeText(shareUrl.toString());
      setToast("Live editing link copied · Anyone with this alpha link can edit");
    } catch {
      setToast(`Live room created · Copy this URL from the address bar: ${shareUrl.toString()}`);
    }
  }

  async function compilePaper() {
    setIsCompiling(true);
    try {
      if (window.axiomate && project.rootPath) {
        const result = await window.axiomate.compileProject(project.rootPath, project.mainFile);
        if (!result.ok || !result.pdfDataUrl) throw new Error(result.log.split("\n").find(Boolean) ?? "Desktop compile failed");
        showPdf(result.pdfDataUrl);
        setView("preview");
        setToast("PDF compiled with shell escape disabled");
        recordRun({ kind: "compile", label: "Desktop PDF compile", provider: "latexmk sandbox", findingCount: 0, status: "passed" });
      } else {
        const token = await auth.getToken();
        if (!token) {
          setCloudOpen(true);
          setToast("Sign in to compile a real PDF on the web.");
          return;
        }
        const compiled = await requestWebCompile(token, project);
        showPdf(compiled.pdfUrl);
        setView("preview");
        setToast("PDF compiled in an isolated Vercel Sandbox · shell escape and network disabled");
        recordRun({ kind: "compile", label: "Web PDF compile", provider: compiled.compiler, findingCount: 0, status: "passed" });
      }
    } catch (error) {
      setToast(error instanceof Error ? `Compile failed · ${error.message}` : "Compile failed");
      recordRun({ kind: "compile", label: "PDF compile", provider: window.axiomate ? "latexmk sandbox" : "Vercel Sandbox", findingCount: 1, status: "failed" });
    } finally {
      setIsCompiling(false);
    }
  }

  function navigateTo(file: string, line: number) {
    setActiveFile(file);
    setView("split");
    setFocusRequest({ file, line, id: Date.now() });
    setToast(`Opened ${file}:${line}`);
  }

  function handleApply(suggestion: Suggestion) {
    const target = project.files.find((file) => file.path === suggestion.file);
    if (!target || !suggestion.replacement) return;
    const nextContent = applySuggestion(target.content, suggestion);
    setProject((previous) => ({
      ...previous,
      files: previous.files.map((file) => (file.path === target.path ? { ...file, content: nextContent } : file)),
    }));
    setActiveFile(target.path);
    setDismissed((previous) => [...previous, suggestion.id]);
    discardPdf();
    setIsDirty(true);
    setToast(`Applied verified patch · ${suggestion.title}`);
    recordRun({ kind: "patch", label: suggestion.title, provider: suggestion.id.startsWith("model-") ? "model suggestion" : "local analysis", findingCount: 1, status: "passed" });
  }

  async function runReview() {
    setIsReviewing(true);
    if (providerConfig && mainFile) {
      try {
        const remoteSuggestions = await requestModelReview(providerConfig, mainFile.path, mainFile.content, styleProfile);
        setModelSuggestions(remoteSuggestions.map((suggestion) => ({ ...suggestion, id: `model-${suggestion.id}` })));
        setDismissed([]);
        setToast(`Model review complete · ${remoteSuggestions.length} additional findings validated against the current source`);
        recordRun({ kind: "model-review", label: "Semantic model review", provider: providerConfig.model, findingCount: remoteSuggestions.length, status: remoteSuggestions.length ? "findings" : "passed" });
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Model review failed");
        recordRun({ kind: "model-review", label: "Semantic model review", provider: providerConfig.model, findingCount: 0, status: "failed" });
      } finally {
        setIsReviewing(false);
      }
      return;
    }
    if (auth.signedIn && mainFile) {
      try {
        const token = await auth.getToken();
        if (!token) throw new Error("Sign in before running a managed review.");
        const managed = await requestManagedReview(token, mainFile.path, mainFile.content, styleProfile);
        setModelSuggestions(managed.suggestions.map((suggestion) => ({ ...suggestion, id: `model-${suggestion.id}` })));
        setDismissed([]);
        setToast(`Managed review complete · ${managed.suggestions.length} validated findings`);
        recordRun({ kind: "model-review", label: "Axiomate managed review", provider: managed.model, findingCount: managed.suggestions.length, status: managed.suggestions.length ? "findings" : "passed" });
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Managed review failed");
        recordRun({ kind: "model-review", label: "Axiomate managed review", provider: "Vercel AI Gateway", findingCount: 0, status: "failed" });
      } finally {
        setIsReviewing(false);
      }
      return;
    }
    window.setTimeout(() => {
      setDismissed([]);
      setIsReviewing(false);
      setToast(`Review complete · ${analysis.suggestions.length} findings across evidence, logic, math, and writing`);
      recordRun({ kind: "local-review", label: "Deterministic paper review", provider: "browser-local", findingCount: analysis.suggestions.length, status: analysis.suggestions.length ? "findings" : "passed" });
    }, 900);
  }

  function resetDemo() {
    setProject(sampleProject);
    setActiveFile(sampleProject.mainFile);
    setDismissed([]);
    discardPdf();
    setIsDirty(true);
    setEvidence(sampleEvidence);
    setResearchSources([]);
    setSelectedSource(undefined);
    setReviewRuns([]);
    setActiveCloudId(undefined);
    setToast("Demo project reset");
  }

  return (
    <div className="app-shell">
      <input
        className="visually-hidden"
        ref={fileInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(event) => void importBrowserFiles(event.target.files)}
      />
      <input
        className="visually-hidden"
        ref={sourceInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={(event) => void importSourcePdfs(event.target.files)}
      />

      <header className="topbar">
        <div className="brand">
          <div className="brand-symbol"><span /><span /><span /></div>
          <strong>axiomate</strong>
          <em>ALPHA</em>
        </div>
        <div className="document-status">
          <span>{project.name}</span><span>/</span><strong>{activeFile}</strong>
          <div className="saved-state"><Check size={12} /> {activeCloudId ? "Cloud snapshot" : isDirty ? "Saving…" : "Browser saved"}</div>
        </div>
        <div className="topbar-actions">
          <button onClick={resetDemo} title="Reset demo"><RotateCcw size={15} /></button>
          <button onClick={() => void saveFile()} title="Save file"><Save size={15} /></button>
          <a href={githubUrl} target="_blank" rel="noreferrer" title="View source on GitHub"><Github size={15} /></a>
          <button title="Settings" onClick={() => setSettingsOpen(true)}><Settings size={15} /></button>
          <button className={`cloud-button ${auth.signedIn ? "active" : ""}`} title="Cloud workspace" onClick={() => setCloudOpen(true)}>
            <Cloud size={15} />
          </button>
          <button className={`share-button ${collaborationRoom ? "active" : ""}`} onClick={() => void shareProject()} title="Copy live editing link">
            <Share2 size={14} />
            {collaborationRoom ? `${Math.max(collaboration.participants.length, 1)} live` : "Share"}
          </button>
          <button className="compile-button" onClick={() => void compilePaper()} disabled={isCompiling}>
            {isCompiling ? <LoaderCircle className="spin" size={14} /> : <Play size={14} fill="currentColor" />}
            Compile
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <ProjectSidebar
          project={project}
          activeFile={activeFile}
          activeTab={sidebarTab}
          analysis={analysis}
          evidence={evidence}
          researchSources={researchSources}
          onSelectFile={setActiveFile}
          onNavigate={navigateTo}
          onSelectTab={setSidebarTab}
          onOpenProject={() => void openProject()}
          onImportPdf={() => sourceInputRef.current?.click()}
          onSelectSource={setSelectedSource}
        />

        <section className="center-workspace">
          <header className="workspace-toolbar">
            <div className="file-tab"><FileOutput size={14} /><strong>{currentFile?.path}</strong>{isDirty && <span className="unsaved-dot" />}</div>
            <div className="view-switcher" aria-label="Workspace view">
              <button className={view === "source" ? "active" : ""} onClick={() => setView("source")}><Code2 size={14} /> Source</button>
              <button className={view === "split" ? "active" : ""} onClick={() => setView("split")}><Columns2 size={14} /> Split</button>
              <button className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}><BookOpenCheck size={14} /> Preview</button>
            </div>
            <div className="trust-control">
              <button className="trust-button" aria-expanded={trustOpen} onClick={() => setTrustOpen((open) => !open)}><ShieldCheck size={14} /> Verified changes only <ChevronDown size={12} /></button>
              {trustOpen && (
                <div className="trust-popover" role="status">
                  <strong>Patch approval is enforced</strong>
                  <p>AI suggestions cannot edit the paper automatically. Every change shows an exact diff and needs your approval.</p>
                  <button onClick={() => setTrustOpen(false)}>Got it</button>
                </div>
              )}
            </div>
          </header>

          <div className={`editor-preview-grid view-${view}`}>
            {view !== "preview" && currentFile && (
              <EditorPane
                content={currentFile.content}
                fileName={currentFile.path}
                onChange={updateCurrentFile}
                onSave={() => void saveFile()}
                focusLine={focusRequest?.file === currentFile.path ? focusRequest.line : undefined}
                focusRequestId={focusRequest?.id}
                collaboration={activeFile === project.mainFile ? collaboration.binding : undefined}
              />
            )}
            {view !== "source" && <PaperPreview content={mainFile?.content ?? ""} pdfDataUrl={pdfDataUrl} />}
          </div>

          <ScoreStrip score={analysis.score} />
        </section>

        <CoWorkerPanel
          suggestions={suggestions}
          onApply={handleApply}
          onDismiss={(suggestion) => setDismissed((previous) => [...previous, suggestion.id])}
          onInspect={(suggestion) => navigateTo(suggestion.file, suggestion.line)}
          onRunReview={() => void runReview()}
          onOpenSettings={() => setSettingsOpen(true)}
          isReviewing={isReviewing}
          providerLabel={providerConfig?.model ?? (auth.signedIn ? "Axiomate AI" : "Local analysis")}
          runs={reviewRuns}
        />
      </main>

      {settingsOpen && (
        <SettingsDialog
          initialConfig={providerConfig}
          initialStyleProfile={styleProfile}
          onClose={() => setSettingsOpen(false)}
          onSave={(config, nextStyleProfile) => {
            setProviderConfig(config);
            setStyleProfile(nextStyleProfile);
            setIsDirty(true);
            setSettingsOpen(false);
            setToast(config ? `Connected ${config.model} · ${nextStyleProfile.venue.toUpperCase()} profile active` : `${nextStyleProfile.venue.toUpperCase()} profile saved · Local analysis mode`);
          }}
        />
      )}

      {cloudOpen && (
        <CloudWorkspaceDialog
          configured={auth.configured}
          authLoaded={auth.loaded}
          signedIn={auth.signedIn}
          user={auth.user}
          project={project}
          evidence={evidence}
          styleProfile={styleProfile}
          activeCloudId={activeCloudId}
          onClose={() => setCloudOpen(false)}
          onSignIn={auth.signIn}
          onSignOut={async () => {
            await auth.signOut();
            setActiveCloudId(undefined);
          }}
          onList={cloud.listProjects}
          onFetch={cloud.openProject}
          onSave={cloud.saveProject}
          onDelete={cloud.deleteProject}
          onDeleted={(projectId) => {
            if (projectId === activeCloudId) setActiveCloudId(undefined);
          }}
          onSaved={(saved) => {
            setActiveCloudId(saved.id);
            setToast(`Saved ${saved.name} to your cloud workspace`);
          }}
          onOpen={(saved) => {
            setProject(saved.snapshot);
            setActiveFile(saved.snapshot.mainFile);
            setEvidence(saved.evidence);
            setStyleProfile(saved.styleProfile);
            setActiveCloudId(saved.id);
            setDismissed([]);
            discardPdf();
            setIsDirty(false);
            setCloudOpen(false);
            setToast(`Opened ${saved.name} from your cloud workspace`);
          }}
        />
      )}

      {selectedSource && (
        <SourceInspector
          source={selectedSource}
          claims={analysis.claims}
          onAttach={attachPassage}
          onClose={() => setSelectedSource(undefined)}
        />
      )}

      <footer className="statusbar">
        <div>
          {collaborationRoom ? <Users size={12} /> : auth.signedIn ? <Cloud size={12} /> : <CloudOff size={12} />}
          {collaborationRoom ? `Live room · ${collaboration.status}` : auth.signedIn ? "Cloud account · manual snapshots" : "Files remain local"}
          <span>·</span> {window.axiomate ? "Desktop runtime" : "Web app"}
        </div>
        <div className="toast-message">{toast}</div>
        <div><PanelLeftClose size={12} /> {analysis.claims.length} claims <span>·</span> {analysis.symbols.length} symbols <span>·</span> {suggestions.length} open</div>
      </footer>
    </div>
  );
}
