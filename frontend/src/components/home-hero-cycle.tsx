"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

const steps = [
  { label: "Create iWallet", title: "Secure AI wallets." },
  { label: "Link agent", title: "Link one agent." },
  { label: "Fund", title: "Fund safely." },
  { label: "Monitor", title: "Track every action." },
];

export function HomeHeroCycle() {
  const [active, setActive] = useState(0);
  const [displayed, setDisplayed] = useState(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const currentTitleRef = useRef<HTMLHeadingElement>(null);
  const incomingTitleRef = useRef<HTMLHeadingElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const isAnimating = useRef(false);

  const updateIndicator = useCallback(() => {
    const tab = tabRefs.current[active];
    const parent = tab?.parentElement;
    if (!tab || !parent) return;

    const tabRect = tab.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    setIndicator({ left: tabRect.left - parentRect.left, width: tabRect.width });
  }, [active]);

  useLayoutEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  useLayoutEffect(() => {
    const chars = currentTitleRef.current?.querySelectorAll("[data-title-char]");
    if (!chars?.length) return;

    gsap.set(chars, { yPercent: 0, opacity: 1 });

    gsap.fromTo(
      chars,
      { yPercent: 105, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.62, ease: "power4.out", stagger: 0.015 }
    );
  }, []);

  useLayoutEffect(() => {
    if (incoming === null) return;

    const currentChars = currentTitleRef.current?.querySelectorAll("[data-title-char]");
    const incomingChars = incomingTitleRef.current?.querySelectorAll("[data-title-char]");
    if (!currentChars?.length || !incomingChars?.length) return;

    gsap.set(incomingChars, { yPercent: 105, opacity: 0 });
    gsap.set(currentChars, { yPercent: 0, opacity: 1 });

    const timeline = gsap.timeline({
      defaults: { ease: "power4.out" },
      onComplete: () => {
        const next = incoming;
        setDisplayed(next);
        setIncoming(null);
        window.setTimeout(() => {
          const finalChars = currentTitleRef.current?.querySelectorAll("[data-title-char]");
          if (finalChars?.length) {
            gsap.set(finalChars, { clearProps: "transform,opacity,filter" });
          }
          isAnimating.current = false;
        }, 80);
      },
    });

    timeline.to(currentChars, {
      yPercent: -105,
      opacity: 0,
      duration: 0.46,
      stagger: 0.01,
    });
    timeline.to(
      incomingChars,
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.62,
        stagger: 0.015,
      },
      0.08
    );

    return () => {
      timeline.kill();
    };
  }, [incoming]);

  const goTo = useCallback((next: number) => {
    if (next === active || isAnimating.current) return;
    isAnimating.current = true;
    setActive(next);
    setIncoming(next);
  }, [active]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      goTo((active + 1) % steps.length);
    }, 3400);

    return () => window.clearInterval(interval);
  }, [active, goTo]);

  return (
    <div className="w-full text-center">
      <div className="relative mx-auto flex w-full flex-wrap justify-center gap-2">
        <span
          className="pointer-events-none absolute top-0 h-full rounded-full border border-border transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
        {steps.map((step, index) => (
          <button
            key={step.label}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            onClick={() => goTo(index)}
            className={`relative z-10 cursor-pointer rounded-full border border-transparent px-5 py-3 text-sm transition-colors ${index === active ? "text-ink" : "text-dim"}`}
          >
            <span className="mr-2 font-mono text-xs">{index + 1}</span>
            {index === active ? step.label : null}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-7 flex min-h-[1.35em] w-full items-center justify-center overflow-hidden pb-2">
        <h1
          key={`current-${displayed}`}
          ref={currentTitleRef}
          className="w-full whitespace-nowrap text-center text-[clamp(1.75rem,9vw,4rem)] font-semibold leading-[1.08] tracking-[-0.045em]"
          aria-label={steps[displayed].title}
        >
          <TitleChars text={steps[displayed].title} />
        </h1>
        {incoming !== null ? (
          <h1
            key={`incoming-${incoming}`}
            ref={incomingTitleRef}
            className="absolute inset-x-0 top-0 w-full whitespace-nowrap text-center text-[clamp(1.75rem,9vw,4rem)] font-semibold leading-[1.08] tracking-[-0.045em]"
            aria-label={steps[incoming].title}
          >
            <TitleChars text={steps[incoming].title} />
          </h1>
        ) : null}
      </div>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted">
        Create, fund, and monitor iWallets without exposing your private key.
      </p>
    </div>
  );
}

function TitleChars({ text }: { text: string }) {
  return Array.from(text).map((char, index) => (
    <span key={`${text}-${char}-${index}`} data-title-char className="inline-block will-change-transform">
      {char === " " ? "\u00A0" : char}
    </span>
  ));
}
