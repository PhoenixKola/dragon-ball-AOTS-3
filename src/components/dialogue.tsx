import { useEffect, useRef, useState } from 'react';
import { api, useUI } from '../app/store';
import { input } from '../systems/input';
import { Btn, ConfirmDialog, SpeakerPortrait, cx, useNav } from './ui';

const CPS = { slow: 28, normal: 60, fast: 130, instant: Infinity } as const;

export function DialogueBox() {
  const ui = useUI();
  const d = ui.dialogue;
  const speed = CPS[ui.settings.textSpeed];
  const total = d?.text.length ?? 0;
  // progress is keyed by dialogue id so a new line can never render with the previous line's progress (no flash of full text)
  const [prog, setProg] = useState<{ id: number; n: number }>({ id: -1, n: 0 });
  const shown = !d ? 0 : prog.id === d.id ? prog.n : speed === Infinity ? total : 0;
  const shownRef = useRef(0);
  shownRef.current = shown;
  const lastAdvance = useRef(0);

  useEffect(() => {
    if (!d) return;
    if (speed === Infinity) {
      setProg({ id: d.id, n: total });
      return;
    }
    setProg({ id: d.id, n: 0 });
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const n = Math.min(total, Math.floor(((performance.now() - t0) / 1000) * speed));
      setProg((p) => (p.id === d.id && p.n < n ? { id: d.id, n } : p));
      if (n >= total) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [d?.id, total, speed]);

  const advanceRef = useRef<() => void>(() => {});
  advanceRef.current = () => {
    if (!d) return;
    if (shownRef.current < total) {
      setProg({ id: d.id, n: total });
      return;
    }
    const now = performance.now();
    if (now - lastAdvance.current < 160) return; // a double tap/click advances one line, not two
    lastAdvance.current = now;
    api.advanceDialogue();
  };

  const hasDialogue = !!d;
  useEffect(() => {
    if (!hasDialogue) return;
    return input.push((a) => {
      if (a === 'confirm') advanceRef.current();
      else if (a === 'skip') api.skipDialogue();
      return true;
    });
  }, [hasDialogue]);

  if (!d) return null;
  const complete = shown >= total;
  return (
    <div className="dialogue" data-dlg-id={d.id} role="dialog" aria-label={`${d.name || 'Narration'} speaking`} onClick={() => advanceRef.current()}>
      {d.name && <SpeakerPortrait who={d.who} size="lg" />}
      <div className="dialogue-body" style={{ borderColor: d.color }}>
        {d.name && (
          <div className="nameplate" style={{ background: d.color }}>{d.name}</div>
        )}
        <p className="dialogue-text" aria-live="polite">{d.text.slice(0, shown)}<span className="dialogue-rest" aria-hidden="true">{d.text.slice(shown)}</span></p>
        <div className="dialogue-foot">
          <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); api.skipDialogue(); }}>Skip (K)</button>
          <span className={cx('advance', complete && 'ready')} aria-hidden="true">{complete ? '▼ Click / E / Enter' : '…'}</span>
        </div>
      </div>
    </div>
  );
}

export function ChoiceMenu() {
  const ui = useUI();
  const c = ui.choice;
  const ref = useRef<HTMLDivElement>(null);
  useNav(ref, { focusKey: c?.id });
  if (!c) return null;
  return (
    <div className="choice-wrap">
      <div className="choice panel" ref={ref} role="dialog" aria-label={c.prompt}>
        <p className="choice-prompt">{c.prompt}</p>
        {c.choices.map((label, i) => (
          <Btn key={i} onClick={() => api.chooseOption(i)} autofocus={i === 0}>{label}</Btn>
        ))}
      </div>
    </div>
  );
}

export function CardOverlay() {
  const c = useUI().card;
  if (!c) return null;
  return (
    <div className="card-overlay" role="status" key={c.id}>
      <div className="card-inner">
        <h1>{c.text}</h1>
        {c.sub && <p>{c.sub}</p>}
      </div>
    </div>
  );
}

export function Caption() {
  const c = useUI().caption;
  if (!c) return null;
  return <div className="caption" role="status">{c}</div>;
}

export function ToastStack() {
  const t = useUI().toasts;
  return (
    <div className="toasts" aria-live="polite">
      {t.map((x) => (
        <div className="toast" key={x.id}>{x.text}</div>
      ))}
    </div>
  );
}

/** Confirmation requested by the session (snapshot.confirm). */
export function SessionConfirm() {
  const c = useUI().confirm;
  if (!c) return null;
  const answer = (yes: boolean) => api.resolveConfirm(yes);
  return <ConfirmDialog title={c.title} body={c.body} yes={c.yes} no={c.no} onYes={() => answer(true)} onNo={() => answer(false)} />;
}
