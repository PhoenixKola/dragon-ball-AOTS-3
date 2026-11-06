import { useMemo } from 'react';
import type { Entity, MapDef } from '../types/script';
import type { GameState } from '../systems/gameState';
import type { WorldMapPosition } from '../app/store';
import { evalCond } from '../systems/cond';
import { BEAT_INDEX } from '../data/story';

const TILE = 32;
const TILE_COLOR: Record<string, string> = {
  ',': '#526b48', '=': '#b59a6b', '#': '#30384a', '~': '#337bb0', ':': '#857d68',
};

interface Marker { id: string; x: number; y: number; kind: string; label: string }

function entityActive(game: GameState, e: Entity): boolean {
  if (e.when && !evalCond(game, e.when)) return false;
  if ((e.kind === 'foe' || e.kind === 'zone') && e.story && game.beat !== BEAT_INDEX[e.story]) return false;
  if (e.kind === 'foe' && e.fight && game.opened.includes(`defeated:${e.id}`)) return false;
  if (e.kind === 'pickup' && game.opened.includes(`pickup:${e.id}`)) return false;
  return true;
}

function markerFor(game: GameState, e: Entity): Marker | null {
  if (!entityActive(game, e)) return null;
  const goal = (e.kind === 'npc' || e.kind === 'foe' || e.kind === 'zone') && !!e.story && game.beat === BEAT_INDEX[e.story];
  const chestOpen = e.kind === 'chest' && game.opened.includes(`chest:${e.id}`);
  const base = { id: e.id, x: e.x / TILE, y: e.y / TILE, label: 'Map point' };
  if (goal) return { ...base, kind: 'goal', label: 'Story objective' };
  if (e.kind === 'exit') return { ...base, kind: 'exit', label: 'Exit' };
  if (e.kind === 'npc') return { ...base, kind: 'npc', label: e.name };
  if (e.kind === 'foe') return { ...base, kind: 'foe', label: e.name };
  if (e.kind === 'chest') return { ...base, kind: chestOpen ? 'opened' : 'chest', label: chestOpen ? 'Opened chest' : 'Treasure chest' };
  if (e.kind === 'zone') return { ...base, kind: 'goal', label: 'Story area' };
  if (e.kind === 'pickup') return { ...base, kind: 'chest', label: e.label ?? 'Supplies' };
  if (e.kind === 'save') return { ...base, kind: 'save', label: 'Save point' };
  if (e.kind === 'heal') return { ...base, kind: 'heal', label: 'Healing station' };
  if (e.kind === 'shop') return { ...base, kind: 'shop', label: 'Shop' };
  if (e.kind === 'travel') return { ...base, kind: 'travel', label: e.label ?? 'Capsule Flyer' };
  if (e.kind === 'door' || e.kind === 'terminal' || e.kind === 'lever' || e.kind === 'sign') return { ...base, kind: 'point', label: e.label ?? e.kind };
  return null;
}

function terrainPaths(map: MapDef): Record<string, string> {
  const paths: Record<string, string[]> = Object.fromEntries(Object.keys(TILE_COLOR).map((k) => [k, []]));
  map.tiles.forEach((row, y) => {
    [...row].forEach((tile, x) => {
      if (paths[tile]) paths[tile].push(`M${x} ${y}h1v1h-1z`);
    });
  });
  return Object.fromEntries(Object.entries(paths).map(([k, cells]) => [k, cells.join('')]));
}

function markerShape(m: Marker) {
  if (m.kind === 'goal') return <><circle cx={m.x} cy={m.y} r="0.42" className="map-goal-halo" /><path d={`M${m.x} ${m.y - 0.34}l0.34 0.34-0.34 0.34-0.34-0.34z`} className="map-goal" /></>;
  if (m.kind === 'exit') return <rect x={m.x - 0.26} y={m.y - 0.26} width="0.52" height="0.52" rx="0.04" className="map-exit" />;
  if (m.kind === 'chest' || m.kind === 'opened') return <path d={`M${m.x - 0.3} ${m.y - 0.22}h0.6v0.44h-0.6z`} className={m.kind === 'opened' ? 'map-opened' : 'map-chest'} />;
  if (m.kind === 'foe') return <circle cx={m.x} cy={m.y} r="0.22" className="map-foe" />;
  if (m.kind === 'save') return <path d={`M${m.x - 0.22} ${m.y - 0.22}h0.44v0.44h-0.44z`} className="map-save" />;
  if (m.kind === 'heal') return <path d={`M${m.x - 0.3} ${m.y - 0.12}h0.6v0.24h-0.6z M${m.x - 0.12} ${m.y - 0.3}h0.24v0.6h-0.24z`} className="map-heal" />;
  if (m.kind === 'shop') return <path d={`M${m.x} ${m.y - 0.3}l0.3 0.55h-0.6z`} className="map-shop" />;
  if (m.kind === 'travel') return <path d={`M${m.x - 0.3} ${m.y + 0.24}l0.6-0.48-0.6-0.48z`} className="map-travel" />;
  if (m.kind === 'point') return <circle cx={m.x} cy={m.y} r="0.17" className="map-point" />;
  return <circle cx={m.x} cy={m.y} r="0.2" className="map-npc" />;
}

export function WorldMapDiagram({ map, game, position, className = '' }: { map: MapDef; game: GameState; position: WorldMapPosition | null; className?: string }) {
  const paths = useMemo(() => terrainPaths(map), [map]);
  const markers = useMemo(() => map.entities.map((e) => markerFor(game, e)).filter((x): x is Marker => !!x), [game, map]);
  const here = position?.mapId === map.id ? position : null;
  const px = (here?.x ?? game.x) / TILE;
  const py = (here?.y ?? game.y) / TILE;
  const angle = here?.facing === 'up' ? -90 : here?.facing === 'down' ? 90 : here?.facing === 'left' ? 180 : 0;
  return (
    <svg className={`world-map-diagram ${className}`} style={{ aspectRatio: `${map.width} / ${map.height}` }} viewBox={`0 0 ${map.width} ${map.height}`} role="img" aria-label={`${map.name} field map. The glowing arrow marks your position; gold marks the current story objective.`}>
      <defs>
        <pattern id={`map-grid-${map.id}`} width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#e8e0bd" strokeOpacity=".12" strokeWidth=".035" /></pattern>
        <linearGradient id={`map-sheen-${map.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".08" /><stop offset=".48" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#08111e" stopOpacity=".22" /></linearGradient>
      </defs>
      <rect className="map-ground" width={map.width} height={map.height} fill="#3a503d" />
      {Object.entries(paths).map(([tile, d]) => d && <path key={tile} d={d} fill={TILE_COLOR[tile]} />)}
      <rect width={map.width} height={map.height} fill={`url(#map-grid-${map.id})`} pointerEvents="none" />
      <rect width={map.width} height={map.height} fill={`url(#map-sheen-${map.id})`} pointerEvents="none" />
      <rect className="map-frame" x="0.12" y="0.12" width={map.width - 0.24} height={map.height - 0.24} rx="0.35" />
      {markers.map((m) => <g key={m.id}>{markerShape(m)}<title>{m.label}</title></g>)}
      {here && <rect className="map-camera" x={here.viewport.x} y={here.viewport.y} width={here.viewport.w} height={here.viewport.h} />}
      <g transform={`translate(${px} ${py}) rotate(${angle})`} className="map-player">
        <circle r="0.48" className="map-player-halo" />
        <path d="M0 -0.42L0.32 0.27L0 0.12L-0.32 0.27Z" />
      </g>
    </svg>
  );
}

export function MapLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`map-legend ${compact ? 'compact' : ''}`} aria-label="Map legend">
      <span><i className="legend-player" />You</span>
      <span><i className="legend-goal" />Story goal</span>
      <span><i className="legend-exit" />Exit</span>
      {!compact && <><span><i className="legend-point" />Character</span><span><i className="legend-service" />Save / heal / shop</span><span><i className="legend-chest" />Chest / supplies</span></>}
    </div>
  );
}
