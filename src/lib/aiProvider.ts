import { z } from "zod";
import type { StyleProfile, Suggestion } from "../types";

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ManagedReviewResult {
  suggestions: Suggestion[];
  model: string;
}

const suggestionSchema = z.object({
  suggestions: z.array(z.object({
    id: z.string(),
    category: z.enum(["evidence", "logic", "math", "writing", "latex"]),
    severity: z.enum(["critical", "warning", "suggestion"]),
    title: z.string(),
    detail: z.string(),
    rationale: z.string(),
    file: z.string(),
    line: z.number().int().positive(),
    original: z.string().optional(),
    replacement: z.string().optional(),
    related: z.array(z.string()).optional(),
  })),
});

export async function requestModelReview(
  config: ProviderConfig,
  file: string,
  content: string,
  styleProfile?: StyleProfile,
  signal?: AbortSignal,
): Promise<Suggestion[]> {
  const isOpenRouter = config.baseUrl.includes("openrouter.ai");
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...(isOpenRouter ? {
        "HTTP-Referer": globalThis.location?.origin ?? "https://axiomate.app",
        "X-Title": "Axiomate",
      } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a conservative scientific paper reviewer. Identify evidence, logic, mathematical notation, writing, and LaTeX issues. Never invent citations. If uncertain, label the item as a suggestion. Return JSON with a suggestions array only.",
        },
        {
          role: "user",
          content: `Style profile: ${JSON.stringify(styleProfile ?? {
            venue: "generic",
            voice: "balanced",
            english: "american",
            avoidPhrases: "",
          })}\nFollow the profile, but do not trade precision for style.\n\nFile: ${file}\n\n${content}`,
        },
      ],
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Model request failed (${response.status}).`);
  const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Model returned no review content.");
  return suggestionSchema.parse(JSON.parse(raw)).suggestions;
}

export async function requestManagedReview(
  accessToken: string,
  file: string,
  content: string,
  styleProfile: StyleProfile,
  signal?: AbortSignal,
): Promise<ManagedReviewResult> {
  const response = await fetch("/api/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ file, content, styleProfile }),
    signal,
  });
  const body = await response.json() as { suggestions?: unknown; model?: string; error?: string };
  if (!response.ok) throw new Error(body.error ?? `Managed review failed (${response.status}).`);
  const parsed = suggestionSchema.parse({ suggestions: body.suggestions });
  if (!body.model) throw new Error("Managed review returned no model information.");
  return { suggestions: parsed.suggestions, model: body.model };
}
