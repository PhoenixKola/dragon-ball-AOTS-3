export type Action =
  | 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'menu' | 'guard1' | 'guard2' | 'guard3' | 'pause' | 'fullscreen' | 'skip' | 'tabPrev' | 'tabNext';

export type Handler = (a: Action) => boolean | void;

const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyE: 'confirm', Enter: 'confirm', Space: 'confirm', KeyZ: 'confirm',
  KeyX: 'back', Backspace: 'back', Escape: 'back',
  Tab: 'menu', KeyM: 'menu', KeyP: 'pause', KeyF: 'fullscreen', KeyK: 'skip',
  Digit1: 'guard1', Digit2: 'guard2', Digit3: 'guard3', Numpad1: 'guard1', Numpad2: 'guard2', Numpad3: 'guard3',
  KeyQ: 'tabPrev', PageUp: 'tabPrev', PageDown: 'tabNext',
};
const NAV: Action[] = ['up', 'down', 'left', 'right'];

/**
 * One reusable input abstraction for keyboard + gamepad with edge-triggered semantics.
 * Handlers form a stack: the top-most handler sees each action first; returning true consumes it.
 * Movement for the world scene is polled with held().
 */
export class InputManager {
  private stack: { id: number; fn: Handler }[] = [];
  private nextId = 1;
  private down = new Set<string>();
  private padPrev: Record<string, boolean> = {};
  private padRepeat: Record<string, number> = {};
  private attached = false;
  /** gamepad polling is injected so tests can fake it */
  getPads: () => (Gamepad | null)[] = () => (typeof navigator !== 'undefined' && navigator.getGamepads ? Array.from(navigator.getGamepads()) : []);
  blocked = false;

  push(fn: Handler): () => void {
    const id = this.nextId++;
    this.stack.push({ id, fn });
    return () => {
      this.stack = this.stack.filter((s) => s.id !== id);
    };
  }

  /** deliver an action from any source (also used by tests/UI buttons) */
  emit(a: Action): void {
    if (this.blocked) return;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      if (this.stack[i].fn(a) === true) return;
    }
  }

  attach(target: Window = window): void {
    if (this.attached) return;
    this.attached = true;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }
  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    target.removeEventListener('blur', this.onBlur);
    this.attached = false;
  }

  private static typing(t: EventTarget | null): boolean {
    const el = t as HTMLElement | null;
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (InputManager.typing(e.target)) return;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.down.add(e.code);
      return;
    }
    const a = KEYMAP[e.code];
    if (!a) return;
    // buttons keep native activation for Space/Enter so a focused button is not double-fired
    const el = e.target as HTMLElement | null;
    const onButton = el?.tagName === 'BUTTON' || el?.getAttribute?.('role') === 'button';
    const wasDown = this.down.has(e.code);
    this.down.add(e.code);
    if (wasDown && !NAV.includes(a)) return; // no key-repeat except navigation
    if (a === 'confirm' && onButton && (e.code === 'Space' || e.code === 'Enter')) return;
    if (a === 'menu' || e.code === 'Space' || e.code.startsWith('Arrow') || a === 'back' && e.code === 'Backspace') e.preventDefault();
    this.emit(a);
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };
  private onBlur = () => {
    this.down.clear();
  };

  /** held movement vector for the world (keyboard + stick + dpad) */
  held(): { dx: number; dy: number; run: boolean } {
    if (this.blocked) return { dx: 0, dy: 0, run: false };
    let dx = 0;
    let dy = 0;
    const d = this.down;
    if (d.has('ArrowLeft') || d.has('KeyA')) dx -= 1;
    if (d.has('ArrowRight') || d.has('KeyD')) dx += 1;
    if (d.has('ArrowUp') || d.has('KeyW')) dy -= 1;
    if (d.has('ArrowDown') || d.has('KeyS')) dy += 1;
    let run = d.has('ShiftLeft') || d.has('ShiftRight');
    const pad = this.pad();
    if (pad) {
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (Math.abs(ax) > 0.3) dx += ax;
      if (Math.abs(ay) > 0.3) dy += ay;
      if (pad.buttons[14]?.pressed) dx -= 1;
      if (pad.buttons[15]?.pressed) dx += 1;
      if (pad.buttons[12]?.pressed) dy -= 1;
      if (pad.buttons[13]?.pressed) dy += 1;
      if (pad.buttons[2]?.pressed) run = true;
    }
    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));
    return { dx, dy, run };
  }

  private pad(): Gamepad | null {
    const pads = this.getPads();
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /** call once per frame: converts gamepad edges into actions */
  pollPad(nowMs: number): void {
    const pad = this.pad();
    if (!pad) {
      this.padPrev = {};
      return;
    }
    const map: [string, boolean, Action][] = [
      ['a', !!pad.buttons[0]?.pressed, 'confirm'],
      ['b', !!pad.buttons[1]?.pressed, 'back'],
      ['x', !!pad.buttons[2]?.pressed, 'guard1'],
      ['y', !!pad.buttons[3]?.pressed, 'guard2'],
      ['rb', !!pad.buttons[5]?.pressed, 'guard3'],
      ['lb', !!pad.buttons[4]?.pressed, 'tabPrev'],
      ['rt', !!pad.buttons[7]?.pressed, 'tabNext'],
      ['start', !!pad.buttons[9]?.pressed, 'menu'],
      ['select', !!pad.buttons[8]?.pressed, 'pause'],
    ];
    for (const [k, pressed, act] of map) {
      const was = this.padPrev[k] === true;
      this.padPrev[k] = pressed;
      if (pressed && !was) this.emit(act); // held A never re-fires
    }
    const nav: [string, boolean, Action][] = [
      ['up', !!pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.6, 'up'],
      ['down', !!pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.6, 'down'],
      ['left', !!pad.buttons[14]?.pressed || (pad.axes[0] ?? 0) < -0.6, 'left'],
      ['right', !!pad.buttons[15]?.pressed || (pad.axes[0] ?? 0) > 0.6, 'right'],
    ];
    for (const [k, pressed, act] of nav) {
      const was = this.padPrev[k] === true;
      this.padPrev[k] = pressed;
      if (!pressed) continue;
      if (!was) {
        this.padRepeat[k] = nowMs + 380;
        this.emit(act);
      } else if (nowMs >= (this.padRepeat[k] ?? 0)) {
        this.padRepeat[k] = nowMs + 110;
        this.emit(act);
      }
    }
  }
}

export const input = new InputManager();
