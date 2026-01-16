/**
 * Design Tokens - Zeni Design System
 *
 * Tokens de design centralizados para consistência visual.
 * Esses valores devem corresponder ao tailwind.config.js
 */

export const colors = {
  // Cores da marca
  brand: {
    primary: '#10B981',      // Esmeralda - cor principal
    primaryDark: '#059669',  // Esmeralda escuro - hover
    primaryLight: '#34D399', // Esmeralda claro - destaques
  },

  // Cores de fundo
  background: {
    dark: '#0F172A',    // Fundo principal
    card: '#1E293B',    // Cards e containers
    elevated: '#334155', // Elementos elevados
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

  // Bordas
  border: {
    default: '#475569',
    subtle: '#334155',
    focus: '#10B981',
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

export const borderRadius = {
  sm: '0.375rem',  // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
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

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.2)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.25)',
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
