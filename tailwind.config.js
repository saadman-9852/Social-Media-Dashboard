/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#161A2B',
        inkLight: '#232A45',
        paper: '#FAF8F4',
        paperDim: '#F0EDE6',
        signal: '#3B5BFF',
        signalDark: '#2A44D6',
        coral: '#FF6B5E',
        sage: '#5B8C6E',
        slate: {
          450: '#6B7280',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22,26,43,0.04), 0 4px 16px rgba(22,26,43,0.06)',
      },
    },
  },
  plugins: [],
};
