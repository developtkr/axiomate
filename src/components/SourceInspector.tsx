import { useMemo, useState } from "react";
import { ArrowLeft, Check, FileSearch, Link2, Search, X } from "lucide-react";
import { passageCandidates } from "../lib/pdfSource";
import type { Claim, ResearchSource } from "../types";

interface SourceInspectorProps {
  source: ResearchSource;
  claims: Claim[];
  onAttach: (claimId: string, pageNumber: number, passage: string) => void;
  onClose: () => void;
}

export function SourceInspector({ source, claims, onAttach, onClose }: SourceInspectorProps) {
  const [pageNumber, setPageNumber] = useState(1);
  const [claimId, setClaimId] = useState(claims.find((claim) => claim.status === "unsupported")?.id ?? claims[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const page = source.pages.find((item) => item.pageNumber === pageNumber) ?? source.pages[0];
  const candidates = useMemo(() => {
    const values = page ? passageCandidates(page) : [];
    if (!query.trim()) return values;
    const normalized = query.toLowerCase();
    return values.filter((value) => value.toLowerCase().includes(normalized));
  }, [page, query]);

  return (
    <div className="source-inspector-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="source-inspector" role="dialog" aria-modal="true" aria-labelledby="source-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <FileSearch size={18} />
            <span><small>LOCAL PDF · {source.pageCount} PAGES</small><strong id="source-title">{source.title}</strong></span>
          </div>
          <button onClick={onClose} aria-label="Close source inspector"><X size={17} /></button>
        </header>

        <div className="source-link-bar">
          <label>
            Attach passage to claim
            <select value={claimId} onChange={(event) => setClaimId(event.target.value)}>
              {claims.map((claim) => <option key={claim.id} value={claim.id}>{claim.text.slice(0, 110)}</option>)}
            </select>
          </label>
          <div className="source-search"><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this page" /></div>
        </div>

        <div className="source-inspector-body">
          <nav aria-label="PDF pages">
            {source.pages.map((item) => (
              <button className={item.pageNumber === pageNumber ? "active" : ""} key={item.pageNumber} onClick={() => setPageNumber(item.pageNumber)}>
                <span>{item.pageNumber}</span>
                <small>{item.text.slice(0, 68) || "No extractable text"}</small>
              </button>
            ))}
          </nav>
          <main>
            <div className="source-page-heading"><ArrowLeft size={13} /><span>PAGE {pageNumber}</span><em>{candidates.length} passages</em></div>
            {candidates.length === 0 && <div className="source-empty">No text passage matches this page and query.</div>}
            {candidates.map((passage, index) => {
              const key = `${pageNumber}-${index}`;
              const isAttached = attached.includes(key);
              return (
                <article key={key}>
                  <p>{passage}</p>
                  <button
                    disabled={!claimId || isAttached}
                    onClick={() => {
                      onAttach(claimId, pageNumber, passage);
                      setAttached((previous) => [...previous, key]);
                    }}
                  >
                    {isAttached ? <><Check size={12} /> Attached</> : <><Link2 size={12} /> Use as evidence</>}
                  </button>
                </article>
              );
            })}
          </main>
        </div>
      </section>
    </div>
  );
}
