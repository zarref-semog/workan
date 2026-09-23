import { createClientId } from "../../utils/clientId";
import { ErrorToast } from "../../components/ui/ErrorToast";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ColorField } from "../../components/forms/ColorField";
import { FormRow } from "../../components/forms/FormRow";
import { TextArea } from "../../components/forms/TextArea";
import { TextInput } from "../../components/forms/TextInput";
import { Modal } from "../../components/modal/Modal";

const emptyTeam = {
  name: "",
  description: "",
  color: "#db2777",
  people: [],
};

export function TeamFormModal({ open, team, teams = [], error, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyTeam);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (open) {
      setForm(team ? { ...team } : { ...emptyTeam });
      setErrors({});
    }
  }, [open, team]);
  const update = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const colorOwner = teams.find((item) =>
    (!team || item.id !== team.id) &&
    item.color?.toLowerCase() === form.color.toLowerCase()
  );
  const colorError = colorOwner ? `Esta cor já está em uso pela equipe "${colorOwner.name}". Escolha outra cor.` : "";
  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {
      name: form.name.trim() ? "" : "Informe o nome.",
    };
    if (nextErrors.name || colorError) return setErrors(nextErrors);
    onSubmit({
      ...form,
      id: form.id ?? createClientId(),
      color: form.color.toLowerCase(),
    });
  };
  return (
    <Modal
      open={open}
      title={team ? "Editar equipe" : "Nova equipe"}
      subtitle="Defina a equipe responsável pelo trabalho."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="team-form">
            <Save size={16} /> Salvar
          </Button>
        </>
      }
    >
      <form id="team-form" className="form-stack" onSubmit={submit}>
        {error && <ErrorToast message={error} />}
        <FormRow>
          <TextInput
            name="name"
            label="Nome"
            placeholder="Ex.: Recursos Humanos"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            error={errors.name}
            required
          />
        </FormRow>
        <TextArea
          name="description"
          label="Descrição"
          placeholder="Descreva as responsabilidades da equipe"
          value={form.description}
          onChange={(event) => update("description", event.target.value)}
        />
        <ColorField label="Cor de identificação" value={form.color} onChange={(color) => update("color", color)} />
        {colorError && <ErrorToast message={colorError} />}
      </form>
    </Modal>
  );
}
