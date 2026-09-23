import { ErrorToast } from "../components/ui/ErrorToast";
import { FilterMenu, FilterSelect } from "../components/ui/FilterMenu";
import { canManageTeam } from "../utils/teamPermissions";
import { nameSortOptions, sortByName } from "../utils/sorting";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  LayoutGrid,
  Plus,
  Search,
  Share2,
  Users,
} from "lucide-react";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/modal/Modal";
import { TextInput } from "../components/forms/TextInput";
import { SelectInput } from "../components/forms/SelectInput";
import { RadioGroup } from "../components/forms/RadioGroup";
import { Checkbox } from "../components/forms/Checkbox";
import { PageHead } from "../components/ui/PageHead";

const toggleValue = (values, value) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
const emptyBoardDraft = {
  teamId: "",
  name: "",
  description: "",
  visibility: "private",
  shareTarget: "teams",
  sharedTeamIds: [],
  sharedUserIds: [],
};

export function BoardsPage({ navigate, currentUser }) {
  const [boards, setBoards] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const managedTeams = teams.filter((team) => canManageTeam(currentUser, team));
  const canManageBoards = currentUser?.permission === 'superadmin' || managedTeams.length > 0;
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyBoardDraft);
  const [sharingOpen, setSharingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.listBoards(), api.listUsers(), api.listTeams()])
      .then(([nextBoards, nextUsers, nextTeams]) => {
        setBoards(nextBoards);
        setUsers(nextUsers);
        setTeams(nextTeams);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const filtered = useMemo(() => sortByName(boards.filter((board) =>
    (visibilityFilter === "all" || (board.visibility || "private") === visibilityFilter) &&
    `${board.name} ${board.description}`.toLowerCase().includes(search.toLowerCase())
  ), sortOrder), [boards, search, visibilityFilter, sortOrder]);
  const createBoard = async () => {
    if (!draft.name.trim() || !draft.teamId) return;
    try {
    setError("");
    const { shareTarget: _shareTarget, ...boardDraft } = draft;
    const ownerId = currentUser?._id;
    const board = await api.createBoard({
      ...boardDraft,
      ownerId,
      memberIds: [
        ...new Set([ownerId, ...draft.sharedUserIds].filter(Boolean)),
      ],
      steps: [
        { name: "Entrada", color: "#64748b", order: 0, customFields: [] },
        { name: "Em andamento", color: "#2563eb", order: 1, customFields: [] },
        { name: "Concluído", color: "#16a34a", order: 2, customFields: [] },
      ],
      cards: [],
    });
    setCreating(false);
    navigate("board", board._id);
    } catch (error) { setError(error.message); }
  };
  return (
    <>
      <PageHead
        eyebrow="ESPAÇO DE TRABALHO"
        title="Quadros"
        subtitle="Organize processos, responsáveis e demandas em um só lugar."
        action={<>{canManageBoards && (
          <Button
            onClick={() => {
              setDraft(emptyBoardDraft);
              setSharingOpen(false);
              setCreating(true);
            }}
          >
            <Plus size={17} /> Criar novo quadro
          </Button>
        )}
          <FilterMenu active={visibilityFilter !== "all" || sortOrder !== "default"} onReset={() => { setVisibilityFilter("all"); setSortOrder("default"); }}>
            <FilterSelect label="Visibilidade" value={visibilityFilter} onChange={setVisibilityFilter} options={[["all", "Todos"], ["public", "Públicos"], ["private", "Privados"]]} />
            <FilterSelect label="Ordenar por" value={sortOrder} onChange={setSortOrder} options={nameSortOptions} />
          </FilterMenu>
        </>}
      />
      <div className="boards-toolbar">
        <div className="list-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar quadros..."
          />
        </div>
        <span>{filtered.length} de {boards.length} quadros</span>
      </div>
      {error && (
        <ErrorToast message={error} />
      )}
      {loading ? (
        <div className="api-state">Carregando seus quadros...</div>
      ) : (
        <div className="boards-grid">
          {!filtered.length && <p className="api-state">Nenhum quadro encontrado.</p>}
          {filtered.map((board) => (
            <button
              className="board-tile"
              style={{ "--team-color": teams.find((team) => team._id === board.teamId)?.color || board.color }}
              key={board._id}
              onClick={() => navigate("board", board._id)}
            >
              <span className="board-tile-icon">
                <LayoutGrid size={22} />
              </span>
              <div>
                <span
                  className={`visibility-badge ${board.visibility || "private"}`}
                >
                  {board.visibility === "public" ? "Público" : "Privado"}
                </span>
                <h3>{board.name}</h3>
                <span className="board-team-name">{teams.find((team) => team._id === board.teamId)?.name || board.teamName}</span>
                <p>{board.description || "Sem descrição"}</p>
              </div>
              <footer>
                <span>
                  <LayoutGrid size={14} />
                  {board.steps?.length || 0} etapas
                </span>
                <span>
                  <Users size={14} />
                  {board.memberIds?.length || 0} membros
                </span>
                <ArrowRight size={17} />
              </footer>
            </button>
          ))}
        </div>
      )}
      <Modal
        open={creating}
        title="Criar novo quadro"
        subtitle="Comece com três etapas e personalize depois."
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button disabled={!draft.name.trim() || !draft.teamId} onClick={createBoard}>
              Criar quadro
            </Button>
          </>
        }
      >
        <div className="form-stack">
          {error && <ErrorToast message={error} />}
          <SelectInput name="board-team" label="Equipe" required value={draft.teamId}
            options={[{ value: "", label: "Selecione uma equipe" }, ...managedTeams.map((team) => ({ value: team._id, label: team.name }))]}
            onChange={(event) => setDraft({ ...draft, teamId: event.target.value })} />
          <TextInput
            label="Nome do quadro"
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <TextInput
            label="Descrição"
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
          <RadioGroup
            label="Visibilidade"
            name="board-visibility"
            value={draft.visibility}
            onChange={(visibility) => {
              setDraft({ ...draft, visibility });
              if (visibility === "public") setSharingOpen(false);
            }}
            options={[
              {
                value: "public",
                label: "Público",
                description: "Todos no espaço de trabalho podem acessar.",
              },
              {
                value: "private",
                label: "Privado",
                description: "Somente você e quem receber acesso.",
              },
            ]}
          />
          {draft.visibility === "private" && (
            <div className="share-control">
              <Button
                variant="secondary"
                onClick={() => setSharingOpen((current) => !current)}
              >
                <Share2 size={16} />
                {sharingOpen ? "Ocultar compartilhamento" : "Compartilhar"}
              </Button>
              {sharingOpen && (
                <div className="share-panel">
                  <RadioGroup
                    label="Compartilhar com"
                    name="share-target"
                    value={draft.shareTarget}
                    onChange={(shareTarget) =>
                      setDraft({ ...draft, shareTarget })
                    }
                    options={[
                    { value: "teams", label: "Equipes" },
                    { value: "users", label: "Usuários" },
                    ]}
                  />
                  <div className="share-list">
                    {draft.shareTarget === "teams"
                      ? teams.map((team) => (
                          <Checkbox
                            key={team._id}
                            label={team.name}
                            description={team.description}
                            checked={draft.sharedTeamIds.includes(
                              team._id,
                            )}
                            onChange={() =>
                              setDraft({
                                ...draft,
                                sharedTeamIds: toggleValue(
                                  draft.sharedTeamIds,
                                  team._id,
                                ),
                              })
                            }
                          />
                        ))
                      : users.map((user) => (
                          <Checkbox
                            key={user._id}
                            label={user.name}
                            description={user.email}
                            checked={draft.sharedUserIds.includes(user._id)}
                            onChange={() =>
                              setDraft({
                                ...draft,
                                sharedUserIds: toggleValue(
                                  draft.sharedUserIds,
                                  user._id,
                                ),
                              })
                            }
                          />
                        ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
