import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorToastProvider } from './components/ui/ErrorToast';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorToastProvider><App /></ErrorToastProvider>
  </React.StrictMode>
);
