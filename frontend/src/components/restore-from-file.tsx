"use client";

import { useRef, useState } from "react";
import { addLocalIdentityId } from "@/lib/local-identities";
import { getIdentity } from "@/lib/sui-client";
import {
  HiOutlineArrowUpTray,
  HiOutlineClipboard,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";

type Parsed = Partial<
  Record<"iwallet_id" | "witness_w" | "owner_address" | "identity_hash", string>
>;

function parseRecovery(text: string): Parsed {
  const out: Parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(iwallet_id|witness_w|owner_address|identity_hash)\s*=\s*(.+?)\s*$/);
    if (m) out[m[1] as keyof Parsed] = m[2];
  }
  return out;
}

/**
 * Restore an iWallet from its downloaded recovery file. Re-adds the iWallet to
 * the dashboard (view) and surfaces the agent config (object id + secret
 * witness) so the owner can restore the agent's ability to trade.
 */
export function RestoreFromFile({ onRestored }: { onRestored?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [agentCfg, setAgentCfg] = useState<{ id: string; witness: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function onFile(file: File) {
    setBusy(true);
    setMsg(null);
    setAgentCfg(null);
    try {
      const p = parseRecovery(await file.text());
      if (!p.iwallet_id || !/^0x[0-9a-fA-F]{6,}$/.test(p.iwallet_id)) {
        throw new Error("No valid iwallet_id in this file — re-download it from the create success screen.");
      }
      const w = await getIdentity(p.iwallet_id);
      if (!w) throw new Error("That iWallet isn't on this network (wrong file or network).");
      addLocalIdentityId(p.iwallet_id);
      setMsg({ kind: "ok", text: `Restored "${w.name}" to your dashboard.` });
      if (p.witness_w) setAgentCfg({ id: p.iwallet_id, witness: p.witness_w });
      onRestored?.();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Restore failed" });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const envBlock = agentCfg
    ? `IIDENTITY_OBJECT_ID=${agentCfg.id}\nAGENT_WITNESS_W=${agentCfg.witness}`
    : "";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink hover:border-accent/40 disabled:opacity-40"
      >
        <HiOutlineArrowUpTray /> {busy ? "Restoring…" : "Restore from recovery file"}
      </button>

      {msg && (
        <p className={`mt-2 text-xs ${msg.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
          {msg.text}
        </p>
      )}

      {agentCfg && (
        <div className="mt-3 rounded-xl border border-orange-300/30 bg-orange-300/5 p-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-200">
            <HiOutlineExclamationTriangle /> Secret — to let the agent trade this iWallet, add to{" "}
            <code className="text-ink">agent/.env</code>:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-canvas p-3 font-mono text-[11px] text-ink">
            {envBlock}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(envBlock);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <HiOutlineClipboard /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
