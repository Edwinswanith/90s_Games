import { useSyncExternalStore } from 'react';
export interface Preferences {
  language: 'en' | 'ta';
  master: number;
  music: number;
  effects: number;
  quality: 'low' | 'medium' | 'high';
  reducedMotion: boolean;
  shake: boolean;
  outfit: number;
  skin: number;
}
const defaults: Preferences = {
  language: 'en',
  master: 0.65,
  music: 0.15,
  effects: 0.7,
  quality: 'medium',
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  shake: false,
  outfit: 0,
  skin: 0,
};
function read(): Preferences {
  try {
    const v = JSON.parse(localStorage.getItem('theru.settings') || '{}');
    return {
      ...defaults,
      language: v.language === 'ta' ? 'ta' : 'en',
      quality: ['low', 'medium', 'high'].includes(v.quality) ? v.quality : defaults.quality,
      ...Object.fromEntries(
        ['master', 'music', 'effects']
          .filter((k) => Number.isFinite(v[k]))
          .map((k) => [k, Math.max(0, Math.min(1, v[k]))]),
      ),
      ...Object.fromEntries(
        ['reducedMotion', 'shake'].filter((k) => typeof v[k] === 'boolean').map((k) => [k, v[k]]),
      ),
    };
  } catch {
    return defaults;
  }
}
export let preferences = read();
const listeners = new Set<() => void>();
export function savePreferences(patch: Partial<Preferences>) {
  preferences = { ...preferences, ...patch };
  localStorage.setItem('theru.settings', JSON.stringify(preferences));
  document.documentElement.lang = preferences.language;
  document.documentElement.dataset.motion = preferences.reducedMotion ? 'reduced' : 'full';
  for (const fn of listeners) fn();
}
export function usePreferences() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => preferences,
  );
}
