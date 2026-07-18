import { describe, expect, it } from "vitest";
import { buildArgumentMap } from "./argumentMap";

describe("buildArgumentMap", () => {
  it("connects the main scientific argument stages", () => {
    const map = buildArgumentMap([
      "We ask whether grounded decoding reduces unsupported claims.",
      "However, its effect remains unclear in long papers.",
      "We propose an evidence-aware revision method.",
      "Our method is computed as a constrained objective.",
      "We evaluate it on two benchmarks.",
      "Results show that it improves citation precision.",
      "A limitation is that the evaluation covers English papers only.",
      "In conclusion, the method reduces unsupported statements.",
    ].join(" "));

    expect(map.nodes).toHaveLength(8);
    expect(map.nodes.every((node) => node.status === "connected")).toBe(true);
    expect(map.edges).toContainEqual({ from: "arg-experiment", to: "arg-result", relation: "supports" });
  });

  it("makes missing limitations visible", () => {
    const map = buildArgumentMap("We propose a method. We evaluate it on a benchmark. Results show improvement.");
    expect(map.nodes.find((node) => node.type === "limitation")?.status).toBe("warning");
  });
});
