export default function Header() {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-card">
            <span className="text-sm font-bold">iW</span>
          </div>
          <span className="text-lg font-bold tracking-tight">I-Wallet</span>
          <span className="ml-1 rounded-full bg-accentSoft px-2 py-0.5 text-[11px] font-semibold text-accent">
            testnet
          </span>
        </div>

        <div className="relative hidden flex-1 md:block">
          <input
            className="h-10 w-full rounded-xl border border-line bg-bg px-4 text-sm outline-none placeholder:text-muted focus:border-accent"
            placeholder="Search markets…"
          />
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
          <a className="hover:text-ink" href="#">How it works</a>
          <a className="hover:text-ink" href="#">Agents</a>
        </nav>

        <button className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accentInk hover:opacity-90">
          Connect
        </button>
      </div>
    </header>
  );
}
