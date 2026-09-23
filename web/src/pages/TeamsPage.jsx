import { ErrorToast } from "../components/ui/ErrorToast";
import { FilterMenu, FilterSelect } from "../components/ui/FilterMenu";
import { canManageTeam } from "../utils/teamPermissions";
import { nameSortOptions, sortByName } from "../utils/sorting";
import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  UsersRound,
} from "lucide-react";
import { api } from "../services/api";
import { useResourceDialog } from "../hooks/useResourceDialog";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { PageHead } from "../components/ui/PageHead";
import { DataTable } from "../components/ui/DataTable";
import { ConfirmDialog } from "../components/modal/ConfirmDialog";
import { TeamFormModal } from "../features/teams/TeamFormModal";
import { AssignPeopleModal } from "../features/teams/AssignPeopleModal";

export function TeamsPage({ currentUser }) {
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const normalizeTeam = (team) => ({ ...team, id: team._id });
  useEffect(() => {
    Promise.all([api.listTeams(), api.listUsers()]).then(([nextTeams, nextUsers]) => {
      setTeams(nextTeams.map(normalizeTeam)); setUsers(nextUsers);
    }).catch((error) => setError(error.message));
  }, []);
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const [peopleTeam, setPeopleTeam] = useState(null);
  const dialog = useResourceDialog();
  const filtered = useMemo(() => sortByName(teams.filter((team) =>
    (memberFilter === "all" || (memberFilter === "with" ? team.people.length > 0 : team.people.length === 0)) &&
    `${team.name} ${team.description}`.toLowerCase().includes(search.trim().toLowerCase())
  ), sortOrder), [teams, search, memberFilter, sortOrder]);

  const saveTeam = async (team) => {
    try {
      setError("");
      const { id, _id, ...data } = team;
      const saved = normalizeTeam(_id ? await api.updateTeam(_id, data) : await api.createTeam(data));
      setTeams((current) => _id ? current.map((item) => item.id === _id ? saved : item) : [...current, saved]);
      dialog.close();
    } catch (error) { setError(error.message); }
  };
  const deleteTeam = async () => {
    try {
      setError("");
      await api.deleteTeam(dialog.resource.id);
      setTeams((current) => current.filter((team) => team.id !== dialog.resource.id));
      dialog.close();
    } catch (error) { setError(error.message); dialog.close(); }
  };
  const updatePeople = async (people) => {
    try {
      setError("");
      const saved = normalizeTeam(await api.updateTeam(peopleTeam.id, { people }));
      setTeams((current) => current.map((team) => team.id === saved.id ? saved : team));
      setPeopleTeam(null);
    } catch (error) { setError(error.message); }
  };
  const columns = [
    {
      key: "team",
      header: "Equipe",
      render: (team) => (
        <div className="team-cell">
          <span
            className="team-icon"
            style={{
              color: team.color,
              background: `${team.color}12`,
            }}
          >
            <UsersRound size={19} />
          </span>
          <strong>{team.name}</strong>
        </div>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      className: "team-description",
      render: (team) => team.description || "Sem descrição",
    },
    {
      key: "people",
      header: "Pessoas",
      render: (team) => (
        <div className="team-people">
          <div className="avatar-stack">
            {team.people.slice(0, 3).map((person) => (
              <Avatar key={person.name} person={person} small />
            ))}
          </div>
          <span>
            {team.people.length}{" "}
            {team.people.length === 1 ? "pessoa" : "pessoas"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      width: 130,
      headerClassName: "actions-column",
      render: (team) => (
        <div className="team-actions">
          <button
            className="action-button"
            disabled={!canManageTeam(currentUser, team)}
            aria-label={`Editar ${team.name}`}
        title="Editar equipe"
            onClick={() => dialog.openEdit(team)}
          >
            <Pencil size={17} />
          </button>
          <button
            className="action-button"
            disabled={currentUser?.permission !== 'admin' && !canManageTeam(currentUser, team)}
        aria-label={`Gerenciar usuários de ${team.name}`}
        title="Gerenciar usuários"
            onClick={() => setPeopleTeam(team)}
          >
            <UserCog size={18} />
          </button>
          <button
            className="action-button delete"
            disabled={!canManageTeam(currentUser, team)}
            aria-label={`Excluir ${team.name}`}
        title="Excluir equipe"
            onClick={() => dialog.openDelete(team)}
          >
            <Trash2 size={17} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="ESPAÇO DE TRABALHO"
        title="Equipes"
        subtitle="Gerencie as equipes e os usuários disponíveis para seus quadros."
        action={<>
          <Button onClick={dialog.openCreate} disabled={!["superadmin", "teamlead"].includes(currentUser?.permission)}>
            <Plus size={17} /> Nova equipe
          </Button>
          <FilterMenu active={memberFilter !== "all" || sortOrder !== "default"} onReset={() => { setMemberFilter("all"); setSortOrder("default"); }}>
            <FilterSelect label="Integrantes" value={memberFilter} onChange={setMemberFilter} options={[["all", "Todas as equipes"], ["with", "Com integrantes"], ["without", "Sem integrantes"]]} />
            <FilterSelect label="Ordenar por" value={sortOrder} onChange={setSortOrder} options={nameSortOptions} />
          </FilterMenu>
        </>
        }
      />
      {error && <ErrorToast message={error} />}
      <section className="panel teams-table-panel">
        <div className="table-tools">
          <div className="list-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar equipe..."
            />
          </div>
          <span className="table-count">{filtered.length} equipes</span>
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          minWidth={850}
        emptyMessage="Nenhuma equipe encontrada."
        />
      </section>
      <TeamFormModal
        error={error}
        teams={teams}
        open={dialog.isFormOpen}
        team={dialog.mode === "edit" ? dialog.resource : null}
        onClose={dialog.close}
        onSubmit={saveTeam}
      />
      <AssignPeopleModal
        canRemoveLeader={["superadmin", "admin"].includes(currentUser?.permission)}
        people={users}
        open={Boolean(peopleTeam)}
        selectedPeople={peopleTeam?.people || []}
        onClose={() => setPeopleTeam(null)}
        onSubmit={updatePeople}
      />
      <ConfirmDialog
        open={dialog.mode === "delete"}
        resourceName={dialog.resource?.name}
        onCancel={dialog.close}
        onConfirm={deleteTeam}
      />
    </>
  );
}
