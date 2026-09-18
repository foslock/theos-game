import { SETTINGS_KEY } from '../config';

export interface Settings {
  sfxVolume: number; // 0..1
  musicVolume: number; // 0..1
  /** Scanline / phosphor overlay on the Mac screen. */
  crtEffect: boolean;
}

const DEFAULTS: Settings = { sfxVolume: 0.8, musicVolume: 0.6, crtEffect: true };

let current: Settings | null = null;

export function getSettings(): Settings {
  if (current) return current;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
    current = { ...DEFAULTS, ...parsed };
  } catch {
    current = { ...DEFAULTS };
  }
  return current;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  current = { ...getSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable; keep in memory */
  }
  return current;
}
