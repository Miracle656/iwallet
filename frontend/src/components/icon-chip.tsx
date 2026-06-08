export function IconChip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <span
      className={`grid h-10 w-10 place-items-center rounded-2xl border ${
        tone === "accent"
          ? "border-accent/25 bg-accent/10 text-accent"
          : "border-border bg-elevated text-ink"
      }`}
    >
      {children}
    </span>
  );
}
