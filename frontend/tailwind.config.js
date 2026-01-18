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
          'primary-light': '#34D399',
          'primary-dark': '#059669',
          dark: '#0D1117',           // Mais profundo para 2026
          'dark-light': '#0F172A',   // Original para fallback
          card: '#1E293B',
          'card-glass': 'rgba(30, 41, 59, 0.7)',
          text: '#F1F5F9',
          muted: '#94A3B8',
          border: 'rgba(148, 163, 184, 0.1)',
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
      },
      // Warm Minimalism 2026 - Border Radius aumentado
      borderRadius: {
        'sm': '0.5rem',     // 8px (era 6px)
        'md': '0.75rem',    // 12px (era 8px)
        'lg': '1rem',       // 16px (era 12px)
        'xl': '1.25rem',    // 20px (era 16px)
        '2xl': '1.5rem',    // 24px (novo)
        '3xl': '2rem',      // 32px (novo)
        'full': '9999px',
      },
      // Sombras suaves com maior blur
      boxShadow: {
        'warm-sm': '0 2px 8px -2px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
        'warm-md': '0 8px 24px -8px rgba(0, 0, 0, 0.2), 0 4px 8px -4px rgba(0, 0, 0, 0.1)',
        'warm-lg': '0 16px 48px -16px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.15)',
        'warm-xl': '0 24px 64px -24px rgba(0, 0, 0, 0.3), 0 12px 24px -12px rgba(0, 0, 0, 0.2)',
        'glow': '0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      // Backdrop blur para glassmorphism
      backdropBlur: {
        'xs': '2px',
        'glass': '12px',
      },
      // Gradientes
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
