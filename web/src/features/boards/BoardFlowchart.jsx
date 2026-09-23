import { useId, useMemo } from "react";
import { buildFlowchart } from "../../utils/flowchart";

export function BoardFlowchart({ steps, visibleSteps, cards }) {
  const markerId = `flow-arrow-${useId().replace(/:/g, "")}`;
  const graph = useMemo(() => buildFlowchart(steps, visibleSteps), [steps, visibleSteps]);
  if (!graph.nodes.length) return <div className="api-state">Nenhuma etapa selecionada. Ajuste o filtro para visualizar o fluxo.</div>;
  return <section className="panel board-flowchart" aria-label="Fluxograma das etapas">
    {/* <p className="flowchart-help">Fluxograma de etapas.
      {graph.hiddenConnections > 0 && ` ${graph.hiddenConnections} conexão(ões) com etapas ocultas pelo filtro.`}
    </p> */}
    <div className="flowchart-scroll" tabIndex={0} aria-label="Área rolável do fluxograma">
      <svg width={graph.width} height={graph.height} viewBox={`0 0 ${graph.width} ${graph.height}`} role="img" aria-label="Etapas e transições permitidas">
        <defs><marker id={markerId} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
        {graph.edges.map(({ source, target, path }) => <path key={`${source._id}-${target._id}`} d={path} className="flowchart-edge" markerEnd={`url(#${markerId})`}><title>{source.name} → {target.name}</title></path>)}
        {graph.nodes.map(({ step, x, y, width, height, nextIds }, index) => <g key={step._id}>
          <title>{step.name}{nextIds.length ? `: ${nextIds.map((id) => steps.find((item) => String(item._id) === id)?.name).filter(Boolean).join(", ")}` : ": Fim do fluxo"}</title>
          <rect x={x} y={y} width={width} height={height} rx="12" className="flowchart-node" style={{ stroke: step.color || "currentColor" }} />
          <foreignObject x={x + 16} y={y + 12} width={width - 32} height={height - 24}>
            <div className="flowchart-node-content">
              <small>{String(step._id) === String([...steps].sort((a, b) => a.order - b.order)[0]?._id) ? `Etapa ${index + 1} · Início` : `Etapa ${index + 1}`}{!nextIds.length ? " · Fim" : ""}</small>
              <strong>{step.name}</strong>
              <span>{cards.filter((card) => String(card.stepId) === String(step._id)).length} card(s)</span>
            </div>
          </foreignObject>
        </g>)}
      </svg>
    </div>
  </section>;
}
