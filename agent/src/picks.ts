import Anthropic from '@anthropic-ai/sdk';
import type { OddsEvent, Outcome } from './odds.js';

export type Pick = {
  /**
   * Sportsbook Move object ID this pick will be submitted against.
   * Currently the-odds-api event.id (placeholder) — real Sui market object
   * IDs land once sportsbook is deployed and markets are created per event.
   */
  marketId: string;
  outcome: Outcome;
  /** stake amount in the staking coin's base units (e.g. MIST for SUI) */
  stake: number;
  /** decimal odds for the chosen outcome (e.g. 1.85) */
  odds: number;
  /** Claude's one-line rationale — surfaced in the UI + audit trail */
  rationale: string;
};

const MAX_PICKS = Number(process.env.MANDATE_MAX_PICKS_PER_TICK ?? '3');
const MAX_STAKE = Number(process.env.MANDATE_MAX_STAKE_PER_BET ?? '1000000');
const MIN_EV = Number(process.env.MIN_EV ?? '0.03');
const MODEL = process.env.CLAUDE_MODEL ?? 'claude-opus-4-7';

const SYSTEM = `You are an autonomous sports-betting agent operating under a strict mandate.

Job: given upcoming events with decimal odds, identify positive-EV bets and propose stakes.

Strategy:
- Implied probability for an outcome = 1 / decimal_odds.
- Estimate true probability using context (sport, matchup, recent form, surface for tennis, etc.).
- EV = true_p * decimal_odds - 1. Only consider outcomes with EV >= ${MIN_EV}.
- Size via quarter-Kelly: stake_fraction = 0.25 * max(0, (true_p * odds - 1) / (odds - 1)).
  Convert to base units: stake = round(stake_fraction * ${MAX_STAKE}); cap at ${MAX_STAKE}.

Mandate:
- At most ${MAX_PICKS} picks per tick.
- Stake per bet must be a positive integer <= ${MAX_STAKE}.
- Skip events where you have low confidence; an empty picks list is acceptable.

Output rules:
- Use the submit_picks tool only — no prose, no text outside tool input.
- rationale: ONE concise sentence (<= 25 words) explaining the edge.
- marketId: use the event.id from the input verbatim.
- outcome: one of "home" | "away" | "draw".`;

type SubmitPicksInput = { picks: Pick[] };

const client = new Anthropic();

export async function pickBets(events: OddsEvent[]): Promise<Pick[]> {
  if (events.length === 0) return [];
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[picks] ANTHROPIC_API_KEY not set — returning empty list');
    return [];
  }

  const compact = events.slice(0, 30).map((e) => ({
    id: e.id,
    sport: e.sport,
    home: e.home,
    away: e.away,
    commenceAt: new Date(e.commenceTime).toISOString(),
    odds: e.bookmakerOdds,
  }));

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
    ],
    tools: [
      {
        name: 'submit_picks',
        description: 'Submit value-bet picks for this tick.',
        input_schema: {
          type: 'object',
          properties: {
            picks: {
              type: 'array',
              maxItems: MAX_PICKS,
              items: {
                type: 'object',
                properties: {
                  marketId: { type: 'string' },
                  outcome: { type: 'string', enum: ['home', 'away', 'draw'] },
                  stake: { type: 'integer', minimum: 1, maximum: MAX_STAKE },
                  odds: { type: 'number', minimum: 1.01 },
                  rationale: { type: 'string', maxLength: 200 },
                },
                required: ['marketId', 'outcome', 'stake', 'odds', 'rationale'],
              },
            },
          },
          required: ['picks'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_picks' },
    messages: [{ role: 'user', content: JSON.stringify({ events: compact }) }],
  });

  for (const block of msg.content) {
    if (block.type === 'tool_use' && block.name === 'submit_picks') {
      const input = block.input as SubmitPicksInput;
      // Defense-in-depth: re-validate against the same caps the schema enforces.
      return (input.picks ?? [])
        .filter(
          (p) =>
            Number.isInteger(p.stake) &&
            p.stake > 0 &&
            p.stake <= MAX_STAKE &&
            ['home', 'away', 'draw'].includes(p.outcome),
        )
        .slice(0, MAX_PICKS);
    }
  }
  return [];
}
