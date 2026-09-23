import { cardDateLabels } from "../utils/cardDates";
import { CardActivities } from "../features/boards/CardActivities";
import { BoardGroups, BoardGroupsEditor } from "../features/boards/BoardGroups";
import { createClientId } from "../utils/clientId";
import { ErrorToast, notify } from "../components/ui/ErrorToast";
import { boardParticipants } from "../utils/boardAccess";
import { canManageTeam } from "../utils/teamPermissions";
import { FilterMenu } from "../components/ui/FilterMenu";
import { normalizedFieldName, fieldKey, fieldValue, missingRequiredFields, allowedNextStepIds, canEditStep, stepAssigneeIds } from "../utils/stepValidation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
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
  const canAssignManager = ["admin", "superadmin"].includes(currentUser?.permission) || canManageTeam(currentUser, teams.find((team) => sameId(team._id, board?.teamId)));
  const canManageBoard = canManageTeam(currentUser, teams.find((team) => sameId(team._id, board?.teamId))) || (!!board?.managerId && sameId(currentUser?._id, board.managerId));
  const canManageCards = canManageBoard || ["admin", "superadmin"].includes(currentUser?.permission);
  const [dialog, setDialog] = useState(null);
  const [hiddenStepIds, setHiddenStepIds] = useState([]);
  const [pendingMove, setPendingMove] = useState(null);
  const [moveAcknowledged, setMoveAcknowledged] = useState(false);
  const [groupId, setGroupId] = useState("*");
  const [viewMode, setViewMode] = useState("kanban");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setBoard(null);
    setPendingMove(null);
    setGroupId("*");
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
  const moveCard = (cardId, stepId, confirmed = false) => {
    if (saving) return;
    const currentCard = board?.cards.find((card) => sameId(card._id, cardId));
    if (!board || !currentCard || sameId(currentCard.stepId, stepId)) return;
    const sourceStep = board.steps.find((item) =>
      sameId(item._id, currentCard.stepId),
    );
    const step = board.steps.find((item) => sameId(item._id, stepId));
    if (!sourceStep || !step) return;
    if (!canManageCards && !canEditStep(sourceStep, currentUser, teams, currentCard)) {
      setError("Apenas o responsável pela etapa pode editar ou mover este card.");
      return;
    }
    if (!canManageCards && !allowedNextStepIds(sourceStep, board.steps).includes(String(stepId))) {
      setError(`A etapa "${step.name}" não é um destino permitido para "${sourceStep.name}".`);
      return;
    }
    const missing = missingRequiredFields(sourceStep, currentCard.fieldValues);
    if (missing.length) {
      setError(`Preencha os campos obrigatórios da etapa "${sourceStep.name}" antes de mover o card: ${missing.join(', ')}.`);
      setDialog({ type: "card", card: currentCard, step: sourceStep });
      return;
    }
    if (!confirmed) {
      setMoveAcknowledged(false);
      setPendingMove({ cardId, stepId, title: currentCard.title, sourceName: sourceStep.name, targetName: step.name });
      return;
    }
    setPendingMove(null);
    const stepValues = Object.fromEntries(
      (sourceStep?.customFields || [])
        .map((field) => [fieldKey(field), fieldValue(field, currentCard.fieldValues)])
        .filter(([, value]) => value !== undefined && value !== ""),
    );
    const historyEntry = {
      stepId: sourceStep._id,
      stepName: sourceStep.name,
      values: stepValues,
      fieldLabels: Object.fromEntries((sourceStep.customFields || []).map((field) => [fieldKey(field), field.name])),
      movedAt: new Date().toISOString(),
    };
    persist({
      ...board,
      cards: board.cards.map((card) =>
        sameId(card._id, cardId)
          ? {
              ...card,
              stepId,
              assigneeId: card.assigneeId,
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
  const groupCards = board.cards.filter((card) => groupId === "*" || (card.groupId || "") === groupId);
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
            <p className="board-responsible">Responsável: <strong>{userById(board.managerId)?.name || "Não definido"}</strong></p>
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
          {canAssignManager && !canManageBoard && <Button variant="secondary" onClick={() => setDialog({ type: "board-edit" })}><Pencil size={16} />Editar quadro</Button>}
          <BoardMembers key={`members-${resourceId}`} board={board} users={users} teams={teams} />
          <Button
            disabled={saving || !steps.length}
            onClick={() =>
              setDialog({ type: "card", card: null, step: steps[0] })
            }
          >
            <Plus size={16} /> Novo card
          </Button>

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
      <div className="board-view-toolbar">
      <div className="board-view-toggle" role="group" aria-label="Visualização do quadro">
        {[
          { value: "kanban", label: "Kanban", Icon: Columns3 },
          { value: "table", label: "Tabela", Icon: Table2 },
          { value: "flowchart", label: "Fluxograma", Icon: Workflow },
          { value: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
        ].map(({ value, label, Icon }) => <button key={value} type="button"
          aria-pressed={viewMode === value} onClick={() => { setViewMode(value); notify(`Visualização alterada para ${label}.`); }}>
          <Icon size={16} aria-hidden="true" />{label}
        </button>)}
      </div>
      <span className="board-view-divider" role="separator" aria-orientation="vertical" />
      <BoardGroups groups={board.groups || []} defaultName={board.defaultGroupName} defaultEnabled={board.defaultGroupEnabled !== false} hasUngrouped={board.cards.some((card) => !card.groupId)} value={groupId} onChange={(value) => { setGroupId(value); notify(`Grupo selecionado: ${value === '*' ? 'Todos os grupos' : (board.groups || []).find((group) => group.key === value)?.name || (board.defaultGroupEnabled === false ? 'Não agrupados' : board.defaultGroupName || 'Padrão')}.`); }} />
          <FilterMenu key={`filters-${resourceId}`} active={steps.some((step) => hiddenStepIds.includes(step._id))} onReset={() => { setHiddenStepIds([]); }}>
            <fieldset className="step-filter-list">
              <legend>Etapas visíveis ({visibleSteps.length}/{steps.length})</legend>
              <div className="step-filter-actions">
                <button type="button" onClick={() => setHiddenStepIds([])}>Todas</button>
                <button type="button" onClick={() => setHiddenStepIds(steps.map((step) => step._id))}>Nenhuma</button>
              </div>
              {steps.map((step) => <Checkbox key={step._id} label={step.name} checked={!hiddenStepIds.includes(step._id)} onChange={() => setHiddenStepIds((current) => toggleValue(current, step._id))} />)}
            </fieldset>
          </FilterMenu>
      </div>
      {error && <ErrorToast message={error} />}
      {viewMode === "kanban" && <main className="kanban" aria-label={`Quadro ${board.name}`}>
        {!visibleSteps.length && <div className="api-state">Nenhuma etapa selecionada. Use o filtro para escolher as etapas que deseja visualizar.</div>}
        {visibleSteps.map((step) => {
          const stepCards = groupCards
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
                    <span>{step.assigneeMode === 'owner' ? 'Proprietário Apenas' : 'Qualquer Pessoa'}</span>
                  </>
                )}
              </div>
              <div className="kanban-cards">
                {stepCards.map((card) => (
                  <KanbanCard
                    key={card._id}
                    card={card}
                    canMove={!saving && (canManageCards || canEditStep(step, currentUser, teams, card))}
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
      {viewMode === "table" && <BoardTable canManage={canManageCards} currentUser={currentUser} cards={groupCards} steps={visibleSteps} users={users} teams={teams}
        onOpenCard={(card, step) => setDialog({ type: "card", card, step })} />}
      {viewMode === "flowchart" && <BoardFlowchart steps={steps} visibleSteps={visibleSteps} cards={groupCards} />}
      {viewMode === "dashboard" && <BoardDashboard cards={groupCards} steps={steps} visibleSteps={visibleSteps}
        onOpenCard={(card, step) => setDialog({ type: "card", card, step })} />}
      <Modal open={!!pendingMove} title="Confirmar mudança de etapa" onClose={() => setPendingMove(null)} footer={<>
        <Button variant="secondary" onClick={() => setPendingMove(null)}>Cancelar</Button>
        <Button disabled={saving || !moveAcknowledged} onClick={() => moveCard(pendingMove.cardId, pendingMove.stepId, true)}>Confirmar e mover</Button>
      </>}>
        <p>Mover <strong>{pendingMove?.title}</strong> de <strong>{pendingMove?.sourceName}</strong> para <strong>{pendingMove?.targetName}</strong>?</p>
        <Checkbox checked={moveAcknowledged} onChange={(event) => setMoveAcknowledged(event.target.checked)} label="Estou ciente de que os campos desta etapa não poderão mais ser modificados." />
      </Modal>
      {dialog?.type === "card" && (
        <CardDialog
          board={board}
          canManage={canManageCards}
          initialGroupId={groupId === "*" ? null : groupId || null}
          readOnly={!canManageCards && !!dialog.card && !canEditStep(dialog.step, currentUser, teams, dialog.card)}
          stepOwnerName={dialog.step.assigneeTeamId ? teams.find((team) => sameId(team._id, dialog.step.assigneeTeamId))?.name : stepAssigneeIds(dialog.step).map((id) => userById(id)?.name).filter(Boolean).join(", ")}
          users={participants}
          step={dialog.step}
          card={dialog.card}
          currentUser={currentUser}
          saving={saving}
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
            dialog.card && (canManageCards || sameId(dialog.card.createdBy, currentUser?._id))
              ? async () => {
                  const saved = await persist({
                    ...board,
                    cards: board.cards.filter(
                      (item) => !sameId(item._id, dialog.card._id),
                    ),
                  });
                  if (saved) setDialog(null);
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
          users={users}
          canAssignManager={canAssignManager}
          canManageBoard={canManageBoard}
          teams={teams}
          saving={saving}
          board={board}
          onClose={() => setDialog(null)}
          onSave={async (nextBoard) => {
            if (!canManageBoard) {
              try { setSaving(true); setError(""); setBoard(await api.updateBoard(board._id, { managerId: nextBoard.managerId || null })); setDialog(null); }
              catch (error) { setError(error.message); }
              finally { setSaving(false); }
              return;
            }
            if (await persist(nextBoard)) {
              if (groupId !== '*' && !(nextBoard.groups || []).some((group) => group.key === groupId)) setGroupId('*');
              setDialog(null);
            }
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

function BoardEditDialog({ board, teams, users, canAssignManager, canManageBoard, saving, error, onClose, onSave }) {
  const [draft, setDraft] = useState({
    ...board,
    groups: [...(board.groups || [])],
    steps: [...board.steps]
      .sort((a, b) => a.order - b.order)
      .map((step) => ({ ...step, clientKey: step._id || createClientId() })),
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
          clientKey: createClientId(),
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
            disabled={saving || (canManageBoard && (!draft.name.trim() || !draft.steps.length || !draft.teamId || draft.groups.some((group) => !group.name.trim())))}
            onClick={() => onSave(draft)}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="form-stack">
        {canAssignManager && <SelectInput label="Responsável do quadro" value={draft.managerId || ""} onChange={(event) => setDraft({ ...draft, managerId: event.target.value || null })} options={[{ value: "", label: "Sem responsável" }, ...users.filter((user) => user.active !== false || sameId(user._id, draft.managerId)).map((user) => ({ value: String(user._id), label: user.name }))]} />}
        <fieldset className="form-stack card-edit-fields" disabled={!canManageBoard}>
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
        <BoardGroupsEditor defaultName={draft.defaultGroupName} defaultEnabled={draft.defaultGroupEnabled !== false} onDefaultChange={({ name, enabled }) => setDraft((current) => ({ ...current, defaultGroupName: name, defaultGroupEnabled: enabled }))} groups={draft.groups} onChange={(groups) => setDraft((current) => ({ ...current, groups, cards: current.cards.map((card) => ({ ...card, groupId: groups.some((group) => group.key === card.groupId) ? card.groupId : null })) }))} />
        </fieldset>
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
  const dates = cardDateLabels(card);
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
        <div className="card-date-summary"><span><Calendar size={13} />{dates.age}</span>{dates.deadline && <span className={dates.overdue ? "card-deadline overdue" : "card-deadline"} aria-label={`${dates.overdue ? "Prazo vencido há" : "Prazo restante:"} ${dates.deadline}`}><Clock size={13} aria-hidden="true" />{dates.deadline}</span>}</div>
        {owner && <Avatar person={owner} small />}
      </footer>
    </article>
  );
}

function CardDialog({ canManage, board, initialGroupId, step, card, users, currentUser, readOnly, stepOwnerName, saving, error, onClose, onSave, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [moveConfirmed, setMoveConfirmed] = useState(false);
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
          groupId: initialGroupId,
          description: "",
          stepId: step._id,
          assigneeId: null,
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
  const clearStepData = (entry, index) => {
    const definition = board.steps.find((item) => sameId(item._id, entry.stepId));
    const keys = new Set([...Object.keys(entry.values || {}), ...(definition?.customFields || []).flatMap((field) => [fieldKey(field), field.legacyName || field.name])]);
    setDraft((current) => ({ ...current,
      fieldValues: Object.fromEntries(Object.entries(current.fieldValues).filter(([key]) => !keys.has(key))),
      stepDataHistory: current.stepDataHistory.filter((_, itemIndex) => itemIndex !== index),
    }));
    setEditingHistory(null);
  };
  if (confirmDelete) return <Modal open title="Excluir card?" subtitle="Esta ação não poderá ser desfeita." size="small" dismissible={!saving} onClose={() => setConfirmDelete(false)} footer={<>
    <Button variant="secondary" disabled={saving} onClick={() => setConfirmDelete(false)}>Cancelar</Button>
    <Button variant="danger" disabled={saving} onClick={async () => { await onDelete(); setConfirmDelete(false); }}><Trash2 size={16} />{saving ? "Excluindo..." : "Excluir card"}</Button>
  </>}><p>O card <strong>{draft.title}</strong>, suas atividades e os dados das etapas serão removidos permanentemente. Deseja continuar?</p></Modal>;
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
          {onDelete && (
            <Button variant="danger" disabled={saving || uploads > 0} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} /> Excluir
            </Button>
          )}
          <Button disabled={readOnly || saving || uploads > 0 || !draft.title.trim() || !draft.description?.trim() || (card && !sameId(card.stepId, draft.stepId) && !moveConfirmed)} onClick={() => onSave({ ...draft, title: draft.title.trim(), description: draft.description.trim() })}>
            Salvar card
          </Button>
        </>
      }
    >
      <fieldset className="form-stack card-edit-fields" disabled={readOnly || saving || uploads > 0}>
        {readOnly && <p role="status">Somente o responsável pela etapa pode editar e mover este card.</p>}
        <details className="card-section" open>
        <summary>Informações do card</summary>
        <div className="form-stack">
        <TextInput
          label="Título"
          name="card-title"
          disabled={!!card && !sameId(card.createdBy, currentUser?._id)}
          required
          autoFocus
          value={draft.title}
          onChange={(e) => set("title", e.target.value)}
        />
        <TextArea
          label="Descrição"
          name="card-description"
          disabled={!!card && !sameId(card.createdBy, currentUser?._id)}
          required
          value={draft.description || ""}
          onChange={(e) => set("description", e.target.value)}
        />
        {canManage && !!board.groups?.length && <SelectInput label="Grupo" value={draft.groupId || ""} onChange={(event) => set("groupId", event.target.value || null)} options={[{ value: "", label: board.defaultGroupEnabled === false ? "Não agrupados" : board.defaultGroupName || "Padrão" }, ...board.groups.map((group) => ({ value: group.key, label: group.name }))]} />}
        {canManage && card && <SelectInput label="Etapa" value={draft.stepId} onChange={(event) => set("stepId", event.target.value)} options={board.steps.map((item) => ({ value: item._id, label: item.name }))} />}
        <CardCreationInfo card={card} currentUser={currentUser} asInputs />
        {card && !sameId(card.stepId, draft.stepId) && <Checkbox label="Confirmo a mudança de etapa e estou ciente de que seus dados ficarão bloqueados para os membros." checked={moveConfirmed} onChange={(event) => setMoveConfirmed(event.target.checked)} />}
        {error && <ErrorToast message={error} />}
        <div className="form-row" style={{ "--columns": 2 }}>
          <SelectInput label="Responsável pelo card" value={draft.assigneeId || ""}
            disabled={readOnly || saving || (!!card?.assigneeId && !sameId(card.assigneeId, currentUser?._id) && !canManage)}
            onChange={(event) => set("assigneeId", event.target.value || null)}
            options={[
              ...(!card?.assigneeId || canManage || sameId(card.assigneeId, currentUser?._id) ? [{ value: "", label: draft.assigneeId ? "Remover atribuição" : "Sem responsável" }] : []),
              ...users.filter((user) => sameId(user._id, currentUser?._id) || sameId(user._id, draft.assigneeId)).map((user) => ({ value: user._id, label: user.name, disabled: !sameId(card?.assigneeId, currentUser?._id) && (!!card?.assigneeId || !sameId(user._id, currentUser?._id)) })),
            ]} />
          <TextInput
            type="date"
            label="Prazo"
            disabled={!sameId(card?.assigneeId, currentUser?._id) && !(!card?.assigneeId && sameId(draft.assigneeId, currentUser?._id))}
            value={draft.dueDate ? String(draft.dueDate).slice(0, 10) : ""}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </div>
        </div>
        </details>
        <CardActivities activities={draft.activities} onChange={(activities) => set("activities", activities)} disabled={readOnly || saving || uploads > 0 || (!canManage && !sameId(draft.assigneeId, currentUser?._id))} />
        {!!draft.stepDataHistory?.length && (
          <details className="card-section" open>
          <summary>Dados das etapas anteriores</summary>
          <div className="step-history">
            <p>
              Estas informações acompanham o card e não podem ser alteradas.
            </p>
            {draft.stepDataHistory.map((entry, index) => (
              <section key={entry._id || `${entry.stepId}-${index}`}>
                <header>
                  <strong>{entry.stepName}</strong>
                  {canManage && <div className="row-actions">
                    <button type="button" className="action-button" aria-label={`Editar dados de ${entry.stepName}`} onClick={() => setEditingHistory(editingHistory === index ? null : index)}><Pencil size={16} /></button>
                    <button type="button" className="action-button delete" aria-label={`Excluir dados de ${entry.stepName}`} onClick={() => clearStepData(entry, index)}><Trash2 size={16} /></button>
                  </div>}
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
                        <small>{entry.fieldLabels?.[name] || name}</small>
                        {canManage && editingHistory === index ? <DynamicField
                          field={board.steps.find((item) => sameId(item._id, entry.stepId))?.customFields.find((field) => fieldKey(field) === name) || { name: entry.fieldLabels?.[name] || name, type: value?.fileId ? 'file' : typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text' }}
                          value={value} onBusy={onUploadBusy}
                          onChange={(next) => setDraft((current) => ({ ...current, fieldValues: { ...current.fieldValues, [name]: next }, stepDataHistory: current.stepDataHistory.map((item, itemIndex) => itemIndex === index ? { ...item, values: { ...item.values, [name]: next } } : item) }))}
                        /> : <strong>
                          {value?.fileId ? <FileDownload value={value} /> : typeof value === "boolean"
                            ? value
                              ? "Sim"
                              : "Não"
                            : String(value)}
                        </strong>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <em>Nenhum dado informado nesta etapa.</em>
                )}
              </section>
            ))}
          </div>
          </details>
        )}
        {!!step.customFields?.length && (
          <details className="card-section" open>
          <summary>Campos de {step.name}</summary>
          {canManage && <div className="row-actions">
            <button type="button" className="action-button" aria-label={`Editar dados de ${step.name}`} onClick={(event) => event.currentTarget.closest('details').querySelector('fieldset input, fieldset textarea, fieldset button')?.focus()}><Pencil size={16} /></button>
            <button type="button" className="action-button delete" aria-label={`Excluir dados de ${step.name}`} onClick={() => clearStepData({ stepId: step._id }, -1)}><Trash2 size={16} /></button>
          </div>}
          <fieldset className="custom-fields-form" disabled={readOnly || (!canManage && draft.stepDataHistory.some((entry) => sameId(entry.stepId, step._id)))}>
            {!canManage && draft.stepDataHistory.some((entry) => sameId(entry.stepId, step._id)) && <p>Esta etapa já foi concluída. Seus campos não podem mais ser modificados.</p>}
            {step.customFields.map((field) => (
              <DynamicField
                key={fieldKey(field)}
                field={field}
                value={fieldValue(field, draft.fieldValues)}
                onChange={(value) => setField(fieldKey(field), value)}
                onBusy={onUploadBusy}
              />
            ))}
          </fieldset>
          </details>
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
  const [assigneeType, setAssigneeType] = useState(step?.assigneeMode || (step?.assigneeTeamId ? "team" : stepAssigneeIds(step || {}).length ? "person" : "anyone"));
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
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  const fieldForm = useRef(null);
  const resetField = () => {
    setEditingFieldKey(null);
    setField({ name: "", type: "text", required: false, options: "" });
  };
  const editField = (item) => {
    setEditingFieldKey(fieldKey(item));
    setField({ ...item, name: item.name, type: item.type || "text", required: !!item.required, options: (item.options || []).join(", ") });
    fieldForm.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    fieldForm.current?.querySelector("input")?.focus({ preventScroll: true });
  };
  const addField = () => {
    if (!field.name.trim()) return;
    if (draft.customFields.some((item) => fieldKey(item) !== editingFieldKey && normalizedFieldName(item.name) === normalizedFieldName(field.name))) {
      notify("J\u00e1 existe um campo com esse nome nesta etapa.", "error"); return;
    }
    const previous = draft.customFields.find((item) => fieldKey(item) === editingFieldKey);
    const next = {
      ...field,
      name: field.name.trim(),
      ...(previous ? { key: previous.key, _id: previous._id, legacyName: previous.legacyName || previous.name } : { key: createClientId() }),
      options: field.type === "select" ? field.options.split(",").map((item) => item.trim()).filter(Boolean) : [],
    };
    setDraft((current) => ({ ...current, customFields: previous
      ? current.customFields.map((item) => fieldKey(item) === editingFieldKey ? next : item)
      : [...current.customFields, next] }));
    resetField();
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
          <Button disabled={!draft.name.trim()} onClick={() => onSave({ ...draft, assigneeMode: assigneeType })}>
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
          options={[{ value: "anyone", label: "Qualquer Pessoa" }, { value: "owner", label: "Proprietário Apenas" }, { value: "person", label: "Pessoas" }, { value: "team", label: "Equipe" }]}
          onChange={(value) => { setAssigneeType(value); setDraft({ ...draft, assigneeId: null, assigneeIds: [], assigneeTeamId: null }); }}
        />
        {assigneeType === "person" ? <MultiSelectInput
          label="Pessoas responsáveis pela etapa"
          placeholder="Selecione as pessoas..."
          value={draft.assigneeIds || []}
          options={users.filter((user) => user.active !== false || draft.assigneeIds?.includes(user._id)).map((user) => ({ value: user._id, label: user.name }))}
          onChange={(assigneeIds) => setDraft({ ...draft, assigneeIds, assigneeId: null, assigneeTeamId: null })}
        /> : assigneeType === "team" ? <SelectInput
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
        /> : null}
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
            <div className="field-row" key={fieldKey(item)}>
              <CheckSquare size={16} />
              <span>
                <strong>{item.name}</strong>
                <small>
                  {fieldTypes.find((type) => type.value === item.type)?.label}
                </small>
              </span>
              <button type="button" aria-label={`Editar ${item.name}`} title="Editar campo" onClick={() => editField(item)}><Pencil size={15} /></button>
              <button type="button" aria-label={`Excluir ${item.name}`} title="Excluir campo" onClick={() => {
                setDraft((current) => ({ ...current, customFields: current.customFields.filter((candidate) => fieldKey(candidate) !== fieldKey(item)) }));
                if (editingFieldKey === fieldKey(item)) resetField();
              }}><Trash2 size={15} /></button>
            </div>
          ))}
          <div className="new-field" ref={fieldForm}>
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
            {editingFieldKey && <Button type="button" variant="secondary" onClick={resetField}>Cancelar edição</Button>}
            <Button type="button" variant="secondary" disabled={!field.name.trim()} onClick={addField}>
              {editingFieldKey ? <Save size={15} /> : <Plus size={15} />}{editingFieldKey ? "Atualizar campo" : "Adicionar campo"}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  );
}

