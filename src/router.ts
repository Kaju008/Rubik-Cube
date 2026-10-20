// Tiny hash router: #/learn, #/learn/cross, #/tricks/patterns, #/speed …
import { useEffect, useState } from 'react';

export interface Route { section: string; sub?: string }
export function parseHash(): Route {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  return { section: parts[0] || 'home', sub: parts[1] };
}
export function nav(path: string) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = target;
}
export function useRoute(): Route {
  const [r, setR] = useState(parseHash);
  useEffect(() => {
    const on = () => setR(parseHash());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return r;
}
