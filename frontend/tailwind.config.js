/** @type {import('tailwindcss').Config} */
// Design system derived from ui-ux-pro-max skill:
//   style = Dark Mode (OLED); palette = slate + status (green/amber/red);
//   typography = Fira Code (display/mono) + Fira Sans (body).
// Severity colors follow the skill's process-map/DAG chart guidance:
//   happy path #10B981 · deviation/warn #F59E0B · bottleneck/critical #EF4444.
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // semantic tokens (mapped to CSS vars so theming stays token-driven)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        // brand
        cascade: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          800: '#1e40af', 900: '#1e3a5f',
        },
        // severity (skill: color + icon + text; never color alone)
        sev: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#F59E0B',
          low: '#64748B',
        },
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Fira Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      transitionDuration: { DEFAULT: '200ms' }, // skill: 150-300ms micro-interactions
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.45)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 260ms ease-out both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
