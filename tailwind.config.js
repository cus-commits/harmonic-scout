/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        'card-hi': 'rgb(var(--card-hi) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        bright: 'rgb(var(--bright) / <alpha-value>)',
        'bright-2': 'var(--bright-2)',
        'bright-3': 'var(--bright-3)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-2': 'var(--muted-2)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          2: 'rgb(var(--accent-2) / <alpha-value>)',
          glow: 'var(--accent-glow)',
        },
        bo: 'rgb(var(--bo) / <alpha-value>)',
        boro: 'rgb(var(--boro) / <alpha-value>)',
        sm: 'rgb(var(--sm) / <alpha-value>)',
        amber: 'rgb(var(--amber) / <alpha-value>)',
        rose: 'rgb(var(--rose) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
      borderRadius: {
        'pill': '6px',
        'btn': '10px',
        'card': '14px',
        'modal': '20px',
      },
    },
  },
  plugins: [],
}
