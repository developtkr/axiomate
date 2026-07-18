import { generateText } from "ai";
import { z } from "zod";
import { AuthError, requireUserId } from "./_lib/auth.js";

const inputSchema = z.object({
  file: z.string().min(1).max(500),
  content: z.string().min(1).max(120_000),
  styleProfile: z.object({
    venue: z.enum(["generic", "acl", "neurips", "thesis"]),
    voice: z.enum(["concise", "balanced", "explanatory"]),
    english: z.enum(["american", "british"]),
    avoidPhrases: z.string().max(2_000),
  }),
});

const outputSchema = z.object({
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
  })).max(50),
});

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      const userId = await requireUserId(request);
      const input = inputSchema.parse(await request.json());
      const model = process.env.AXIOMATE_GATEWAY_MODEL ?? "openai/gpt-5.5";
      const result = await generateText({
        model,
        temperature: 0.1,
        system: "You are a conservative scientific paper reviewer. Identify only evidence, logic, mathematical notation, writing, and LaTeX issues supported by the supplied source. Never invent citations, results, or definitions. Preserve LaTeX syntax. Return JSON containing a suggestions array only.",
        prompt: `Style profile: ${JSON.stringify(input.styleProfile)}\nFollow it without trading precision for style.\n\nFile: ${input.file}\n\n${input.content}`,
        providerOptions: {
          gateway: {
            user: userId,
            tags: ["feature:paper-review", `env:${process.env.VERCEL_ENV ?? "local"}`],
          },
        },
      });
      const parsed = outputSchema.parse(JSON.parse(result.text));
      return json({ suggestions: parsed.suggestions, model });
    } catch (error) {
      if (error instanceof AuthError) return json({ error: error.message }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return json({ error: "The review response could not be validated" }, 422);
      }
      return json({ error: error instanceof Error ? error.message : "Review failed" }, 500);
    }
  },
};
