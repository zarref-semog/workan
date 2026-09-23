import { DataTable } from "../../components/ui/DataTable";
import { canEditStep, stepAssigneeIds } from "../../utils/stepValidation";
import { Eye, Pencil } from "lucide-react";

export function BoardTable({ cards, steps, users, teams, currentUser, onOpenCard }) {
  const rows = steps.flatMap((step) => cards.filter((card) => String(card.stepId) === String(step._id))
    .sort((a, b) => a.order - b.order).map((card) => ({ ...card, step })));
  const responsible = ({ step, assigneeId }) => step.assigneeTeamId
    ? teams.find((team) => String(team._id) === String(step.assigneeTeamId))?.name || "Equipe indisponível"
    : (stepAssigneeIds(step).length ? stepAssigneeIds(step) : [assigneeId]).map((id) => users.find((user) => String(user._id) === String(id))?.name).filter(Boolean).join(", ") || "Sem responsável";
  const columns = [
    { key: "title", header: "Card", render: (card) => <button className="table-card-link" onClick={() => onOpenCard(card, card.step)}>{card.title}</button> },
    { key: "description", header: "Descrição", className: "board-table-description" },
    { key: "step", header: "Etapa", render: ({ step }) => <span className="table-step"><i style={{ background: step.color }} />{step.name}</span> },
    { key: "responsible", header: "Responsável", render: responsible },
    { key: "dueDate", header: "Prazo", render: (card) => card.dueDate ? new Date(card.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Sem prazo" },
    { key: "actions", header: "Ações", width: 90, render: (card) => {
      const editable = canEditStep(card.step, currentUser, teams);
      const label = `${editable ? "Editar" : "Visualizar"} ${card.title}`;
      return <div className="modal-actions-menu"><button type="button" className="action-button" aria-label={label} title={label} onClick={() => onOpenCard(card, card.step)}>
        {editable ? <Pencil size={16} /> : <Eye size={16} />}
      </button></div>;
    } },
  ];
  return <section className="panel board-table" aria-label="Cards em tabela">
    <DataTable columns={columns} rows={rows} minWidth={850} emptyMessage={steps.length ? "Nenhum card nas etapas selecionadas." : "Nenhuma etapa selecionada. Ajuste o filtro para visualizar os cards."} />
  </section>;
}
