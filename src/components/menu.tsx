import { useEffect, useRef, useState } from 'react';
import { api, useUI } from '../app/store';
import { heroActorId } from '../engine/assets';
import { computeHeroStats } from '../engine/combat/fighters';
import { FORMS, HEROES, HERO_FORMS, xpForLevel } from '../data/heroes';
import { ITEMS } from '../data/items';
import { TRAVEL_DESTINATIONS } from '../data/maps';
import { QUESTS } from '../data/quests';
import { skillsOf } from '../data/skills';
import { CHAPTERS } from '../data/stages';
import { BEATS, BEAT_INDEX } from '../data/story';
import { evalCond } from '../systems/cond';
import { availableHeroes, formsUnlocked, maxStats, TP_CAP_PER_STAT, TP_STEP, type GameState } from '../systems/gameState';
import { TRAIN_STATS, type TrainStat } from '../systems/progression';
import { objectiveProgress, questStatus } from '../systems/questRuntime';
import { SKILLS } from '../data/skills';
import type { HeroId } from '../types';
import { OptionsPanel, SaveLoadPanel } from './screens';
import { RAGE } from '../engine/combat/rage';
import { SPARKING_ATK, SPARKING_COST, SPARKING_TURNS } from '../engine/combat/formulas';
import { FLAG_NOTES, TARGET_TEXT, heroName, iconForForm, iconForItem, iconForSkill, skillNote } from './helpers';
import { modText } from './shop';
import { Bar, Btn, Glyph, Panel, Portrait, RefIcon, cx, fmtTime, useConfirm, useNav } from './ui';

const TABS = ['Status', 'Party', 'Abilities', 'Items', 'Equipment', 'Journal', 'Options', 'Save'] as const;
type Tab = (typeof TABS)[number];

function HeroPicker({ game, hero, onPick }: { game: GameState; hero: HeroId; onPick: (h: HeroId) => void }) {
  return (
    <div className="hero-picker" role="group" aria-label="Choose fighter">
      {game.joined.map((h) => (
        <Btn key={h} small pressed={h === hero} className={h === hero ? 'on' : ''} onClick={() => onPick(h)}>{heroName(h)}{game.away.includes(h) ? ' (away)' : ''}</Btn>
      ))}
    </div>
  );
}

const awayReason = (g: GameState, h: HeroId): string => {
  if (h === 'goku' && g.flags.goku_sacrifice) return 'Gone from Earth';
  if (h === 'goku' && g.flags.goku_sick && !g.flags.goku_recovered) return 'Recovering from the heart virus';
  return 'Away on story duty';
};

/* ------------------------------------------------------------------ status */
function StatusTab({ game, hero }: { game: GameState; hero: HeroId }) {
  const r = game.roster[hero];
  const def = HEROES[hero];
  const kami = hero === 'piccolo' && !!game.flags.piccolo_kami_merged;
  const d = computeHeroStats(hero, r.level, kami, r.accessories, r.trained);
  const m = maxStats(game, hero);
  const unlocked = formsUnlocked(game, hero);
  const need = xpForLevel(r.level);
  return (
    <div className="two-col">
      <Panel title={`${def.name} — ${def.title}`}>
        <div className="row">
          <Portrait actor={heroActorId(hero, 'base', game.flags)} name={def.name} color={def.color} size="lg" />
          <div className="grow">
            <p><b>Level {r.level}</b> · {def.role}</p>
            <Bar kind="xp" value={r.xp} max={need} label={`XP ${r.xp}/${need}`} />
            <Bar kind="hp" value={r.hp} max={m.hp} label={`HP ${r.hp}/${m.hp}`} />
            <Bar kind="ki" value={r.ki} max={m.ki} label={`Ki ${r.ki}/${m.ki}`} />
          </div>
        </div>
        <table className="table">
          <tbody>
            <tr><th>ATK</th><td>{d.atk}</td><th>DEF</th><td>{d.def}</td></tr>
            <tr><th>SPD</th><td>{d.spd}</td><th>Training</th><td>{r.tp} TP free</td></tr>
          </tbody>
        </table>
        {kami && <p className="hint">Kami's merge: permanent +15-20% to all stats.</p>}
        <p><b>Rage Art — {def.rageArt.name}</b><br />{def.rageArt.desc}</p>
        <p className="hint">Rage fills to 100 from hits dealt and taken (+{RAGE.GUARD_PERFECT} for a Perfect Guard). Sparking costs {SPARKING_COST} Rage: {SPARKING_TURNS} turns of ATK x{SPARKING_ATK} and half Ki costs.</p>
      </Panel>
      <Panel title="Transformations">
        {HERO_FORMS[hero].length === 0 && <p className="hint">{hero === 'piccolo' ? 'Piccolo has no transformations; his Kami merge is a permanent milestone.' : 'No transformations — pure technique.'}</p>}
        {HERO_FORMS[hero].map(({ form }) => {
          const ok = unlocked.includes(form);
          const hidden = !ok && form === 'ssj2';
          return (
            <div className={cx('form-row', !ok && 'locked')} key={form}>
              <b className="row"><RefIcon r={iconForForm(form)} alt={FORMS[form].name} size="sm" />{hidden ? '???' : FORMS[form].name}</b>
              <span>{ok ? 'Unlocked' : 'Locked'}</span>
              <small>{ok ? FORMS[form].note : hidden ? 'Something sleeps inside…' : 'Unlocked by a story event.'}</small>
            </div>
          );
        })}
        <h3>Equipped</h3>
        <p>{r.accessories.length ? r.accessories.map((a) => ITEMS[a]?.name).join(', ') : 'No accessories'}</p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ party */
function PartyTab({ game }: { game: GameState }) {
  const [msg, setMsg] = useState<string | null>(null);
  const avail = availableHeroes(game);
  const apply = (list: HeroId[]) => {
    const r = api.setParty(list);
    setMsg(r.ok ? null : (r.reason ?? 'Cannot change the party.'));
    api.ui(r.ok ? 'confirm' : 'error');
  };
  const slots = [0, 1, 2];
  return (
    <div className="two-col">
      <Panel title="Active party (max 3)">
        {slots.map((i) => {
          const h = game.party[i];
          return (
            <div className="party-slot" key={i}>
              {h ? (
                <>
                  <Portrait actor={heroActorId(h, 'base', game.flags)} name={heroName(h)} color={HEROES[h].color} size="sm" />
                  <span className="grow"><b>{heroName(h)}</b> Lv {game.roster[h].level}{i === 0 ? ' · leader' : ''}</span>
                  {i > 0 && <Btn small onClick={() => apply([h, ...game.party.filter((x) => x !== h)])}>Make leader</Btn>}
                  <Btn small disabled={game.party.length <= 1} reason="A party needs at least one fighter" onClick={() => apply(game.party.filter((x) => x !== h))}>Remove</Btn>
                </>
              ) : (
                <span className="hint">Empty slot</span>
              )}
            </div>
          );
        })}
        {msg && <p className="warn" role="status">{msg}</p>}
        <p className="hint">Story fights may force specific fighters. Everyone who has joined gains XP (reserves earn 70%).</p>
      </Panel>
      <Panel title="Roster">
        {game.joined.map((h) => {
          const away = game.away.includes(h);
          const inParty = game.party.includes(h);
          return (
            <div className={cx('party-slot', away && 'locked')} key={h}>
              <Portrait actor={heroActorId(h, 'base', game.flags)} name={heroName(h)} color={HEROES[h].color} size="sm" />
              <span className="grow"><b>{heroName(h)}</b> Lv {game.roster[h].level}<br /><small>{away ? awayReason(game, h) : HEROES[h].role}</small></span>
              <Btn small disabled={away || inParty || game.party.length >= 3} reason={away ? awayReason(game, h) : inParty ? 'Already in the party' : 'Party is full (remove someone first)'} onClick={() => apply([...game.party, h])}>Add</Btn>
            </div>
          );
        })}
        {avail.length === 0 && <p className="hint">Nobody is available.</p>}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ abilities */
function AbilitiesTab({ game, hero }: { game: GameState; hero: HeroId }) {
  const r = game.roster[hero];
  const skills = skillsOf(hero);
  const [sel, setSel] = useState<string>(skills[0].id);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setSel(skillsOf(hero)[0].id);
    setMsg(null);
  }, [hero]);
  const s = SKILLS[sel] ?? skills[0];
  const note = skillNote(game, hero, s);
  const equip = (slot: number) => {
    const res = api.setLoadout(hero, slot, s.id);
    setMsg(res.ok ? `${s.name} equipped in slot ${slot + 1}.` : (res.reason ?? 'Cannot equip.'));
    api.ui(res.ok ? 'confirm' : 'error');
  };
  const unequip = (slot: number) => {
    const res = api.setLoadout(hero, slot, null);
    setMsg(res.ok ? `Slot ${slot + 1} cleared.` : (res.reason ?? ''));
  };
  return (
    <div className="abilities">
      <Panel title="Loadout (4 slots)">
        <div className="loadout">
          {[0, 1, 2, 3].map((i) => {
            const id = r.loadout[i];
            const sk = id ? SKILLS[id] : null;
            return (
              <div className="slot-card" key={i}>
                <small>Slot {i + 1}</small>
                {sk ? (
                  <>
                    <RefIcon r={iconForSkill(sk.id)} alt={sk.name} />
                    <b>{sk.name}</b>
                    <span>{sk.ki} Ki</span>
                    <Btn small onClick={() => unequip(i)}>Unequip</Btn>
                  </>
                ) : (
                  <span className="hint">Empty</span>
                )}
              </div>
            );
          })}
        </div>
        {msg && <p className="notice" role="status">{msg}</p>}
      </Panel>
      <div className="two-col tall">
        <div className="list scroll" role="listbox" aria-label="Techniques">
          {skills.map((k) => {
            const n = skillNote(game, hero, k);
            const equipped = r.loadout.indexOf(k.id);
            return (
              <button type="button" data-nav="" role="option" aria-selected={sel === k.id} key={k.id} className={cx('list-btn', sel === k.id && 'selected', n.locked && 'locked')} onClick={() => setSel(k.id)}>
                <RefIcon r={iconForSkill(k.id)} alt={k.name} size="sm" />
                <span className="grow">{k.name}<small>{n.locked ? n.reason : (n.note ?? k.role)}</small></span>
                {equipped >= 0 && <span className="badge">S{equipped + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="detail">
          <h3><RefIcon r={iconForSkill(s.id)} alt={s.name} /> {s.name}</h3>
          <p>{s.desc}</p>
          <table className="table">
            <tbody>
              <tr><th>Cost</th><td>{s.ki} Ki{s.hpCost ? ` + ${Math.round(s.hpCost * 100)}% HP` : ''}{s.rageCost ? ` + ${s.rageCost} Rage` : ''}</td></tr>
              <tr><th>Target</th><td>{TARGET_TEXT[s.target]}</td></tr>
              <tr><th>Type</th><td>{s.element === 'ki' ? 'Ki (absorbable)' : 'Physical'} · {s.role}</td></tr>
              <tr><th>Trade-off</th><td>{s.tradeoff}</td></tr>
              {s.chargeTurns ? <tr><th>Timing</th><td>Charges {s.chargeTurns} turn{s.chargeTurns > 1 ? 's' : ''} first</td></tr> : null}
              {s.battleLimit ? <tr><th>Limit</th><td>{s.battleLimit} per battle</td></tr> : null}
            </tbody>
          </table>
          {note.locked ? <p className="warn">🔒 {note.reason}</p> : note.note && <p className="hint">{note.note}</p>}
          <div className="row wrap">
            {[0, 1, 2, 3].map((i) => (
              <Btn key={i} small disabled={note.locked} reason={note.reason} onClick={() => equip(i)}>Equip to slot {i + 1}</Btn>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ items */
function ItemsTab({ game }: { game: GameState }) {
  const ids = Object.keys(game.inventory).filter((id) => ITEMS[id]);
  const groups: [string, string[]][] = [
    ['Consumables', ids.filter((i) => ITEMS[i].kind === 'consumable')],
    ['Accessories', ids.filter((i) => ITEMS[i].kind === 'accessory')],
    ['Key items', ids.filter((i) => ITEMS[i].kind === 'key')],
  ];
  const [using, setUsing] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="two-col tall">
      <div className="list scroll">
        <p className="zeni pad">Zeni: <b>{game.zeni}</b></p>
        {ids.length === 0 && <p className="hint pad">Your pack is empty.</p>}
        {groups.map(([name, list]) => list.length > 0 && (
          <div key={name}>
            <h3 className="pad">{name}</h3>
            {list.map((id) => (
              <button type="button" data-nav="" key={id} className={cx('list-btn', using === id && 'selected')} onClick={() => { setUsing(ITEMS[id].kind === 'consumable' && ITEMS[id].field ? id : null); setMsg(ITEMS[id].desc + (ITEMS[id].kind === 'consumable' && !ITEMS[id].field ? ' (battle only)' : '')); }}>
                <RefIcon r={iconForItem(id)} alt={ITEMS[id].name} size="sm" />
                <span className="grow">{ITEMS[id].name}<small>{ITEMS[id].desc}</small></span>
                <span className="owned">×{game.inventory[id]}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="detail">
        {using ? (
          <>
            <h3>Use {ITEMS[using].name} on…</h3>
            {game.joined.map((h) => {
              const m = maxStats(game, h);
              const r = game.roster[h];
              return (
                <Btn key={h} className="list-btn" onClick={() => {
                  const res = api.useItem(using, h);
                  setMsg(res.ok ? `${ITEMS[using].name} used on ${heroName(h)}.` : (res.reason ?? 'No effect.'));
                  api.ui(res.ok ? 'confirm' : 'error');
                  if (res.ok && (game.inventory[using] ?? 0) <= 1) setUsing(null);
                }}>
                  <span className="grow">{heroName(h)}{r.hp <= 0 ? ' (down)' : ''}</span>
                  <small>HP {r.hp}/{m.hp} · Ki {r.ki}/{m.ki}</small>
                </Btn>
              );
            })}
            <Btn small onClick={() => setUsing(null)}>Cancel</Btn>
          </>
        ) : (
          <p className="hint">Select a consumable to use it on a fighter. Accessories are equipped in the Equipment tab; key items are story objects.</p>
        )}
        {msg && <p className="notice" role="status">{msg}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ equipment & training */
const STAT_LABEL: Record<TrainStat, string> = { hp: 'HP', ki: 'Ki', atk: 'ATK', def: 'DEF', spd: 'SPD' };

function EquipmentTab({ game, hero }: { game: GameState; hero: HeroId }) {
  const r = game.roster[hero];
  const kami = hero === 'piccolo' && !!game.flags.piccolo_kami_merged;
  const cur = computeHeroStats(hero, r.level, kami, r.accessories, r.trained);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmNode, ask] = useConfirm();
  const owned = Object.keys(game.inventory).filter((i) => ITEMS[i]?.kind === 'accessory');
  const delta = (id: string, slot: number) => {
    const acc = [...r.accessories];
    acc[slot] = id;
    const n = computeHeroStats(hero, r.level, kami, acc.filter(Boolean), r.trained);
    return `ATK ${n.atk - cur.atk >= 0 ? '+' : ''}${n.atk - cur.atk} · DEF ${n.def - cur.def >= 0 ? '+' : ''}${n.def - cur.def} · SPD ${n.spd - cur.spd >= 0 ? '+' : ''}${n.spd - cur.spd} · HP ${n.hp - cur.hp >= 0 ? '+' : ''}${n.hp - cur.hp} · Ki ${n.ki - cur.ki >= 0 ? '+' : ''}${n.ki - cur.ki}`;
  };
  return (
    <div className="two-col tall">
      {confirmNode}
      <Panel title="Accessories">
        {[0, 1].map((slot) => {
          const id = r.accessories[slot];
          return (
            <div className="party-slot" key={slot}>
              <RefIcon r={id ? iconForItem(id) : { url: null, glyph: 'charm' }} alt={id ? ITEMS[id].name : 'Empty'} size="sm" />
              <span className="grow"><b>{id ? ITEMS[id].name : 'Empty'}</b><br /><small>{id ? modText(id) : `Slot ${slot + 1}`}</small></span>
              {id && <Btn small onClick={() => { const x = api.equip(hero, slot, null); setMsg(x.ok ? 'Unequipped.' : (x.reason ?? '')); }}>Unequip</Btn>}
            </div>
          );
        })}
        <h3>In your pack</h3>
        {owned.length === 0 && <p className="hint">No spare accessories. Buy some at Capsule Corp or find them in quests.</p>}
        {owned.map((id) => (
          <div className="equip-row" key={id}>
            <div className="row"><RefIcon r={iconForItem(id)} alt={ITEMS[id].name} size="sm" /><b className="grow">{ITEMS[id].name}</b><span className="owned">×{game.inventory[id]}</span></div>
            <small>{ITEMS[id].desc}</small>
            {[0, 1].map((slot) => (
              <Btn key={slot} small className="equip-btn" onClick={() => { const x = api.equip(hero, slot, id); setMsg(x.ok ? `${ITEMS[id].name} equipped.` : (x.reason ?? '')); api.ui(x.ok ? 'confirm' : 'error'); }}>
                Slot {slot + 1}: {delta(id, slot)}
              </Btn>
            ))}
          </div>
        ))}
        {msg && <p className="notice" role="status">{msg}</p>}
      </Panel>
      <Panel title={`Training — ${r.tp} point${r.tp === 1 ? '' : 's'} free`} right={<Btn small onClick={async () => { if (await ask('Refund all training?', 'All spent Training Points return to the pool.', 'Refund')) setMsg(`Refunded ${api.refundTraining(hero)} points.`); }}>Refund all</Btn>}>
        {TRAIN_STATS.map((st) => {
          const used = r.trained[st];
          const next = computeHeroStats(hero, r.level, kami, r.accessories, { ...r.trained, [st]: used + 1 });
          const key = st as 'hp' | 'ki' | 'atk' | 'def' | 'spd';
          const full = used >= TP_CAP_PER_STAT;
          return (
            <div className="train-row" key={st}>
              <b>{STAT_LABEL[st]}</b>
              <span className="grow">{cur[key]} <small>(+{Math.round(used * TP_STEP[key])} trained)</small></span>
              <small>{full ? 'MAX' : `→ ${next[key]}`}</small>
              <Btn small disabled={r.tp < 1 || full} reason={full ? 'Training cap reached' : 'No Training Points'} onClick={() => { const x = api.train(hero, st); setMsg(x.ok ? `${STAT_LABEL[st]} trained.` : (x.reason ?? '')); }}>+1</Btn>
            </div>
          );
        })}
        <p className="hint">You earn 1 Training Point per level. Each stat can be trained {TP_CAP_PER_STAT} times; refunding is free.</p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ journal */
function JournalTab({ game }: { game: GameState }) {
  const ui = useUI();
  const beat = BEATS[game.beat];
  const chapter = CHAPTERS[beat?.chapter ?? 8];
  const dests = TRAVEL_DESTINATIONS.filter((d) => evalCond(game, d.when));
  const sts: Record<string, string> = { locked: 'Locked', available: 'Available', active: 'Active', done: 'Complete', missed: 'Missed' };
  return (
    <div className="two-col tall">
      <div className="scroll">
        <Panel title="Current chapter">
          <h3>{chapter}</h3>
          <p><b>Objective:</b> {ui.hudObjective.text || beat?.objective || 'The Cell Saga is complete.'}</p>
          <p className="hint">{ui.hudObjective.where}</p>
        </Panel>
        <Panel title="Map notes — Capsule Flyer destinations">
          {dests.map((d) => <p key={d.map}><b>{d.label}</b> <small>{d.hint}</small></p>)}
        </Panel>
        {game.flags.postgame_unlocked && (
          <Panel title="Postgame records">
            {Object.keys(game.postgame.records).length === 0 && <p className="hint">Try a Capsule Corp simulation. Records are saved but never change the story.</p>}
            {Object.entries(game.postgame.records).map(([id, rec]) => <p key={id}>{id.replace('SIM_', '').toLowerCase()}: best {rec.best} rounds · {rec.clears} clears</p>)}
          </Panel>
        )}
        <Panel title="Milestones">
          {Object.keys(FLAG_NOTES).filter((f) => game.flags[f]).map((f) => <p key={f}>✔ {FLAG_NOTES[f]}</p>)}
          {!Object.keys(FLAG_NOTES).some((f) => game.flags[f]) && <p className="hint">None yet.</p>}
        </Panel>
      </div>
      <div className="scroll" role="list" aria-label="Quests">
        {QUESTS.map((q) => {
          const st = questStatus(game, q.id);
          if (st === 'locked') return null;
          const until = BEATS[BEAT_INDEX[q.until]];
          return (
            <Panel key={q.id} title={q.name} className={`quest quest-${st}`} right={<span className={`tag tag-${st}`}><Glyph k={st === 'done' ? 'up' : st === 'missed' ? 'debuff' : st === 'active' ? 'skills' : 'pin'} /> {sts[st]}</span>}>
              <p>{q.summary}</p>
              {(st === 'active' || st === 'available') && q.objectives.map((o) => {
                const n = st === 'active' ? objectiveProgress(game, q.id, o.key) : 0;
                return <Bar key={o.key} kind="xp" value={n} max={o.need} label={`${o.text}: ${n}/${o.need}`} />;
              })}
              {st !== 'done' && st !== 'missed' && until && <p className="warn">Closes after: {CHAPTERS[until.chapter]}.</p>}
              {st === 'done' && <p className="hint">Reward received: {q.reward.note}</p>}
              {st === 'missed' && <p className="hint">The window closed. This quest can no longer be completed.</p>}
              {st === 'available' && <p className="hint">Talk to the quest giver in {q.giver.map.replace(/_/g, ' ')}.</p>}
            </Panel>
          );
        })}
        {QUESTS.every((q) => questStatus(game, q.id) === 'locked') && <p className="hint pad">No side quests yet. Explore and talk to people.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ menu shell */
export function MenuOverlay() {
  const ui = useUI();
  const game = ui.game;
  const [tab, setTab] = useState<Tab>('Status');
  const [hero, setHero] = useState<HeroId>(game?.party[0] ?? 'trunks');
  const ref = useRef<HTMLDivElement>(null);
  const close = () => api.closeOverlay();
  useNav(ref, {
    onBack: close,
    onMenu: close,
    onTab: (d) => setTab(TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length]),
    focusKey: tab + hero,
  });
  if (!game) return null;
  const showHero = tab === 'Status' || tab === 'Abilities' || tab === 'Equipment';
  return (
    <div className="overlay">
      <div className="shell shell-wide menu" role="dialog" aria-modal="true" aria-label="Game menu">
        <header className="shell-head">
          <h1>Menu</h1>
          <span className="menu-meta">Zeni <b>{game.zeni}</b> · {fmtTime(game.stats.playMs)} · {game.difficulty}</span>
          <Btn small onClick={close}>Close (X)</Btn>
        </header>
        <div className="tabs" role="tablist" aria-label="Menu sections">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={t === tab} className={cx('tab', t === tab && 'on')} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="objective-strip">Objective: {ui.hudObjective.text} <small>{ui.hudObjective.where}</small></div>
        <div className="shell-body" ref={ref}>
          {showHero && <HeroPicker game={game} hero={game.joined.includes(hero) ? hero : game.joined[0]} onPick={setHero} />}
          {tab === 'Status' && <StatusTab game={game} hero={game.joined.includes(hero) ? hero : game.joined[0]} />}
          {tab === 'Party' && <PartyTab game={game} />}
          {tab === 'Abilities' && <AbilitiesTab game={game} hero={game.joined.includes(hero) ? hero : game.joined[0]} />}
          {tab === 'Items' && <ItemsTab game={game} />}
          {tab === 'Equipment' && <EquipmentTab game={game} hero={game.joined.includes(hero) ? hero : game.joined[0]} />}
          {tab === 'Journal' && <JournalTab game={game} />}
          {tab === 'Options' && <OptionsPanel inGame />}
          {tab === 'Save' && <SaveLoadPanel canSave />}
        </div>
      </div>
    </div>
  );
}
