import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';

type Point = { time: number; value: number };

type Props = {
  data: Point[];
  height?: number;
  tone?: 'up' | 'down' | 'neutral';
};

const TONE_COLORS: Record<NonNullable<Props['tone']>, {
  line: string;
  top: string;
  bottom: string;
}> = {
  up: {
    line: '#1FB87D',
    top: 'rgba(31, 184, 125, 0.35)',
    bottom: 'rgba(31, 184, 125, 0)',
  },
  down: {
    line: '#E64545',
    top: 'rgba(230, 69, 69, 0.32)',
    bottom: 'rgba(230, 69, 69, 0)',
  },
  neutral: {
    line: '#fbff6c',
    top: 'rgba(251, 255, 108, 0.36)',
    bottom: 'rgba(251, 255, 108, 0)',
  },
};

export default function OddsChart({ data, height = 56, tone = 'neutral' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const colors = TONE_COLORS[tone];

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#92979d',
        fontSize: 9,
      },
      rightPriceScale: { visible: false, borderVisible: false },
      leftPriceScale: { visible: false, borderVisible: false },
      timeScale: { visible: false, borderVisible: false },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Hidden,
        vertLine: { visible: false, labelVisible: false, style: LineStyle.Solid },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addAreaSeries({
      lineColor: colors.line,
      topColor: colors.top,
      bottomColor: colors.bottom,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    series.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })),
    );
    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.resize(containerRef.current.clientWidth, height);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data, height, tone]);

  return <div ref={containerRef} style={{ height, width: '100%' }} />;
}
