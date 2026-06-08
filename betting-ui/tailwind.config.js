/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Joseph's iwallet design system (frontend/src/app/globals.css)
        ink: '#e5eef1',
        muted: '#92979d',
        line: 'rgba(229, 238, 241, 0.1)',
        bg: '#101113',
        card: '#131416',
        surface: '#131416',
        surfaceRaised: '#222328',
        positive: '#1FB87D',
        positiveBg: 'rgba(31, 184, 125, 0.12)',
        negative: '#E64545',
        negativeBg: 'rgba(230, 69, 69, 0.12)',
        accent: '#fbff6c',
        accentSoft: 'rgba(251, 255, 108, 0.1)',
        accentInk: '#131416',
      },
      fontFamily: {
        sans: ['Satoshi-Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 1px rgba(0, 0, 0, 0.2)',
        cardHover: '0 4px 12px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
