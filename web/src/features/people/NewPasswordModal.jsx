import { useState } from 'react';
import { Modal } from '../../components/modal/Modal';
import { TextInput } from '../../components/forms/TextInput';
import { Button } from '../../components/ui/Button';
import { ErrorToast } from '../../components/ui/ErrorToast';
import { api } from '../../services/api';

export function NewPasswordModal({ onComplete, onLogout }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    setSaving(true);
    try { onComplete(await api.changePassword({ newPassword, confirmPassword })); }
    catch (error) { setError(error.message); }
    finally { setSaving(false); }
  };
  return <Modal open dismissible={false} title="Defina sua nova senha" subtitle="Para continuar, substitua a senha temporária por uma senha pessoal."
    footer={<><Button variant="secondary" disabled={saving} onClick={onLogout}>Sair</Button><Button type="submit" form="new-password-form" disabled={saving}>{saving ? 'Salvando...' : 'Salvar nova senha'}</Button></>}>
    <ErrorToast message={error} />
    <form id="new-password-form" className="form-stack" onSubmit={submit}>
      <TextInput name="newPassword" label="Nova senha" type="password" autoComplete="new-password" autoFocus required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} hint="Use pelo menos 8 caracteres." />
      <TextInput name="confirmPassword" label="Confirmar nova senha" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
    </form>
  </Modal>;
}
