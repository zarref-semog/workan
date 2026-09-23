import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UserPlus, Users } from "lucide-react";
import { Avatar } from "../../components/ui/Avatar";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/modal/Modal";
import { CustomSelect } from "../../components/forms/CustomSelect";

export function AssignPeopleModal({ open, people = [], selectedPeople, onClose, onSubmit, canRemoveLeader = false }) {
  const allPeople = useMemo(() => [...new Map([...selectedPeople, ...people].map((person) => [String(person._id), person])).values()], [people, selectedPeople]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [candidate, setCandidate] = useState("");
  useEffect(() => {
    if (open) {
      setSelectedIds(selectedPeople.map((person) => String(person._id)));
      setCandidate("");
    }
  }, [open, selectedPeople]);
  const availablePeople = useMemo(
    () => allPeople.filter((person) => !["superadmin", "admin"].includes(person.permission) && person.active !== false && !selectedIds.includes(String(person._id))),
    [selectedIds, allPeople],
  );
  const selected = allPeople.filter((person) =>
    selectedIds.includes(String(person._id)),
  ).map((person) => ({ ...person, permission: selectedPeople.find((member) => String(member._id) === String(person._id))?.permission || 'member' }));
  const addPerson = () => {
    if (!candidate) return;
    setSelectedIds((current) => [...current, candidate]);
    setCandidate("");
  };
  const removePerson = (id) =>
    setSelectedIds((current) => current.filter((item) => item !== id));

  return (
    <Modal
      open={open}
      title="Gerenciar usuários"
      subtitle="Adicione ou remova usuários desta equipe."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(selected)}>
            <UserPlus size={16} /> Atualizar equipe
          </Button>
        </>
      }
    >
      <div className="assign-people">
        <div className="assign-picker">
          <div>
            <label htmlFor="person-picker">Selecionar usuário</label>
            <CustomSelect
              id="person-picker"
              value={candidate}
              onChange={setCandidate}
              placeholder="Escolha um usuário..."
              options={availablePeople.map((person) => ({
                value: String(person._id),
                label: person.name,
              }))}
            />
          </div>
          <Button onClick={addPerson} disabled={!candidate}>
            <Plus size={16} /> Adicionar
          </Button>
        </div>
        <div className="assigned-list-head">
          <div>
            <Users size={17} />
            <strong>Usuários adicionados</strong>
          </div>
          <span>{selected.length}</span>
        </div>
        <div className="assigned-list">
          {selected.map((person) => (
            <div className="assigned-person" key={person._id}>
              <Avatar person={person} />
              <div>
                <strong>{person.name}</strong>
                <small>{person.email}</small>
              </div>
              <button
                disabled={person.permission === "teamlead" && !canRemoveLeader}
                title={person.permission === "teamlead" && !canRemoveLeader ? "A liderança deve ser alterada no cadastro de usuários." : undefined}
                aria-label={`Remover ${person.name}`}
                onClick={() => removePerson(String(person._id))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!selected.length && (
            <div className="assigned-empty">
              <Users size={23} />
              <span>Nenhum usuário adicionado.</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
