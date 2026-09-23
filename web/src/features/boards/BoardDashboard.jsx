import { AlertCircle, Clock, Layers, Flag } from "lucide-react";
import { boardDashboard } from "../../utils/boardDashboard";

export function BoardDashboard({ cards, steps, visibleSteps, onOpenCard }) {
  const { totals, distribution, attention } = boardDashboard(cards, steps, visibleSteps);
  if (!visibleSteps.length) return <div className="api-state">Nenhuma etapa selecionada. Ajuste o filtro para visualizar o dashboard.</div>;
  return <section className="board-dashboard" aria-label="Dashboard do quadro">
    <div className="dashboard-stats">
      {[
        { label: "Total de cards", value: totals.total, Icon: Layers, hint: "Nas etapas selecionadas" },
        { label: "Em etapas finais", value: totals.terminal, Icon: Flag, hint: "Etapas sem próximo destino" },
        { label: "Cards atrasados", value: totals.overdue, Icon: Clock, hint: "Prazo vencido, fora das etapas finais" },
        { label: "Campos pendentes", value: totals.incomplete, Icon: AlertCircle, hint: "Cards com campos obrigatórios vazios" },
      ].map(({ label, value, Icon, hint }) => <article className="panel dashboard-stat" key={label}>
        <div><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
        <strong>{value}</strong><small>{hint}</small>
      </article>)}
    </div>
    <div className="dashboard-sections">
      <section className="panel dashboard-section" aria-label="Distribuição de cards por etapa">
        <h2>Cards por etapa</h2>
        {!totals.total && <p className="dashboard-empty">Nenhum card nas etapas selecionadas.</p>}
        {distribution.map(({ step, count }) => <div className="dashboard-bar-row" key={step._id}>
          <div><span>{step.name}</span><strong>{count}</strong></div>
          <div className="dashboard-bar" role="img" aria-label={`${step.name}: ${count} de ${totals.total} cards`}>
            <span style={{ width: `${totals.total ? count / totals.total * 100 : 0}%`, background: step.color || "var(--teal)" }} />
          </div>
        </div>)}
      </section>
      <section className="panel dashboard-section" aria-label="Cards que precisam de atenção">
        <h2>Precisam de atenção <span>({attention.length})</span></h2>
        {!attention.length && <p className="dashboard-empty">Nenhum atraso ou campo obrigatório pendente nas etapas selecionadas.</p>}
        <div className="dashboard-attention">
          {attention.map(({ card, step, overdue, missing }) => <button type="button" className="dashboard-card" key={card._id} onClick={() => onOpenCard(card, step)}>
            <strong>{card.title}</strong><span>{step.name}</span>
            {overdue && <small className="dashboard-overdue">Prazo vencido em {new Date(`${String(card.dueDate).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")}</small>}
            {!!missing.length && <small>Preencher: {missing.join(", ")}</small>}
          </button>)}
        </div>
      </section>
    </div>
  </section>;
}
