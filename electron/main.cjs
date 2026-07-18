const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");

const SUPPORTED_EXTENSIONS = new Set([".tex", ".bib", ".sty", ".cls", ".md"]);
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", ".paper", "build", "out"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PROJECT_FILES = 240;
const COMPILE_TIMEOUT_MS = 60_000;

function isWithinRoot(rootPath, targetPath) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(targetPath));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function resolveProjectPath(rootPath, relativePath) {
  const target = path.resolve(rootPath, relativePath);
  if (!isWithinRoot(rootPath, target)) throw new Error("Path is outside the project root.");
  return target;
}

async function collectProjectFiles(rootPath) {
  const files = [];

  async function visit(directory) {
    if (files.length >= MAX_PROJECT_FILES) return;
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= MAX_PROJECT_FILES) break;
      if (entry.isSymbolicLink()) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) await visit(absolutePath);
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
      const stat = await fs.stat(absolutePath);
      if (stat.size > MAX_FILE_BYTES) continue;
      const content = await fs.readFile(absolutePath, "utf8");
      files.push({
        path: path.relative(rootPath, absolutePath),
        content,
        type: extension === ".tex" ? "tex" : extension === ".bib" ? "bib" : "other",
      });
    }
  }

  await visit(rootPath);
  return files;
}

function findMainFile(files) {
  return files.find((file) => file.content.includes("\\documentclass"))?.path
    ?? files.find((file) => file.type === "tex")?.path
    ?? "main.tex";
}

function runLatexmk(rootPath, mainFile) {
  return new Promise((resolve) => {
    const args = [
      "-pdf",
      "-interaction=nonstopmode",
      "-halt-on-error",
      "-file-line-error",
      "-pdflatex=pdflatex %O -no-shell-escape %S",
      mainFile,
    ];
    const child = spawn("latexmk", args, {
      cwd: rootPath,
      env: {
        PATH: process.env.PATH,
        LANG: process.env.LANG ?? "en_US.UTF-8",
        HOME: app.getPath("userData"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    let settled = false;
    const append = (chunk) => {
      output += chunk.toString();
      if (output.length > 200_000) output = output.slice(-200_000);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      resolve({ ok: false, log: error.code === "ENOENT" ? "latexmk was not found. Install TeX Live or MacTeX." : error.message });
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      resolve({ ok: code === 0, log: output });
    });
    setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGTERM");
      resolve({ ok: false, log: `${output}\nCompilation timed out after ${COMPILE_TIMEOUT_MS / 1000} seconds.` });
    }, COMPILE_TIMEOUT_MS).unref();
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#090b0d",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("project:open", async () => {
  const result = await dialog.showOpenDialog({
    title: "Open a LaTeX project",
    properties: ["openDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const rootPath = result.filePaths[0];
  const files = await collectProjectFiles(rootPath);
  return {
    name: path.basename(rootPath),
    rootPath,
    mainFile: findMainFile(files),
    files,
  };
});

ipcMain.handle("project:save-file", async (_event, rootPath, relativePath, content) => {
  try {
    if (typeof content !== "string" || Buffer.byteLength(content) > MAX_FILE_BYTES) throw new Error("File is too large.");
    const target = resolveProjectPath(rootPath, relativePath);
    await fs.writeFile(target, content, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Save failed." };
  }
});

ipcMain.handle("project:compile", async (_event, rootPath, mainFile) => {
  try {
    resolveProjectPath(rootPath, mainFile);
    const result = await runLatexmk(rootPath, mainFile);
    if (!result.ok) return result;
    const pdfPath = path.join(rootPath, path.dirname(mainFile), `${path.basename(mainFile, path.extname(mainFile))}.pdf`);
    if (!isWithinRoot(rootPath, pdfPath)) throw new Error("Compiled PDF path is outside the project root.");
    const pdf = await fs.readFile(pdfPath);
    return { ok: true, log: result.log, pdfDataUrl: `data:application/pdf;base64,${pdf.toString("base64")}` };
  } catch (error) {
    return { ok: false, log: error instanceof Error ? error.message : "Compilation failed." };
  }
});

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
