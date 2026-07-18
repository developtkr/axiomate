import { describe, expect, it } from "vitest";
import { sampleEvidence, sampleProject } from "../data/sampleProject";
import { analyzePaper, applySuggestion } from "./paperAnalysis";

const main = sampleProject.files.find((file) => file.path === sampleProject.mainFile)!;

describe("analyzePaper", () => {
  it("extracts the paper structure and four review dimensions", () => {
    const result = analyzePaper(main.content, main.path, sampleEvidence);
    expect(result.sections.map((section) => section.title)).toEqual([
      "Introduction",
      "Method",
      "Experiments",
      "Conclusion",
    ]);
    expect(result.claims.length).toBeGreaterThan(3);
    expect(result.claims.some((claim) => claim.text.includes("documentclass"))).toBe(false);
    expect(result.symbols.length).toBeGreaterThan(3);
    expect(result.score.evidence).toBeGreaterThanOrEqual(0);
    expect(result.score.logic).toBeLessThan(100);
  });

  it("flags evidence, logic, math, and writing issues", () => {
    const result = analyzePaper(main.content, main.path, sampleEvidence);
    const categories = new Set(result.suggestions.map((suggestion) => suggestion.category));
    expect(categories).toEqual(new Set(["evidence", "logic", "math", "writing"]));
    expect(result.suggestions.some((suggestion) => suggestion.id === "math-objective-sign")).toBe(true);
    expect(result.suggestions.some((suggestion) => suggestion.id === "logic-overclaim")).toBe(true);
  });

  it("keeps citation-backed claims connected to their source", () => {
    const result = analyzePaper(main.content, main.path, sampleEvidence);
    const cited = result.claims.find((claim) => claim.citation === "lee2025grounded");
    expect(cited?.status).toBe("supported");
    expect(cited?.evidenceId).toBe("ev-grounded-1");
  });

  it("enforces project-specific phrases without rewriting automatically", () => {
    const result = analyzePaper(main.content, main.path, sampleEvidence, {
      venue: "acl",
      voice: "concise",
      english: "american",
      avoidPhrases: "scientific writing",
    });
    expect(result.suggestions.some((suggestion) => suggestion.id.startsWith("writing-style-"))).toBe(true);
  });
});

describe("applySuggestion", () => {
  it("applies only a suggestion with an exact replacement", () => {
    const analysis = analyzePaper(main.content, main.path, sampleEvidence);
    const suggestion = analysis.suggestions.find((item) => item.id === "logic-overclaim")!;
    const updated = applySuggestion(main.content, suggestion);
    expect(updated).toContain("reduced unsupported claims on the two evaluated");
    expect(updated).not.toContain("guarantees citation correctness");
  });
});
