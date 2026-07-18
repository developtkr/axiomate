import { describe, expect, it } from "vitest";
import projectsHandler from "../../api/projects";
import { projectPayloadSchema } from "../../api/_lib/projectSchema";

const validPayload = {
  project: {
    name: "paper",
    mainFile: "main.tex",
    files: [{ path: "main.tex", content: "\\documentclass{article}", type: "tex" as const }],
  },
  evidence: [],
  styleProfile: {
    venue: "generic" as const,
    voice: "balanced" as const,
    english: "american" as const,
    avoidPhrases: "obviously",
  },
};

describe("cloud project API", () => {
  it("rejects unauthenticated project access before touching the database", async () => {
    const response = await projectsHandler.fetch(new Request("https://axiomate.test/api/projects"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Sign in required" });
  });

  it("validates the minimal project snapshot schema", () => {
    expect(projectPayloadSchema.parse(validPayload).project.mainFile).toBe("main.tex");
    expect(() => projectPayloadSchema.parse({
      ...validPayload,
      project: { ...validPayload.project, files: [] },
    })).toThrow();
  });
});
