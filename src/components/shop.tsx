import { useEffect, useState } from 'react';
import { api, useUI } from '../app/store';
import { ITEMS } from '../data/items';
import { shopStock } from '../systems/progression';
import { heroName, iconForItem } from './helpers';
import { Btn, RefIcon, cx } from './ui';
import { Shell } from './screens';

const MOD_LABEL: Record<string, string> = { atk: 'ATK', def: 'DEF', spd: 'SPD', hp: 'HP', ki: 'Ki', rageGain: 'Rage gain', guardAssist: 'Guard window', drainResist: 'Drain resist', crit: 'Crit' };

export function modText(id: string): string {
  const m = ITEMS[id]?.mods;
  if (!m) return '';
  return Object.entries(m).map(([k, v]) => `${MOD_LABEL[k] ?? k} +${Math.round((v as number) * 100)}%`).join(', ');
}

export function ShopOverlay() {
  const ui = useUI();
  const game = ui.game;
  const shop = ui.shop;
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [sel, setSel] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  const stock = game && shop ? shopStock(game, shop.shopId) : [];
  const sellable = game ? Object.keys(game.inventory).filter((id) => ITEMS[id] && ITEMS[id].kind !== 'key') : [];
  const list = tab === 'buy' ? stock : sellable;

  useEffect(() => {
    if (!list.includes(sel ?? '')) setSel(list[0] ?? null);
  }, [tab, list.join(',')]); 
  useEffect(() => setQty(1), [sel, tab]);

  if (!game || !shop) return null;
  const item = sel ? ITEMS[sel] : null;
  const owned = sel ? (game.inventory[sel] ?? 0) : 0;
  const unit = item ? (tab === 'buy' ? item.price : item.sell) : 0;
  const maxQty = item ? (tab === 'buy' ? Math.max(1, Math.min(99, item.max - owned)) : Math.max(1, owned)) : 1;
  const total = unit * qty;
  const tooPoor = tab === 'buy' && game.zeni < total;
  const full = tab === 'buy' && item ? owned + qty > item.max : false;

  const act = () => {
    if (!item || !sel) return;
    const r = tab === 'buy' ? api.buy(shop.shopId, sel, qty) : api.sell(sel, qty);
    setMsg(r.ok ? `${tab === 'buy' ? 'Bought' : 'Sold'} ${qty} × ${item.name}.` : (r.reason ?? 'Cannot do that.'));
    api.ui(r.ok ? 'confirm' : 'error');
  };

  return (
    <Shell title={shop.name} onClose={() => api.closeShop()} wide>
      <div className="shop">
        <div className="shop-top">
          <div className="seg">
            <Btn small pressed={tab === 'buy'} className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>Buy</Btn>
            <Btn small pressed={tab === 'sell'} className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>Sell</Btn>
          </div>
          <span className="zeni" aria-label="Zeni">Zeni: <b>{game.zeni}</b></span>
        </div>
        <div className="shop-main">
          <div className="list scroll" role="listbox" aria-label={tab === 'buy' ? 'For sale' : 'Your items'}>
            {list.length === 0 && <p className="hint pad">{tab === 'buy' ? 'Nothing for sale right now.' : 'You have nothing to sell.'}</p>}
            {list.map((id) => (
              <button key={id} type="button" data-nav="" role="option" aria-selected={sel === id} className={cx('list-btn', sel === id && 'selected')} onClick={() => { setSel(id); setMsg(null); }}>
                <RefIcon r={iconForItem(id)} alt={ITEMS[id].name} size="sm" />
                <span className="grow">{ITEMS[id].name}</span>
                <span className="price">{tab === 'buy' ? ITEMS[id].price : ITEMS[id].sell}z</span>
                <span className="owned">×{game.inventory[id] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="detail">
            {item ? (
              <>
                <h3><RefIcon r={iconForItem(item.id)} alt={item.name} /> {item.name}</h3>
                <p>{item.desc}</p>
                {item.mods && <p className="mods">Effect: {modText(item.id)}</p>}
                {item.kind === 'accessory' && (
                  <p className="hint">Equip it from the Equipment tab of the menu. Equipped by: {Object.entries(game.roster).filter(([, r]) => r.accessories.includes(item.id)).map(([h]) => heroName(h)).join(', ') || 'nobody'}.</p>
                )}
                {item.kind === 'consumable' && <p className="hint">{item.battle ? 'Usable in battle' : 'Field only'}{item.field ? ' and in the menu' : ''}.</p>}
                <p>Owned: <b>{owned}</b> / {item.max}</p>
                <div className="row">
                  <Btn small onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>−</Btn>
                  <span className="qty" aria-live="polite">{qty}</span>
                  <Btn small onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty}>+</Btn>
                  <Btn small onClick={() => setQty(maxQty)}>Max</Btn>
                  <span className="grow" />
                  <span>{tab === 'buy' ? 'Cost' : 'Receive'}: <b>{total}z</b></span>
                </div>
                <Btn primary disabled={tooPoor || full || (tab === 'sell' && owned < qty)} reason={tooPoor ? 'Not enough Zeni' : full ? `You can carry at most ${item.max}` : 'Not enough items'} onClick={act}>
                  {tab === 'buy' ? 'Buy' : 'Sell'}
                </Btn>
                {tooPoor && <p className="warn" role="status">Not enough Zeni (need {total - game.zeni} more).</p>}
                {full && <p className="warn" role="status">You can carry at most {item.max}.</p>}
              </>
            ) : (
              <p className="hint">Select an item.</p>
            )}
            {msg && <p className="notice" role="status">{msg}</p>}
          </div>
        </div>
      </div>
    </Shell>
  );
}
