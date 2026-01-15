/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        zeni: {
          primary: '#10B981',
          dark: '#0F172A',
          card: '#1E293B',
          text: '#F1F5F9',
          muted: '#94A3B8'
        }
      }
    },
  },
  plugins: [],
}
