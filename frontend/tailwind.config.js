/** @type {import('tailwindcss').Config} */
// Cascade — "Premium Student Portal" design system.
// Brief: elegant, calm, premium, non-distracting. NOT terminal, NOT generic blue/purple SaaS.
// Style: editorial / paper-reading minimalism. Warm cream surfaces, warm-ink text,
// a single restrained accent (deep teal-green "ink-emerald"), soft amber for highlight.
// Type: Fraunces (elegant serif display) + Jost (refined geometric sans body).
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // semantic tokens (CSS vars -> light, warm, premium)
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        // brand accent — deep, refined teal-green ink (not bright, not blue)
        accent: {
          50: '#f1f7f5', 100: '#dcebe6', 200: '#bbd8ce', 300: '#8fbcae',
          400: '#5d9a89', 500: '#3d7d6c', 600: '#2f6457', 700: '#285247',
          800: '#22423a', 900: '#1d3731',
        },
        // warm highlight (sparingly) + status (muted, elegant)
        gold: '#b08945',
        success: '#3d7d6c',
        warn: '#b0823a',
        danger: '#a8443a',
      },
      fontFamily: {
        // serif display for headings (elegant/editorial), sans for body (calm/legible)
        serif: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans: ['Jost', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: {
        // soft, premium elevation (low-contrast, warm)
        soft: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.05)',
        lift: '0 2px 4px rgba(28,25,23,0.05), 0 12px 32px rgba(28,25,23,0.08)',
      },
      transitionDuration: { DEFAULT: '200ms' },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-in-up': 'fade-in-up 360ms cubic-bezier(0.22,1,0.36,1) both' },
    },
  },
  plugins: [],
};
