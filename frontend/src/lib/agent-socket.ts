"use client";

import { useEffect, useRef, useState } from "react";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL ?? "").replace(/\/$/, "");

export type SocketTrade = {
  id: string;
  identityId: string;
  agentName?: string;
  pool: string;
  side: "bid" | "ask";
  quantity: string;
  price: string;
  status: "success" | "rejected" | "failed";
  ts: number;
  [key: string]: unknown;
};

type SocketOptions = {
  identityId?: string;
  onTrade?: (trade: SocketTrade) => void;
};

/**
 * Connects to the backend Socket.io server for live agent events.
 * Falls back gracefully if the backend doesn't have socket.io configured yet.
 * Requires `socket.io-client` — install: `yarn add socket.io-client`
 */
export function useAgentSocket({ identityId, onTrade }: SocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [trades, setTrades] = useState<SocketTrade[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!BACKEND) return;

    let socket: ReturnType<typeof import("socket.io-client")["io"]>;

    // Dynamic import so the module doesn't break SSR or builds where socket.io-client isn't installed yet
    import("socket.io-client")
      .then(({ io }) => {
        socket = io(BACKEND, {
          transports: ["websocket", "polling"],
          reconnectionDelay: 3000,
          reconnectionDelayMax: 10000,
          autoConnect: true,
        });

        socket.on("connect", () => setConnected(true));
        socket.on("disconnect", () => setConnected(false));
        socket.on("connect_error", () => {
          // Backend doesn't have socket.io yet — suppress, keep retrying
        });

        socket.on("trade", (trade: SocketTrade) => {
          if (identityId && trade.identityId !== identityId) return;
          setTrades((prev) => [trade, ...prev].slice(0, 100));
          onTrade?.(trade);
        });

        // Join identity room if provided
        if (identityId) socket.emit("join", { identityId });

        socketRef.current = socket;
      })
      .catch(() => {
        // socket.io-client not installed — noop, polling fallback will handle it
      });

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityId]);

  return { connected, trades, socket: socketRef };
}
