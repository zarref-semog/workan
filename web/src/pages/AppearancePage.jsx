import { ColorField } from "../components/forms/ColorField";
import { ErrorToast } from '../components/ui/ErrorToast';
import { useEffect, useState } from "react";
import { Paintbrush, RotateCcw, Save } from "lucide-react";
import { api } from "../services/api";
import { applyBranding, defaultBranding } from "../hooks/useBranding";
import { Button } from "../components/ui/Button";
import { PageHead } from "../components/ui/PageHead";
import { TextInput } from "../components/forms/TextInput";

export function AppearancePage() {
  const [draft, setDraft] = useState(defaultBranding);
  const [saved, setSaved] = useState(defaultBranding);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState('');
  useEffect(() => {
    api.getAppearance().then((value) => {
      const next = { ...defaultBranding, ...value };
      setDraft(next);
      setSaved(next);
    }).catch((error) => setError(error.message));
  }, []);
  useEffect(() => {
    applyBranding(draft);
  }, [draft]);
  const update = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    setMessage("");
    setError('');
    try {
      const next = { ...defaultBranding, ...(await api.updateAppearance(draft)) };
      setDraft(next);
      setSaved(next);
      applyBranding(next);
      window.dispatchEvent(
        new CustomEvent("branding-updated", { detail: next }),
      );
      setMessage("Identidade visual atualizada.");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };
  const reset = () => setDraft(defaultBranding);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  return (
    <>
      <ErrorToast message={error} />
      <PageHead
        eyebrow="ADMINISTRAÇÃO"
        title="Aparência"
        subtitle="Personalize a identidade visual exibida para todos os usuários."
        action={
          <Button disabled={!dirty || saving} onClick={save}>
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        }
      />
      <div className="branding-layout">
        <section className="panel branding-form">
          <header>
            <Paintbrush size={19} />
            <div>
              <h3>Identidade da aplicação</h3>
              <p>Defina marca, logotipo e paleta principal.</p>
            </div>
          </header>
          <div className="form-stack">
            <TextInput
              label="Nome da aplicação"
              value={draft.appName}
              onChange={(event) => update("appName", event.target.value)}
            />
            <TextInput
              label="Slogan"
              value={draft.tagline}
              onChange={(event) => update("tagline", event.target.value)}
            />
            <TextInput
              label="URL do logotipo"
              placeholder="https://.../logo.png"
              value={draft.logoUrl}
              onChange={(event) => update("logoUrl", event.target.value)}
              hint="Use uma imagem quadrada, SVG ou PNG."
            />
            <div className="branding-colors">
              <ColorField
                label="Cor principal"
                value={draft.primaryColor}
                onChange={(value) => update("primaryColor", value)}
              />
              <ColorField
                label="Cor de destaque"
                value={draft.accentColor}
                onChange={(value) => update("accentColor", value)}
              />
              <ColorField
                label="Fundo do menu"
                value={draft.sidebarColor}
                onChange={(value) => update("sidebarColor", value)}
              />
            </div>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw size={15} /> Restaurar padrão
            </Button>
            {message && <p className="appearance-message">{message}</p>}
          </div>
        </section>

      </div>
    </>
  );
}
