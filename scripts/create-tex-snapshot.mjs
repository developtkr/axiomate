import { Sandbox } from "@vercel/sandbox";

const sandbox = await Sandbox.create({ runtime: "node22", timeout: 10 * 60_000, resources: { vcpus: 2 } });

try {
  const install = await sandbox.runCommand({
    cmd: "dnf",
    args: ["install", "-y", "latexmk", "texlive", "texlive-amsmath", "texlive-booktabs"],
    sudo: true,
    stdout: process.stdout,
    stderr: process.stderr,
  });
  if (install.exitCode !== 0) throw new Error("Could not install the TeX toolchain.");

  await sandbox.writeFiles([{
    path: "smoke.tex",
    content: "\\documentclass{article}\\usepackage{amsmath,booktabs}\\begin{document}Axiomate $x^2$.\\end{document}",
  }]);
  const compile = await sandbox.runCommand({
    cmd: "latexmk",
    args: ["-pdf", "-interaction=nonstopmode", "-halt-on-error", "-pdflatex=pdflatex %O -no-shell-escape %S", "smoke.tex"],
  });
  if (compile.exitCode !== 0) throw new Error(await compile.stderr());

  const snapshot = await sandbox.snapshot({ expiration: 0 });
  console.log(`AXIOMATE_TEX_SNAPSHOT_ID=${snapshot.snapshotId}`);
} catch (error) {
  await sandbox.stop().catch(() => undefined);
  throw error;
}
