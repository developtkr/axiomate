import { z } from "zod";

const projectPathSchema = z.string().min(1).max(500).refine((value) => {
  if (value.startsWith("/") || value.includes("\\") || value.includes("\0")) return false;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}, "Project paths must be safe relative POSIX paths");

const projectFileSchema = z.object({
  path: projectPathSchema,
  content: z.string().max(1_000_000),
  type: z.enum(["tex", "bib", "other"]),
});

const evidenceSchema = z.object({
  id: z.string().min(1).max(200),
  sourceId: z.string().max(200).optional(),
  claimId: z.string().max(200).optional(),
  citeKey: z.string().max(500),
  title: z.string().max(1_000),
  authors: z.string().max(1_000),
  year: z.number().int().min(0).max(3000).optional(),
  page: z.number().int().positive().optional(),
  passage: z.string().max(20_000),
});

const styleProfileSchema = z.object({
  venue: z.enum(["generic", "acl", "neurips", "thesis"]),
  voice: z.enum(["concise", "balanced", "explanatory"]),
  english: z.enum(["american", "british"]),
  avoidPhrases: z.string().max(2_000),
});

export const paperProjectSchema = z.object({
  name: z.string().min(1).max(200),
  mainFile: projectPathSchema,
  files: z.array(projectFileSchema).min(1).max(100),
}).superRefine((project, context) => {
  const paths = new Set(project.files.map((file) => file.path));
  if (paths.size !== project.files.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["files"], message: "Project file paths must be unique" });
  }
  if (!paths.has(project.mainFile)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["mainFile"], message: "Main file must exist in the project" });
  }
  if (!project.mainFile.toLowerCase().endsWith(".tex")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["mainFile"], message: "Main file must be a .tex file" });
  }
});

export const projectPayloadSchema = z.object({
  project: paperProjectSchema,
  evidence: z.array(evidenceSchema).max(1_000),
  styleProfile: styleProfileSchema,
});

export const projectIdSchema = z.string().uuid();
