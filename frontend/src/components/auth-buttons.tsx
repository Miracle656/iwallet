"use client";

import { ZkLoginButton } from "@/components/zklogin-button";

export function AuthButtons({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <ZkLoginButton />
    </div>
  );
}
