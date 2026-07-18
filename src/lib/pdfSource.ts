import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PdfPageText, ResearchSource } from "../types";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const MAX_PDF_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 160;

interface PdfTextItem {
  str: string;
  hasEOL: boolean;
}

function normalizePageText(items: PdfTextItem[]): string {
  let text = "";
  for (const item of items) {
    text += item.str;
    text += item.hasEOL ? "\n" : " ";
  }
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function firstUsefulLine(pages: PdfPageText[], fallback: string): string {
  const line = pages[0]?.text
    .split("\n")
    .map((value) => value.trim())
    .find((value) => value.length >= 12 && value.length <= 180);
  return line ?? fallback.replace(/\.pdf$/i, "");
}

export async function extractPdfSource(file: File): Promise<ResearchSource> {
  if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name} exceeds the 40 MB local import limit.`);
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data });
  const document = await loadingTask.promise;
  if (document.numPages > MAX_PAGES) {
    await loadingTask.destroy();
    throw new Error(`${file.name} has more than ${MAX_PAGES} pages.`);
  }

  const pages: PdfPageText[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items: PdfTextItem[] = textContent.items.flatMap((item) => (
      "str" in item ? [{ str: item.str, hasEOL: item.hasEOL }] : []
    ));
    pages.push({ pageNumber, text: normalizePageText(items) });
    page.cleanup();
  }

  const metadata = await document.getMetadata().catch(() => undefined);
  const info = metadata?.info as { Title?: string; Author?: string; CreationDate?: string } | undefined;
  const parsedYear = info?.CreationDate?.match(/(?:D:)?(19|20)\d{2}/)?.[0].replace("D:", "");
  const fallback = file.name.replace(/\.pdf$/i, "");
  const source: ResearchSource = {
    id: `pdf-${crypto.randomUUID()}`,
    fileName: file.name,
    title: info?.Title?.trim() || firstUsefulLine(pages, fallback),
    authors: info?.Author?.trim() || undefined,
    year: parsedYear ? Number(parsedYear) : undefined,
    pageCount: document.numPages,
    size: file.size,
    pages,
  };
  await loadingTask.destroy();
  return source;
}

export function passageCandidates(page: PdfPageText): string[] {
  return page.text
    .split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z])/)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 50 && value.length <= 900)
    .slice(0, 30);
}
