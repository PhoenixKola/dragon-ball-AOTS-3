import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api, useUI, type Settings } from '../app/store';
import { DIFFICULTY_TEXT, FLAG_NOTES, heroName, iconForItem, iconForMap } from './helpers';
import { BEATS } from '../data/story';
import { FORMS } from '../data/heroes';
import { SKILLS } from '../data/skills';
import { COMBOS, ITEMS } from '../data/items';
import { BASE_ACCURACY, CRIT_CHANCE, CRIT_MULT, DEFEND_MULT, GUARD_MULT, SPARKING_ATK, SPARKING_COST, SPARKING_TURNS } from '../engine/combat/formulas';
import { GUARD_PRESETS } from '../engine/combat/guard';
import { RAGE } from '../engine/combat/rage';
import type { SlotId, SlotInfo } from '../systems/save';
import { CHAPTERS } from '../data/stages';
import { Btn, Bar, Panel, RefIcon, cx, fmtDate, fmtTime, useConfirm, useNav } from './ui';

/** Shared overlay shell: dimmed backdrop, titled panel, Back button, keyboard/pad navigation */
export function Shell({ title, onClose, children, wide, closeLabel = 'Back' }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; closeLabel?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useNav(ref, { onBack: onClose });
  return (
    <div className="overlay">
      <div className={cx('shell', wide && 'shell-wide')} ref={ref} role="dialog" aria-modal="true" aria-label={title}>
        <header className="shell-head">
          <h1>{title}</h1>
          <Btn small onClick={onClose}>{closeLabel} (X)</Btn>
        </header>
        <div className="shell-body">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ options */
function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="opt-row" role="group" aria-label={label}>
      <span className="opt-label">{label}</span>
      <div className="seg">
        {options.map((o) => (
          <Btn key={String(o.v)} small pressed={o.v === value} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>{o.label}</Btn>
        ))}
      </div>
    </div>
  );
}
function Slide({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="opt-row">
      <span className="opt-label">{label}</span>
      <input type="range" data-nav="" min={0} max={100} step={5} value={Math.round(value * 100)} onChange={(e) => onChange(parseInt(e.target.value, 10) / 100)} aria-label={label} />
      <span className="opt-val">{Math.round(value * 100)}%</span>
    </label>
  );
}
function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div className="opt-row">
      <span className="opt-label">{label}{hint && <small className="hint"> {hint}</small>}</span>
      <Btn small pressed={value} className={value ? 'on' : ''} onClick={() => onChange(!value)}>{value ? 'On' : 'Off'}</Btn>
    </div>
  );
}

export function OptionsPanel({ inGame }: { inGame?: boolean }) {
  const ui = useUI();
  const s = ui.settings;
  const set = (p: Partial<Settings>) => api.updateSettings(p);
  return (
    <div className="options">
      <Slide label="Master volume" value={s.master} onChange={(v) => set({ master: v })} />
      <Slide label="Music" value={s.music} onChange={(v) => set({ music: v })} />
      <Slide label="Sound effects" value={s.sfx} onChange={(v) => set({ sfx: v })} />
      <Toggle label="Mute all" value={s.muted} onChange={(v) => set({ muted: v })} />
      <Seg label="Text speed" value={s.textSpeed} options={[{ v: 'slow', label: 'Slow' }, { v: 'normal', label: 'Normal' }, { v: 'fast', label: 'Fast' }, { v: 'instant', label: 'Instant' }]} onChange={(v) => set({ textSpeed: v })} />
      <Seg label="Battle speed" value={s.battleSpeed} options={[{ v: 1, label: '1x' }, { v: 1.5, label: '1.5x' }, { v: 2, label: '2x' }]} onChange={(v) => set({ battleSpeed: v })} />
      <Seg label="Active Guard window" value={s.guardMode} options={[{ v: 'standard', label: 'Standard' }, { v: 'relaxed', label: 'Relaxed' }, { v: 'assist', label: 'Assist' }]} onChange={(v) => set({ guardMode: v })} />
      <Toggle label="Reduced motion" hint="(less shake, flashes and bobbing)" value={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
      <Slide label="Screen shake" value={s.screenShake} onChange={(v) => set({ screenShake: v })} />
      <Toggle label="Tutorial pop-ups" value={s.showTutorials} onChange={(v) => set({ showTutorials: v })} />
      <div className="opt-row">
        <span className="opt-label">Fullscreen <small className="hint">(F)</small></span>
        <Btn small pressed={ui.fullscreen} className={ui.fullscreen ? 'on' : ''} onClick={() => api.toggleFullscreen()}>{ui.fullscreen ? 'Leave fullscreen' : 'Enter fullscreen'}</Btn>
      </div>
      {inGame && ui.game && (
        <>
          <Seg label="Difficulty" value={ui.game.difficulty} options={[{ v: 'easy', label: 'Easy' }, { v: 'normal', label: 'Normal' }]} onChange={(v) => api.setDifficulty(v)} />
          <p className="hint">{DIFFICULTY_TEXT[ui.game.difficulty]}</p>
        </>
      )}
      <p className="hint">Controls: move WASD / arrows / stick · interact E / Enter / Space / A · back X / Backspace / B (Esc is best-effort in fullscreen) · menu Tab / M / Start · guard 1/2/3 · fullscreen F.</p>
    </div>
  );
}

export function OptionsOverlay() {
  const ui = useUI();
  return (
    <Shell title="Options" onClose={() => api.closeOverlay()}>
      <OptionsPanel inGame={ui.screen === 'world'} />
    </Shell>
  );
}

/* ------------------------------------------------------------------ help */
export function HelpPanel() {
  const std = GUARD_PRESETS.standard;
  const rel = GUARD_PRESETS.relaxed;
  const asst = GUARD_PRESETS.assist;
  return (
    <div className="help">
      <h3>Controls</h3>
      <table className="table">
        <tbody>
          <tr><th>Move</th><td>WASD / arrow keys / left stick / D-pad (Shift to run)</td></tr>
          <tr><th>Interact / confirm</th><td>E, Enter, Space, Z · gamepad A · click</td></tr>
          <tr><th>Back / cancel</th><td>X, Backspace, gamepad B, the on-screen Back button (Esc works, but browsers reserve it in fullscreen)</td></tr>
          <tr><th>Menu</th><td>Tab, M · gamepad Start</td></tr>
          <tr><th>Active Guard</th><td>Keys 1 / 2 / 3 for the targeted fighter's slot · gamepad X / Y / RB · or click the Guard buttons</td></tr>
          <tr><th>Pause battle / fullscreen / skip text</th><td>P · F · K</td></tr>
        </tbody>
      </table>
      <h3>Active Guard</h3>
      <p>When an enemy attack is about to land, a ring closes in on your fighter. Press that fighter's Guard key as the ring reaches the centre.</p>
      <ul>
        <li><b>Perfect</b> (within ±{std.perfectMs} ms): damage x{GUARD_MULT.perfect}, big Rage gain (+{RAGE.GUARD_PERFECT}). Relaxed ±{rel.perfectMs} ms, Assist ±{asst.perfectMs} ms.</li>
        <li><b>Good</b> (within ±{std.goodMs} ms): damage x{GUARD_MULT.good}, +{RAGE.GUARD_GOOD} Rage. Relaxed ±{rel.goodMs} ms, Assist ±{asst.goodMs} ms.</li>
        <li><b>Missed</b>: full damage. Defend halves damage too (x{DEFEND_MULT}); the two stack.</li>
        <li>Pressing too often is ignored for a moment, so mashing does not help.</li>
      </ul>
      <h3>Rage</h3>
      <p>Each fighter has a 0-100 Rage meter. It fills from dealing damage, taking damage (more when low on HP), critical hits and especially guarding. At 100 you can unleash that hero's Rage Art. Defending repeatedly only grants Rage the first time (+{RAGE.DEFEND_GAIN}). A single action never adds more than {RAGE.PER_ACTION_CAP} Rage.</p>
      <h3>Sparking</h3>
      <p>Costs {SPARKING_COST} Rage and lasts {SPARKING_TURNS} of that fighter's turns: ATK x{SPARKING_ATK}, Ki costs halved, damage taken x0.9. It cannot be stacked while active.</p>
      <h3>Forms</h3>
      <p>Transformations are unlocked by story events, are separate for each hero, take your turn to enter, and drain Ki every turn. When Ki runs out the form ends.</p>
      <table className="table">
        <tbody>
          {(['ssj', 'ascended', 'ultra'] as const).map((f) => (
            <tr key={f}><th>{FORMS[f].name}</th><td>{FORMS[f].note}</td></tr>
          ))}
        </tbody>
      </table>
      <h3>Combat basics</h3>
      <p>Accuracy starts at {Math.round(BASE_ACCURACY * 100)}%, critical hits happen {Math.round(CRIT_CHANCE * 100)}% of the time for x{CRIT_MULT} damage. Ki recovers a little each turn, from Attack (+3) and from Defend (+8). Physical attacks beat Android 19/20's energy absorption; area and unmissable techniques beat Super Perfect Cell's afterimages.</p>
      <h3>Combos</h3>
      <p>Two-fighter team moves ({COMBOS.length} of them) need both partners alive, unstunned, with enough Ki, and the partner must not have acted yet this round — start them from the faster fighter.</p>
      <p className="hint">{Object.keys(SKILLS).length} techniques in total; check the Abilities tab for details.</p>
    </div>
  );
}

export function HelpOverlay() {
  return (
    <Shell title="Help" onClose={() => api.closeOverlay()}>
      <HelpPanel />
    </Shell>
  );
}

/* ------------------------------------------------------------------ save / load */
const slotLabel = (s: SlotId) => (s === 'auto' ? 'Autosave' : `Slot ${s + 1}`);

export function SaveLoadPanel({ canSave }: { canSave: boolean }) {
  const ui = useUI();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmNode, ask] = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const importTarget = useRef<SlotId>(0);
  useEffect(() => {
    api.refreshSlots();
  }, []);

  const doSave = async (i: SlotInfo) => {
    if (i.status !== 'empty' && !(await ask('Overwrite save?', `${slotLabel(i.slot)} already has a save. Replace it with your current progress?`, 'Overwrite'))) return;
    const r = api.saveSlot(i.slot);
    setMsg(r.ok ? `Saved to ${slotLabel(i.slot)}.` : `Could not save: ${r.error ?? 'unknown error'}`);
    api.refreshSlots();
  };
  const doLoad = async (i: SlotInfo) => {
    if (canSave && !(await ask('Load this save?', 'Unsaved progress will be lost.', 'Load'))) return;
    if (!api.loadSlot(i.slot)) setMsg(`Could not load ${slotLabel(i.slot)}.`);
  };
  const doDelete = async (i: SlotInfo) => {
    if (!(await ask('Delete save?', `Permanently delete ${slotLabel(i.slot)} and its backup?`, 'Delete'))) return;
    api.deleteSlot(i.slot);
    setMsg(`${slotLabel(i.slot)} deleted.`);
    api.refreshSlots();
  };
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const slot = importTarget.current;
    const info = ui.slots.find((s) => s.slot === slot);
    const text = await file.text();
    if (info && info.status !== 'empty' && !(await ask('Import over this slot?', `${slotLabel(slot)} contains a save. Importing will replace it (the file is validated first).`, 'Import'))) return;
    const r = api.importFile(slot, text);
    setMsg(r.ok ? `Imported into ${slotLabel(slot)}.` : `Import rejected: ${r.error ?? 'invalid file'}`);
    api.refreshSlots();
  };

  return (
    <div className="slots">
      {confirmNode}
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
      {msg && <p className="notice" role="status">{msg}</p>}
      {ui.slots.map((i) => (
        <div className={cx('slot', `slot-${i.status}`)} key={String(i.slot)}>
          <div className="slot-info">
            <h3>{slotLabel(i.slot)}</h3>
            {i.status === 'empty' && <p className="hint">Empty</p>}
            {(i.status === 'ok' || i.status === 'recovered') && (
              <p>
                {CHAPTERS[i.chapter ?? 0]?.split('—')[0].trim()} · Lv {i.level} {i.leader ? heroName(i.leader) : ''} · {i.map?.replace(/_/g, ' ')}<br />
                <small>{fmtTime(i.playMs ?? 0)} played · {fmtDate(i.savedAt)}</small>
              </p>
            )}
            {i.status === 'recovered' && <p className="warn">The main file was damaged; this is the automatic backup copy.</p>}
            {i.status === 'corrupt' && <p className="warn">This save is damaged and no backup could be read ({i.error}). Other slots are unaffected.</p>}
          </div>
          <div className="slot-actions">
            {canSave && i.slot !== 'auto' && <Btn small primary onClick={() => void doSave(i)}>Save</Btn>}
            <Btn small disabled={i.status !== 'ok' && i.status !== 'recovered'} reason="Nothing to load" onClick={() => void doLoad(i)}>Load</Btn>
            <Btn small disabled={i.status !== 'ok' && i.status !== 'recovered'} reason="Nothing to export" onClick={() => api.exportSlot(i.slot)}>Export</Btn>
            <Btn small onClick={() => { importTarget.current = i.slot; fileRef.current?.click(); }}>Import…</Btn>
            <Btn small disabled={i.status === 'empty'} reason="Nothing to delete" onClick={() => void doDelete(i)}>Delete</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SaveOverlay() {
  const ui = useUI();
  const canSave = ui.screen === 'world';
  return (
    <Shell title={canSave ? 'Save / Load' : 'Load Game'} onClose={() => api.closeOverlay()}>
      <SaveLoadPanel canSave={canSave} />
    </Shell>
  );
}

/* ------------------------------------------------------------------ travel / new game */
export function TravelOverlay() {
  const t = useUI().travel;
  if (!t) return null;
  return (
    <Shell title="Capsule Flyer — Destinations" onClose={() => api.chooseTravel(null)} closeLabel="Cancel">
      <div className="list">
        {t.options.map((o, i) => (
          <Btn key={o.map} className="list-btn" onClick={() => api.chooseTravel(i)} autofocus={i === 0}>
            <RefIcon r={iconForMap()} alt={o.label} size="sm" />
            <span className="grow"><b>{o.label}</b><small>{o.hint}</small></span>
          </Btn>
        ))}
      </div>
    </Shell>
  );
}

export function NewGameOverlay() {
  return (
    <Shell title="New Game — Difficulty" onClose={() => api.closeOverlay()}>
      <div className="list">
        <Btn className="list-btn" autofocus onClick={() => api.newGame('normal')}>
          <b>Normal</b>
          <small>{DIFFICULTY_TEXT.normal}</small>
        </Btn>
        <Btn className="list-btn" onClick={() => api.newGame('easy')}>
          <b>Easy</b>
          <small>{DIFFICULTY_TEXT.easy}</small>
        </Btn>
      </div>
      <p className="hint">You can change the difficulty later in Options. Progress is stored only in this browser, under the AOTS3 namespace.</p>
    </Shell>
  );
}

/* ------------------------------------------------------------------ rewards / defeat / credits */
export function RewardsOverlay() {
  const ui = useUI();
  const r = ui.rewards;
  const ref = useRef<HTMLDivElement>(null);
  useNav(ref, { onBack: () => api.dismissRewards() });
  if (!r) return null;
  const s = r.summary;
  const next = ui.game ? BEATS[ui.game.beat] : null;
  const title = s.outcome === 'victory' ? (r.kind === 'story' && s.note && /surviv|repel|time/i.test(s.note) ? s.note : 'Victory!') : 'Escaped';
  return (
    <div className="overlay">
      <div className="shell rewards" ref={ref} role="dialog" aria-modal="true" aria-label="Battle results">
        <header className="shell-head"><h1>{title}</h1></header>
        <div className="shell-body">
          <p className="hint">{r.stageName}{s.note ? ` — ${s.note}` : ''}</p>
          <div className="reward-grid">
            <Panel title="Experience">
              {Object.keys(s.xp).length === 0 && <p className="hint">No experience awarded.</p>}
              {Object.entries(s.xp).map(([h, xp]) => (
                <div className="reward-row" key={h}><span>{r.names[h] ?? heroName(h)}</span><b>+{xp} XP</b></div>
              ))}
              {s.levelUps.map((lu) => (
                <div className="levelup" key={lu.hero}>
                  <b>{r.names[lu.hero] ?? heroName(lu.hero)}</b> reached level {lu.to}!
                  {lu.newSkills.map((id) => (
                    <div key={id} className="newskill">New technique: {SKILLS[id]?.name ?? id}</div>
                  ))}
                </div>
              ))}
            </Panel>
            <Panel title="Spoils">
              <div className="reward-row"><span>Zeni</span><b>+{s.zeni}</b></div>
              {s.items.map((it, i) => (
                <div className="reward-row" key={i}><span className="row"><RefIcon r={iconForItem(it.id)} alt={ITEMS[it.id]?.name ?? it.id} size="sm" /> {ITEMS[it.id]?.name ?? it.id}</span><b>x{it.n}</b></div>
              ))}
              {s.items.length === 0 && s.zeni === 0 && <p className="hint">No loot from this fight.</p>}
              {s.flags.filter((f) => FLAG_NOTES[f]).map((f) => (
                <div className="newskill" key={f}>{FLAG_NOTES[f]}</div>
              ))}
            </Panel>
          </div>
          {r.kind === 'story' && next && <p className="objective">Next: {next.objective}</p>}
          <div className="row end"><Btn primary autofocus onClick={() => api.dismissRewards()}>Continue</Btn></div>
        </div>
      </div>
    </div>
  );
}

export function DefeatOverlay() {
  const d = useUI().defeat;
  const ref = useRef<HTMLDivElement>(null);
  useNav(ref, {});
  if (!d) return null;
  return (
    <div className="overlay overlay-dark">
      <div className="shell defeat" ref={ref} role="alertdialog" aria-modal="true" aria-label="Defeated">
        <header className="shell-head"><h1>Defeated</h1></header>
        <div className="shell-body">
          <p>{d.stageName}: the party has fallen. Nothing was lost — retry the battle with your previous inventory, or load a save.</p>
          <div className="row end">
            <Btn primary autofocus onClick={() => api.defeatChoice('retry')}>Retry battle</Btn>
            <Btn disabled={!d.canLoad} reason="No save available" onClick={() => api.defeatChoice('load')}>Load latest save</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

const CREDITS: [string, string[]][] = [
  ['Attack of the Saiyans III — The Cell Saga', ['A private, offline, fan-made tactical JRPG.', 'No monetisation. No claim of official endorsement.']],
  ['Design & Engineering', ['React 19 · TypeScript · Phaser 3 · Vite', 'Deterministic combat core, Active Guard, story runtime, save system']],
  ['Art', ['Candidate sprite, world, VFX and UI art from the AOTS3 curated bundle.', 'Nothing is approved final art: derived forms, procedural NPCs and minions are labelled provisional in the art reports.']],
  ['Audio', ['Music and effects are synthesised in your browser — nothing is streamed.']],
  ['Inspired by', ['Dragon Ball Z and the Nintendo DS Attack of the Saiyans games.']],
  ['Thank you for playing', ['Earth is safe — for now.']],
];

export function CreditsOverlay() {
  const ui = useUI();
  const ref = useRef<HTMLDivElement>(null);
  useNav(ref, { onBack: () => api.closeOverlay() });
  return (
    <div className="overlay overlay-dark">
      <div className="credits" ref={ref}>
        <div className={cx('credits-scroll', ui.settings.reducedMotion && 'static')} tabIndex={0}>
          {CREDITS.map(([h, lines]) => (
            <section key={h}>
              <h2>{h}</h2>
              {lines.map((l) => <p key={l}>{l}</p>)}
            </section>
          ))}
        </div>
        <div className="row end"><Btn primary autofocus onClick={() => api.closeOverlay()}>Close</Btn></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ title */
const TITLE_ART = './assets/title/cell_saga_title_screen.png';

/** discreet sound chip: audio is gesture-gated by browsers, so it says so and lets the player unlock it explicitly */
function SoundChip() {
  const ui = useUI();
  const [st, setSt] = useState<string>('locked');
  useEffect(() => {
    const read = () => setSt(((window as unknown as { __AOTS__?: { audio?: () => { status: string } } }).__AOTS__?.audio?.() ?? { status: 'locked' }).status);
    read();
    const t = setInterval(read, 400);
    return () => clearInterval(t);
  }, []);
  if (ui.settings.muted) return <button type="button" className="sound-chip" onClick={() => api.updateSettings({ muted: false })}>♪ Sound is muted — click to unmute</button>;
  if (st === 'running' || st === 'unsupported') return null;
  return <button type="button" className="sound-chip" onClick={() => api.ui('confirm')}>♪ Click anywhere to enable sound</button>;
}

export function TitleScreen() {
  const ui = useUI();
  const ref = useRef<HTMLDivElement>(null);
  const [confirmNode, ask] = useConfirm();
  const [artReady, setArtReady] = useState(false);
  useNav(ref, { active: !ui.overlay && ui.assetsReady && artReady });
  useEffect(() => {
    const img = new Image();
    img.onload = () => setArtReady(true);
    img.onerror = () => setArtReady(true);
    img.src = TITLE_ART;
  }, []);
  const ready = ui.assetsReady && artReady;
  useEffect(() => {
    if (!ready || ui.overlay) return;
    const first = ref.current?.querySelector<HTMLElement>('[data-nav]');
    if (first && !ref.current?.contains(document.activeElement)) first.focus();
  }, [ready, ui.overlay]);
  const startNew = async () => {
    if (ui.hasSave && !(await ask('Start a new game?', 'Your existing saves are not deleted, but the Autosave slot will be overwritten as you progress.', 'New Game'))) return;
    api.openOverlay('newgame');
  };
  const items: { label: string; run: () => void }[] = [
    ...(ui.hasSave ? [{ label: 'Continue', run: () => api.continueGame() }] : []),
    { label: 'New Game', run: () => void startNew() },
    { label: 'Load Game', run: () => api.openOverlay('save') },
    { label: 'Options', run: () => api.openOverlay('options') },
    { label: 'Help', run: () => api.openOverlay('help') },
    { label: 'Credits', run: () => api.openOverlay('credits') },
  ];
  return (
    <div className="title" ref={ref} aria-label="Attack of the Saiyans III: The Cell Saga">
      {confirmNode}
      <h1 className="sr-only">Attack of the Saiyans III — The Cell Saga</h1>
      <img className={cx('title-img', artReady && 'is-in')} src={TITLE_ART} alt="" aria-hidden="true" draggable={false} />
      {!ready ? (
        <div className="title-loading" role="status" aria-live="polite">
          <span>LOADING</span>
          <div className="loadbar"><div className="loadbar-fill" /></div>
        </div>
      ) : (
        <nav className="title-list" aria-label="Main menu">
          {items.map((it) => (
            <button key={it.label} type="button" data-nav className="title-item" onClick={it.run} onMouseEnter={(e) => e.currentTarget.focus({ preventScroll: true })}>
              <span className="title-cursor" aria-hidden="true">▶</span>
              {it.label}
            </button>
          ))}
        </nav>
      )}
      {ready && <SoundChip />}
      <p className="title-foot">Private fan-made project · offline · no affiliation or endorsement</p>
    </div>
  );
}

export { Bar };
