/**
 * Thin wrapper around the-odds-api.com (https://the-odds-api.com/).
 * Live h2h odds for upcoming events; falls back to an empty list when no key.
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

/** Raw shape from the-odds-api v4 /odds (the slice we use). */
type RawEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
};

export async function fetchUpcomingOdds(): Promise<OddsEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn('[odds] ODDS_API_KEY not set — returning empty list');
    return [];
  }

  const region = process.env.ODDS_API_REGION ?? 'eu';
  const url = new URL('https://api.the-odds-api.com/v4/sports/upcoming/odds');
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('regions', region);
  url.searchParams.set('markets', 'h2h');
  url.searchParams.set('oddsFormat', 'decimal');
  url.searchParams.set('dateFormat', 'iso');

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[odds] the-odds-api ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }

  const raw = (await res.json()) as RawEvent[];
  return raw.map(normalize).filter((e): e is OddsEvent => e !== null);
}

/**
 * Pick the first bookmaker that has an h2h market and map its outcomes to
 * home/away/draw by matching team names. Events without usable h2h pricing
 * are dropped (returns null).
 */
function normalize(ev: RawEvent): OddsEvent | null {
  for (const bm of ev.bookmakers ?? []) {
    const h2h = bm.markets?.find((m) => m.key === 'h2h');
    if (!h2h) continue;

    let home: number | undefined;
    let away: number | undefined;
    let draw: number | undefined;
    for (const o of h2h.outcomes) {
      if (o.name === ev.home_team) home = o.price;
      else if (o.name === ev.away_team) away = o.price;
      else if (o.name === 'Draw') draw = o.price;
    }
    if (home === undefined || away === undefined) continue;

    return {
      id: ev.id,
      sport: ev.sport_key,
      home: ev.home_team,
      away: ev.away_team,
      commenceTime: Date.parse(ev.commence_time),
      bookmakerOdds: { home, away, ...(draw !== undefined ? { draw } : {}) },
    };
  }
  return null;
}

/** Convert decimal odds (1.85) → basis points (18500) for the on-chain market. */
export function oddsToBps(decimal: number): number {
  return Math.round(decimal * 10000);
}
