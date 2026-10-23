import { BEATS } from '../data/story';
import { STATE_VERSION, PRODUCT, newGameState, type GameState } from './gameState';
import { SaveError, validateState } from './validate';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** isolated namespace: never collides with AOTS2 (Namek) or the legacy prototype keys */
export const SAVE_PREFIX = 'aots3.cell.v1.';
export const LEGACY_PREFIX = 'aots3.cell.save.v1.';
export const SLOT_COUNT = 3;
export type SlotId = 'auto' | 0 | 1 | 2;
export const slotKey = (slot: SlotId) => `${SAVE_PREFIX}${slot === 'auto' ? 'auto' : `slot${slot}`}`;

export function checksum(text: string): string {
  let n = 2166136261;
  for (let i = 0; i < text.length; i++) n = Math.imul(n ^ text.charCodeAt(i), 16777619);
  return (n >>> 0).toString(16).padStart(8, '0');
}

export interface Envelope {
  product: typeof PRODUCT;
  version: number;
  savedAt: number;
  checksum: string;
  body: string;
}

export function pack(state: GameState, now = Date.now()): string {
  const s = { ...state, savedAt: now };
  const body = JSON.stringify(s);
  const env: Envelope = { product: PRODUCT, version: STATE_VERSION, savedAt: now, checksum: checksum(body), body };
  return JSON.stringify(env);
}

export function unpack(text: string): GameState {
  let env: unknown;
  try {
    env = JSON.parse(text);
  } catch {
    throw new SaveError('Save file is not valid JSON');
  }
  if (typeof env !== 'object' || env === null) throw new SaveError('Bad save envelope');
  const e = env as Partial<Envelope>;
  if (e.product !== PRODUCT || typeof e.body !== 'string' || typeof e.checksum !== 'string') throw new SaveError('Not an AOTS3 Cell Saga save');
  if (checksum(e.body) !== e.checksum) throw new SaveError('Checksum mismatch: the save is corrupted or was edited');
  let raw: unknown;
  try {
    raw = JSON.parse(e.body);
  } catch {
    throw new SaveError('Save body is not valid JSON');
  }
  return validateState(migrate(raw));
}

/** schema migrations for future versions of this game (v1 is current) */
export function migrate(raw: unknown): unknown {
  return raw;
}

export interface SlotInfo {
  slot: SlotId;
  status: 'empty' | 'ok' | 'corrupt' | 'recovered';
  savedAt?: number;
  chapter?: number;
  map?: string;
  playMs?: number;
  leader?: string;
  level?: number;
  error?: string;
}

export class SaveManager {
  constructor(private store: StorageLike) {}

  /** write with backup of the previous valid copy; verifies by read-back before reporting success */
  save(slot: SlotId, state: GameState, now = Date.now()): { ok: boolean; error?: string } {
    const key = slotKey(slot);
    try {
      const text = pack(state, now);
      unpack(text); // refuse to write something that would not load
      const old = this.store.getItem(key);
      if (old) {
        try {
          unpack(old);
          this.store.setItem(`${key}.bak`, old);
        } catch {
          /* keep the previous backup */
        }
      }
      this.store.setItem(key, text);
      if (this.store.getItem(key) !== text) throw new Error('Write verification failed');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  load(slot: SlotId): { state: GameState | null; info: SlotInfo } {
    const key = slotKey(slot);
    const raw = this.store.getItem(key);
    if (!raw) return { state: null, info: { slot, status: 'empty' } };
    try {
      const s = unpack(raw);
      return { state: s, info: this.info(slot, s, 'ok') };
    } catch (e) {
      const bak = this.store.getItem(`${key}.bak`);
      if (bak) {
        try {
          const s = unpack(bak);
          return { state: s, info: this.info(slot, s, 'recovered', e instanceof Error ? e.message : String(e)) };
        } catch {
          /* fall through */
        }
      }
      return { state: null, info: { slot, status: 'corrupt', error: e instanceof Error ? e.message : String(e) } };
    }
  }

  private info(slot: SlotId, s: GameState, status: SlotInfo['status'], error?: string): SlotInfo {
    const b = BEATS[s.beat];
    return { slot, status, savedAt: s.savedAt, chapter: b?.chapter ?? 8, map: s.mapId, playMs: s.stats.playMs, leader: s.party[0], level: s.party[0] ? s.roster[s.party[0]].level : 1, error };
  }

  list(): SlotInfo[] {
    return (['auto', 0, 1, 2] as SlotId[]).map((s) => this.load(s).info);
  }

  delete(slot: SlotId) {
    const key = slotKey(slot);
    this.store.removeItem(key);
    this.store.removeItem(`${key}.bak`);
  }

  /** newest valid save across all slots (Continue) */
  latest(): { slot: SlotId; state: GameState } | null {
    let best: { slot: SlotId; state: GameState } | null = null;
    for (const slot of ['auto', 0, 1, 2] as SlotId[]) {
      const r = this.load(slot);
      if (r.state && (!best || r.state.savedAt >= best.state.savedAt)) best = { slot, state: r.state };
    }
    return best;
  }

  exportText(slot: SlotId): string | null {
    const r = this.load(slot);
    return r.state ? pack(r.state, r.state.savedAt || Date.now()) : null;
  }
  exportFilename(slot: SlotId, now = new Date()): string {
    const d = now.toISOString().slice(0, 10);
    return `AOTS3-Cell-Saga_${slot === 'auto' ? 'autosave' : `slot${slot + 1}`}_${d}.json`;
  }
  /** validates fully before touching any slot; caller must already have asked for overwrite confirmation */
  importText(slot: SlotId, text: string): { ok: boolean; error?: string } {
    try {
      const s = unpack(text);
      return this.save(slot, s);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Legacy prototype saves (aots3.cell.save.v1.N) cannot be mapped onto the real world/quest state, so they are never
   * loaded as progress. This validated helper starts a NEW game that only carries over difficulty and (capped) Zeni.
   */
  migrateLegacy(slot: 0 | 1 | 2): { ok: boolean; error?: string; state?: GameState } {
    const raw = this.store.getItem(`${LEGACY_PREFIX}${slot}`);
    if (!raw) return { ok: false, error: 'No legacy save' };
    try {
      const env = JSON.parse(raw) as { product?: string; body?: string; checksum?: string };
      if (env.product !== PRODUCT || typeof env.body !== 'string') throw new Error('Not a prototype save');
      const old = JSON.parse(env.body) as { zeni?: number; difficulty?: string };
      const g = newGameState(old.difficulty === 'Easy' ? 'easy' : 'normal');
      const z = Number(old.zeni);
      if (Number.isFinite(z) && z > 0) g.zeni = Math.min(1000, Math.floor(z));
      return { ok: true, state: g };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
