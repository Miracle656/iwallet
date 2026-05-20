/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1217',
        muted: '#5D6671',
        line: '#E5E8EC',
        bg: '#F7F8FA',
        card: '#FFFFFF',
        positive: '#1FB87D',
        positiveBg: '#E6F8F0',
        negative: '#E64545',
        negativeBg: '#FCEAEA',
        accent: '#2D5BFF',
        accentSoft: '#EEF2FF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(15, 23, 42, 0.02)',
        cardHover: '0 4px 12px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
