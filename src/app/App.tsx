import { useUI, api } from './store';
import { BattleHUD } from '../components/BattleHUD';
import { CardOverlay, Caption, ChoiceMenu, DialogueBox, SessionConfirm, ToastStack } from '../components/dialogue';
import { MenuOverlay } from '../components/menu';
import { CreditsOverlay, DefeatOverlay, HelpOverlay, NewGameOverlay, OptionsOverlay, RewardsOverlay, SaveOverlay, TitleScreen, TravelOverlay } from '../components/screens';
import { ShopOverlay } from '../components/shop';
import { Bar, Btn, cx } from '../components/ui';
import { HEROES } from '../data/heroes';
import { maxStats } from '../systems/gameState';
import './styles.css';

function WorldHUD() {
  const ui = useUI();
  const g = ui.game;
  if (!g || ui.scriptActive) return null;
  return (
    <div className="world-hud">
      <div className="hud-left panel">
        <div className="hud-map">{ui.hudMap}</div>
        <div className="hud-obj"><b>Objective:</b> {ui.hudObjective.text}</div>
        <div className="hud-where">{ui.hudObjective.where}</div>
      </div>
      <div className="hud-party" aria-label="Party">
        {g.party.map((h) => {
          const r = g.roster[h];
          const m = maxStats(g, h);
          return (
            <div className="hud-hero" key={h} style={{ borderColor: HEROES[h].color }}>
              <b>{HEROES[h].name.replace('Future ', '')}</b> <small>Lv {r.level}</small>
              <Bar kind="hp" value={r.hp} max={m.hp} label={`${r.hp}`} />
              <Bar kind="ki" value={r.ki} max={m.ki} label={`${r.ki}`} />
            </div>
          );
        })}
      </div>
      <Btn small className="hud-menu-btn" onClick={() => api.openMenu()}>Menu (Tab)</Btn>
    </div>
  );
}

export function App() {
  const ui = useUI();
  const o = ui.overlay;
  return (
    <div className="stage-wrap">
      <div className={cx('stage', ui.settings.reducedMotion && 'reduced', `screen-${ui.screen}`)} data-screen={ui.screen} data-overlay={o ?? ''}>
        <div id="game-root" />
        {ui.screen === 'title' && <TitleScreen />}
        {ui.screen === 'world' && !o && !ui.loading && <WorldHUD />}
        {ui.screen === 'world' && !o && !ui.loading && ui.prompt && !ui.scriptActive && <div className="prompt" role="status">{ui.prompt}</div>}
        {ui.screen === 'battle' && <BattleHUD />}
        {ui.loading && <div className="load-veil" role="status" aria-live="polite"><span>LOADING</span><div className="loadbar"><div className="loadbar-fill" /></div></div>}
        <Caption />
        <CardOverlay />
        <DialogueBox />
        <ChoiceMenu />
        {o === 'menu' && <MenuOverlay />}
        {o === 'shop' && <ShopOverlay />}
        {o === 'travel' && <TravelOverlay />}
        {o === 'save' && <SaveOverlay />}
        {o === 'options' && <OptionsOverlay />}
        {o === 'help' && <HelpOverlay />}
        {o === 'newgame' && <NewGameOverlay />}
        {o === 'rewards' && <RewardsOverlay />}
        {o === 'defeat' && <DefeatOverlay />}
        {o === 'credits' && <CreditsOverlay />}
        {o === 'confirm' && <SessionConfirm />}
        <ToastStack />
        {ui.note && <div className="note-strip" role="status">{ui.note}</div>}
      </div>
    </div>
  );
}
