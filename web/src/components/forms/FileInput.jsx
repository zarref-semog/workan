import { ErrorToast } from "../ui/ErrorToast";
import { useId, useRef, useState } from "react";
import { Download, Paperclip, Trash2, Upload } from "lucide-react";
import { FormField } from "./FormField";
import { api } from "../../services/api";

export function FileDownload({ value }) {
  const [error, setError] = useState("");
  return <><a className="file-download" href="#download" onClick={async (event) => {
    event.preventDefault();
    try { setError(""); await api.downloadFile(value); } catch (e) { setError(e.message); }
  }}><Download size={16} />{value.name}</a>{error && <ErrorToast message={error} />}</>;
}

export function FileInput({ label, value, required, onChange, onBusy }) {
  const id = useId();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("O arquivo deve ter no máximo 5 MB."); return; }
    setBusy(true); onBusy?.(1); setError("");
    try { onChange(await api.uploadFile(file)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); onBusy?.(-1); if (input.current) input.current.value = ""; }
  };
  return <FormField id={id} label={label} required={required} error={error} hint="Máximo de 5 MB por arquivo.">
    <div className="file-field">
      <input ref={input} id={id} type="file" className="file-native" disabled={busy} onChange={(event) => upload(event.target.files[0])} />
      {value?.fileId && <div className="file-selected"><Paperclip size={17} /><FileDownload value={value} />
        <button type="button" className="action-button" disabled={busy} aria-label={`Remover ${value.name}`} onClick={() => onChange(null)}><Trash2 size={16} /></button></div>}
      <button type="button" className="file-upload" disabled={busy} onClick={() => input.current?.click()}><Upload size={18} />{busy ? "Enviando arquivo..." : value?.fileId ? "Substituir arquivo" : "Selecionar arquivo"}</button>
    </div>
  </FormField>;
}
