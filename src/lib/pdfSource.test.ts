import { describe, expect, it, vi } from "vitest";
import { passageCandidates } from "./pdfSource";

vi.mock("pdfjs-dist", () => ({ getDocument: vi.fn(), GlobalWorkerOptions: {} }));

describe("passageCandidates", () => {
  it("returns evidence-sized passages and ignores fragments", () => {
    const passages = passageCandidates({
      pageNumber: 2,
      text: "Header\n\nThe controlled evaluation reports a statistically significant reduction in unsupported claims across both scientific corpora. A second sentence provides enough context for the result.\n\nshort",
    });

    expect(passages).toHaveLength(2);
    expect(passages[0]).toContain("controlled evaluation");
    expect(passages.every((passage) => passage.length >= 50)).toBe(true);
  });
});
