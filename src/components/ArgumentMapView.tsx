import { ArrowDown, CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import type { ArgumentEdge, ArgumentNode } from "../types";

interface ArgumentMapViewProps {
  nodes: ArgumentNode[];
  edges: ArgumentEdge[];
}

const statusIcons = {
  connected: CircleCheck,
  warning: CircleAlert,
  missing: CircleDashed,
} as const;

export function ArgumentMapView({ nodes, edges }: ArgumentMapViewProps) {
  return (
    <div className="argument-map" aria-label="Paper argument map">
      <header>
        <small>ARGUMENT GRAPH</small>
        <span>{nodes.filter((node) => node.status === "connected").length}/{nodes.length} connected</span>
      </header>
      {nodes.map((node, index) => {
        const Icon = statusIcons[node.status];
        const outgoing = edges.find((edge) => edge.from === node.id);
        return (
          <div className="argument-step" key={node.id}>
            <article className={`argument-node argument-${node.status}`}>
              <Icon size={14} />
              <div>
                <strong>{node.label}</strong>
                <p>{node.detail}</p>
                <small>LINE {node.line}</small>
              </div>
            </article>
            {index < nodes.length - 1 && outgoing && (
              <div className="argument-edge"><ArrowDown size={12} /><span>{outgoing.relation}</span></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
