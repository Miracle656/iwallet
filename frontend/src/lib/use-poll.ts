import { useEffect } from "react";

/**
 * Poll `fn` every `intervalMs`, but SKIP while the tab is hidden — so a left-open
 * /trade tab (5 pollers) stops hammering the RPC and the dev server when you're
 * not looking. Runs once on mount, then on the interval.
 */
export function usePoll(fn: () => void, intervalMs: number, deps: unknown[]) {
  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      fn();
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
