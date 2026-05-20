import type { Market } from './types';

/**
 * Browsable demo markets (Polymarket-style). These are illustrative — the
 * REAL agent activity (markets the agent minted + bet into, proof-verified)
 * is the Agent Feed, which is 100% live from the harness.
 */
export const MARKETS: Market[] = [
  {
    id: 'mkt-soccer-demo',
    sport: 'soccer',
    sportLabel: 'Soccer',
    home: 'Djurgardens IF',
    away: 'IK Sirius',
    homeOdds: 1.49,
    awayOdds: 4.6,
    volume: 50_000_000,
    closesAt: Date.now() + 6 * 24 * 3600 * 1000,
  },
  {
    id: 'mkt-atp-khachanov',
    sport: 'tennis',
    sportLabel: 'Tennis',
    home: 'K. Khachanov',
    away: 'H. Gaston',
    homeOdds: 1.55,
    awayOdds: 2.35,
    volume: 18_400_000,
    closesAt: Date.now() + 4 * 3600 * 1000,
  },
  {
    id: 'mkt-atp-paul',
    sport: 'tennis',
    sportLabel: 'Tennis',
    home: 'T. Paul',
    away: 'T.M. Etcheverry',
    homeOdds: 1.55,
    awayOdds: 2.78,
    volume: 9_900_000,
    closesAt: Date.now() + 7 * 3600 * 1000,
  },
  {
    id: 'mkt-ipl-rr-lsg',
    sport: 'cricket',
    sportLabel: 'Cricket',
    home: 'Rajasthan Royals',
    away: 'Lucknow Super Giants',
    homeOdds: 2.43,
    awayOdds: 1.45,
    volume: 31_200_000,
    closesAt: Date.now() + 22 * 3600 * 1000,
  },
  {
    id: 'mkt-ncaa-ncst-duke',
    sport: 'baseball',
    sportLabel: 'Baseball',
    home: 'NC State',
    away: 'Duke',
    homeOdds: 1.16,
    awayOdds: 4.1,
    volume: 5_400_000,
    closesAt: Date.now() + 30 * 3600 * 1000,
  },
  {
    id: 'mkt-wta-frech',
    sport: 'tennis',
    sportLabel: 'Tennis',
    home: 'M. Frech',
    away: 'L. Fernandez',
    homeOdds: 1.8,
    awayOdds: 1.95,
    volume: 12_000_000,
    closesAt: Date.now() + 5 * 3600 * 1000,
  },
];

export const CATEGORIES = [
  'Trending',
  'Soccer',
  'Tennis',
  'Cricket',
  'Baseball',
  'Basketball',
  'Esports',
] as const;

const SPORT_ICON: Record<string, string> = {
  soccer: '⚽',
  tennis: '🎾',
  cricket: '🏏',
  baseball: '⚾',
  basketball: '🏀',
};

export function sportIcon(sport: string): string {
  return SPORT_ICON[sport] ?? '🎯';
}

/** Decimal odds -> implied probability %. */
export function impliedPct(decimal: number): number {
  return Math.round((1 / decimal) * 100);
}

export function fmtVolume(v?: number): string {
  if (!v) return '—';
  const sui = v / 1e9;
  if (sui >= 1) return `${sui.toFixed(1)} SUI`;
  return `${(v / 1e6).toFixed(1)}M MIST`;
}
