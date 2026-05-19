export function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-[#131416] p-5">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#92979d]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-[#e5eef1]">{value}</p>
      {helper ? <p className="mt-2 text-sm leading-6 text-[#92979d]">{helper}</p> : null}
    </div>
  );
}
