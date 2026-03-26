/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#FF7F61',
        'primary-dark': '#E6684B',
        secondary: '#2D1E4B',
        'secondary-light': '#46326E',
        accent: '#00E5D4',
        cream: '#FFFBF7',
        vanilla: '#FFFAF0',
        sand: '#F5EEE6',
        'warm-border': '#EEEAE3',
        'text-warm': '#8E8271',
        'text-warm-dark': '#9E8FC0',
      },
      fontFamily: {
        bricolage: ['Bricolage Grotesque', 'sans-serif'],
        lexend: ['Lexend', 'sans-serif'],
      },
      boxShadow: {
        'warm-sm': '0 2px 4px rgba(45,30,75,0.04)',
        'warm-md': '0 8px 12px rgba(45,30,75,0.08)',
        'warm-card': '0 4px 20px rgba(45,30,75,0.05)',
        coral: '0 4px 16px rgba(255,127,97,0.35)',
      },
    },
  },
  plugins: [],
}
