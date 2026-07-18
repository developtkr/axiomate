import { afterEach, describe, expect, it, vi } from "vitest";
import { requestManagedReview, requestModelReview } from "./aiProvider";

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
    }, "main.tex", "\\section{Conclusion} Broad claim.", {
      venue: "neurips",
      voice: "concise",
      english: "american",
      avoidPhrases: "clearly",
    });

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
    const body = JSON.parse(String(request.body));
    expect(body.model).toBe("anthropic/claude-sonnet-4");
    expect(body.messages[1].content).toContain('"venue":"neurips"');
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

  it("sends an authenticated managed review without exposing a provider key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: "openai/gpt-5.5",
      suggestions: [{
        id: "math-1",
        category: "math",
        severity: "suggestion",
        title: "Define the symbol",
        detail: "The symbol is used before its definition.",
        rationale: "Readers cannot resolve the notation locally.",
        file: "main.tex",
        line: 8,
      }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestManagedReview("session-token", "main.tex", "x = 1", {
      venue: "generic",
      voice: "balanced",
      english: "american",
      avoidPhrases: "obviously",
    });

    expect(result.model).toBe("openai/gpt-5.5");
    expect(result.suggestions).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/review", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer session-token" }),
    }));
  });
});
