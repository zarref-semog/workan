import { useCallback, useEffect, useRef, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef();
  const showToast = useCallback((nextMessage) => {
    clearTimeout(timeoutRef.current);
    setMessage(nextMessage);
    timeoutRef.current = setTimeout(() => setMessage(''), 2400);
  }, []);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  return { message, showToast };
}
