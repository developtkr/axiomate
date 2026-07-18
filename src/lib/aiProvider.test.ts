import { afterEach, describe, expect, it, vi } from "vitest";
import { requestModelReview } from "./aiProvider";

afterEach(() => vi.unstubAllGlobals());

describe("requestModelReview", () => {
  it("supports an OpenRouter host and model ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            suggestions: [{
              id: "scope-1",
              category: "logic",
              severity: "warning",
              title: "Scope needs review",
              detail: "The conclusion is broader than the experiment.",
              rationale: "Only one benchmark is reported.",
              file: "main.tex",
              line: 12,
            }],
          }),
        },
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const suggestions = await requestModelReview({
      baseUrl: "https://openrouter.ai/api/v1/",
      apiKey: "test-key",
      model: "anthropic/claude-sonnet-4",
    }, "main.tex", "\\section{Conclusion} Broad claim.");

    expect(suggestions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "X-Title": "Axiomate",
        }),
      }),
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body)).model).toBe("anthropic/claude-sonnet-4");
  });

  it("rejects malformed model output instead of trusting it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"suggestions":[{"title":"missing fields"}]}' } }],
    }), { status: 200 })));

    await expect(requestModelReview({
      baseUrl: "https://gateway.example/v1",
      apiKey: "test-key",
      model: "test-model",
    }, "main.tex", "paper" )).rejects.toThrow();
  });
});
