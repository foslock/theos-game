import { SAVE_KEY, SAVE_VERSION } from '../config';
import { ITEMS, type ItemId } from '../data/items';
import { ROOM_IDS } from '../data/rooms';
import { newGameState, type GameState } from './GameState';

export class SaveError extends Error {}

export function serialize(state: GameState): string {
  return JSON.stringify({ ...state, savedAt: new Date().toISOString() });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Upgrades older save shapes to the current version. Add a case per version bump. */
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  const out = { ...raw };
  let v = typeof out.version === 'number' ? out.version : 0;
  if (v > SAVE_VERSION) throw new SaveError(`Save is from a newer version (${v}).`);
  // Example for the future:
  // if (v === 1) { out.someNewField = defaultValue; v = 2; }
  out.version = v === 0 ? SAVE_VERSION : v;
  return out;
}

/** Parses + validates a JSON save. Throws SaveError on anything malformed. */
export function parseSave(json: string): GameState {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new SaveError('Save file is not valid JSON.');
  }
  if (!isRecord(raw)) throw new SaveError('Save file is not an object.');
  const m = migrate(raw);

  const base = newGameState(0);
  if (typeof m.seed !== 'number') throw new SaveError('Missing seed.');
  if (typeof m.currentRoom !== 'string' || !ROOM_IDS.includes(m.currentRoom as never)) {
    throw new SaveError('Unknown current room.');
  }
  if (m.previousRoom != null && !ROOM_IDS.includes(m.previousRoom as never)) {
    throw new SaveError('Unknown previous room.');
  }
  if (!Array.isArray(m.inventory)) throw new SaveError('Inventory is not a list.');
  const inventory = m.inventory.map((e) => {
    if (!isRecord(e) || typeof e.item !== 'string' || !(e.item in ITEMS)) throw new SaveError('Bad inventory entry.');
    const count = typeof e.count === 'number' && e.count > 0 ? Math.floor(e.count) : 1;
    return { item: e.item as ItemId, count };
  });
  if (!isRecord(m.flags)) throw new SaveError('Flags are not an object.');
  const flags: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(m.flags)) flags[k] = v === true;
  const pickedUp = Array.isArray(m.pickedUp) ? m.pickedUp.filter((s): s is string => typeof s === 'string') : [];
  const puzzles = isRecord(m.puzzles) ? (m.puzzles as GameState['puzzles']) : {};

  return {
    ...base,
    version: SAVE_VERSION,
    seed: m.seed,
    currentRoom: m.currentRoom as GameState['currentRoom'],
    previousRoom: (m.previousRoom as GameState['previousRoom']) ?? null,
    lucyJoined: m.lucyJoined === true,
    inventory,
    flags,
    pickedUp,
    puzzles,
    savedAt: typeof m.savedAt === 'string' ? m.savedAt : base.savedAt,
  };
}

function storage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function autosave(state: GameState): void {
  storage()?.setItem(SAVE_KEY, serialize(state));
}

export function loadAutosave(): GameState | null {
  const json = storage()?.getItem(SAVE_KEY);
  if (!json) return null;
  try {
    return parseSave(json);
  } catch (err) {
    console.warn('Autosave was unreadable and will be ignored:', err);
    return null;
  }
}

export function hasAutosave(): boolean {
  return !!storage()?.getItem(SAVE_KEY);
}

export function clearAutosave(): void {
  storage()?.removeItem(SAVE_KEY);
}

export function exportToFile(state: GameState): void {
  const blob = new Blob([serialize(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  a.href = url;
  a.download = `theos-game-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFromFile(file: File): Promise<GameState> {
  const text = await file.text();
  return parseSave(text);
}

/** Opens the hidden file picker from index.html. Resolves null if the user cancels. */
export function pickSaveFile(): Promise<GameState | null> {
  const input = document.getElementById('file-input') as HTMLInputElement | null;
  if (!input) return Promise.reject(new SaveError('File input element is missing.'));
  return new Promise((resolve, reject) => {
    input.value = '';
    const onChange = async () => {
      input.removeEventListener('change', onChange);
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(await importFromFile(file));
      } catch (err) {
        reject(err);
      }
    };
    input.addEventListener('change', onChange);
    input.click();
  });
}
