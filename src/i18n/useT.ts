import { useApp } from '../store';
import { STRINGS } from './strings';

/** useT(): returns t(key, fallback?). Reactive to lang changes via zustand. */
export function useT(): (key: string, fallback?: string) => string {
  const lang = useApp((s) => s.lang);
  return (key, fallback) => {
    const entry = STRINGS[key];
    if (!entry) return fallback ?? key;
    return entry[lang] ?? entry.en ?? fallback ?? key;
  };
}
