export function HashText({ value, chars = 8 }: { value: string; chars?: number }) {
  const display = value.length > chars * 2 + 3 ? `${value.slice(0, chars)}...${value.slice(-chars)}` : value;

  return <span className="font-mono text-xs text-[#b9c2c6]">{display}</span>;
}
