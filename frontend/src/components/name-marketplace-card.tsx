/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Droplet, ShieldCheck, Activity, Cpu } from "lucide-react";
import { Avatar as DiceBearAvatar } from "@dicebear/core";
import bigEars from "@dicebear/styles/big-ears.json";

// --- Types ---
type AgentActivityItem = {
  id: string;
  handle: string;
  activity: string;
  value: string;
  txHash: string;
  statusColor: string;
};

// --- Mock Data ---
const baseAgents: AgentActivityItem[] = [
  { id: "1", handle: "@alpha-trader", activity: "Awaiting Mandate", value: "0.00", txHash: "0x3a...d91", statusColor: "text-gray-400" },
  { id: "2", handle: "@deepbook-bot", activity: "Monitoring Pools", value: "420.50", txHash: "0x7d...49j", statusColor: "text-cyan-400" },
  { id: "3", handle: "@zk-guard", activity: "Idle Security", value: "0.00", txHash: "0xe5...22c", statusColor: "text-amber-500" },
  { id: "4", handle: "@liquidity-elf", activity: "Yield Farming", value: "25.00", txHash: "0x9b...11a", statusColor: "text-emerald-400" },
  { id: "5", handle: "@claude-agent", activity: "Analyzing Prompts", value: "14.98", txHash: "0x47...482", statusColor: "text-purple-400" },
];

// Duplicate list for infinite smooth loop execution
const marqueeItems = [...baseAgents, ...baseAgents, ...baseAgents];

// --- Robot Avatar Loader ---
const AgentAvatar = ({ seed }: { seed: string }) => {
  const avatarUri = useMemo(() => {
    const avatar = new DiceBearAvatar(bigEars, {
      seed,
      // Softer pastel backgrounds look much better with the Big Ears style
      backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
      size: 12,
    });
    return avatar.toDataUri();
  }, [seed]);

  return (
    <img
      src={avatarUri}
      alt="Agent Identity"
      className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-slate-900/50"
    />
  );
};

export default function IWalletMonitorCard() {
  // Simulation States
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveAgents, setLiveAgents] = useState<AgentActivityItem[]>(baseAgents);
  const [metrics, setMetrics] = useState({ active: 1245, volume: 48.2, zkRatio: 99.4 });

  // Live Blockchain State Machine Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Step 1: Select a random agent to trigger an action
      const randomIndex = Math.floor(Math.random() * baseAgents.length);
      const targetAgent = baseAgents[randomIndex];
      
      setActiveId(targetAgent.id);

      // Step 2: Mutate the active agent's state to simulate real-time transactions
      setLiveAgents((prev) =>
        prev.map((agent) => {
          if (agent.id === targetAgent.id) {
            const actions = [
              { activity: "⚡ Placing Trade", value: (Math.random() * 50 + 10).toFixed(2), statusColor: "text-cyan-400 font-bold" },
              { activity: "🛡️ Verifying ZK Proof", value: "0.00", statusColor: "text-amber-400 font-bold tracking-wide animate-pulse" },
              { activity: "💸 Executing Service Pay", value: (Math.random() * 5 + 1).toFixed(2), statusColor: "text-purple-400 font-bold" },
            ];
            return { ...agent, ...actions[Math.floor(Math.random() * actions.length)] };
          }
          return agent;
        })
      );

      // Step 3: Roll up global metrics in sync with the action
      setMetrics((m) => ({
        active: m.active + Math.floor(Math.random() * 3),
        volume: parseFloat((m.volume + Math.random() * 5).toFixed(1)),
        zkRatio: parseFloat((99.4 + Math.random() * 0.5).toFixed(1)),
      }));

      // Step 4: Cool down and return to smooth streaming state
      setTimeout(() => {
        setActiveId(null);
      }, 2500);

    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#05030a] p-4 sm:p-6 font-sans antialiased">
      
      {/* Outer Card Wrapper with Neon Glow Base */}
      <div className="relative w-full max-w-5xl rounded-3xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 p-[1px] shadow-[0_0_80px_rgba(99,102,241,0.1)]">
        
        {/* Core Frame Layout */}
        <div className="relative flex flex-col md:flex-row w-full h-full bg-[#0a0714]/98 backdrop-blur-3xl rounded-[23px] overflow-hidden">
          
          {/* Futuristic Dotted Grid */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '20px 20px' }}
          />

          {/* LEFT SIDE PANEL: Title & Description */}
          <div className="relative z-20 flex-1 p-6 sm:p-10 md:p-14 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 w-fit mb-6">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">On-Chain Privacy Layer</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-4">
              Monitor Agentic <br /> Activity Live
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-sm leading-relaxed">
              I-Wallet provides secure, keyless identity for autonomous AI agents using ZK-proofs and Sui&apos;s object architecture—preventing prompt injections and key thefts.
            </p>
          </div>

          {/* RIGHT SIDE PANEL: Live Stream Engine */}
          <div className="relative z-20 flex-1 h-[400px] sm:h-[480px] md:h-[540px] flex flex-col justify-between p-4 sm:p-6">
            
            {/* Smooth Top & Bottom Clipping Overlays */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0714] to-transparent z-30 pointer-events-none" />
            <div className="absolute bottom-[90px] left-0 right-0 h-20 bg-gradient-to-t from-[#0a0714] to-transparent z-30 pointer-events-none" />

            {/* Extended Overflow Container (Fixed clipping boundary walls) */}
            <div className="relative flex-1 overflow-hidden px-8 -mx-8 py-4 -my-4">
              <div className="absolute left-8 right-8 animate-marquee-y flex flex-col gap-3.5 backface-hidden transform-gpu">
                {marqueeItems.map((item, index) => {
                  // Connect looped cards back to their synchronized state engine reference
                  const currentLiveState = liveAgents.find((a) => a.id === item.id) || item;
                  const isActive = currentLiveState.id === activeId;

                  return (
                    <div
                      key={`${item.id}-${index}`}
                      style={{ transform: isActive ? "scale(1.05)" : "scale(1)" }}
                      className={`relative flex items-center justify-between p-4 rounded-2xl transition-all duration-500 ease-out will-change-transform ${
                        isActive
                          ? "bg-gradient-to-r from-purple-600/20 via-pink-600/15 to-indigo-600/20 border border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)] z-40 opacity-100"
                          : "bg-white/[0.02] border border-white/5 z-10 opacity-35 filter blur-[0.4px]"
                      }`}
                    >
                      {/* Identity Details */}
                      <div className="flex items-center gap-4">
                        <AgentAvatar seed={currentLiveState.handle} />
                        <div className="flex flex-col">
                          <span className="text-white font-semibold text-base tracking-wide">{currentLiveState.handle}</span>
                          <span className={`text-xs transition-colors duration-300 ${currentLiveState.statusColor}`}>
                            {currentLiveState.activity}
                          </span>
                        </div>
                      </div>
                      
                      {/* Operational Value Metrics */}
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                          {currentLiveState.activity.includes("ZK") ? (
                            <ShieldCheck className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                          ) : (
                            <Droplet className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                          )}
                          <span className="font-bold text-base text-white font-mono">
                            {currentLiveState.activity.includes("ZK") ? "Verified" : currentLiveState.value}
                          </span>
                        </div>
                        <span className="text-slate-500 text-xs font-mono mt-0.5">{currentLiveState.txHash}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Synchronized Live Performance Metrics Bar */}
            <div className="relative z-40 mt-4 backdrop-blur-md bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex justify-between items-center px-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-purple-400" /> Active Agents
                </span>
                <span className="text-white font-bold text-lg font-mono transition-all duration-300">
                  {metrics.active.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-cyan-400" /> Volume
                </span>
                <div className="flex items-center gap-0.5">
                  <Droplet className="w-3.5 h-3.5 fill-cyan-500 text-cyan-500" />
                  <span className="text-white font-bold text-lg font-mono transition-all duration-300">
                    {metrics.volume}k
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" /> Proof Success
                </span>
                <span className="text-white font-bold text-lg font-mono transition-all duration-300">
                  {metrics.zkRatio}%
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Embedded Stylesheet containing GPU accelerated layout variables */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-y {
          0% { transform: translateY(0); }
          100% { transform: translateY(-33.3333%); }
        }
        .animate-marquee-y {
          animation: marquee-y 22s linear infinite;
        }
        .animate-marquee-y:hover {
          animation-play-state: paused;
        }
      `}} />
    </div>
  );
}