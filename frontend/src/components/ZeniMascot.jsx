import React from 'react';

// Import all mascot variations
import ZeniDefault from '../assets/mascot/zeni-mascot.svg';
import ZeniIcon from '../assets/mascot/zeni-icon.svg';
import ZeniWaving from '../assets/mascot/zeni-waving.svg';
import ZeniThinking from '../assets/mascot/zeni-thinking.svg';
import ZeniHappy from '../assets/mascot/zeni-happy.svg';
import ZeniWorried from '../assets/mascot/zeni-worried.svg';

/**
 * Componente da mascote Zeni
 *
 * @param {string} variant - Variação da mascote: 'default' | 'icon' | 'waving' | 'thinking' | 'happy' | 'worried'
 * @param {string} size - Tamanho: 'xs' (24px) | 'sm' (32px) | 'md' (48px) | 'lg' (64px) | 'xl' (96px) | '2xl' (128px) | 'full' (200px)
 * @param {string} className - Classes CSS adicionais
 * @param {string} alt - Texto alternativo para acessibilidade
 */
const ZeniMascot = ({
  variant = 'default',
  size = 'md',
  className = '',
  alt = 'Zeni - Sua assistente financeira'
}) => {
  const mascots = {
    default: ZeniDefault,
    icon: ZeniIcon,
    waving: ZeniWaving,
    thinking: ZeniThinking,
    happy: ZeniHappy,
    worried: ZeniWorried
  };

  const sizes = {
    xs: 'w-6 h-6',      // 24px
    sm: 'w-8 h-8',      // 32px
    md: 'w-12 h-12',    // 48px
    lg: 'w-16 h-16',    // 64px
    xl: 'w-24 h-24',    // 96px
    '2xl': 'w-32 h-32', // 128px
    full: 'w-48 h-48'   // 192px
  };

  const MascotSrc = mascots[variant] || mascots.default;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <img
      src={MascotSrc}
      alt={alt}
      className={`${sizeClass} ${className}`}
      draggable="false"
    />
  );
};

/**
 * Zeni com mensagem/slogan
 */
export const ZeniWithMessage = ({
  variant = 'default',
  message = 'Fala com a Zeni!',
  size = 'lg',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <ZeniMascot variant={variant} size={size} />
      <span className="text-zeni-primary font-medium text-sm">{message}</span>
    </div>
  );
};

/**
 * Zeni para estados de loading
 */
export const ZeniLoading = ({ message = 'Pensando...' }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="animate-pulse">
        <ZeniMascot variant="thinking" size="md" />
      </div>
      <span className="text-zeni-muted text-sm">{message}</span>
    </div>
  );
};

/**
 * Zeni para estados de sucesso
 */
export const ZeniSuccess = ({ message = 'Feito!' }) => {
  return (
    <div className="flex items-center gap-3">
      <ZeniMascot variant="happy" size="md" />
      <span className="text-emerald-400 font-medium">{message}</span>
    </div>
  );
};

/**
 * Zeni para alertas de orçamento
 */
export const ZeniBudgetAlert = ({ message = 'Atenção com os gastos!' }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
      <ZeniMascot variant="worried" size="md" />
      <span className="text-amber-300 text-sm">{message}</span>
    </div>
  );
};

/**
 * Zeni para boas-vindas/onboarding
 */
export const ZeniWelcome = ({
  title = 'Oi! Eu sou a Zeni!',
  subtitle = 'Sua assistente financeira pessoal'
}) => {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <ZeniMascot variant="waving" size="full" />
      <div className="text-center">
        <h2 className="text-xl font-bold text-zeni-text">{title}</h2>
        <p className="text-zeni-muted">{subtitle}</p>
      </div>
    </div>
  );
};

export default ZeniMascot;
