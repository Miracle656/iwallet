export function IconChip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <span
      className={`grid h-10 w-10 place-items-center rounded-2xl border ${
        tone === "accent"
          ? "border-[#fbff6c]/25 bg-[#fbff6c]/10 text-[#fbff6c]"
          : "border-white/10 bg-[#222328] text-[#e5eef1]"
      }`}
    >
      {children}
    </span>
  );
}
