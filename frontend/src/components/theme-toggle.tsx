"use client";

import { useEffect, useState } from "react";
import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi2";

/** Toggles the `.light` class on <html> and persists it. Default = dark. */
export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-elevated text-ink transition hover:border-accent/40 hover:text-accent"
    >
      {light ? <HiOutlineMoon /> : <HiOutlineSun />}
    </button>
  );
}
