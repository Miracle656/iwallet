import type { IWallet } from "@/lib/demo-data";

export function BalanceOverview({ wallet }: { wallet: IWallet }) {
  const primaryToken = wallet.balance.tokens[0];
  const lowBalance = !primaryToken || primaryToken.amount < 10;

  return (
    <section className="rounded-[1.8rem] border border-border bg-surface p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-muted">Total balance</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-ink">
            {primaryToken ? `${primaryToken.amount} ${primaryToken.symbol}` : "0 SUI"}
          </p>
          {wallet.balance.totalUsd !== undefined ? <p className="mt-1 text-sm text-muted">≈ ${wallet.balance.totalUsd.toFixed(2)} USD demo value</p> : null}
        </div>
        {lowBalance ? <div className="rounded-full border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm text-orange-200">Low balance</div> : null}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {wallet.balance.tokens.map((token) => (
          <div key={token.symbol} className="rounded-[1.25rem] border border-border p-4 sm:flex-1">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Token</p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <p className="text-lg font-semibold text-ink">{token.symbol}</p>
              <p className="font-mono text-sm text-muted">{token.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
