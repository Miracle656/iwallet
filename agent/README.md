# I-Wallet Agent — Trojan Horse Sports-Bet Demo

Off-chain daemon that drives the demo: fetch live odds → ask Claude to pick
value bets → submit them through the I-Wallet contract (ZK proof + mandate
gate) into the `sportsbook` package → log to Walrus.

This is **scaffolding** (Phase 2 of the 39-day roadmap). Every external call is
stubbed; real implementations land in Phase 3 (June 5–15).

## Layout

```
src/
  index.ts     # main loop / tick
  odds.ts      # the-odds-api.com client (stub)
  picks.ts     # Claude API value-bet selection (stub)
  iwallet.ts   # I-Wallet + sportsbook tx builders (stub)
  walrus.ts    # audit-trail blob writer (stub)
```

## Run

```sh
cp .env.example .env
# fill in keys + object IDs
npm install
npm start
```

## What's intentionally not done yet

- The exact `execute_*` Move call shape — blocked on `[TBD-4]` (final contract
  signatures) and `[TBD-1]` (hashing primitive) from `docs/INTEGRATION_SPEC.md`.
  See George (@oxgeorgegoldman).
- Real odds fetch — needs an `ODDS_API_KEY` from https://the-odds-api.com/.
- Real Claude calls — uses `@anthropic-ai/sdk` against `claude-opus-4-7`
  (latest as of 2026-05). Reads `ANTHROPIC_API_KEY`.
- Walrus writes — uses the official Walrus client when wired in Phase 3.
