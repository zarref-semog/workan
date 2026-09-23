import { useState } from 'react';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { SelectInput } from '../../components/forms/SelectInput';
import { TextInput } from '../../components/forms/TextInput';
import { createClientId } from '../../utils/clientId';

export function BoardGroups({ groups, value, onChange, defaultName = 'Padrão', defaultEnabled = true, hasUngrouped = false }) {
  return <div className="board-groups"><SelectInput label="Grupo" value={value} onChange={(event) => onChange(event.target.value)} options={[
    { value: '*', label: 'Todos os grupos' }, ...(defaultEnabled || hasUngrouped ? [{ value: '', label: defaultEnabled ? defaultName : 'Não agrupados' }] : []), ...groups.map((group) => ({ value: group.key, label: group.name })),
  ]} /></div>;
}

export function BoardGroupsEditor({ groups, onChange, defaultName = 'Padrão', defaultEnabled = true, onDefaultChange }) {
  const [name, setName] = useState('');
  const [editingKey, setEditingKey] = useState(null);
  const reset = () => { setName(''); setEditingKey(null); };
  const save = () => {
    if (!name.trim()) return;
    if (editingKey === '__default__') { onDefaultChange({ name: name.trim(), enabled: true }); reset(); return; }
    onChange(editingKey ? groups.map((group) => group.key === editingKey ? { ...group, name: name.trim() } : group)
      : [...groups, { key: createClientId(), name: name.trim() }]);
    reset();
  };
  return <section className="board-steps-editor">
    <header><div><h3>Grupos do quadro</h3><p>Editar ou remover grupos não exclui seus cards.</p></div><span>{groups.length + (defaultEnabled ? 1 : 0)}</span></header>
    <BoardGroupList groups={[...(defaultEnabled ? [{ key: '__default__', name: defaultName }] : []), ...groups]} onEdit={(group) => { setEditingKey(group.key); setName(group.name); }} onRemove={(group) => {
      if (group.key === '__default__') onDefaultChange({ name: defaultName, enabled: false });
      else onChange(groups.filter((item) => item.key !== group.key));
      if (editingKey === group.key) reset();
    }} />
    <div className="new-board-step new-board-group">
      <TextInput label={editingKey ? 'Nome do grupo' : 'Nome do novo grupo'} placeholder="Ex.: Sprint 1" value={name} onChange={(event) => setName(event.target.value)} />
      {editingKey && <Button type="button" variant="secondary" onClick={reset}>Cancelar</Button>}
      <Button type="button" variant="secondary" disabled={!name.trim()} onClick={save}>{editingKey ? <Save size={15} /> : <Plus size={15} />}{editingKey ? 'Atualizar grupo' : 'Adicionar grupo'}</Button>
    </div>
  </section>;
}

function BoardGroupList({ groups, onEdit, onRemove }) {
  return <ul className="board-step-list board-group-list" aria-label="Grupos do quadro">
    {!groups.length && <li className="board-step-row"><span><small>Nenhum grupo cadastrado.</small></span></li>}
    {groups.map((group) => <li className="board-step-row" key={group.key}>
      <span><strong>{group.name}</strong></span>
      <button type="button" aria-label={`Editar ${group.name}`} title="Editar grupo" onClick={() => onEdit(group)}><Pencil size={16} /></button>
      <button type="button" aria-label={`Remover ${group.name}`} title="Remover grupo" onClick={() => onRemove(group)}><Trash2 size={16} /></button>
    </li>)}
  </ul>;
}
