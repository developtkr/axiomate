import type { PaperProject } from "../types";

export interface WebCompileResult {
  pdfUrl: string;
  compiler: string;
}

export async function requestWebCompile(accessToken: string, project: PaperProject): Promise<WebCompileResult> {
  const response = await fetch("/api/compile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ project: { name: project.name, mainFile: project.mainFile, files: project.files } }),
  });
  if (!response.ok) {
    const body = await response.json() as { error?: string; log?: string };
    const firstDiagnostic = body.log?.split("\n").find((line) => /:\d+:|error/i.test(line));
    throw new Error(firstDiagnostic ? `${body.error ?? "Compile failed"} ${firstDiagnostic}` : body.error ?? `Compile failed (${response.status}).`);
  }
  const pdf = await response.blob();
  if (pdf.type !== "application/pdf") throw new Error("Compiler returned an invalid PDF response.");
  return {
    pdfUrl: URL.createObjectURL(pdf),
    compiler: response.headers.get("X-Axiomate-Compiler") ?? "Vercel Sandbox",
  };
}
