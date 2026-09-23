import { ErrorToast } from "../components/ui/ErrorToast";
import { FilterMenu, FilterSelect } from "../components/ui/FilterMenu";
import { nameSortOptions, sortByName } from "../utils/sorting";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { useResourceDialog } from "../hooks/useResourceDialog";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { PageHead } from "../components/ui/PageHead";
import { ConfirmDialog } from "../components/modal/ConfirmDialog";
import { PersonFormModal } from "../features/people/PersonFormModal";
import { DataTable } from "../components/ui/DataTable";

export function UsersPage() {
  const [people, setPeople] = useState([]);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = async () => {
    const [users, teams] = await Promise.all([api.listUsers(), api.listTeams()]);
    setPeople(users.map((user) => ({ ...user, id: user._id })));
    setTeams(teams);
  };
  useEffect(() => { load().catch((error) => setError(error.message)); }, []);
  const [teamFilter, setTeamFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("default");
  const dialog = useResourceDialog();
  const savePerson = async (person) => {
    setSaving(true); setError("");
    try {
      const { id, _id, ...data } = person;
      if (_id) await api.updateUser(_id, data); else await api.createUser(data);
      await load();
      dialog.close();
    } catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  const deletePerson = async () => {
    try {
      setError("");
      await api.deleteUser(dialog.resource.id);
      await load();
      dialog.close();
    } catch (error) { setError(error.message); dialog.close(); }
  };
  const filteredPeople = useMemo(() => sortByName(people.filter((person) =>
    (teamFilter === "Todos" || person.teamIds?.includes(teamFilter)) &&
    (roleFilter === "all" || (person.permission || "member") === roleFilter) &&
    `${person.name} ${person.email}`.toLowerCase().includes(search.toLowerCase())
  ), sortOrder), [people, teamFilter, search, roleFilter, sortOrder]);
  const columns = [
    {
      key: "person",
      header: "Nome",
      render: (person) => (
        <div className="person-cell">
          <Avatar person={person} />
          <div>
            <button type="button" className="user-name-button" onClick={() => { setError(""); dialog.openEdit(person); }} aria-label={`Editar ${person.name}`}>{person.name}</button>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "E-mail",
      render: (person) => person.email,
    },
    {
      key: "permission",
      header: "Permissão",
      render: (person) => <span>{person.permission === "superadmin" ? "Superadmin" : person.permission === "admin" ? "Administrador" : person.permission === "teamlead" ? "Líder de equipe" : "Membro"}</span>,
    },
    {
      key: "actions",
      header: "Ações",
      width: 90,
      render: (person) => (
        <div className="modal-actions-menu">
          <button type="button" className="action-button" onClick={() => { setError(""); dialog.openEdit(person); }} aria-label={`Editar ${person.name}`}>
            <Pencil size={16} />
          </button>
          <button type="button" className="action-button delete" onClick={() => { setError(""); dialog.openDelete(person); }} aria-label={`Excluir ${person.name}`}>
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];
  return (
    <>
      <PageHead
        eyebrow="ADMINISTRAÇÃO"
        title="Usuários"
        subtitle="Gerencie usuários, equipes e responsabilidades nos quadros."
        action={<>
          <Button onClick={() => { setError(""); dialog.openCreate(); }}>
            <Plus size={17} /> Adicionar usuário
          </Button>
          <FilterMenu active={teamFilter !== "Todos" || roleFilter !== "all" || sortOrder !== "default"} onReset={() => { setTeamFilter("Todos"); setRoleFilter("all"); setSortOrder("default"); }}>
            <FilterSelect label="Equipe" value={teamFilter} onChange={setTeamFilter} options={[["Todos", "Todas as equipes"], ...teams.map((team) => [team._id, team.name])]} />
            <FilterSelect label="Perfil" value={roleFilter} onChange={setRoleFilter} options={[["all", "Todos os perfis"], ["superadmin", "Superadmin"], ["admin", "Administrador"], ["teamlead", "Líder de equipe"], ["member", "Membro"]]} />
            <FilterSelect label="Ordenar por" value={sortOrder} onChange={setSortOrder} options={nameSortOptions} />
          </FilterMenu>
        </>
        }
      />
      {error && <ErrorToast message={error} />}
      <section className="panel">
        <div className="table-tools">
          <div className="list-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar usuário..."
            />
          </div>

        </div>
        <DataTable
          columns={columns}
          rows={filteredPeople}
          minWidth={600}
          emptyMessage="Nenhum usuário encontrado."
        />
      </section>
      <PersonFormModal
        key={`${dialog.mode}-${dialog.resource?.id || "new"}`}
        teams={teams}
        saving={saving}
        open={dialog.isFormOpen}
        person={dialog.mode === "edit" ? dialog.resource : null}
        onClose={() => { setError(""); dialog.close(); }}
        onSubmit={savePerson}
        onResetPassword={async (id) => {
          setSaving(true); setError("");
          try { return await api.resetUserPassword(id); }
          catch (error) { setError(error.message); }
          finally { setSaving(false); }
        }}
      />
      <ConfirmDialog
        open={dialog.mode === "delete"}
        resourceName={dialog.resource?.name}
        onCancel={dialog.close}
        onConfirm={deletePerson}
      />
    </>
  );
}
