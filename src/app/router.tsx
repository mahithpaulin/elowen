import { useEffect, useState } from 'react';

export function useHashRoute(): { path: string; parts: string[] } {
  const get = () => window.location.hash.replace(/^#/, '') || '/dashboard';
  const [path, setPath] = useState(get);
  useEffect(() => {
    const on = () => setPath(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return { path, parts: path.split('/').filter(Boolean) };
}

export function navigate(to: string): void {
  if (to.startsWith('#')) to = to.slice(1);
  window.location.hash = to;
}
