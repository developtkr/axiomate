import katex from "katex";

interface PaperPreviewProps {
  content: string;
  pdfDataUrl?: string;
}

interface PreviewBlock {
  type: "title" | "author" | "section" | "paragraph" | "equation";
  content: string;
}

function parsePreview(content: string): PreviewBlock[] {
  const body = content.replace(/[\s\S]*?\\begin\{document\}/, "").replace(/\\end\{document\}[\s\S]*/, "");
  const title = content.match(/\\title\{([^}]+)\}/)?.[1];
  const author = content.match(/\\author\{([^}]+)\}/)?.[1];
  const blocks: PreviewBlock[] = [];
  if (title) blocks.push({ type: "title", content: title });
  if (author) blocks.push({ type: "author", content: author });

  const tokens = body.split(/(\\section\{[^}]+\}|\\begin\{equation\}[\s\S]*?\\end\{equation\})/g);
  for (const token of tokens) {
    const value = token.trim();
    if (!value || value === "\\maketitle") continue;
    const section = value.match(/^\\section\{([^}]+)\}$/);
    if (section) {
      blocks.push({ type: "section", content: section[1] });
      continue;
    }
    const equation = value.match(/^\\begin\{equation\}([\s\S]*?)\\end\{equation\}$/);
    if (equation) {
      blocks.push({
        type: "equation",
        content: equation[1].replace(/\\label\{[^}]+\}/g, "").trim(),
      });
      continue;
    }
    const clean = value
      .replace(/\\maketitle/g, "")
      .replace(/\\begin\{abstract\}|\\end\{abstract\}/g, "")
      .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, "[Table 1. Evaluation results on the combined benchmark.] ")
      .replace(/\\bibliographystyle\{[^}]+\}|\\bibliography\{[^}]+\}/g, "")
      .replace(/\\cite\{([^}]+)\}/g, " [$1]")
      .replace(/Table~\\ref\{[^}]+\}/g, "Table 1")
      .replace(/\\%/g, "%")
      .replace(/\\&/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (clean.length > 3) blocks.push({ type: "paragraph", content: clean });
  }
  return blocks;
}

function renderInlineMath(text: string) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      const html = katex.renderToString(part.slice(1, -1), { throwOnError: false });
      return <span key={`${part}-${index}`} dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function PaperPreview({ content, pdfDataUrl }: PaperPreviewProps) {
  if (pdfDataUrl) {
    return <iframe className="pdf-frame" src={pdfDataUrl} title="Compiled paper PDF" />;
  }

  const blocks = parsePreview(content);
  return (
    <div className="paper-canvas">
      <article className="paper-sheet">
        {blocks.map((block, index) => {
          if (block.type === "title") return <h1 key={`${block.type}-${index}`}>{block.content}</h1>;
          if (block.type === "author") return <p className="paper-author" key={`${block.type}-${index}`}>{block.content}</p>;
          if (block.type === "section") return <h2 key={`${block.type}-${index}`}>{block.content}</h2>;
          if (block.type === "equation") {
            const html = katex.renderToString(block.content, { displayMode: true, throwOnError: false });
            return <div className="paper-equation" key={`${block.type}-${index}`} dangerouslySetInnerHTML={{ __html: html }} />;
          }
          return <p key={`${block.type}-${index}`}>{renderInlineMath(block.content)}</p>;
        })}
      </article>
    </div>
  );
}
