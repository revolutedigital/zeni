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
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        // Escala tipográfica baseada em Major Third (1.25)
        'xs': ['0.75rem', { lineHeight: '1.5' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],    // 14px
        'base': ['1rem', { lineHeight: '1.6' }],      // 16px
        'lg': ['1.125rem', { lineHeight: '1.5' }],    // 18px
        'xl': ['1.25rem', { lineHeight: '1.4' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '1.3' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '1.25' }],  // 30px
        '4xl': ['2.25rem', { lineHeight: '1.2' }],    // 36px
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0em',
        wide: '0.02em',
        wider: '0.04em',
      },
      lineHeight: {
        'none': '1',
        'tight': '1.25',
        'snug': '1.375',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '1.75',
      }
    },
  },
  plugins: [],
}
