import { useCallback, useState } from 'react';

export function useResourceDialog() {
  const [dialog, setDialog] = useState({ mode: null, resource: null });
  const openCreate = useCallback(() => setDialog({ mode: 'create', resource: null }), []);
  const openEdit = useCallback((resource) => setDialog({ mode: 'edit', resource }), []);
  const openDelete = useCallback((resource) => setDialog({ mode: 'delete', resource }), []);
  const close = useCallback(() => setDialog({ mode: null, resource: null }), []);
  return { ...dialog, isFormOpen: dialog.mode === 'create' || dialog.mode === 'edit', openCreate, openEdit, openDelete, close };
}
