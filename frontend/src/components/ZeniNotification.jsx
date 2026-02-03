import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import ZeniMascot from './ZeniMascot';

/**
 * ZeniNotification - Notificação com personalidade da Zeni
 * Personality System 2026
 *
 * Exibe mensagens contextuais da Zeni com animações e estilos únicos
 */
const ZeniNotification = ({
  message,
  mood = 'default',
  isVisible = false,
  onClose,
  duration = 5000,
  position = 'bottom-right',
  showConfetti = false,
  animation = 'pop',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState([]);

  // Controle de visibilidade com animação
  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);

      // Gerar confetti se necessário
      if (showConfetti) {
        const particles = Array.from({ length: 20 }, (_, i) => ({
          id: i,
          left: 10 + Math.random() * 80,
          delay: Math.random() * 0.5,
          color: ['#10B981', '#34D399', '#FBBF24', '#F472B6', '#3B82F6'][i % 5],
        }));
        setConfettiParticles(particles);
      }

      // Auto-dismiss
      if (duration > 0 && onClose) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, duration, onClose, showConfetti]);

  // Posições
  const positions = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
  };

  // Animações de entrada
  const animations = {
    pop: 'animate-popIn',
    bounce: 'animate-bounceIn',
    slide: 'animate-slideUp',
    wiggle: 'animate-wiggle',
    float: 'animate-float',
  };

  // Cores de fundo por mood
  const moodStyles = {
    happy: 'border-emerald-500/30 bg-emerald-500/5',
    worried: 'border-amber-500/30 bg-amber-500/5',
    thinking: 'border-blue-500/30 bg-blue-500/5',
    default: 'border-zeni-border bg-zeni-card/90',
    waving: 'border-emerald-500/30 bg-emerald-500/5',
  };

  if (!isVisible && !isAnimating) return null;

  return (
    <div
      className={`
        fixed z-50 ${positions[position]}
        ${isAnimating ? animations[animation] : 'opacity-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Confetti */}
      {showConfetti && confettiParticles.length > 0 && (
        <div className="absolute inset-0 overflow-visible pointer-events-none">
          {confettiParticles.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 rounded-sm animate-confetti"
              style={{
                left: `${p.left}%`,
                top: '50%',
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Card da notificação */}
      <div
        className={`
          flex items-start gap-3 p-4
          glass-card rounded-2xl
          border ${moodStyles[mood]}
          shadow-warm-lg
          max-w-xs sm:max-w-sm
          backdrop-blur-glass
        `}
      >
        {/* Mascote */}
        <div className={mood === 'happy' ? 'animate-bounce' : ''}>
          <ZeniMascot
            variant={mood}
            size="md"
            animated
            animation={mood === 'thinking' ? 'breathe' : 'float'}
          />
        </div>

        {/* Mensagem */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zeni-text font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* Botão fechar */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-zeni-muted hover:text-zeni-text transition-colors p-1 -mr-1 -mt-1"
            aria-label="Fechar notificação"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * ZeniFloatingBubble - Bolha flutuante da Zeni
 * Para exibir dicas ou mensagens rápidas
 */
export const ZeniFloatingBubble = ({
  message,
  isVisible,
  onClose,
  position = 'right',
}) => {
  if (!isVisible) return null;

  const positionStyles = {
    left: 'left-4 bottom-24',
    right: 'right-4 bottom-24',
    center: 'left-1/2 -translate-x-1/2 bottom-24',
  };

  return (
    <div
      className={`
        fixed z-40 ${positionStyles[position]}
        animate-slideUp
      `}
    >
      <div className="relative">
        {/* Bolha de fala */}
        <div className="glass-card rounded-2xl p-3 pr-8 shadow-warm-md border border-zeni-border max-w-[200px]">
          <p className="text-xs text-zeni-muted">{message}</p>

          {/* Seta da bolha */}
          <div className="absolute -bottom-2 right-8 w-4 h-4 glass-card border-r border-b border-zeni-border rotate-45" />

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-1 right-1 text-zeni-muted hover:text-zeni-text p-1"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Mini Zeni */}
        <div className="absolute -bottom-4 right-4">
          <ZeniMascot variant="icon" size="md" animated animation="breathe" />
        </div>
      </div>
    </div>
  );
};

/**
 * ZeniGreeting - Saudação inicial
 */
export const ZeniGreeting = ({ onDismiss }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    let period;
    if (hour >= 5 && hour < 12) period = 'Bom dia';
    else if (hour >= 12 && hour < 18) period = 'Boa tarde';
    else period = 'Boa noite';

    setGreeting(`${period}! Como posso te ajudar hoje?`);

    // Auto-dismiss após 5s
    if (onDismiss) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [onDismiss]);

  return (
    <ZeniNotification
      message={greeting}
      mood="waving"
      isVisible={true}
      onClose={onDismiss}
      position="bottom-right"
      animation="pop"
    />
  );
};

/**
 * ZeniCelebrationToast - Toast de celebração especial
 */
export const ZeniCelebrationToast = ({
  message,
  isVisible,
  onClose,
}) => {
  return (
    <ZeniNotification
      message={message}
      mood="happy"
      isVisible={isVisible}
      onClose={onClose}
      position="top-center"
      animation="bounce"
      showConfetti={true}
      duration={6000}
    />
  );
};

/**
 * ZeniWarningToast - Toast de alerta/aviso
 */
export const ZeniWarningToast = ({
  message,
  isVisible,
  onClose,
}) => {
  return (
    <ZeniNotification
      message={message}
      mood="worried"
      isVisible={isVisible}
      onClose={onClose}
      position="top-center"
      animation="wiggle"
      duration={5000}
    />
  );
};

export default ZeniNotification;
