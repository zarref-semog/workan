import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

const ErrorContext = createContext(() => {});

function Toast({ item, onClose }) {
  const { message, type } = item;
  useEffect(() => {
    const timer = setTimeout(() => onClose(item), 10000);
    return () => clearTimeout(timer);
  }, [item, onClose]);
  return <div className={`error-toast ${type === "success" ? "success-toast" : ""}`} role={type === "success" ? "status" : "alert"}>{type === "success" ? <CheckCircle size={20} aria-hidden="true" /> : <AlertCircle size={20} aria-hidden="true" />}<span>{message}</span><button type="button" aria-label="Fechar notificação" onClick={() => onClose(item)}><X size={18} /></button></div>;
}

export function notify(message, type = "success") {
  window.dispatchEvent(new CustomEvent('workan-notification', { detail: { message, type } }));
}

export function ErrorToastProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const show = useCallback((message, type = "error") => {
    if (!message) return;
    setMessages((current) => current.some((item) => item.message === String(message) && item.type === type) ? current : [...current, { message: String(message), type }]);
  }, []);
  const close = useCallback((message) => setMessages((current) => current.filter((item) => item !== message)), []);
  useEffect(() => {
    const receive = (event) => show(event.detail.message, event.detail.type);
    window.addEventListener('workan-notification', receive);
    return () => window.removeEventListener('workan-notification', receive);
  }, [show]);
  return <ErrorContext.Provider value={show}>
    <div onInvalidCapture={(event) => { event.preventDefault(); show(event.target.validationMessage); }}>{children}</div>
    {createPortal(<div className="error-toast-stack" aria-label="Notificações">
      {messages.map((item) => <Toast key={`${item.type}-${item.message}`} item={item} onClose={close} />)}
    </div>, document.body)}
  </ErrorContext.Provider>;
}

export function ErrorToast({ message }) {
  const show = useContext(ErrorContext);
  useEffect(() => { show(message); }, [message, show]);
  return null;
}
