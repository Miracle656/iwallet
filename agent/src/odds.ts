/**
 * Thin wrapper around the-odds-api.com (https://the-odds-api.com/).
 * Phase 3: real fetch; today: stubs out an empty list.
 */

export type Outcome = 'home' | 'away' | 'draw';

export type OddsEvent = {
  /** the-odds-api event id; we carry this forward to bind picks → markets */
  id: string;
  sport: string;
  home: string;
  away: string;
  /** unix ms */
  commenceTime: number;
  /** decimal odds (e.g. 1.85). Converted to bps before going on-chain. */
  bookmakerOdds: {
    home: number;
    away: number;
    draw?: number;
  };
};

export async function fetchUpcomingOdds(): Promise<OddsEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn('[odds] ODDS_API_KEY not set — returning empty list');
    return [];
  }

  // TODO Phase 3: real call. Sketch:
  //
  //   const url = new URL('https://api.the-odds-api.com/v4/sports/upcoming/odds');
  //   url.searchParams.set('apiKey', apiKey);
  //   url.searchParams.set('regions', 'eu');
  //   url.searchParams.set('markets', 'h2h');
  //   const res = await fetch(url);
  //   const raw = await res.json();
  //   return normalize(raw);

  return [];
}

/** Convert decimal odds (1.85) → basis points (18500) for the on-chain market. */
export function oddsToBps(decimal: number): number {
  return Math.round(decimal * 10000);
}
