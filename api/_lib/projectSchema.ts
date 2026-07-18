import { z } from "zod";

const projectFileSchema = z.object({
  path: z.string().min(1).max(500),
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

export const projectPayloadSchema = z.object({
  project: z.object({
    name: z.string().min(1).max(200),
    mainFile: z.string().min(1).max(500),
    files: z.array(projectFileSchema).min(1).max(100),
  }),
  evidence: z.array(evidenceSchema).max(1_000),
  styleProfile: styleProfileSchema,
});

export const projectIdSchema = z.string().uuid();
