import type { Evidence, PaperProject } from "../types";

const mainTex = String.raw`\documentclass{article}
\usepackage{amsmath,amssymb,booktabs}
\title{Adaptive Evidence Routing for Reliable Scientific Writing}
\author{Axiomate Research Group}

\begin{document}
\maketitle

\begin{abstract}
Scientific writing assistants can improve drafting speed, but unsupported claims and notation drift limit their use in high-stakes research. We introduce Adaptive Evidence Routing (AER), a workflow that binds each generated claim to a verifiable source passage. On two benchmark corpora, AER reduces unsupported claims by 31\% while preserving author style.
\end{abstract}

\section{Introduction}
Large language models are increasingly used for scientific writing, yet fluent prose can conceal unsupported factual claims \cite{lee2025grounded}. Existing tools treat citations as formatting artifacts rather than semantic evidence. This gap makes it difficult for researchers to determine whether a cited paper actually supports the surrounding sentence.

We propose Adaptive Evidence Routing (AER), which represents a paper as linked claims, evidence passages, and argument roles. Our contribution is threefold: a claim-level provenance model, an evidence-aware rewrite policy, and a consistency checker for mathematical notation.

\section{Method}
Let $x \in \mathbb{R}^{d}$ denote a sentence representation and let $E = \{e_1, \dots, e_n\}$ be candidate evidence passages. We define the support score as
\begin{equation}
  s_i = \frac{\exp(x^\top W e_i)}{\sum_j \exp(x^\top W e_j)}.
  \label{eq:support}
\end{equation}
The final evidence representation is computed as
\begin{equation}
  z = \sum_{i=1}^{n} s_i e_i.
  \label{eq:evidence}
\end{equation}

We minimize the combined objective
\begin{equation}
  \mathcal{L} = \mathcal{L}_{\mathrm{write}} + \lambda \mathcal{L}_{\mathrm{support}} - \beta R(z),
  \label{eq:objective}
\end{equation}
where $\lambda$ controls evidence alignment. The coefficient $\beta$ is fixed for all experiments.

\section{Experiments}
We evaluate AER on two scientific writing corpora. Table~\ref{tab:results} reports the unsupported claim rate. Our method improves factuality in every setting.

\begin{table}[h]
\centering
\begin{tabular}{lcc}
\toprule
Method & Unsupported claims $\downarrow$ & Style match $\uparrow$ \\
\midrule
Baseline & 18.4 & 82.1 \\
AER & 12.7 & 84.6 \\
\bottomrule
\end{tabular}
\caption{Evaluation results on the combined benchmark.}
\label{tab:results}
\end{table}

\section{Conclusion}
AER eliminates hallucinations in scientific writing and guarantees citation correctness across research domains. Future work will connect generated tables to executable analysis artifacts.

\bibliographystyle{plain}
\bibliography{references}
\end{document}`;

const bib = String.raw`@article{lee2025grounded,
  title={Grounded Generation for Scientific Documents},
  author={Lee, Mina and Patel, Arjun},
  journal={Transactions on Machine Learning Research},
  year={2025}
}`;

export const sampleProject: PaperProject = {
  name: "aer-paper",
  mainFile: "main.tex",
  files: [
    { path: "main.tex", content: mainTex, type: "tex" },
    { path: "references.bib", content: bib, type: "bib" },
  ],
};

export const sampleEvidence: Evidence[] = [
  {
    id: "ev-grounded-1",
    citeKey: "lee2025grounded",
    title: "Grounded Generation for Scientific Documents",
    authors: "Mina Lee, Arjun Patel",
    year: 2025,
    page: 3,
    passage:
      "Fluent model outputs frequently contain claims that are not entailed by the cited source, even when the bibliography entry itself is valid.",
  },
  {
    id: "ev-project-result",
    citeKey: "project:table-1",
    title: "AER evaluation results",
    authors: "Current project",
    year: 2026,
    passage:
      "The unsupported claim rate decreases from 18.4 to 12.7 on the combined benchmark, a relative reduction of 31.0%.",
  },
];
