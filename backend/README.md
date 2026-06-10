# I-Wallet backend

Hono (Node) service: the **agent trade feed** the dashboard reads, the **Enoki
sponsorship** routes (gasless iWallet creation), the gas-station routes, and the
agent service (create_iidentity + SuiNS leaf subname). Long-running web service —
bind to `$PORT`, in-memory feed (resets on restart).

## Routes
| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/trades` | `X-IWALLET-API-KEY` | agent posts a trade |
| `GET` | `/trades` | public (CORS) | global feed |
| `GET` | `/trades/identity/:id` | public (CORS) | per-iWallet feed |
| `POST` | `/enoki/sponsor`, `/enoki/execute` | public (allowlist-bounded) | Enoki sponsored txs |
| `POST` | `/sponsor/setup`, `/agent/execute` | `X-IWALLET-API-KEY` | gas station |

## Env
| Var | Required | Notes |
|---|---|---|
| `API_SECRET` | yes | gates writes; must match the agent's `BACKEND_API_KEY` |
| `PORT` | auto | injected by the host; falls back to 3000 locally |
| `SPONSOR_PRIVATE_KEY` | no | only for the legacy self-managed gas-station routes |
| `ENOKI_PRIVATE_API_KEY` | for sponsorship | Enoki **private** key — powers `/enoki/sponsor` + `/enoki/execute` (gasless iWallet creation). Never put this in the frontend. |
| `ENOKI_NETWORK` | no | `testnet` (default) / `mainnet` / `devnet` |
| `PK` | for AgentService | keypair that signs `createAgent` (create_iidentity + SuiNS subname) |

### Enoki sponsored transactions
`POST /enoki/sponsor` ({ transactionKindBytes, sender, allowedMoveCallTargets }) → `{ bytes, digest }`,
then `POST /enoki/execute` ({ digest, signature }) → executes (Enoki pays gas). Both are **public**
(CORS) — abuse is bounded by the move-call allowlist you set per request + in the Enoki portal.
The portal allowlist must include `0x1::option::none`, `<pkg>::prototype::create_iidentity`, and
`<pkg>::prototype::set_policy` for the **current** package id (see `Published.toml`).

## Run locally
```bash
pnpm install            # npm install also works
API_SECRET=devsecret pnpm dev      # tsx watch on :3000
```

> `pnpm build` runs `tsc` as a typecheck only (tsconfig is `noEmit` because the
> source imports `.ts` extensions). `pnpm start` therefore runs via `tsx`, not
> `node dist/` — keep it that way or the deploy breaks.

## Deploy on Render
1. **render.com → New → Blueprint**, pick this repo. Render reads `render.yaml` at the
   root and provisions the `iwallet-backend` web service (rootDir `backend`,
   `npm install` → `npm start`).
   - *Or* **New → Web Service** manually: Root Directory `backend`, Build `npm install`,
     Start `npm start`.
2. **Environment → add** `API_SECRET` = a secret of your choice.
3. Deploy → you get `https://iwallet-backend.onrender.com`.

Then point the others at it:
- **Frontend (Vercel):** set `NEXT_PUBLIC_BACKEND_URL` = that URL → redeploy.
- **Agent (`agent/.env`):** `BACKEND_URL` = that URL, `BACKEND_API_KEY` = the same `API_SECRET`.

> Free tier sleeps after ~15 min idle (first request cold-starts ~30s) and the in-memory
> feed clears on restart — fine for demos. Use a paid instance or add a DB to persist.
