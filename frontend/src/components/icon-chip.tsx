export function IconChip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" }) {
  return (
    <span
      className={`grid h-10 w-10 place-items-center rounded-2xl border ${
        tone === "accent"
          ? "border-[#298dff]/25 bg-[#298dff]/10 text-[#298dff]"
          : "border-white/10 bg-[#222328] text-[#e5eef1]"
      }`}
    >
      {children}
    </span>
  );
}
