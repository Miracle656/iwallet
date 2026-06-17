"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processZkLoginCallback } from "@/lib/zklogin";

type Phase = "processing" | "error";

export default function ZkLoginCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("processing");
  const [error, setError] = useState("");

  useEffect(() => {
    processZkLoginCallback()
      .then(({ address }) => {
        localStorage.setItem("zklogin_address", address);
        router.replace("/dashboard");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setPhase("error");
      });
  }, [router]);

  if (phase === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-6 text-center">
        <p className="text-sm font-medium text-ink">Sign-in failed</p>
        <p className="max-w-sm text-xs text-muted">{error}</p>
        <button
          onClick={() => router.replace("/")}
          className="mt-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-ink hover:border-accent/40 hover:text-accent"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-muted">Completing sign-in…</p>
    </div>
  );
}
