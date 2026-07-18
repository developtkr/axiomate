import type { PaperAnalysis } from "../types";

interface ScoreStripProps {
  score: PaperAnalysis["score"];
}

const scoreLabels = {
  evidence: "Evidence",
  logic: "Logic",
  math: "Math",
  writing: "Writing",
} as const;

export function ScoreStrip({ score }: ScoreStripProps) {
  return (
    <section className="score-strip" aria-label="Paper health scores">
      {(Object.keys(scoreLabels) as Array<keyof typeof scoreLabels>).map((key) => (
        <div className="score-cell" key={key}>
          <span>{scoreLabels[key]}</span>
          <strong>{score[key]}</strong>
          <div className="score-track" aria-hidden="true">
            <div className={`score-fill score-${key}`} style={{ width: `${score[key]}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}
