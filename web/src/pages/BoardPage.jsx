import { ErrorToast } from "../components/ui/ErrorToast";
import { boardParticipants } from "../utils/boardAccess";
import { canManageTeam } from "../utils/teamPermissions";
import { FilterMenu } from "../components/ui/FilterMenu";
import { missingRequiredFields, allowedNextStepIds, canEditStep, stepAssigneeIds } from "../utils/stepValidation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Columns3,
  Table2,
  Workflow,
  LayoutDashboard,
  Check,
  CheckSquare,
  GripVertical,
  Globe2,
  LockKeyhole,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Share2,
  Trash2,
  UserRound,
} from "lucide-react";
import { api } from "../services/api";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/modal/Modal";
import { ConfirmDialog } from "../components/modal/ConfirmDialog";
import { Checkbox } from "../components/forms/Checkbox";
import { RadioGroup } from "../components/forms/RadioGroup";
import { SelectInput } from "../components/forms/SelectInput";
import { MultiSelectInput } from "../components/forms/MultiSelectInput";
import { TextArea } from "../components/forms/TextArea";
import { TextInput } from "../components/forms/TextInput";
import { FileInput, FileDownload } from "../components/forms/FileInput";
import { ColorField } from "../components/forms/ColorField";
import { BoardTable } from "../features/boards/BoardTable";
import { BoardFlowchart } from "../features/boards/BoardFlowchart";
import { BoardDashboard } from "../features/boards/BoardDashboard";
import { BoardMembers } from "../features/boards/BoardMembers";

const sameId = (left, right) => String(left || "") === String(right || "");
const toggleValue = (values, value) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
const fieldTypes = [
  { value: "file", label: "Arquivo" },
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "checkbox", label: "Caixa de seleção" },
];

export function BoardPage({ resourceId, navigate, currentUser }) {
  const [board, setBoard] = useState(null);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const canManageBoard = canManageTeam(currentUser, teams.find((team) => sameId(team._id, board?.teamId)));
  const [dialog, setDialog] = useState(null);
  const [hiddenStepIds, setHiddenStepIds] = useState([]);
  const [viewMode, setViewMode] = useState("kanban");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setBoard(null);
    setError("");
    setDialog(null);
    setHiddenStepIds([]);
    Promise.all([api.getBoard(resourceId), api.listUsers(), api.listTeams()])
      .then(([nextBoard, nextUsers, nextTeams]) => {
        setBoard(nextBoard);
        setUsers(nextUsers);
        setTeams(nextTeams);
      })
      .catch((e) => setError(e.message));
  }, [resourceId]);
  useEffect(() => {
    const closeOptions = (event) => {
      if (!optionsRef.current?.contains(event.target)) setOptionsOpen(false);
    };
    document.addEventListener("mousedown", closeOptions);
    return () => document.removeEventListener("mousedown", closeOptions);
  }, []);
  const userById = (id) => users.find((user) => sameId(user._id, id));
  const persist = async (nextBoard) => {
    const previousBoard = board;
    setBoard(nextBoard);
    setError("");
    setSaving(true);
    try {
      setBoard(await api.updateBoard(nextBoard._id, nextBoard));
      return true;
    } catch (e) {
      setBoard(previousBoard);
      setError(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const moveCard = (cardId, stepId) => {
    if (saving) return;
    const currentCard = board?.cards.find((card) => sameId(card._id, cardId));
    if (!board || !currentCard || sameId(currentCard.stepId, stepId)) return;
    const sourceStep = board.steps.find((item) =>
      sameId(item._id, currentCard.stepId),
    );
    const step = board.steps.find((item) => sameId(item._id, stepId));
    if (!sourceStep || !step) return;
    if (!canEditStep(sourceStep, currentUser, teams)) {
      setError("Apenas o responsável pela etapa pode editar ou mover este card.");
      return;
    }
    if (!allowedNextStepIds(sourceStep, board.steps).includes(String(stepId))) {
      setError(`A etapa "${step.name}" não é um destino permitido para "${sourceStep.name}".`);
      return;
    }
    const missing = missingRequiredFields(sourceStep, currentCard.fieldValues);
    if (missing.length) {
      setError(`Preencha os campos obrigatórios da etapa "${sourceStep.name}" antes de mover o card: ${missing.join(', ')}.`);
      setDialog({ type: "card", card: currentCard, step: sourceStep });
      return;
    }
    const stepValues = Object.fromEntries(
      (sourceStep?.customFields || [])
        .map((field) => [field.name, currentCard.fieldValues?.[field.name]])
        .filter(([, value]) => value !== undefined && value !== ""),
    );
    const historyEntry = {
      stepId: sourceStep._id,
      stepName: sourceStep.name,
      values: stepValues,
      movedAt: new Date().toISOString(),
    };
    persist({
      ...board,
      cards: board.cards.map((card) =>
        sameId(card._id, cardId)
          ? {
              ...card,
              stepId,
              assigneeId: stepAssigneeIds(step)[0] || (step.assigneeTeamId ? null : card.assigneeId),
              stepDataHistory: [
                ...(card.stepDataHistory || []),
                historyEntry,
              ],
            }
          : card,
      ),
    });
  };
  const moveStep = (stepId, targetStepId) => {
    if (!stepId || sameId(stepId, targetStepId)) return;
    const ordered = [...board.steps].sort((a, b) => a.order - b.order);
    const sourceIndex = ordered.findIndex((step) =>
      sameId(step._id, stepId),
    );
    const targetIndex = ordered.findIndex((step) =>
      sameId(step._id, targetStepId),
    );
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = ordered.splice(sourceIndex, 1);
    ordered.splice(targetIndex, 0, moved);
    persist({
      ...board,
      steps: ordered.map((step, order) => ({ ...step, order })),
    });
  };
  if (error && !board)
    return (
      <div className="api-state">
        <ErrorToast message={error} />
        <Button variant="secondary" onClick={() => navigate("boards")}>
          Voltar aos quadros
        </Button>
      </div>
    );
  if (!board) return <div className="api-state">Carregando quadro...</div>;
  const steps = [...board.steps].sort((a, b) => a.order - b.order);
  const participants = boardParticipants(board, users, teams);
  const participantTeams = teams.filter((team) => board.visibility === "public" || [board.teamId, ...(board.sharedTeamIds || [])].some((id) => sameId(id, team._id)));
  const visibleSteps = steps.filter((step) => !hiddenStepIds.includes(step._id));
  return (
    <div className="board-page" style={{ "--team-color": teams.find((team) => sameId(team._id, board.teamId))?.color || board.color }}>
      <header className="board-header">
        <button className="back" onClick={() => navigate("boards")}>
          <ArrowLeft size={16} /> Todos os quadros
        </button>
        <div className="board-title">
          <div>
            <h1>{board.name}</h1>
            <p>{board.description}</p>
          </div>
        </div>
        <div className="board-header-actions">
          <span className={saving ? "saving save-status active" : "saving save-status"}
            role="status" aria-label={saving ? "Salvando..." : "Salvo"}
            title={saving ? "Salvando..." : "Salvo"}>
            {saving ? <LoaderCircle className="save-spinner" size={20} aria-hidden="true" /> : <>
              <Save size={20} aria-hidden="true" />
              <Check className="save-check" size={12} strokeWidth={3} aria-hidden="true" />
            </>}
          </span>
          <BoardMembers key={resourceId} board={board} users={users} teams={teams} />
          <Button
            disabled={saving || !steps.length}
            onClick={() =>
              setDialog({ type: "card", card: null, step: steps[0] })
            }
          >
            <Plus size={16} /> Novo card
          </Button>
          <FilterMenu key={resourceId} active={steps.some((step) => hiddenStepIds.includes(step._id))} onReset={() => { setHiddenStepIds([]); }}>
            <fieldset className="step-filter-list">
              <legend>Etapas visíveis ({visibleSteps.length}/{steps.length})</legend>
              <div className="step-filter-actions">
                <button type="button" onClick={() => setHiddenStepIds([])}>Todas</button>
                <button type="button" onClick={() => setHiddenStepIds(steps.map((step) => step._id))}>Nenhuma</button>
              </div>
              {steps.map((step) => <Checkbox key={step._id} label={step.name} checked={!hiddenStepIds.includes(step._id)} onChange={() => setHiddenStepIds((current) => toggleValue(current, step._id))} />)}
            </fieldset>
          </FilterMenu>
          {canManageBoard && (
            <div className="board-options" ref={optionsRef}>
              <button
                className="board-options-trigger"
                type="button"
                aria-label="Mais opções do quadro"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen((open) => !open)}
              >
                <MoreHorizontal size={20} />
              </button>
              {optionsOpen && (
                <div className="board-options-menu">
                  <button type="button" onClick={() => { setOptionsOpen(false); setDialog({ type: "board-edit" }); }}>
                    <Pencil size={16} />
                    <span><strong>Editar quadro</strong><small>Nome, descrição e etapas</small></span>
                  </button>
                  <button type="button" onClick={() => { setOptionsOpen(false); persist({ ...board, visibility: board.visibility === "public" ? "private" : "public" }); }}>
                    {board.visibility === "public" ? <LockKeyhole size={16} /> : <Globe2 size={16} />}
                    <span><strong>{board.visibility === "public" ? "Tornar privado" : "Tornar público"}</strong><small>Visibilidade atual: {board.visibility === "public" ? "Público" : "Privado"}</small></span>
                  </button>
                  {board.visibility !== "public" && (
                    <button type="button" onClick={() => { setOptionsOpen(false); setDialog({ type: "board-share" }); }}>
                      <Share2 size={16} />
                      <span><strong>Compartilhar</strong><small>Conceder acesso a equipes ou usuários</small></span>
                    </button>
                  )}
                  <button className="delete" type="button" onClick={() => { setOptionsOpen(false); setDialog({ type: "board-delete" }); }}>
                    <Trash2 size={16} />
                    <span><strong>Excluir quadro</strong><small>Remover permanentemente</small></span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="board-view-toggle" role="group" aria-label="Visualização do quadro">
        {[
          { value: "kanban", label: "Kanban", Icon: Columns3 },
          { value: "table", label: "Tabela", Icon: Table2 },
          { value: "flowchart", label: "Fluxograma", Icon: Workflow },
          { value: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
        ].map(({ value, label, Icon }) => <button key={value} type="button"
          aria-pressed={viewMode === value} onClick={() => setViewMode(value)}>
          <Icon size={16} aria-hidden="true" />{label}
        </button>)}
      </div>
      {error && <ErrorToast message={error} />}
      {viewMode === "kanban" && <main className="kanban" aria-label={`Quadro ${board.name}`}>
        {!visibleSteps.length && <div className="api-state">Nenhuma etapa selecionada. Use o filtro para escolher as etapas que deseja visualizar.</div>}
        {visibleSteps.map((step) => {
          const stepCards = board.cards
            .filter((card) => sameId(card.stepId, step._id))
            .sort((a, b) => a.order - b.order);
          const owners = stepAssigneeIds(step).map(userById).filter(Boolean);
          const owner = step.assigneeTeamId ? teams.find((team) => sameId(team._id, step.assigneeTeamId)) : owners[0];
          return (
            <section
              className="kanban-column"
              key={step._id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const cardId = event.dataTransfer.getData("cardId");
                const stepId = event.dataTransfer.getData("stepId");
                if (cardId) moveCard(cardId, step._id);
                else if (stepId) moveStep(stepId, step._id);
              }}
            >
              <header
                className="kanban-column-head"
                draggable={canManageBoard}
                onDragStart={(event) => {
                  if (!canManageBoard) return event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("stepId", step._id);
                }}
              >
                <div className="step-name">
                  <GripVertical className="step-grip" size={15} />
                  <i style={{ background: step.color }} />
                  <strong>{step.name}</strong>
                  <span>{stepCards.length}</span>
                </div>
                {canManageBoard && <button
                  aria-label={`Configurar ${step.name}`}
                  onClick={() => setDialog({ type: "step", step })}
                >
                  <MoreHorizontal size={18} />
                </button>}
              </header>
              <div className="step-owner">
                {owner ? (
                  <>
                    <Avatar person={step.assigneeTeamId ? { ...owner, initials: owner.name.slice(0, 2) } : owner} small />
                    <span>
                      Responsável pela etapa
                      <br />
                      <strong>{step.assigneeTeamId ? owner.name : owners.map((person) => person.name).join(", ")}</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <UserRound size={19} />
                    <span>Sem responsável</span>
                  </>
                )}
              </div>
              <div className="kanban-cards">
                {stepCards.map((card) => (
                  <KanbanCard
                    key={card._id}
                    card={card}
                    canMove={!saving && canEditStep(step, currentUser, teams)}
                    owner={userById(card.assigneeId)}
                    onClick={() => setDialog({ type: "card", card, step })}
                  />
                ))}
                {!stepCards.length && (
                  <div className="empty-column">
                    Arraste um card para esta etapa
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </main>}
      {viewMode === "table" && <BoardTable currentUser={currentUser} cards={board.cards} steps={visibleSteps} users={users} teams={teams}
        onOpenCard={(card, step) => setDialog({ type: "card", card, step })} />}
      {viewMode === "flowchart" && <BoardFlowchart steps={steps} visibleSteps={visibleSteps} cards={board.cards} />}
      {viewMode === "dashboard" && <BoardDashboard cards={board.cards} steps={steps} visibleSteps={visibleSteps}
        onOpenCard={(card, step) => setDialog({ type: "card", card, step })} />}
      {dialog?.type === "card" && (
        <CardDialog
          board={board}
          readOnly={!!dialog.card && !canEditStep(dialog.step, currentUser, teams)}
          stepOwnerName={dialog.step.assigneeTeamId ? teams.find((team) => sameId(team._id, dialog.step.assigneeTeamId))?.name : stepAssigneeIds(dialog.step).map((id) => userById(id)?.name).filter(Boolean).join(", ")}
          users={participants}
          step={dialog.step}
          card={dialog.card}
          currentUser={currentUser}
          saving={saving}
          error={error}
          onClose={() => setDialog(null)}
          onSave={async (card) => {
            const exists = board.cards.some((item) =>
              sameId(item._id, card._id),
            );
            const saved = await persist({
              ...board,
              cards: exists
                ? board.cards.map((item) =>
                    sameId(item._id, card._id) ? card : item,
                  )
                : [...board.cards, card],
            });
            if (saved) setDialog(null);
          }}
          onDelete={
            dialog.card
              ? () => {
                  persist({
                    ...board,
                    cards: board.cards.filter(
                      (item) => !sameId(item._id, dialog.card._id),
                    ),
                  });
                  setDialog(null);
                }
              : null
          }
        />
      )}
      {dialog?.type === "step" && (
        <StepDialog
          step={dialog.step}
          steps={board.steps}
          teams={participantTeams}
          users={participants}
          onClose={() => setDialog(null)}
          onSave={(step) => {
            const exists = board.steps.some((item) =>
              sameId(item._id, step._id),
            );
            persist({
              ...board,
              steps: exists
                ? board.steps.map((item) =>
                    sameId(item._id, step._id) ? step : item,
                  )
                : [...board.steps, { ...step, order: board.steps.length }],
            });
            setDialog(null);
          }}
          onDelete={
            dialog.step
              ? () => {
                  if (
                    board.cards.some((card) =>
                      sameId(card.stepId, dialog.step._id),
                    )
                  )
                    return setError(
                      "Mova ou exclua os cards desta etapa antes de removê-la.",
                    );
                  persist({
                    ...board,
                    steps: board.steps.filter(
                      (item) => !sameId(item._id, dialog.step._id),
                    ).map((item) => ({ ...item, nextStepIds: item.nextStepIds?.filter((id) => !sameId(id, dialog.step._id)) })),
                  });
                  setDialog(null);
                }
              : null
          }
        />
      )}
      {dialog?.type === "board-edit" && (
        <BoardEditDialog
          teams={teams}
          saving={saving}
          error={error}
          board={board}
          onClose={() => setDialog(null)}
          onSave={async (nextBoard) => {
            if (await persist(nextBoard)) setDialog(null);
          }}
        />
      )}
      {dialog?.type === "board-share" && (
        <ShareBoardDialog
          board={board}
          users={users}
          teams={teams}
          onClose={() => setDialog(null)}
          onSave={(sharing) => {
            persist({ ...board, ...sharing });
            setDialog(null);
          }}
        />
      )}
      <ConfirmDialog
        open={dialog?.type === "board-delete"}
        resourceName={board.name}
        onCancel={() => setDialog(null)}
        onConfirm={async () => {
          try {
            await api.deleteBoard(board._id);
            navigate("boards");
          } catch (deleteError) {
            setError(deleteError.message);
            setDialog(null);
          }
        }}
      />
    </div>
  );
}

function ShareBoardDialog({ board, users, teams, onClose, onSave }) {
  const [target, setTarget] = useState(
    board.sharedUserIds?.length && !board.sharedTeamIds?.length
      ? "users"
      : "teams",
  );
  const [sharedTeamIds, setSharedTeamIds] = useState(
    (board.sharedTeamIds || []).map(String),
  );
  const [sharedUserIds, setSharedUserIds] = useState(
    (board.sharedUserIds || []).map(String),
  );
  return (
    <Modal
      open
      title="Compartilhar quadro"
      subtitle="Escolha quem poderá acessar este quadro privado."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ sharedTeamIds, sharedUserIds })}>
            <Share2 size={16} /> Salvar compartilhamento
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <RadioGroup
          label="Compartilhar com"
          name="board-share-target"
          value={target}
          onChange={setTarget}
          options={[
            { value: "teams", label: "Equipes" },
            { value: "users", label: "Pessoas" },
          ]}
        />
        <div className="share-list">
          {target === "teams"
            ? teams.map((team) => {
                const id = String(team._id);
                return <Checkbox key={id} label={team.name} description={team.description} checked={sharedTeamIds.includes(id)} onChange={() => setSharedTeamIds((values) => toggleValue(values, id))} />;
              })
            : users.map((user) => {
                const id = String(user._id);
                return <Checkbox key={id} label={user.name} description={user.email} checked={sharedUserIds.includes(id)} onChange={() => setSharedUserIds((values) => toggleValue(values, id))} />;
              })}
        </div>
      </div>
    </Modal>
  );
}

function BoardEditDialog({ board, teams, saving, error, onClose, onSave }) {
  const [draft, setDraft] = useState({
    ...board,
    steps: [...board.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({ ...step, clientKey: step._id || crypto.randomUUID() })),
  });
  const [newStep, setNewStep] = useState({ name: "", color: "#64748b" });
  const [stepError, setStepError] = useState("");
  const [draggedStepKey, setDraggedStepKey] = useState(null);
  const addStep = () => {
    if (!newStep.name.trim()) return;
    setDraft((current) => ({
      ...current,
      steps: [
        ...current.steps,
        {
          name: newStep.name.trim(),
          color: newStep.color,
          order: current.steps.length,
          customFields: [],
          assigneeId: null,
          clientKey: crypto.randomUUID(),
        },
      ],
    }));
    setNewStep({ name: "", color: "#64748b" });
    setStepError("");
  };
  const removeStep = (step) => {
    if (draft.cards.some((card) => sameId(card.stepId, step._id))) {
      setStepError(
        `A etapa “${step.name}” possui cards. Mova ou exclua esses cards antes de removê-la.`,
      );
      return;
    }
    setDraft((current) => ({
      ...current,
      steps: current.steps
        .filter((item) => item.clientKey !== step.clientKey)
        .map((item, order) => ({ ...item, order, nextStepIds: item.nextStepIds?.filter((id) => !sameId(id, step._id)) })),
    }));
    setStepError("");
  };
  const reorderStep = (targetStepKey) => {
    if (!draggedStepKey || draggedStepKey === targetStepKey) return;
    setDraft((current) => {
      const reordered = [...current.steps];
      const sourceIndex = reordered.findIndex(
        (step) => step.clientKey === draggedStepKey,
      );
      const targetIndex = reordered.findIndex(
        (step) => step.clientKey === targetStepKey,
      );
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return {
        ...current,
        steps: reordered.map((step, order) => ({ ...step, order })),
      };
    });
    setDraggedStepKey(null);
  };
  return (
    <Modal
      open
      title="Editar quadro"
      subtitle="Atualize o quadro e gerencie suas etapas."
      onClose={onClose}
      size="large"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={saving || !draft.name.trim() || !draft.steps.length || !draft.teamId}
            onClick={() => onSave(draft)}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <TextInput
          label="Nome do quadro"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <TextArea
          label="Descrição"
          value={draft.description || ""}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
        />
        <SelectInput name="edit-board-team" label="Equipe" required value={draft.teamId || ""}
          hint="O quadro utiliza automaticamente a cor da equipe."
          options={[{ value: "", label: "Selecione uma equipe" }, ...teams.map((team) => ({ value: team._id, label: team.name }))]}
          onChange={(event) => setDraft({ ...draft, teamId: event.target.value, color: teams.find((team) => team._id === event.target.value)?.color })} />
        {error && <ErrorToast message={error} />}
        <section className="board-steps-editor">
          <header>
            <div>
              <h3>Etapas do quadro</h3>
              <p>Adicione ou remova colunas do fluxo.</p>
            </div>
            <span>{draft.steps.length}</span>
          </header>
          <div className="board-step-list">
            {draft.steps.map((step) => (
                <div
                  className={`board-step-row ${draggedStepKey === step.clientKey ? "dragging" : ""}`}
                  key={step.clientKey}
                  draggable
                  onDragStart={(event) => {
                    setDraggedStepKey(step.clientKey);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    reorderStep(step.clientKey);
                  }}
                  onDragEnd={() => setDraggedStepKey(null)}
                >
                  <GripVertical className="step-modal-drag" size={17} />
                  <i style={{ background: step.color }} />
                  <span>
                    <strong>{step.name}</strong>
                    <small>
                      {
                        draft.cards.filter((card) =>
                          sameId(card.stepId, step._id),
                        ).length
                      }{" "}
                      cards
                    </small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remover ${step.name}`}
                    onClick={() => removeStep(step)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
          {stepError && <ErrorToast message={stepError} />}
          <div className="new-board-step">
            <TextInput
              label="Nome da nova etapa"
              placeholder="Ex.: Em aprovação"
              value={newStep.name}
              onChange={(event) =>
                setNewStep({ ...newStep, name: event.target.value })
              }
            />
            <ColorField
              label="Cor"
              value={newStep.color}
              onChange={(color) =>
                setNewStep({ ...newStep, color })
              }
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!newStep.name.trim()}
              onClick={addStep}
            >
              <Plus size={15} /> Adicionar etapa
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

function CardCreationInfo({ card, currentUser, asInputs = false }) {
  const [openedAt] = useState(() => new Date());
  const createdAt = card?.createdAt ? new Date(card.createdAt) : card ? null : openedAt;
  const validDate = createdAt && !Number.isNaN(createdAt.getTime());
  const creatorName = card ? card.createdByName || "Não registrado" : currentUser?.name || "Usuário conectado";
  const creationDate = validDate
    ? `${createdAt.toLocaleDateString("pt-BR")} às ${createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    : "Não registrada";
  if (asInputs) return (
    <div className="form-row" style={{ "--columns": 2 }}>
      <TextInput name="card-created-by" label="Criado por" value={creatorName} readOnly />
      <TextInput name="card-created-at" label="Data de criação" value={creationDate} readOnly />
    </div>
  );
  return (
    <div className="card-creation-info">
      <span><strong>Criado por:</strong> {card ? card.createdByName || "Não registrado" : currentUser?.name || "Usuário conectado"}</span>
      <span><strong>Criação:</strong> {validDate ? <time dateTime={createdAt.toISOString()}>
        {createdAt.toLocaleDateString("pt-BR")} às {createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false })}
      </time> : "Não registrada"}</span>
    </div>
  );
}

function KanbanCard({ card, owner, onClick, canMove }) {
  return (
    <article
      className="kanban-card"
      draggable={canMove}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("cardId", card._id);
      }}
      onClick={onClick}
    >
      <h3>{card.title}</h3>
      <p>{card.description}</p>
      <footer>
        {card.dueDate && (
          <time>
            <Calendar size={13} />
            {new Date(card.dueDate).toLocaleDateString("pt-BR")}
          </time>
        )}
        {owner && <Avatar person={owner} small />}
      </footer>
    </article>
  );
}

function CardDialog({ step, card, users, currentUser, readOnly, stepOwnerName, saving, error, onClose, onSave, onDelete }) {
  const [uploads, setUploads] = useState(0);
  const onUploadBusy = (delta) => setUploads((count) => count + delta);
  const [draft, setDraft] = useState(
    card
      ? {
          ...card,
          fieldValues: { ...(card.fieldValues || {}) },
          stepDataHistory: [...(card.stepDataHistory || [])],
        }
      : {
          title: "",
          description: "",
          stepId: step._id,
          assigneeId: stepAssigneeIds(step)[0] || null,
          dueDate: "",
          labels: [],
          fieldValues: {},
          stepDataHistory: [],
          order: 0,
        },
  );
  const set = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const setField = (name, value) =>
    setDraft((current) => ({
      ...current,
      fieldValues: { ...current.fieldValues, [name]: value },
    }));
  return (
    <Modal
      open
      title={card ? (readOnly ? "Visualizar card" : "Editar card") : `Novo card em ${step.name}`}
      subtitle="As informações acompanham o card durante todo o fluxo."
      onClose={onClose}
      size="large"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {onDelete && !readOnly && (
            <Button variant="danger" onClick={onDelete}>
              <Trash2 size={15} /> Excluir
            </Button>
          )}
          <Button disabled={readOnly || saving || uploads > 0 || !draft.title.trim() || !draft.description?.trim()} onClick={() => onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() })}>
            Salvar card
          </Button>
        </>
      }
    >
      <fieldset className="form-stack card-edit-fields" disabled={readOnly || saving || uploads > 0}>
        {readOnly && <p role="status">Somente o responsável pela etapa pode editar e mover este card.</p>}
        <TextInput
          label="Título"
          name="card-title"
          required
          autoFocus
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <TextArea
          label="Descrição"
          name="card-description"
          required
          value={draft.description || ""}
          onChange={(e) => set("description", e.target.value)}
        />
        <CardCreationInfo card={card} currentUser={currentUser} asInputs />
        {error && <ErrorToast message={error} />}
        <div className="form-row" style={{ "--columns": 2 }}>
          {stepAssigneeIds(step).length || step.assigneeTeamId ? <TextInput
            label={step.assigneeTeamId ? "Equipe responsável pela etapa" : "Responsável pela etapa"}
            value={stepOwnerName || "Responsável indisponível"}
            readOnly
          /> : <SelectInput
            label="Responsável"
            value={draft.assigneeId || ""}
            onChange={(e) => set("assigneeId", e.target.value || null)}
            options={[
              { value: "", label: "Sem responsável" },
              ...users.map((user) => ({ value: user._id, label: user.name })),
            ]}
          />}
          <TextInput
            type="date"
            label="Prazo"
            value={draft.dueDate ? String(draft.dueDate).slice(0, 10) : ""}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </div>
        {!!draft.stepDataHistory?.length && (
          <div className="step-history">
            <h3>Dados das etapas anteriores</h3>
            <p>
              Estas informações acompanham o card e não podem ser alteradas.
            </p>
            {draft.stepDataHistory.map((entry, index) => (
              <section key={entry._id || `${entry.stepId}-${index}`}>
                <header>
                  <strong>{entry.stepName}</strong>
                  <time>
                    {entry.movedAt
                      ? new Date(entry.movedAt).toLocaleString("pt-BR")
                      : ""}
                  </time>
                </header>
                {Object.entries(entry.values || {}).length ? (
                  <div>
                    {Object.entries(entry.values || {}).map(([name, value]) => (
                      <span key={name}>
                        <small>{name}</small>
                        <strong>
                          {value?.fileId ? <FileDownload value={value} /> : typeof value === "boolean"
                            ? value
                              ? "Sim"
                              : "Não"
                            : String(value)}
                        </strong>
                      </span>
                    ))}
                  </div>
                ) : (
                  <em>Nenhum dado informado nesta etapa.</em>
                )}
              </section>
            ))}
          </div>
        )}
        {!!step.customFields?.length && (
          <div className="custom-fields-form">
            <h3>Campos de {step.name}</h3>
            {step.customFields.map((field) => (
              <DynamicField
                key={field._id || field.name}
                field={field}
                value={draft.fieldValues[field.name]}
                onChange={(value) => setField(field.name, value)}
                onBusy={onUploadBusy}
              />
            ))}
          </div>
        )}
      </fieldset>
    </Modal>
  );
}

function DynamicField({ field, value, onChange, onBusy }) {
  if (field.type === "file") return <FileInput label={field.name} required={field.required} value={value} onChange={onChange} onBusy={onBusy} />;
  if (field.type === "checkbox")
    return (
      <Checkbox
        label={field.required ? `${field.name} *` : field.name}
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  if (field.type === "select")
    return (
      <SelectInput
        label={field.name}
        required={field.required}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: "", label: "Selecione..." },
          ...(field.options || []).map((option) => ({
            value: option,
            label: option,
          })),
        ]}
      />
    );
  return (
    <TextInput
      label={field.name}
      required={field.required}
      type={field.type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function StepDialog({ step, steps, teams, users, onClose, onSave, onDelete }) {
  const [assigneeType, setAssigneeType] = useState(step?.assigneeTeamId ? "team" : "person");
  const [draft, setDraft] = useState(
    step
      ? { ...step, assigneeIds: stepAssigneeIds(step), nextStepIds: allowedNextStepIds(step, steps), customFields: [...(step.customFields || [])] }
      : {
          name: "",
          color:
            getComputedStyle(document.documentElement)
              .getPropertyValue("--teal")
              .trim() || "#0f766e",
          assigneeId: null,
          customFields: [],
        },
  );
  const [field, setField] = useState({
    name: "",
    type: "text",
    required: false,
    options: "",
  });
  const addField = () => {
    if (!field.name.trim()) return;
    setDraft({
      ...draft,
      customFields: [
        ...draft.customFields,
        {
          ...field,
          options:
            field.type === "select"
              ? field.options
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [],
        },
      ],
    });
    setField({ name: "", type: "text", required: false, options: "" });
  };
  return (
    <Modal
      open
      title={step ? "Configurar etapa" : "Nova etapa"}
      subtitle="Defina o responsável e os campos que aparecem nos cards desta coluna."
      onClose={onClose}
      size="large"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              <Trash2 size={15} /> Excluir etapa
            </Button>
          )}
          <Button disabled={!draft.name.trim()} onClick={() => onSave(draft)}>
            Salvar etapa
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <div className="form-row" style={{ "--columns": 2 }}>
          <TextInput
            label="Nome da etapa"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <ColorField
            label="Cor"
            value={draft.color}
            onChange={(color) => setDraft({ ...draft, color })}
          />
        </div>
        <RadioGroup
          label="Tipo de responsável"
          name="step-assignee-type"
          value={assigneeType}
          options={[{ value: "person", label: "Pessoas" }, { value: "team", label: "Equipe" }]}
          onChange={(value) => { setAssigneeType(value); setDraft({ ...draft, assigneeId: null, assigneeIds: [], assigneeTeamId: null }); }}
        />
        {assigneeType === "person" ? <MultiSelectInput
          label="Pessoas responsáveis pela etapa"
          placeholder="Selecione as pessoas..."
          value={draft.assigneeIds || []}
          options={users.filter((user) => user.active !== false || draft.assigneeIds?.includes(user._id)).map((user) => ({ value: user._id, label: user.name }))}
          onChange={(assigneeIds) => setDraft({ ...draft, assigneeIds, assigneeId: null, assigneeTeamId: null })}
        /> : <SelectInput
          label="Equipe responsável pela etapa"
          placeholder="Selecione a equipe..."
          value={draft.assigneeTeamId || ""}
          onChange={(e) =>
            setDraft({ ...draft,
              assigneeId: null, assigneeIds: [],
              assigneeTeamId: e.target.value || null,
            })
          }
          options={[
            { value: "", label: "Sem responsável" },
            ...teams.map((team) => ({ value: team._id, label: team.name })),
          ]}
        />}
        <section className="field-builder">
          <h3>Próximas etapas permitidas</h3>
          <p>Selecione os destinos para os cards desta etapa. Sem seleção, o fluxo termina aqui.</p>
          {steps.filter((item) => !sameId(item._id, step?._id)).map((item) => (
            <Checkbox key={item._id} label={item.name}
              checked={(draft.nextStepIds || []).includes(String(item._id))}
              onChange={() => setDraft({ ...draft, nextStepIds: toggleValue(draft.nextStepIds || [], String(item._id)) })} />
          ))}
        </section>
        <section className="field-builder">
          <div>
            <h3>Campos personalizados</h3>
            <p>Estes campos serão exibidos apenas nos cards desta etapa.</p>
          </div>
          {draft.customFields.map((item, index) => (
            <div className="field-row" key={`${item.name}-${index}`}>
              <CheckSquare size={16} />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {fieldTypes.find((type) => type.value === item.type)?.label}
                </small>
              </span>
              <button
                onClick={() =>
                  setDraft({
                    ...draft,
                    customFields: draft.customFields.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div className="new-field">
            <TextInput
              label="Nome do campo"
              value={field.name}
              onChange={(e) => setField({ ...field, name: e.target.value })}
            />
            <SelectInput
              label="Tipo"
              value={field.type}
              onChange={(e) => setField({ ...field, type: e.target.value })}
              options={fieldTypes}
            />
            {field.type === "select" && (
              <TextInput
                label="Opções (separadas por vírgula)"
                value={field.options}
                onChange={(e) =>
                  setField({ ...field, options: e.target.value })
                }
              />
            )}
            <Checkbox
              label="Obrigatório"
              checked={field.required}
              onChange={(e) =>
                setField({ ...field, required: e.target.checked })
              }
            />
            <Button variant="secondary" onClick={addField}>
              <Plus size={15} /> Adicionar campo
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
