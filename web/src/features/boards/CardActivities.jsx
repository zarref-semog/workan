import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/forms/TextInput';
import { Checkbox } from '../../components/forms/Checkbox';
import { createClientId } from '../../utils/clientId';

export function CardActivities({ activities = [], onChange, disabled }) {
  const [title, setTitle] = useState('');
  function add(event) {
    event.preventDefault();
    if (disabled || !title.trim()) return;
    onChange([...activities, { key: createClientId(), title: title.trim(), completed: false }]);
    setTitle('');
  }
  return <details className="card-section" open>
    <summary>Lista de atividades ({activities.filter((item) => item.completed).length}/{activities.length})</summary>
    <div className="form-stack">
      <table className="card-activities-table" aria-label="Lista de atividades">
        <tbody>{activities.map((item) => <tr key={item.key}>
          <td><Checkbox aria-label={`Concluir: ${item.title}`} checked={item.completed} disabled={disabled} onChange={(event) => onChange(activities.map((current) => current.key === item.key ? { ...current, completed: event.target.checked } : current))} /></td>
          <td className={item.completed ? 'activity-completed' : ''}>{item.title}</td>
        </tr>)}</tbody>
      </table>
      {!activities.length && <p>Nenhuma atividade cadastrada.</p>}
      <form className="form-stack" onSubmit={add}>
        <TextInput label="Nova atividade" value={title} disabled={disabled} onChange={(event) => setTitle(event.target.value)} />
        <Button type="submit" disabled={disabled || !title.trim()}><Plus size={16} />Adicionar atividade</Button>
      </form>
    </div>
  </details>;
}
