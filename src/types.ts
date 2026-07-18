export type EvidenceStatus =
  | "supported"
  | "partial"
  | "unsupported"
  | "project-result"
  | "hypothesis";

export type Severity = "critical" | "warning" | "suggestion";

export interface ProjectFile {
  path: string;
  content: string;
  type: "tex" | "bib" | "other";
}

export interface PaperProject {
  name: string;
  rootPath?: string;
  mainFile: string;
  files: ProjectFile[];
}

export interface Evidence {
  id: string;
  sourceId?: string;
  claimId?: string;
  citeKey: string;
  title: string;
  authors: string;
  year?: number;
  page?: number;
  passage: string;
}

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

export interface ResearchSource {
  id: string;
  fileName: string;
  title: string;
  authors?: string;
  year?: number;
  pageCount: number;
  size: number;
  pages: PdfPageText[];
}

export type ArgumentNodeType =
  | "question"
  | "gap"
  | "contribution"
  | "method"
  | "experiment"
  | "result"
  | "limitation"
  | "conclusion";

export interface ArgumentNode {
  id: string;
  type: ArgumentNodeType;
  label: string;
  detail: string;
  line: number;
  status: "connected" | "warning" | "missing";
}

export interface ArgumentEdge {
  from: string;
  to: string;
  relation: "motivates" | "addresses" | "tests" | "supports" | "qualifies" | "summarizes";
}

export interface ReviewRun {
  id: string;
  createdAt: string;
  kind: "local-review" | "model-review" | "patch" | "compile";
  label: string;
  provider: string;
  findingCount: number;
  status: "passed" | "findings" | "failed";
}

export interface StyleProfile {
  venue: "generic" | "acl" | "neurips" | "thesis";
  voice: "concise" | "balanced" | "explanatory";
  english: "american" | "british";
  avoidPhrases: string;
}

export interface Claim {
  id: string;
  text: string;
  file: string;
  line: number;
  status: EvidenceStatus;
  citation?: string;
  evidenceId?: string;
}

export type SuggestionCategory =
  | "evidence"
  | "logic"
  | "math"
  | "writing"
  | "latex";

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  severity: Severity;
  title: string;
  detail: string;
  rationale: string;
  file: string;
  line: number;
  original?: string;
  replacement?: string;
  related?: string[];
}

export interface PaperAnalysis {
  claims: Claim[];
  suggestions: Suggestion[];
  sections: Array<{ title: string; level: number; line: number }>;
  symbols: Array<{ symbol: string; count: number; firstLine: number }>;
  argumentNodes: ArgumentNode[];
  argumentEdges: ArgumentEdge[];
  score: {
    evidence: number;
    logic: number;
    math: number;
    writing: number;
  };
}

export interface CompileResult {
  ok: boolean;
  log: string;
  pdfDataUrl?: string;
}

export interface DesktopBridge {
  openProject(): Promise<PaperProject | null>;
  saveFile(rootPath: string, relativePath: string, content: string): Promise<{ ok: boolean; error?: string }>;
  compileProject(rootPath: string, mainFile: string): Promise<CompileResult>;
}

declare global {
  interface Window {
    axiomate?: DesktopBridge;
  }
}
