import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { input, type Action } from '../systems/input';
import { portraitUrl } from '../engine/assets';
import { speakerOf } from '../data/speakers';
import type { GlyphKey, IconRef } from './helpers';

export const cx = (...a: (string | false | null | undefined)[]): string => a.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ keyboard / gamepad navigation */
export interface NavOptions {
  onBack?: () => void;
  onMenu?: () => void;
  onTab?: (d: -1 | 1) => void;
  active?: boolean;
  /** re-focus the first item when this key changes */
  focusKey?: string | number;
}

const navItems = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('[data-nav]')).filter((e) => !e.hasAttribute('hidden') && e.getClientRects().length > 0);

function stepRange(el: HTMLInputElement, dir: 1 | -1) {
  const step = parseFloat(el.step || '1') || 1;
  const min = parseFloat(el.min || '0');
  const max = parseFloat(el.max || '100');
  const v = Math.max(min, Math.min(max, parseFloat(el.value) + dir * step));
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, String(v));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Registers an input-stack handler that moves DOM focus between `[data-nav]` elements inside `ref`. */
export function useNav(ref: RefObject<HTMLElement | null>, o: NavOptions = {}): void {
  const opt = useRef(o);
  opt.current = o;
  useEffect(() => {
    const pop = input.push((a: Action) => {
      const cfg = opt.current;
      if (cfg.active === false) return false;
      const root = ref.current;
      if (!root) return false;
      const act = document.activeElement as HTMLElement | null;
      const move = (d: number) => {
        const items = navItems(root);
        if (!items.length) return;
        const i = act ? items.indexOf(act) : -1;
        const next = items[i < 0 ? (d > 0 ? 0 : items.length - 1) : (i + d + items.length) % items.length];
        next.focus();
        next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      };
      switch (a) {
        case 'up': move(-1); return true;
        case 'down': move(1); return true;
        case 'left':
        case 'right':
          if (act instanceof HTMLInputElement && act.type === 'range') stepRange(act, a === 'left' ? -1 : 1);
          else move(a === 'left' ? -1 : 1);
          return true;
        case 'confirm':
          if (act && root.contains(act) && act.hasAttribute('data-nav')) act.click();
          else navItems(root)[0]?.click();
          return true;
        case 'back':
          cfg.onBack?.();
          return true;
        case 'menu':
          if (cfg.onMenu) {
            cfg.onMenu();
            return true;
          }
          return true;
        case 'tabPrev': cfg.onTab?.(-1); return true;
        case 'tabNext': cfg.onTab?.(1); return true;
        default: return false;
      }
    });
    return pop;
  }, [ref]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const t = window.setTimeout(() => {
      const items = navItems(root);
      const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? items[0];
      first?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [ref, o.focusKey]);
}

/* ------------------------------------------------------------------ small widgets */
export function Bar({ value, max, kind, label }: { value: number; max: number; kind: 'hp' | 'ki' | 'rage' | 'xp' | 'boss'; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cx('bar', `bar-${kind}`)} role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} aria-label={label ?? kind}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
      <span className="bar-text">{label ?? `${Math.round(value)}/${Math.round(max)}`}</span>
    </div>
  );
}

export function Portrait({ actor, name, color, size = 'md' }: { actor: string; name: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const url = portraitUrl(actor);
  const [bad, setBad] = useState(false);
  const col = color ?? '#6b7bb5';
  return (
    <div className={cx('portrait', `portrait-${size}`)} style={{ borderColor: col }} aria-hidden={!url}>
      {url && !bad ? (
        <img src={url} alt={name} draggable={false} onError={() => setBad(true)} />
      ) : (
        <span className="portrait-fallback" style={{ background: col }} title="Provisional portrait">{(name || '?').trim()[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

export function SpeakerPortrait({ who, size }: { who: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = speakerOf(who);
  return <Portrait actor={s.actor} name={s.name} color={s.color} size={size} />;
}

const GLYPH_PATHS: Record<GlyphKey, ReactNode> = {
  attack: <path d="M5 19L19 5M14 5h5v5M7 14l3 3M4 20l3-3" />,
  skills: <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />,
  defend: <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" />,
  items: <path d="M6 8h12l1 12H5zM9 8V6a3 3 0 016 0v2" />,
  combo: (<><circle cx="9" cy="12" r="4" /><circle cx="15" cy="12" r="4" /></>),
  rage: <path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" />,
  sparking: <path d="M13 2L5 14h6l-1 8 8-12h-6z" />,
  form: <path d="M6 11l6-6 6 6M6 19l6-6 6 6" />,
  flee: <path d="M3 12h14M12 6l6 6-6 6" />,
  finisher: <path d="M12 2l3 7 7 .6-5.4 4.7 1.7 7.2L12 17.8 5.7 21.5l1.7-7.2L2 9.6 9 9z" />,
  potion: <path d="M9 3h6M10 3v5l-5 9a3 3 0 003 4h8a3 3 0 003-4l-5-9V3" />,
  charm: <path d="M12 3l8 9-8 9-8-9z" />,
  key: (<><circle cx="8" cy="9" r="4" /><path d="M11 12l9 8M17 18l2-2M14 15l2-2" /></>),
  melee: <path d="M7 9h10v8H7zM7 9V6h3v3M10 9V5h3v4M13 9V6h3v3" />,
  beam: <path d="M2 12h4l2-5 3 10 3-10 2 5h6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  debuff: <path d="M12 4v14M6 12l6 6 6-6" />,
  up: <path d="M12 20V6M6 12l6-6 6 6" />,
  pin: (<><path d="M12 21s-6-6-6-11a6 6 0 0112 0c0 5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></>),
  circle: <circle cx="12" cy="12" r="7" />,
};

/** Clean inline SVG glyph used whenever art is missing; always renders something. */
export function Glyph({ k, className }: { k: GlyphKey; className?: string }) {
  return (
    <svg className={cx('glyph', className)} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {GLYPH_PATHS[k] ?? GLYPH_PATHS.circle}
    </svg>
  );
}

/** Image icon with guaranteed glyph fallback (missing URL or failed load). */
export function RefIcon({ r, alt, size = 'md' }: { r: IconRef; alt: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const [bad, setBad] = useState<string | null>(null);
  const ok = r.url && bad !== r.url;
  return (
    <span className={cx('icon', `icon-${size}`, !ok && 'icon-fallback')} title={alt}>
      {ok ? <img src={r.url!} alt="" draggable={false} onError={() => setBad(r.url)} /> : <Glyph k={r.glyph} />}
    </span>
  );
}

/** legacy helper: image URL with glyph fallback by alt initial */
export function Icon({ src, alt, size = 'md', glyph = 'circle' }: { src: string | null; alt: string; size?: 'xs' | 'sm' | 'md' | 'lg'; glyph?: GlyphKey }) {
  return <RefIcon r={{ url: src, glyph }} alt={alt} size={size} />;
}

export function Panel({ title, children, className, right }: { title?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return (
    <section className={cx('panel', className)}>
      {title && (
        <header className="panel-head">
          <h2>{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Btn({ children, onClick, disabled, reason, primary, small, pressed, className, autofocus, title }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; reason?: string; primary?: boolean; small?: boolean; pressed?: boolean; className?: string; autofocus?: boolean; title?: string;
}) {
  return (
    <button
      type="button"
      className={cx('btn', primary && 'btn-primary', small && 'btn-small', disabled && 'is-disabled', className)}
      data-nav=""
      data-autofocus={autofocus ? '' : undefined}
      aria-disabled={disabled || undefined}
      aria-pressed={pressed}
      title={disabled && reason ? reason : title}
      onClick={() => {
        if (disabled) return;
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

/** Local confirm dialog (does not go through the session). */
export function ConfirmDialog({ title, body, yes = 'Yes', no = 'Cancel', onYes, onNo }: { title: string; body: string; yes?: string; no?: string; onYes: () => void; onNo: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useNav(ref, { onBack: onNo });
  return (
    <div className="modal-backdrop" onClick={onNo}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="row end">
          <Btn onClick={onNo} autofocus>{no}</Btn>
          <Btn primary onClick={onYes}>{yes}</Btn>
        </div>
      </div>
    </div>
  );
}

export function useConfirm(): [ReactNode, (title: string, body: string, yes?: string, no?: string) => Promise<boolean>] {
  const [req, setReq] = useState<{ title: string; body: string; yes?: string; no?: string; res: (v: boolean) => void } | null>(null);
  const ask = useCallback((title: string, body: string, yes?: string, no?: string) => new Promise<boolean>((res) => setReq({ title, body, yes, no, res })), []);
  const node = req ? (
    <ConfirmDialog
      title={req.title}
      body={req.body}
      yes={req.yes}
      no={req.no}
      onYes={() => {
        req.res(true);
        setReq(null);
      }}
      onNo={() => {
        req.res(false);
        setReq(null);
      }}
    />
  ) : null;
  return [node, ask];
}

export const fmtTime = (ms: number): string => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
};
export const fmtDate = (t?: number): string => (t ? new Date(t).toLocaleString() : '—');
