import { describe, expect, it } from "vitest";
import compileHandler from "../../api/compile";
import { paperProjectSchema } from "../../api/_lib/projectSchema";

const project = {
  name: "paper",
  mainFile: "main.tex",
  files: [{ path: "main.tex", content: "\\documentclass{article}", type: "tex" as const }],
};

describe("web compile API", () => {
  it("rejects unauthenticated compile requests before creating a sandbox", async () => {
    const response = await compileHandler.fetch(new Request("https://axiomate.test/api/compile", {
      method: "POST",
      body: JSON.stringify({ project }),
    }));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sign in required" });
  });

  it("accepts a project whose main file exists", () => {
    expect(paperProjectSchema.parse(project).mainFile).toBe("main.tex");
  });

  it("rejects path traversal and missing main files", () => {
    expect(() => paperProjectSchema.parse({
      ...project,
      files: [{ ...project.files[0], path: "../main.tex" }],
    })).toThrow();
    expect(() => paperProjectSchema.parse({ ...project, mainFile: "missing.tex" })).toThrow();
    expect(() => paperProjectSchema.parse({
      ...project,
      mainFile: "references.bib",
      files: [{ path: "references.bib", content: "", type: "bib" }],
    })).toThrow();
  });
});
