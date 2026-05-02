/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: '#221e1a',
        'ink-2': '#1c1815',
        surface: '#2e2a25',
        card: '#36322c',
        'card-hi': '#3d3830',
        border: '#4a443c',
        bright: '#faf6ef',
        'bright-2': 'rgba(250, 246, 239, 0.72)',
        'bright-3': 'rgba(250, 246, 239, 0.50)',
        muted: '#b8aea0',
        'muted-2': 'rgba(184, 174, 160, 0.66)',
        accent: {
          DEFAULT: '#e6c79a',
          2: '#f0d9b6',
          glow: 'rgba(230, 199, 154, 0.14)',
        },
        bo: '#93dafd',
        boro: '#d3c5fe',
        sm: '#86efc8',
        amber: '#fcc94d',
        rose: '#fb8a99',
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
