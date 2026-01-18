/**
 * Design Tokens - Zeni Design System
 * Warm Minimalism 2026 Edition
 *
 * Tokens de design centralizados para consistência visual.
 * Esses valores devem corresponder ao tailwind.config.js
 */

export const colors = {
  // Cores da marca - Gradiente Primário 2026
  brand: {
    primary: '#10B981',      // Esmeralda - cor principal
    primaryDark: '#059669',  // Esmeralda escuro - hover
    primaryLight: '#34D399', // Esmeralda claro - gradiente end
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },

  // Cores de fundo - Mais profundo para 2026
  background: {
    dark: '#0D1117',         // Fundo principal (mais profundo)
    darkLight: '#0F172A',    // Fallback/secondary
    card: '#1E293B',         // Cards sólidos
    cardGlass: 'rgba(30, 41, 59, 0.7)', // Cards glassmorphism
    elevated: '#334155',     // Elementos elevados
  },

  // Cores de texto
  text: {
    primary: '#F1F5F9',  // Texto principal
    muted: '#94A3B8',    // Texto secundário
    disabled: '#64748B', // Texto desabilitado
  },

  // Cores semânticas
  semantic: {
    success: '#10B981',  // Sucesso, receitas
    error: '#EF4444',    // Erro, despesas
    warning: '#FBBF24',  // Alerta, pendências
    info: '#3B82F6',     // Informação
  },

  // Cores dos agentes
  agents: {
    registrar: '#10B981',  // Verde
    cfo: '#3B82F6',        // Azul
    guardian: '#F59E0B',   // Âmbar
    educator: '#A855F7',   // Roxo
  },

  // Bordas - Glassmorphism
  border: {
    default: '#475569',
    subtle: '#334155',
    focus: '#10B981',
    glass: 'rgba(148, 163, 184, 0.1)', // Borda sutil para glass
  },

  // Glow effects
  glow: {
    primary: 'rgba(16, 185, 129, 0.15)',
    primaryStrong: 'rgba(16, 185, 129, 0.25)',
  }
}

export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
}

// Warm Minimalism 2026 - Border Radius aumentado
export const borderRadius = {
  sm: '0.5rem',    // 8px (era 6px)
  md: '0.75rem',   // 12px (era 8px)
  lg: '1rem',      // 16px (era 12px)
  xl: '1.25rem',   // 20px (era 16px)
  '2xl': '1.5rem', // 24px (novo)
  '3xl': '2rem',   // 32px (novo)
  full: '9999px',  // Circular
}

export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  }
}

// Warm Minimalism 2026 - Sombras suaves com maior blur
export const shadows = {
  sm: '0 2px 8px -2px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 8px 24px -8px rgba(0, 0, 0, 0.2), 0 4px 8px -4px rgba(0, 0, 0, 0.1)',
  lg: '0 16px 48px -16px rgba(0, 0, 0, 0.25), 0 8px 16px -8px rgba(0, 0, 0, 0.15)',
  xl: '0 24px 64px -24px rgba(0, 0, 0, 0.3), 0 12px 24px -12px rgba(0, 0, 0, 0.2)',
  glow: '0 0 20px rgba(16, 185, 129, 0.15), 0 0 40px rgba(16, 185, 129, 0.1)',
  glass: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
}

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
}

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
}

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  modal: 50,
  popover: 60,
  toast: 70,
}

// Exportação agrupada
const designTokens = {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  transitions,
  breakpoints,
  zIndex,
}

export default designTokens
