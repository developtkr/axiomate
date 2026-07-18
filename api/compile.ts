import path from "node:path";
import { Sandbox } from "@vercel/sandbox";
import { z } from "zod";
import { AuthError, requireUserId } from "./_lib/auth.js";
import { paperProjectSchema } from "./_lib/projectSchema.js";

const compilePayloadSchema = z.object({ project: paperProjectSchema });
const maxBodyBytes = 2_000_000;
const maxPdfBytes = 20_000_000;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      await requireUserId(request);
      const snapshotId = process.env.AXIOMATE_TEX_SNAPSHOT_ID;
      if (!snapshotId) return json({ error: "Web PDF compiler is not configured." }, 503);

      const raw = await request.text();
      if (Buffer.byteLength(raw) > maxBodyBytes) return json({ error: "Project is too large to compile." }, 413);
      const { project } = compilePayloadSchema.parse(JSON.parse(raw));
      const sandbox = await Sandbox.create({
        source: { type: "snapshot", snapshotId },
        timeout: 90_000,
        resources: { vcpus: 2 },
        networkPolicy: "deny-all",
      });

      try {
        const directories = new Set<string>(["project"]);
        for (const file of project.files) {
          let directory = path.posix.dirname(file.path);
          while (directory !== ".") {
            directories.add(`project/${directory}`);
            directory = path.posix.dirname(directory);
          }
        }
        for (const directory of [...directories].sort((a, b) => a.length - b.length)) {
          await sandbox.mkDir(directory);
        }
        await sandbox.writeFiles(project.files.map((file) => ({
          path: `project/${file.path}`,
          content: file.content,
        })));

        const result = await sandbox.runCommand({
          cmd: "latexmk",
          args: [
            "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            "-file-line-error",
            "-pdflatex=pdflatex %O -no-shell-escape %S",
            `./${project.mainFile}`,
          ],
          cwd: "/vercel/sandbox/project",
          signal: AbortSignal.timeout(70_000),
        });
        const log = `${await result.stdout()}\n${await result.stderr()}`.trim().slice(-40_000);
        if (result.exitCode !== 0) return json({ error: "LaTeX compilation failed.", log }, 422);

        const pdfPath = path.posix.join(
          "project",
          path.posix.dirname(project.mainFile),
          `${path.posix.basename(project.mainFile, path.posix.extname(project.mainFile))}.pdf`,
        );
        const pdf = await sandbox.readFileToBuffer({ path: pdfPath });
        if (!pdf) return json({ error: "Compiler completed without producing a PDF.", log }, 422);
        if (pdf.byteLength > maxPdfBytes) return json({ error: "Compiled PDF is too large." }, 413);

        return new Response(new Uint8Array(pdf), {
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/pdf",
            "Content-Disposition": "inline; filename=paper.pdf",
            "X-Axiomate-Compiler": "latexmk-sandbox",
          },
        });
      } finally {
        await sandbox.stop().catch(() => undefined);
      }
    } catch (error) {
      if (error instanceof AuthError) return json({ error: error.message }, error.status);
      if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Invalid compile request." }, 400);
      return json({ error: error instanceof Error ? error.message : "Compilation failed." }, 500);
    }
  },
};
