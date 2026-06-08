"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { fetchMidPrice, type Pool } from "@/lib/deepbook";

/**
 * Live mid-price chart. DeepBook doesn't expose OHLC cheaply, so we poll the
 * mid price and plot it as an area line that grows in real time.
 */
export function PriceChart({ pool, pollMs = 3000 }: { pool: Pool; pollMs?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const dataRef = useRef<{ time: UTCTimestamp; value: number }[]>([]);
  const [mid, setMid] = useState<number | null>(null);

  // create chart once
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#92979d",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)" },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: true },
      height: containerRef.current.clientHeight || 320,
      autoSize: true,
    });
    const series = chart.addAreaSeries({
      lineColor: "#298dff",
      topColor: "rgba(41, 141, 255,0.30)",
      bottomColor: "rgba(41, 141, 255,0)",
      lineWidth: 2,
      priceLineVisible: true,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // reset series data when the pool changes
  useEffect(() => {
    dataRef.current = [];
    seriesRef.current?.setData([]);
  }, [pool.key]);

  // poll mid price and append
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const m = await fetchMidPrice(pool.key);
      if (!alive || m == null) return;
      setMid(m);
      const time = Math.floor(Date.now() / 1000) as UTCTimestamp;
      const last = dataRef.current[dataRef.current.length - 1];
      if (last && last.time === time) {
        last.value = m;
        seriesRef.current?.update(last);
      } else {
        const point = { time, value: m };
        dataRef.current.push(point);
        seriesRef.current?.update(point);
      }
    };
    tick();
    const t = setInterval(tick, pollMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [pool.key, pollMs]);

  return (
    <div className="relative h-full w-full">
      {mid == null && (
        <p className="absolute inset-0 grid place-items-center text-sm text-[#6f747a]">
          Waiting for price…
        </p>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
