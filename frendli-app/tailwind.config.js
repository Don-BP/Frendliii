/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00E5D4',
          foreground: '#1A1A2E',
        },
        mint: {
          DEFAULT: '#00D97E',
        },
        lilac: {
          DEFAULT: '#B99FD8',
        },
        mauve: {
          DEFAULT: '#C0ADCC',
        },
        greige: {
          DEFAULT: '#A899B3',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F7FEFF',
        },
        destructive: '#E53935',
      },
      fontFamily: {
        'sans': ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'display': ['PlusJakartaSans_800ExtraBold'],
        'heading': ['PlusJakartaSans_700Bold'],
        'subheading': ['PlusJakartaSans_600SemiBold'],
      }
    },
  },
  plugins: [],
}
