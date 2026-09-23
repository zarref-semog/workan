import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';

const ErrorContext = createContext(() => {});

export function ErrorToastProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const show = useCallback((message) => {
    if (!message) return;
    setMessages((current) => current.includes(String(message)) ? current : [...current, String(message)]);
  }, []);
  return <ErrorContext.Provider value={show}>
    <div onInvalidCapture={(event) => { event.preventDefault(); show(event.target.validationMessage); }}>{children}</div>
    {createPortal(<div className="error-toast-stack" aria-label="Notificações de erro">
      {messages.map((message) => <div className="error-toast" role="alert" key={message}>
        <AlertCircle size={20} aria-hidden="true" /><span>{message}</span>
        <button type="button" aria-label="Fechar mensagem de erro" onClick={() => setMessages((current) => current.filter((item) => item !== message))}><X size={18} /></button>
      </div>)}
    </div>, document.body)}
  </ErrorContext.Provider>;
}

export function ErrorToast({ message }) {
  const show = useContext(ErrorContext);
  useEffect(() => { show(message); }, [message, show]);
  return null;
}
