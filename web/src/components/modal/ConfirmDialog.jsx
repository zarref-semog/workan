import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from './Modal';

export function ConfirmDialog({ open, resourceName, onCancel, onConfirm }) {
  return <Modal open={open} title="Excluir recurso?" subtitle="Esta ação não poderá ser desfeita." onClose={onCancel} size="small" footer={<><Button variant="secondary" onClick={onCancel}>Cancelar</Button><Button variant="danger" onClick={onConfirm}><Trash2 size={16} /> Excluir</Button></>}><div className="confirm-content"><span><AlertTriangle size={24} /></span><p>O recurso <strong>{resourceName}</strong> será removido permanentemente.</p></div></Modal>;
}
