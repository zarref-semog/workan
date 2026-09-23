import { ColorField } from "../components/forms/ColorField";
import { ErrorToast } from '../components/ui/ErrorToast';
import { useEffect, useState } from "react";
import { Paintbrush, RotateCcw, Save, Upload, Trash2 } from "lucide-react";
import { api } from "../services/api";
import { applyBranding, defaultBranding } from "../hooks/useBranding";
import { Button } from "../components/ui/Button";
import { PageHead } from "../components/ui/PageHead";
import { TextInput } from "../components/forms/TextInput";

export function AppearancePage() {
  const [draft, setDraft] = useState(defaultBranding);
  const [saved, setSaved] = useState(defaultBranding);
  const [logoImage, setLogoImage] = useState(null);
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
      const next = { ...defaultBranding, ...(await api.updateAppearance({ ...draft, ...(logoImage ? { logoImage } : {}) })) };
      setDraft(next);
      setSaved(next);
      setLogoImage(null);
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
  const reset = () => { setDraft(defaultBranding); setLogoImage(null); };
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
            <div className="form-field">
              <label htmlFor="branding-logo">Logotipo</label>
              <div className="file-field">
                <input id="branding-logo" type="file" className="file-native" accept=".jpg,.jpeg,.png" disabled={saving} onChange={(event) => {
                  const file = event.target.files[0];
                  event.target.value = "";
                  if (!file) return;
                  setError('');
                  if (!/\.jpe?g$|\.png$/i.test(file.name) || file.size > 1024 * 1024) { setError('Selecione uma imagem JPG ou PNG de até 1 MB.'); return; }
                  const reader = new FileReader();
                  reader.onload = () => { setLogoImage({ name: file.name, content: String(reader.result).split(',')[1] }); update('logoUrl', String(reader.result)); };
                  reader.onerror = () => setError('Não foi possível ler a imagem.');
                  reader.readAsDataURL(file);
                }} />
                {draft.logoUrl && <div className="file-selected"><img src={draft.logoUrl} alt="Prévia do logotipo" style={{ maxWidth: 120, maxHeight: 80, objectFit: 'contain' }} /><button type="button" className="action-button" disabled={saving} aria-label="Remover logotipo" onClick={() => { update('logoUrl', ''); setLogoImage(null); }}><Trash2 size={16} /></button></div>}
                <button type="button" className="file-upload" disabled={saving} onClick={() => document.getElementById('branding-logo').click()}><Upload size={18} />{draft.logoUrl ? 'Substituir imagem' : 'Anexar imagem'}</button>
              </div>
              <small>JPG ou PNG. Máximo de 1 MB.</small>
            </div>
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
