import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function Modal({ open, title, subtitle, children, footer, onClose, size = 'medium', dismissible = true }) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => dismissible && event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.classList.remove('modal-open'); };
  }, [open, onClose, dismissible]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop" onMouseDown={(event) => dismissible && event.target === event.currentTarget && onClose()}><section className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><header className="modal-header"><div><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{dismissible && <button type="button" aria-label="Fechar" onClick={onClose}><X size={20} /></button>}</header><div className="modal-body">{children}</div>{footer && <footer className="modal-footer">{footer}</footer>}</section></div>, document.body);
}
