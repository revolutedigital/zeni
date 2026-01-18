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
 * Motion-First 2026 Edition
 *
 * @param {string} variant - Variação da mascote: 'default' | 'icon' | 'waving' | 'thinking' | 'happy' | 'worried'
 * @param {string} size - Tamanho: 'xs' (24px) | 'sm' (32px) | 'md' (48px) | 'lg' (64px) | 'xl' (96px) | '2xl' (128px) | 'full' (200px)
 * @param {string} className - Classes CSS adicionais
 * @param {string} alt - Texto alternativo para acessibilidade
 * @param {boolean} animated - Ativar animação flutuante
 * @param {string} animation - Tipo de animação: 'float' | 'breathe' | 'bounce' | 'wave' | 'heartbeat' | 'pop' | 'none'
 */
const ZeniMascot = ({
  variant = 'default',
  size = 'md',
  className = '',
  alt = 'Zeni - Sua assistente financeira',
  animated = false,
  animation = 'float'
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

  // Motion-First 2026 - Animações disponíveis
  const animations = {
    float: 'animate-float',
    breathe: 'animate-breathe',
    bounce: 'animate-bounceIn',
    wave: 'animate-wave',
    heartbeat: 'animate-heartbeat',
    pop: 'animate-popIn',
    wiggle: 'animate-wiggle',
    none: ''
  };

  const MascotSrc = mascots[variant] || mascots.default;
  const sizeClass = sizes[size] || sizes.md;
  const animationClass = animated ? (animations[animation] || animations.float) : '';

  return (
    <img
      src={MascotSrc}
      alt={alt}
      className={`${sizeClass} ${animationClass} transition-transform duration-200 hover:scale-105 ${className}`}
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
  className = '',
  animated = true
}) => {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <ZeniMascot variant={variant} size={size} animated={animated} />
      <span className="text-zeni-primary font-medium text-sm animate-fadeIn">{message}</span>
    </div>
  );
};

/**
 * Zeni para estados de loading
 */
export const ZeniLoading = ({ message = 'Pensando...' }) => {
  return (
    <div className="flex items-center gap-3" role="status" aria-label={message}>
      <div className="animate-pulseSoft">
        <ZeniMascot variant="thinking" size="md" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-zeni-muted text-sm">{message}</span>
        <span className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    </div>
  );
};

/**
 * Zeni para estados de sucesso
 */
export const ZeniSuccess = ({ message = 'Feito!' }) => {
  return (
    <div className="flex items-center gap-3 animate-bounceIn">
      <ZeniMascot variant="happy" size="md" />
      <span className="text-emerald-400 font-medium">{message}</span>
    </div>
  );
};

/**
 * Zeni para alertas de orçamento
 * Motion-First 2026 - Com animações de atenção
 */
export const ZeniBudgetAlert = ({ message = 'Atenção com os gastos!' }) => {
  return (
    <div className="flex items-center gap-3 p-4 glass-card rounded-2xl border border-amber-500/30 animate-shake shadow-warm-md">
      <div className="animate-wiggle">
        <ZeniMascot variant="worried" size="md" />
      </div>
      <span className="text-amber-300 text-sm font-medium">{message}</span>
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
    <div className="flex flex-col items-center gap-4 py-6 animate-fadeIn">
      <div className="animate-float">
        <ZeniMascot variant="waving" size="full" />
      </div>
      <div className="text-center animate-slideUp">
        <h2 className="text-xl font-bold text-zeni-text">{title}</h2>
        <p className="text-zeni-muted">{subtitle}</p>
      </div>
    </div>
  );
};

/**
 * Zeni para empty states
 */
export const ZeniEmpty = ({
  title = 'Nada por aqui ainda',
  subtitle = 'Que tal começar adicionando algo?',
  action
}) => {
  return (
    <div className="flex flex-col items-center gap-4 py-12 animate-fadeIn">
      <div className="animate-float opacity-60">
        <ZeniMascot variant="thinking" size="xl" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-medium text-zeni-text">{title}</h3>
        <p className="text-zeni-muted text-sm">{subtitle}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

/**
 * Zeni para erros
 * Motion-First 2026
 */
export const ZeniError = ({
  title = 'Ops! Algo deu errado',
  subtitle = 'Tente novamente mais tarde',
  onRetry
}) => {
  return (
    <div className="flex flex-col items-center gap-4 py-8 animate-rubberBand">
      <ZeniMascot variant="worried" size="xl" animated animation="heartbeat" />
      <div className="text-center">
        <h3 className="text-lg font-medium text-red-400">{title}</h3>
        <p className="text-zeni-muted text-sm">{subtitle}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2.5 gradient-primary hover:shadow-glow text-white rounded-xl transition-all duration-200 btn-press"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
};

/**
 * Zeni Celebration - Para celebrar conquistas
 * Motion-First 2026
 */
export const ZeniCelebration = ({
  message = 'Parabéns!',
  subMessage = ''
}) => {
  return (
    <div className="flex flex-col items-center gap-4 py-8 relative">
      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm animate-confetti"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: '40%',
              backgroundColor: ['#10B981', '#34D399', '#FBBF24', '#F472B6', '#3B82F6'][i % 5],
              animationDelay: `${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="animate-bounceIn">
        <ZeniMascot variant="happy" size="xl" animated animation="wave" />
      </div>
      <div className="text-center animate-slideUp">
        <h3 className="text-xl font-bold gradient-primary-text">{message}</h3>
        {subMessage && <p className="text-zeni-muted text-sm mt-1">{subMessage}</p>}
      </div>
    </div>
  );
};

/**
 * Typing Indicator - Zeni pensando
 * Motion-First 2026
 */
export const ZeniTyping = () => {
  return (
    <div className="flex items-center gap-3">
      <ZeniMascot variant="thinking" size="sm" animated animation="breathe" />
      <div className="flex gap-1">
        <span className="typing-dot w-2 h-2 bg-zeni-primary rounded-full" />
        <span className="typing-dot w-2 h-2 bg-zeni-primary rounded-full" />
        <span className="typing-dot w-2 h-2 bg-zeni-primary rounded-full" />
      </div>
    </div>
  );
};

export default ZeniMascot;
