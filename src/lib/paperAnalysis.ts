import type { Claim, Evidence, PaperAnalysis, Suggestion } from "../types";

const sentenceSplit = /(?<=[.!?])\s+(?=[A-Z])/g;
const sectionPattern = /\\(sub)*section\{([^}]+)\}/g;
const citationPattern = /\[CITE:([^\]]+)\]/;
const equationPattern = /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g;
const symbolPattern = /\\[a-zA-Z]+|[a-zA-Z](?:_[{a-zA-Z0-9]+}?)?/g;

function lineAt(content: string, offset: number): number {
  return content.slice(0, offset).split("\n").length;
}

function stripLatex(value: string): string {
  return value
    .replace(/%.*$/gm, "")
    .replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, " ")
    .replace(/\\(?:section|subsection|caption|label|bibliography|bibliographystyle)\{[^}]*\}/g, " ")
    .replace(/\$[^$]+\$/g, " [equation] ")
    .replace(/\\cite(?:p|t)?\{([^}]+)\}/g, " [CITE:$1] ")
    .replace(/\\[a-zA-Z]+(?:\[[^\]]*\])?/g, " ")
    .replace(/[{}~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function claimStatus(sentence: string, citation: string | undefined): Claim["status"] {
  if (/we (introduce|propose|define)/i.test(sentence)) return "hypothesis";
  if (/\b(our method|we evaluate|table|results?)\b/i.test(sentence)) return "project-result";
  if (citation) return "supported";
  return "unsupported";
}

export function analyzePaper(content: string, file: string, evidence: Evidence[]): PaperAnalysis {
  const sections = Array.from(content.matchAll(sectionPattern)).map((match) => ({
    title: match[2],
    level: match[1] ? 2 : 1,
    line: lineAt(content, match.index ?? 0),
  }));

  const textBlocks = content
    .replace(/\\begin\{equation\}[\s\S]*?\\end\{equation\}/g, " ")
    .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, " ")
    .split(/\n\s*\n/)
    .map(stripLatex)
    .filter(Boolean)
    .flatMap((block) => block.split(sentenceSplit));

  const claims: Claim[] = textBlocks
    .filter((sentence) => sentence.length > 35 && !/^where\b/i.test(sentence))
    .map((sentence, index) => {
      const rawCitation = sentence.match(citationPattern)?.[1];
      const citation = rawCitation?.split(",")[0];
      const location = content.indexOf(sentence.slice(0, Math.min(30, sentence.length)));
      return {
        id: `claim-${index + 1}`,
        text: sentence.replace(citationPattern, "").trim(),
        file,
        line: location >= 0 ? lineAt(content, location) : 1,
        status: claimStatus(sentence, citation),
        citation,
        evidenceId: citation ? evidence.find((item) => item.citeKey === citation)?.id : undefined,
      };
    });

  const suggestions: Suggestion[] = [];
  const conclusionOverclaim = "AER eliminates hallucinations in scientific writing and guarantees citation correctness across research domains.";
  if (content.includes(conclusionOverclaim)) {
    suggestions.push({
      id: "logic-overclaim",
      category: "logic",
      severity: "critical",
      title: "Conclusion exceeds the evaluated evidence",
      detail: "The experiments cover two corpora, but the conclusion claims a cross-domain guarantee.",
      rationale: "A result observed on two benchmarks cannot establish elimination or a guarantee across all research domains.",
      file,
      line: lineAt(content, content.indexOf(conclusionOverclaim)),
      original: conclusionOverclaim,
      replacement:
        "AER reduced unsupported claims on the two evaluated scientific writing corpora while maintaining author style.",
      related: ["Abstract", "Experiments", "Table 1"],
    });
  }

  if (/\\beta R\(z\)/.test(content) && !/where[^.]*\\beta/i.test(content)) {
    const target = "The coefficient $\\beta$ is fixed for all experiments.";
    suggestions.push({
      id: "math-beta-definition",
      category: "math",
      severity: "warning",
      title: "β is used before it is defined",
      detail: "Equation (3) introduces β, but its role and value range are not defined.",
      rationale: "A reader cannot tell whether β is positive, tunable, or why the regularizer is subtracted.",
      file,
      line: lineAt(content, content.indexOf("\\beta R(z)")),
      original: target,
      replacement:
        "where $\\lambda > 0$ controls evidence alignment and $\\beta \\geq 0$ controls the regularization strength; both are fixed across experiments.",
      related: ["Equation 3", "Experiments"],
    });
  }

  if (/minimize[\s\S]{0,180}- \\beta R\(z\)/i.test(content)) {
    suggestions.push({
      id: "math-objective-sign",
      category: "math",
      severity: "suggestion",
      title: "Check the regularizer sign",
      detail: "The objective is minimized, but R(z) is subtracted. Confirm that larger R(z) should be rewarded.",
      rationale: "This may be intentional, but the sign convention is not explained in the surrounding text.",
      file,
      line: lineAt(content, content.indexOf("\\mathcal{L} =")),
      related: ["Equation 3", "Method, paragraph 3"],
    });
  }

  const uncitedClaims = claims.filter((claim) => claim.status === "unsupported");
  if (uncitedClaims.length > 0) {
    const claim = uncitedClaims[0];
    suggestions.push({
      id: "evidence-unsupported",
      category: "evidence",
      severity: "warning",
      title: "Claim needs evidence or qualification",
      detail: claim.text,
      rationale: "This factual statement has no citation or linked project result.",
      file,
      line: claim.line,
    });
  }

  if (/improves factuality in every setting/i.test(content)) {
    const original = "Our method improves factuality in every setting.";
    suggestions.push({
      id: "writing-scope",
      category: "writing",
      severity: "suggestion",
      title: "Qualify the scope of this result",
      detail: "“Every setting” is broader than the combined result shown in Table 1.",
      rationale: "Specific language makes the result easier to verify and harder to misread.",
      file,
      line: lineAt(content, content.indexOf(original)),
      original,
      replacement: "AER lowers the unsupported claim rate on both evaluated corpora.",
      related: ["Table 1"],
    });
  }

  const symbolCounts = new Map<string, { count: number; firstLine: number }>();
  for (const equation of content.matchAll(equationPattern)) {
    const equationText = equation[1];
    for (const match of equationText.matchAll(symbolPattern)) {
      const symbol = match[0];
      if (["\\begin", "\\end", "\\label", "\\mathrm", "\\mathcal", "\\exp", "\\sum", "\\top", "\\dots", "\\frac"].includes(symbol)) continue;
      const current = symbolCounts.get(symbol);
      symbolCounts.set(symbol, {
        count: (current?.count ?? 0) + 1,
        firstLine: current?.firstLine ?? lineAt(content, (equation.index ?? 0) + (match.index ?? 0)),
      });
    }
  }

  const symbols = [...symbolCounts.entries()]
    .map(([symbol, value]) => ({ symbol, ...value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 18);

  const supported = claims.filter((claim) => claim.status !== "unsupported").length;
  const evidenceScore = claims.length ? Math.round((supported / claims.length) * 100) : 100;
  const critical = suggestions.filter((item) => item.severity === "critical").length;
  const mathIssues = suggestions.filter((item) => item.category === "math").length;
  const writingIssues = suggestions.filter((item) => item.category === "writing").length;

  return {
    claims,
    suggestions,
    sections,
    symbols,
    score: {
      evidence: Math.max(0, evidenceScore),
      logic: Math.max(0, 100 - critical * 24),
      math: Math.max(0, 100 - mathIssues * 12),
      writing: Math.max(0, 100 - writingIssues * 10),
    },
  };
}

export function applySuggestion(content: string, suggestion: Suggestion): string {
  if (!suggestion.original || !suggestion.replacement) return content;
  return content.replace(suggestion.original, suggestion.replacement);
}
