/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'isro': {
          'blue': '#003366',
          'darkblue': '#001a33',
          'lightblue': '#4da6ff',
          'orange': '#ff6600',
          'gold': '#ffc107',
          'green': '#28a745',
          'red': '#dc3545',
          'dark': '#0a0e17',
          'darker': '#060a12',
          'card': '#111827',
          'surface': '#1a2332',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
