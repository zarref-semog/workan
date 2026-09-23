import { useCallback, useState } from 'react';

export function useAppNavigation(initialPage = 'boards') {
  const [route, setRoute] = useState({ page: initialPage, resourceId: null });
  const navigate = useCallback((page, resourceId = null) => setRoute({ page, resourceId }), []);
  return { ...route, navigate };
}
