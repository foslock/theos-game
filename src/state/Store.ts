import type { GameState } from './GameState';
import { autosave } from './SaveManager';

type Listener = (state: GameState) => void;

/** Single source of truth for the running game. Every mutation goes through `update`, which autosaves. */
class Store {
  private state: GameState | null = null;
  private listeners = new Set<Listener>();

  hasState(): boolean {
    return this.state !== null;
  }

  get(): GameState {
    if (!this.state) throw new Error('No game state loaded.');
    return this.state;
  }

  set(state: GameState): void {
    this.state = state;
    autosave(state);
    this.emit();
  }

  update(mutator: (state: GameState) => void): void {
    const s = this.get();
    mutator(s);
    autosave(s);
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    if (!this.state) return;
    for (const l of this.listeners) l(this.state);
  }
}

export const store = new Store();
