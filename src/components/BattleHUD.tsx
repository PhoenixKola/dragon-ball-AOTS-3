import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, uiStore, useUI, type BattleView, type Commands, type FighterView } from '../app/store';
import { GUARD_PRESETS } from '../engine/combat/guard';
import { FORMS } from '../data/heroes';
import { SKILLS } from '../data/skills';
import type { BattleAction } from '../types';
import { input } from '../systems/input';
import { STATUS_INFO, iconForCommand, iconForForm, iconForItem, iconForSkill, iconForStatus, isBadStatus, type CommandKey, type IconRef } from './helpers';
import { Bar, Btn, RefIcon, cx, useNav } from './ui';

type Pending =
  | { kind: 'attack'; label: string; element: 'phys' | 'ki' }
  | { kind: 'skill'; skillId: string; label: string; element: 'phys' | 'ki' }
  | { kind: 'rage'; label: string; element: 'phys' | 'ki' }
  | { kind: 'combo'; comboId: string; label: string; element: 'phys' | 'ki' }
  | { kind: 'item'; itemId: string; label: string; element: 'phys' };

type Level = { l: 'root' } | { l: 'skills' } | { l: 'items' } | { l: 'combos' } | { l: 'forms' } | { l: 'target'; p: Pending; of: 'enemy' | 'ally' | 'dead' };

/* ------------------------------------------------------------------ status chips (icon + short text, never colour only) */
function StatusChips({ f }: { f: FighterView }) {
  return (
    <span className="chips">
      {f.sparking > 0 && (
        <span className="chip chip-good" title={`${STATUS_INFO.sparking.label}: ${STATUS_INFO.sparking.desc} (${f.sparking} turns)`}>
          <RefIcon r={iconForStatus('sparking')} alt="Sparking" size="xs" />SPRK {f.sparking}
        </span>
      )}
      {f.charging && <span className="chip chip-warn" title="Charging a technique — it fires next turn">CHRG</span>}
      {f.statuses.map((s) => {
        const info = STATUS_INFO[s.kind];
        return (
          <span key={s.kind} className={cx('chip', isBadStatus(s.kind) ? 'chip-bad' : 'chip-good')} title={`${info.label}: ${info.desc}${s.turns < 90 ? ` (${s.turns} turn${s.turns === 1 ? '' : 's'})` : ''}`}>
            <RefIcon r={iconForStatus(s.kind)} alt={info.label} size="xs" />{info.short}
          </span>
        );
      })}
    </span>
  );
}

function AllyPanel({ f, current, slot }: { f: FighterView; current: boolean; slot: number }) {
  return (
    <div className={cx('ally-panel', current && 'is-current', !f.alive && 'is-down')} aria-label={`${f.name}${current ? ' (acting)' : ''}`}>
      <div className="ally-head">
        <b>{f.name.replace('Future ', '')}</b>
        <span className="lv">L{f.level}</span>
        {f.form !== 'base' && <span className="badge" title={FORMS[f.form].name}>{FORMS[f.form].name.replace('Super Saiyan', 'SSJ').replace('Ascended SSJ', 'Asc.')}</span>}
        <span className="slot-key" title={`Guard key ${slot}`}>[{slot}]</span>
      </div>
      <Bar kind="hp" value={f.hp} max={f.maxHp} label={`${f.hp}/${f.maxHp}`} />
      <div className="mini-bars">
        <Bar kind="ki" value={f.ki} max={f.maxKi} label={`Ki ${f.ki}`} />
        {!f.guest && <Bar kind="rage" value={f.rage} max={100} label={f.rage >= 100 ? 'RAGE!' : `${Math.floor(f.rage)}`} />}
      </div>
      <StatusChips f={f} />
    </div>
  );
}

function EnemyPlate({ f, current, hint }: { f: FighterView; current: boolean; hint: boolean }) {
  return (
    <div className={cx('enemy-plate', f.boss && 'boss', current && 'is-current', hint && 'is-target', !f.alive && 'is-down')}>
      <div className="enemy-name"><span>{f.name}</span>{f.boss && <span className="badge">BOSS</span>}</div>
      <Bar kind={f.boss ? 'boss' : 'hp'} value={f.hp} max={f.maxHp} label={`${Math.max(0, Math.round((f.hp / f.maxHp) * 100))}%`} />
      <StatusChips f={f} />
    </div>
  );
}

/* ------------------------------------------------------------------ Active Guard cue */
function GuardCue({ b }: { b: BattleView }) {
  const g = b.guard;
  const ui = useUI();
  if (!g) return null;
  const preset = GUARD_PRESETS[ui.settings.guardMode];
  const t = b.battleClock;
  const span = Math.max(1, g.closeAt - g.openAt);
  const pos = Math.max(0, Math.min(1, (t - g.openAt) / span));
  const impact = (g.impactAt - g.openAt) / span;
  const goodW = (preset.goodMs * 2) / span;
  const perfW = (preset.perfectMs * 2) / span;
  const inGood = Math.abs(t - g.impactAt) <= preset.goodMs;
  const inPerfect = Math.abs(t - g.impactAt) <= preset.perfectMs;
  const target = b.fighters.find((f) => f.uid === g.targetUid);
  const toImpact = Math.max(0, (g.impactAt - t) / Math.max(1, g.impactAt - g.openAt));
  const scale = 1 + toImpact * 1.3;
  return (
    <div className={cx('guard-cue', inGood && 'now', inPerfect && 'perfect')} role="alert" aria-live="assertive">
      <div className="guard-main">
        {!ui.settings.reducedMotion && (
          <div className="ring-wrap" aria-hidden="true">
            <div className="ring ring-target" />
            <div className="ring ring-close" style={{ transform: `scale(${scale})` }} />
          </div>
        )}
        <div className="guard-text">
          <div className="guard-title"><span aria-hidden="true">◆ </span>GUARD NOW — press {g.slot}</div>
          <div className="guard-sub">{target?.name ?? 'Target'} ← {g.label}{g.hits > 1 ? ` (${g.hitIndex + 1}/${g.hits})` : ''}</div>
          <div className="timeline" aria-hidden="true">
            <div className="tl-good" style={{ left: `${(impact - goodW / 2) * 100}%`, width: `${goodW * 100}%` }} />
            <div className="tl-perfect" style={{ left: `${(impact - perfW / 2) * 100}%`, width: `${perfW * 100}%` }} />
            <div className="tl-impact" style={{ left: `${impact * 100}%` }} />
            <div className="tl-marker" style={{ left: `${pos * 100}%` }} />
          </div>
        </div>
      </div>
      <div className="guard-buttons">
        {b.fighters.filter((f) => f.team === 'ally' && f.isHero && !f.isProtectee).map((f, i) => (
          <button key={f.uid} type="button" className={cx('btn guard-btn', f.uid === g.targetUid && 'primary-target')} aria-label={`Guard ${f.name} (key ${i + 1})`} onClick={() => api.battleGuard(i + 1)}>
            {f.name.replace('Future ', '')} [{i + 1}]
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ command panel */
function Row({ icon, label, chip, disabled, reason, sub, onClick, onHover, autofocus, primary }: {
  icon: IconRef; label: ReactNode; chip?: ReactNode; disabled?: boolean; reason?: string; sub?: string; onClick: () => void; onHover?: () => void; autofocus?: boolean; primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={cx('cmd-row', disabled && 'is-disabled', primary && 'primary')}
      data-nav=""
      data-autofocus={autofocus ? '' : undefined}
      aria-disabled={disabled || undefined}
      title={disabled && reason ? reason : undefined}
      onClick={() => !disabled && onClick()}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      <RefIcon r={icon} alt="" size="sm" />
      <span className="cmd-label">{label}{(sub || (disabled && reason)) && <small>{disabled && reason ? reason : sub}</small>}</span>
      {chip != null && <span className="cost-chip">{chip}</span>}
    </button>
  );
}

function setHint(uid: string | null) {
  const b = uiStore.get().battle;
  if (b && (b.targetHint ?? null) !== uid) uiStore.patch({ battle: { ...b, targetHint: uid } });
}

function weakNotes(f: FighterView, element: 'phys' | 'ki'): string[] {
  const out: string[] = [];
  if (f.statuses.some((s) => s.kind === 'exposed')) out.push('Weak point exposed (+40% damage)');
  if (f.statuses.some((s) => s.kind === 'shielded')) out.push('Shield closed (-50% damage)');
  if (element === 'ki' && f.statuses.some((s) => s.kind === 'absorbing')) out.push('Palms open: Ki is absorbed — use a physical attack!');
  if (f.statuses.some((s) => s.kind === 'evade')) out.push('Evasive: homing/area moves still land');
  if (f.statuses.some((s) => s.kind === 'counter')) out.push('Counter stance');
  if (f.statuses.some((s) => s.kind === 'barrier')) out.push('Barrier up');
  return out;
}

function CommandMenu({ b, c }: { b: BattleView; c: Commands }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lvl, setLvl] = useState<Level>({ l: 'root' });
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string>('');
  const [tIdx, setTIdx] = useState(0);
  useEffect(() => {
    setLvl({ l: 'root' });
    setMsg(null);
    setInfo('');
  }, [c.actorUid, b.round]);
  const active = b.phase === 'input' && !b.paused;
  const back = () => {
    setInfo('');
    setLvl((cur) => (cur.l === 'target' ? (cur.p.kind === 'skill' ? { l: 'skills' } : cur.p.kind === 'item' ? { l: 'items' } : cur.p.kind === 'combo' ? { l: 'combos' } : { l: 'root' }) : { l: 'root' }));
  };
  useNav(ref, { active: active && lvl.l !== 'target', onBack: back, focusKey: (lvl.l === 'target' ? 'target' : lvl.l) + c.actorUid });

  const fv = (uid: string) => b.fighters.find((f) => f.uid === uid);
  const targetUids = lvl.l === 'target' ? (lvl.of === 'enemy' ? c.enemyTargets : lvl.of === 'ally' ? c.allyTargets : c.deadAllyTargets) : [];
  const tuid = lvl.l === 'target' ? targetUids[Math.min(tIdx, targetUids.length - 1)] : null;

  const submit = (a: BattleAction) => {
    const r = api.battleSubmit(a);
    if (!r.ok) {
      setMsg(r.reason ?? 'That cannot be done.');
      api.ui('error');
    } else {
      setMsg(null);
      setLvl({ l: 'root' });
    }
  };
  const resolve = (p: Pending, target?: string) => {
    switch (p.kind) {
      case 'attack': return submit({ kind: 'attack', targetUid: target ?? '' });
      case 'skill': return submit({ kind: 'skill', skillId: p.skillId, targetUid: target });
      case 'rage': return submit({ kind: 'rage', targetUid: target });
      case 'combo': return submit({ kind: 'combo', comboId: p.comboId, targetUid: target });
      case 'item': return submit({ kind: 'item', itemId: p.itemId, targetUid: target ?? '' });
    }
  };
  const choose = (p: Pending, of: 'enemy' | 'ally' | 'dead' | 'none') => {
    if (of === 'none') return resolve(p);
    const list = of === 'enemy' ? c.enemyTargets : of === 'ally' ? c.allyTargets : c.deadAllyTargets;
    if (list.length === 0) {
      setMsg('There is nobody to target.');
      return;
    }
    if (of === 'enemy' && list.length === 1) return resolve(p, list[0]);
    setTIdx(0);
    setLvl({ l: 'target', p, of });
  };

  // in-world targeting: the BattleScene reads battle.targetHint and draws the marker; arrows cycle, confirm selects
  useEffect(() => {
    if (lvl.l !== 'target' || !active) {
      setHint(null);
      return;
    }
    setHint(tuid ?? null);
    const n = targetUids.length;
    const pop = input.push((a) => {
      if (a === 'left' || a === 'up') setTIdx((i) => (i - 1 + n) % n);
      else if (a === 'right' || a === 'down') setTIdx((i) => (i + 1) % n);
      else if (a === 'confirm') {
        if (tuid) resolve(lvl.p, tuid);
      } else if (a === 'back') back();
      else if (a === 'tabPrev' || a === 'tabNext' || a === 'menu') return true;
      else return false;
      return true;
    });
    return () => {
      pop();
      setHint(null);
    };
  }, [lvl.l, tuid, active, targetUids.join(",")]);

  const rootRows: { key: CommandKey; label: string; chip?: string; disabled?: boolean; reason?: string; info: string; go: () => void; primary?: boolean }[] = [
    { key: 'attack', label: 'Attack', chip: '+3 Ki', info: 'Basic physical strike. Restores 3 Ki.', go: () => choose({ kind: 'attack', label: 'Attack', element: 'phys' }, 'enemy') },
    { key: 'skills', label: 'Techniques', chip: String(c.skills.length), info: 'Your four equipped techniques.', go: () => { setInfo(''); setLvl({ l: 'skills' }); } },
    { key: 'defend', label: 'Guard', chip: '+8 Ki', info: 'Defend: take x0.55 damage until your next turn and restore 8 Ki.', go: () => submit({ kind: 'defend' }) },
    { key: 'items', label: 'Items', chip: String(c.items.reduce((n, i) => n + i.count, 0)), disabled: c.items.length === 0, reason: 'No usable items', info: 'Use a consumable on an ally.', go: () => { setInfo(''); setLvl({ l: 'items' }); } },
    { key: 'combo', label: 'Combos', chip: String(c.combos.filter((x) => x.ok).length), disabled: c.combos.length === 0, reason: 'No combos for this fighter', info: 'Team attacks with a partner.', go: () => { setInfo(''); setLvl({ l: 'combos' }); } },
    { key: 'rage', label: 'Rage Art', chip: '100', disabled: !c.rage.ok, reason: c.rage.reason, info: `${c.rage.name}: ${c.rage.desc}`, go: () => choose({ kind: 'rage', label: c.rage.name, element: 'phys' }, c.rage.target === 'enemy' ? 'enemy' : 'none') },
    { key: 'sparking', label: 'Sparking', chip: '60', disabled: !c.sparking.ok, reason: c.sparking.reason, info: '3 turns: ATK x1.25, Ki costs halved, damage taken x0.9.', go: () => submit({ kind: 'sparking' }) },
    { key: 'form', label: 'Form', disabled: c.forms.length === 0, reason: 'No forms', info: 'Transform (costs your turn, drains Ki each turn).', go: () => { setInfo(''); setLvl({ l: 'forms' }); } },
    { key: 'flee', label: 'Flee', disabled: !c.flee.ok, reason: c.flee.reason, info: 'Try to escape the battle.', go: () => submit({ kind: 'flee' }) },
  ];
  if (c.finisher.visible) rootRows.splice(5, 0, { key: 'finisher', label: 'FINISHER', disabled: !c.finisher.ok, reason: c.finisher.reason, primary: true, info: 'Father–Son Kamehameha: the decisive blow.', go: () => submit({ kind: 'finisher' }) });

  const title =
    lvl.l === 'root' ? c.actorName.replace('Future ', '') : lvl.l === 'target' ? `${lvl.p.label} → ${fv(tuid ?? '')?.name ?? '…'}` : lvl.l === 'skills' ? 'Techniques' : lvl.l === 'items' ? 'Items' : lvl.l === 'combos' ? 'Combos' : 'Form';
  const tf = tuid ? fv(tuid) : undefined;

  return (
    <div className={cx('command-menu', !active && 'inactive')} ref={ref} role="menu" aria-label="Battle commands">
      <div className="cmd-head"><span className="cmd-title">{title}</span>{lvl.l !== 'root' && <button type="button" className="link-btn cmd-back" onClick={back} aria-label="Back">◀ Back</button>}</div>
      <div className="cmd-list">
        {lvl.l === 'root' && rootRows.map((r, i) => (
          <Row key={r.key} icon={iconForCommand(r.key)} label={r.label} chip={r.chip} disabled={r.disabled} reason={r.reason} onClick={r.go} primary={r.primary} autofocus={i === 0} onHover={() => setInfo(r.disabled && r.reason ? r.reason : r.info)} />
        ))}
        {lvl.l === 'skills' && (c.skills.length === 0 ? <p className="hint pad">No techniques equipped.</p> : c.skills.map((s, i) => (
          <Row key={s.id} icon={iconForSkill(s.id)} label={s.name} sub={s.role} disabled={!s.ok} reason={s.reason} autofocus={i === 0}
            chip={`${s.ki}${s.hpCost ? `+${Math.round(s.hpCost * 100)}%` : ''}`} onHover={() => setInfo(s.ok ? `${s.desc} ${s.tradeoff}` : (s.reason ?? ''))}
            onClick={() => choose({ kind: 'skill', skillId: s.id, label: s.name, element: SKILLS[s.id]?.element ?? 'phys' }, s.target === 'none' ? 'none' : s.target === 'enemy' ? 'enemy' : 'ally')} />
        )))}
        {lvl.l === 'items' && c.items.map((it, i) => (
          <Row key={it.id} icon={iconForItem(it.id)} label={it.name} chip={`×${it.count}`} autofocus={i === 0} onHover={() => setInfo(it.desc)}
            onClick={() => choose({ kind: 'item', itemId: it.id, label: it.name, element: 'phys' }, it.revive ? 'dead' : 'ally')} />
        ))}
        {lvl.l === 'combos' && c.combos.map((cb, i) => (
          <Row key={cb.id} icon={iconForCommand('combo')} label={cb.name} disabled={!cb.ok} reason={cb.reason} autofocus={i === 0} onHover={() => setInfo(cb.ok ? cb.desc : (cb.reason ?? ''))}
            onClick={() => choose({ kind: 'combo', comboId: cb.id, label: cb.name, element: 'phys' }, cb.target === 'enemy' ? 'enemy' : 'none')} />
        ))}
        {lvl.l === 'forms' && c.forms.map((f, i) => (
          <Row key={f.form} icon={iconForForm(f.form)} label={f.form === 'base' ? 'Power down' : f.name} disabled={!f.ok} reason={f.reason} autofocus={i === 0} onHover={() => setInfo(f.note)} onClick={() => submit({ kind: 'form', form: f.form })} />
        ))}
        {lvl.l === 'target' && targetUids.map((uid, i) => {
          const f = fv(uid);
          if (!f) return null;
          return (
            <button key={uid} type="button" className={cx('target-chip', i === Math.min(tIdx, targetUids.length - 1) && 'on')} onMouseEnter={() => setTIdx(i)} onClick={() => resolve(lvl.p, uid)} aria-label={`${f.name}, ${f.hp} of ${f.maxHp} HP`} aria-pressed={i === tIdx}>
              <span className="tc-arrow" aria-hidden="true">▶</span>
              <span className="tc-name">{f.name}</span>
              <span className="tc-hp"><Bar kind={f.team === 'enemy' ? 'hp' : 'hp'} value={f.hp} max={f.maxHp} label={`${f.hp}`} /></span>
            </button>
          );
        })}
      </div>
      {lvl.l === 'target' && tf && (
        <div className="target-detail">
          <StatusChips f={tf} />
          {(lvl.p.element === 'ki' || tf.statuses.length > 0) && weakNotes(tf, lvl.p.element).map((n) => <div key={n} className="weak-note">{n}</div>)}
        </div>
      )}
      <div className="cmd-foot">
        {msg ? <span className="warn">{msg}</span> : <span className="cmd-info">{info || (lvl.l === 'target' ? 'Choose a target.' : ' ')}</span>}
        <span className="keyhints" aria-hidden="true">
          {lvl.l === 'target' ? '◀▶ pick · E ok · X back' : '↑↓ move · E ok · X back'}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ HUD root */
function objectiveText(b: BattleView): string {
  switch (b.mode) {
    case 'survive': return `Survive ${b.roundsGoal ?? '?'} rounds (round ${b.round})`;
    case 'threshold': return 'Force a retreat: drive the enemy down to the target HP';
    case 'protect': return 'Defeat the enemies — keep the protectee alive';
    case 'finisher': return 'Survive until the opening, then finish it';
    default: return 'Defeat all enemies';
  }
}

export function BattleHUD() {
  const ui = useUI();
  const b = ui.battle;
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!b || b.phase !== 'guard') return;
    return input.push((a) => {
      if (a === 'guard1') api.battleGuard(1);
      else if (a === 'guard2') api.battleGuard(2);
      else if (a === 'guard3') api.battleGuard(3);
      else return false;
      return true;
    });
  }, [b?.phase]);

  useEffect(() => {
    return input.push((a) => {
      if (a === 'pause') {
        api.battlePause(!(ui.battle?.paused ?? false));
        return true;
      }
      return false;
    });
  }, [ui.battle?.paused]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [b?.log.length]);

  const tutRef = useRef<HTMLDivElement>(null);
  useNav(tutRef, { active: !!b?.tutorial, onBack: () => api.dismissBattleTutorial() });

  const allies = useMemo(() => (b ? b.fighters.filter((f) => f.team === 'ally' && !f.isProtectee) : []), [b]);
  if (!b) return null;
  const enemies = b.fighters.filter((f) => f.team === 'enemy');
  const protectee = b.fighters.find((f) => f.isProtectee);
  const order = b.turnOrder.map((u) => b.fighters.find((f) => f.uid === u)).filter((f): f is FighterView => !!f && f.alive);

  return (
    <div className="battle-hud">
      <header className="bh-top">
        <div className="bh-title">
          <b>{b.stageName}</b>
          <span className="chip">{b.kind === 'random' ? 'Ambush' : b.kind === 'sim' ? 'Simulation' : b.kind === 'side' ? 'Optional' : 'Story'}</span>
          <span className="bh-obj">{objectiveText(b)}</span>
        </div>
        <div className="bh-ctrls">
          <span className="round">Round {b.round}</span>
          <Btn small pressed={b.paused} onClick={() => api.battlePause(!b.paused)}>{b.paused ? 'Resume' : 'Pause'}</Btn>
          <Btn small onClick={() => api.updateSettings({ battleSpeed: ui.settings.battleSpeed === 1 ? 1.5 : ui.settings.battleSpeed === 1.5 ? 2 : 1 })}>{ui.settings.battleSpeed}x</Btn>
          <Btn small onClick={() => api.skipBattleAnimations()}>Skip</Btn>
        </div>
      </header>
      <div className="enemy-strip">
        {enemies.map((f) => <EnemyPlate key={f.uid} f={f} current={f.uid === b.currentUid} hint={f.uid === b.targetHint} />)}
        {protectee && <div className="enemy-plate protectee"><div className="enemy-name"><span>{protectee.name}</span><span className="badge">PROTECT</span></div><Bar kind="hp" value={protectee.hp} max={protectee.maxHp} label={`${protectee.hp}`} /></div>}
      </div>
      <div className="turn-order" aria-label="Turn order">
        {order.slice(0, 9).map((f, i) => (
          <span key={f.uid + i} className={cx('turn-chip', f.team, f.uid === b.currentUid && 'current')}>{f.name.replace('Future ', '').split(' ')[0]}</span>
        ))}
      </div>
      {b.banner && <div className="banner" role="status" aria-live="polite">{b.banner}</div>}
      <GuardCue b={b} />
      <div className="ally-col">
        {allies.map((f, i) => <AllyPanel key={f.uid} f={f} slot={i + 1} current={f.uid === b.currentUid} />)}
      </div>
      {!b.guard && (
        <div className="log" ref={logRef} aria-live="polite" aria-label="Battle log">
          {b.log.slice(-30).map((l, i) => <p key={i}>{l}</p>)}
        </div>
      )}
      {b.phase === 'input' && b.commands && <CommandMenu b={b} c={b.commands} />}
      {b.phase !== 'input' && (
        <div className="command-menu inactive" aria-hidden="true">
          <div className="cmd-head"><span className="cmd-title">{b.phase === 'guard' ? 'Guard!' : b.phase === 'ended' ? (b.outcome?.outcome === 'victory' ? 'Victory!' : b.outcome?.outcome === 'defeat' ? 'Defeat…' : 'Escaped') : '…'}</span></div>
        </div>
      )}
      {b.paused && <div className="pause-veil" role="dialog" aria-label="Paused"><div className="panel"><h2>Paused</h2><Btn primary autofocus onClick={() => api.battlePause(false)}>Resume</Btn></div></div>}
      {b.tutorial && (
        <div className="overlay overlay-soft">
          <div className="modal" ref={tutRef} role="dialog" aria-modal="true" aria-label="Tutorial">
            <h2>Tip</h2>
            <p>{b.tutorial}</p>
            <div className="row end"><Btn primary autofocus onClick={() => api.dismissBattleTutorial()}>Got it</Btn></div>
          </div>
        </div>
      )}
    </div>
  );
}
