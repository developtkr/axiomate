import type { ArgumentEdge, ArgumentNode, ArgumentNodeType } from "../types";

function lineAt(content: string, phrase: string) {
  const index = content.toLowerCase().indexOf(phrase.toLowerCase());
  return index < 0 ? 1 : content.slice(0, index).split("\n").length;
}

function clean(value: string) {
  return value
    .replace(/%.*$/gm, "")
    .replace(/\\begin\{(?:equation|table)\}[\s\S]*?\\end\{(?:equation|table)\}/g, " [technical artifact]. ")
    .replace(/\\(?:documentclass|usepackage|title|author)(?:\[[^\]]*\])?\{[^}]*\}/g, " ")
    .replace(/\\(?:label|bibliography|bibliographystyle)\{[^}]*\}/g, " ")
    .replace(/\\(?:section|subsection)\{([^}]*)\}/g, ". $1. ")
    .replace(/\\(?:begin|end)\{[^}]+\}|\\maketitle/g, ". ")
    .replace(/\\cite(?:p|t)?\{[^}]+\}/g, "")
    .replace(/\\[a-zA-Z]+\{([^}]*)\}/g, "$1")
    .replace(/\$[^$]+\$/g, "[equation]")
    .replace(/\n\s*\n/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/(?:\.\s*){2,}/g, ". ")
    .trim();
}

function findSentence(content: string, patterns: RegExp[]): string | undefined {
  const prose = clean(content);
  const sentences = prose.split(/(?<=[.!?])\s+/);
  return patterns.flatMap((pattern) => sentences.filter((sentence) => pattern.test(sentence)))[0];
}

function node(id: string, type: ArgumentNodeType, detail: string | undefined, content: string, fallback: string): ArgumentNode {
  const text = detail ?? fallback;
  return {
    id,
    type,
    label: type.charAt(0).toUpperCase() + type.slice(1),
    detail: text,
    line: detail ? lineAt(content, detail.slice(0, 28)) : 1,
    status: detail ? "connected" : "missing",
  };
}

export function buildArgumentMap(content: string): { nodes: ArgumentNode[]; edges: ArgumentEdge[] } {
  const question = findSentence(content, [/we (ask|study|investigate)/i, /research question/i]);
  const gap = findSentence(content, [/this gap/i, /however/i, /remain(s)? (unclear|difficult|open)/i]);
  const contribution = findSentence(content, [/we (propose|introduce|present)/i, /our contribution/i]);
  const method = findSentence(content, [/we define/i, /our method/i, /computed as/i]);
  const experiment = findSentence(content, [/we evaluate/i, /experiment/i, /benchmark/i]);
  const result = findSentence(content, [/reduces?/i, /improves?/i, /outperforms?/i, /results? show/i]);
  const limitation = findSentence(content, [/limitation/i, /future work/i, /restricted to/i]);
  const conclusion = findSentence(content, [/in conclusion/i, /we conclude/i, /guarantees?/i, /eliminates?/i]);

  const nodes = [
    node("arg-question", "question", question, content, "No explicit research question detected."),
    node("arg-gap", "gap", gap, content, "No explicit research gap detected."),
    node("arg-contribution", "contribution", contribution, content, "No contribution statement detected."),
    node("arg-method", "method", method, content, "No method statement detected."),
    node("arg-experiment", "experiment", experiment, content, "No experiment statement detected."),
    node("arg-result", "result", result, content, "No result statement detected."),
    node("arg-limitation", "limitation", limitation, content, "No limitation statement detected."),
    node("arg-conclusion", "conclusion", conclusion, content, "No conclusion statement detected."),
  ];

  const edges: ArgumentEdge[] = [
    { from: "arg-question", to: "arg-gap", relation: "motivates" },
    { from: "arg-gap", to: "arg-contribution", relation: "motivates" },
    { from: "arg-contribution", to: "arg-method", relation: "addresses" },
    { from: "arg-method", to: "arg-experiment", relation: "tests" },
    { from: "arg-experiment", to: "arg-result", relation: "supports" },
    { from: "arg-result", to: "arg-conclusion", relation: "summarizes" },
    { from: "arg-limitation", to: "arg-conclusion", relation: "qualifies" },
  ];

  if (!question && contribution) nodes[0] = { ...nodes[0], status: "warning" };
  if (!limitation) nodes[6] = { ...nodes[6], status: "warning" };
  return { nodes, edges };
}
