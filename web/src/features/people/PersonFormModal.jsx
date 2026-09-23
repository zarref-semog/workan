import { createClientId } from "../../utils/clientId";
import { ErrorToast } from "../../components/ui/ErrorToast";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Checkbox } from "../../components/forms/Checkbox";
import { SelectInput } from "../../components/forms/SelectInput";
import { TextInput } from "../../components/forms/TextInput";
import { Modal } from "../../components/modal/Modal";

const emptyPerson = {
  name: "",
  email: "",
  ledTeamIds: [],
  permission: "member",
  active: true,
};

export function PersonFormModal({ open, person, teams = [], error, saving, onClose, onSubmit, onResetPassword }) {
  const [form, setForm] = useState(emptyPerson);
  const [resetMessage, setResetMessage] = useState("");
  const isLeader = form.permission === 'teamlead';
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm(
        person ? { ...person, ledTeamIds: person.ledTeamIds || [], active: person.active ?? true } : emptyPerson,
      );
      setErrors({});
      setResetMessage("");
    }
  }, [open, person]);
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const errors = {
      name: form.name.trim() ? "" : "Informe o nome.",
      email: /.+@.+\..+/.test(form.email) ? "" : "Informe um e-mail válido.",
    };
    if (isLeader && !form.ledTeamIds.length) errors.teams = 'Selecione ao menos uma equipe para liderar.';
    if (Object.values(errors).some(Boolean)) return setErrors(errors);
    const initials = form.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    const { teamIds, ledTeamIds, ...data } = form;
    onSubmit({ ...data, ...(isLeader ? { ledTeamIds } : {}), id: form.id ?? createClientId(), initials });
  };
  return (
    <Modal
      open={open}
      title={person ? "Editar usuário" : "Adicionar usuário"}
      subtitle="Informe os dados e a permissão de acesso do usuário."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="person-form" disabled={saving}>
            <Save size={16} /> Salvar
          </Button>
        </>
      }
    >
      <form id="person-form" className="form-stack" onSubmit={submit}>
        {error && <ErrorToast message={error} />}
        <TextInput
          name="name"
          label="Nome completo"
          placeholder="Ex.: Maria Souza"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          error={errors.name}
          required
        />
        <TextInput
          name="email"
          type="email"
          label="E-mail"
          placeholder="maria@empresa.com"
          value={form.email ?? ""}
          onChange={(event) => update("email", event.target.value)}
          error={errors.email}
          required
        />
        <SelectInput
          name="permission"
          label="Permissão de acesso"
          value={form.permission || "member"}
          onChange={(event) => update("permission", event.target.value)}
          options={[
            { value: "member", label: "Membro — gerencia apenas cards" },
            { value: "teamlead", label: "Líder de equipe — gerencia quadros e equipes" },
            { value: "admin", label: "Administrador — usuários e permissões" },
            { value: "superadmin", label: "Superadmin — acesso completo" },
          ]}
        />
        {isLeader && <fieldset className="user-team-options">
          <legend>Equipes que liderará</legend>
          {teams.map((team) => <Checkbox key={team._id} label={team.name} checked={form.ledTeamIds.includes(team._id)} onChange={(event) => update('ledTeamIds', event.target.checked ? [...form.ledTeamIds, team._id] : form.ledTeamIds.filter((id) => id !== team._id))} />)}
          {!teams.length && <p>Nenhuma equipe cadastrada.</p>}
          {errors.teams && <ErrorToast message={errors.teams} />}
        </fieldset>}
        {person && <Checkbox
          label="Usuário ativo"
          description="Permite o acesso deste usuário à aplicação."
          checked={form.active}
          onChange={(event) => update("active", event.target.checked)}
        />}
        {person && <Button type="button" variant="secondary" disabled={saving} onClick={async () => {
          const result = await onResetPassword(person._id);
          if (result) setResetMessage(`Senha redefinida: ${result.defaultPassword}`);
        }}>Resetar senha</Button>}
        {resetMessage && <p role="status">{resetMessage}</p>}
      </form>
    </Modal>
  );
}
