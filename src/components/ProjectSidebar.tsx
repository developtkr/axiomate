import {
  BookOpen,
  Braces,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileText,
  FolderOpen,
  Library,
  Sigma,
} from "lucide-react";
import type { Evidence, PaperAnalysis, PaperProject } from "../types";

type SidebarTab = "files" | "outline" | "claims" | "sources";

interface ProjectSidebarProps {
  project: PaperProject;
  activeFile: string;
  activeTab: SidebarTab;
  analysis: PaperAnalysis;
  evidence: Evidence[];
  onSelectFile: (path: string) => void;
  onSelectTab: (tab: SidebarTab) => void;
  onOpenProject: () => void;
}

const tabItems = [
  { id: "files", label: "Files", icon: FolderOpen },
  { id: "outline", label: "Outline", icon: BookOpen },
  { id: "claims", label: "Claims", icon: Braces },
  { id: "sources", label: "Sources", icon: Library },
] as const;

function statusLabel(status: string) {
  if (status === "project-result") return "RESULT";
  if (status === "hypothesis") return "AUTHOR";
  return status.toUpperCase();
}

export function ProjectSidebar({
  project,
  activeFile,
  activeTab,
  analysis,
  evidence,
  onSelectFile,
  onSelectTab,
  onOpenProject,
}: ProjectSidebarProps) {
  return (
    <aside className="project-sidebar">
      <div className="project-heading">
        <button className="project-switcher" onClick={onOpenProject} title="Open a local LaTeX project">
          <span className="project-mark">A</span>
          <span>
            <small>PROJECT</small>
            <strong>{project.name}</strong>
          </span>
          <ChevronDown size={14} />
        </button>
      </div>

      <nav className="sidebar-tabs" aria-label="Project views">
        {tabItems.map(({ id, label, icon: Icon }) => (
          <button
            className={activeTab === id ? "active" : ""}
            key={id}
            onClick={() => onSelectTab(id)}
            title={label}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-content">
        {activeTab === "files" && (
          <div className="file-list">
            <div className="tree-label"><ChevronDown size={13} /> {project.name}</div>
            {project.files.map((file) => (
              <button
                className={`file-row ${activeFile === file.path ? "active" : ""}`}
                key={file.path}
                onClick={() => onSelectFile(file.path)}
              >
                {file.type === "bib" ? <Library size={14} /> : <FileCode2 size={14} />}
                <span>{file.path}</span>
                {file.path === project.mainFile && <em>MAIN</em>}
              </button>
            ))}
          </div>
        )}

        {activeTab === "outline" && (
          <div className="outline-list">
            {analysis.sections.map((section) => (
              <button className={section.level === 2 ? "level-two" : ""} key={`${section.title}-${section.line}`}>
                <ChevronRight size={12} />
                <span>{section.title}</span>
                <em>{section.line}</em>
              </button>
            ))}
            <div className="symbol-heading"><Sigma size={13} /> Symbols <span>{analysis.symbols.length}</span></div>
            <div className="symbol-grid">
              {analysis.symbols.slice(0, 10).map((symbol) => (
                <span key={symbol.symbol}>{symbol.symbol}<small>{symbol.count}</small></span>
              ))}
            </div>
          </div>
        )}

        {activeTab === "claims" && (
          <div className="claim-list">
            {analysis.claims.slice(0, 12).map((claim) => (
              <article key={claim.id}>
                <div><span className={`status-dot status-${claim.status}`} /> {statusLabel(claim.status)}</div>
                <p>{claim.text}</p>
                <small>{claim.file}:{claim.line}</small>
              </article>
            ))}
          </div>
        )}

        {activeTab === "sources" && (
          <div className="source-list">
            {evidence.map((source) => (
              <article key={source.id}>
                <FileText size={15} />
                <div>
                  <strong>{source.title}</strong>
                  <span>{source.authors} · {source.year}</span>
                  <p>{source.passage}</p>
                  {source.page && <small>PAGE {source.page}</small>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
