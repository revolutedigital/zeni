import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ZeniAnimated - Mascote Zeni com animações Motion-First 2026
 *
 * Features:
 * - Idle animations (piscar, respirar)
 * - Eye tracking (olhos seguem o cursor)
 * - Transições suaves entre estados
 * - Celebrações com confetti
 */

// Cores da Zeni
const ZENI_COLORS = {
  body: '#10B981',
  bodyLight: '#34D399',
  face: '#FBBF24',
  eyes: '#1E293B',
  cheeks: '#F472B6',
  leaf: '#059669',
  leafLight: '#10B981',
};

/**
 * ZeniAnimated - Versão animada da mascote
 */
const ZeniAnimated = ({
  variant = 'default',
  size = 'md',
  className = '',
  followCursor = true,
  idleAnimations = true,
  onClick,
}) => {
  const containerRef = useRef(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [breathScale, setBreathScale] = useState(1);

  // Tamanhos em pixels
  const sizes = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    '2xl': 128,
    full: 192,
  };

  const pixelSize = sizes[size] || sizes.md;

  // Eye tracking - seguir cursor
  const handleMouseMove = useCallback((e) => {
    if (!followCursor || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;

    // Limitar movimento dos olhos
    const maxOffset = pixelSize * 0.03;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const normalizedDistance = Math.min(distance / 200, 1);

    setEyeOffset({
      x: (deltaX / distance || 0) * maxOffset * normalizedDistance,
      y: (deltaY / distance || 0) * maxOffset * normalizedDistance,
    });
  }, [followCursor, pixelSize]);

  // Idle animations
  useEffect(() => {
    if (!idleAnimations) return;

    // Piscar aleatoriamente
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 2000);

    // Respirar suavemente
    let breathDirection = 1;
    const breathInterval = setInterval(() => {
      setBreathScale(prev => {
        const newScale = prev + (0.005 * breathDirection);
        if (newScale >= 1.02) breathDirection = -1;
        if (newScale <= 0.98) breathDirection = 1;
        return newScale;
      });
    }, 50);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(breathInterval);
    };
  }, [idleAnimations]);

  // Event listener para mouse move
  useEffect(() => {
    if (followCursor) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followCursor, handleMouseMove]);

  // Expressões baseadas na variante
  const getExpression = () => {
    switch (variant) {
      case 'happy':
        return { eyeShape: 'happy', mouthShape: 'smile' };
      case 'worried':
        return { eyeShape: 'worried', mouthShape: 'worried' };
      case 'thinking':
        return { eyeShape: 'thinking', mouthShape: 'neutral' };
      case 'waving':
        return { eyeShape: 'happy', mouthShape: 'smile', waving: true };
      default:
        return { eyeShape: 'normal', mouthShape: 'smile' };
    }
  };

  const expression = getExpression();

  return (
    <div
      ref={containerRef}
      className={`inline-block cursor-pointer transition-transform duration-200 hover:scale-105 ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      onClick={onClick}
      role="img"
      aria-label="Zeni - Sua assistente financeira"
    >
      <svg
        viewBox="0 0 100 100"
        width={pixelSize}
        height={pixelSize}
        style={{ transform: `scale(${breathScale})` }}
      >
        {/* Definições de gradientes */}
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ZENI_COLORS.body} />
            <stop offset="100%" stopColor={ZENI_COLORS.bodyLight} />
          </linearGradient>
          <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ZENI_COLORS.leafLight} />
            <stop offset="100%" stopColor={ZENI_COLORS.leaf} />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Corpo principal */}
        <ellipse
          cx="50"
          cy="55"
          rx="35"
          ry="38"
          fill="url(#bodyGradient)"
          filter="url(#softShadow)"
        />

        {/* Folha no topo */}
        <g className={expression.waving ? 'animate-wave origin-bottom' : ''}>
          <path
            d="M50 15 Q55 5 60 10 Q65 15 55 20 Q50 22 50 15"
            fill="url(#leafGradient)"
          />
          <path
            d="M50 15 Q45 5 40 10 Q35 15 45 20 Q50 22 50 15"
            fill="url(#leafGradient)"
          />
        </g>

        {/* Face */}
        <ellipse
          cx="50"
          cy="50"
          rx="25"
          ry="22"
          fill={ZENI_COLORS.face}
        />

        {/* Olhos */}
        <g style={{ transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)` }}>
          {/* Olho esquerdo */}
          <ellipse
            cx="40"
            cy="48"
            rx={expression.eyeShape === 'happy' ? 4 : 5}
            ry={isBlinking ? 1 : (expression.eyeShape === 'happy' ? 3 : 6)}
            fill={ZENI_COLORS.eyes}
            style={{ transition: 'ry 0.1s ease' }}
          />
          {/* Brilho olho esquerdo */}
          {!isBlinking && expression.eyeShape !== 'happy' && (
            <circle cx="42" cy="46" r="1.5" fill="white" opacity="0.8" />
          )}

          {/* Olho direito */}
          <ellipse
            cx="60"
            cy="48"
            rx={expression.eyeShape === 'happy' ? 4 : 5}
            ry={isBlinking ? 1 : (expression.eyeShape === 'happy' ? 3 : 6)}
            fill={ZENI_COLORS.eyes}
            style={{ transition: 'ry 0.1s ease' }}
          />
          {/* Brilho olho direito */}
          {!isBlinking && expression.eyeShape !== 'happy' && (
            <circle cx="62" cy="46" r="1.5" fill="white" opacity="0.8" />
          )}

          {/* Sobrancelhas para worried */}
          {expression.eyeShape === 'worried' && (
            <>
              <line x1="35" y1="40" x2="43" y2="42" stroke={ZENI_COLORS.eyes} strokeWidth="2" strokeLinecap="round" />
              <line x1="57" y1="42" x2="65" y2="40" stroke={ZENI_COLORS.eyes} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
        </g>

        {/* Bochechas */}
        <circle cx="30" cy="55" r="4" fill={ZENI_COLORS.cheeks} opacity="0.5" />
        <circle cx="70" cy="55" r="4" fill={ZENI_COLORS.cheeks} opacity="0.5" />

        {/* Boca */}
        {expression.mouthShape === 'smile' && (
          <path
            d="M42 60 Q50 68 58 60"
            stroke={ZENI_COLORS.eyes}
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {expression.mouthShape === 'worried' && (
          <path
            d="M42 63 Q50 58 58 63"
            stroke={ZENI_COLORS.eyes}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        )}
        {expression.mouthShape === 'neutral' && (
          <ellipse cx="50" cy="62" rx="4" ry="3" fill={ZENI_COLORS.eyes} opacity="0.6" />
        )}

        {/* Braços acenando (para waving) */}
        {expression.waving && (
          <g className="animate-wave origin-center">
            <ellipse
              cx="82"
              cy="45"
              rx="8"
              ry="6"
              fill="url(#bodyGradient)"
              transform="rotate(-30 82 45)"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * ZeniCelebration - Zeni com efeito de confetti
 */
export const ZeniCelebration = ({
  size = 'xl',
  message = 'Parabéns!',
  onComplete,
}) => {
  const [confetti, setConfetti] = useState([]);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Criar confetti
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 100,
      y: 50,
      color: ['#10B981', '#34D399', '#FBBF24', '#F472B6', '#3B82F6'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 0.5,
      rotation: Math.random() * 360,
    }));
    setConfetti(particles);

    // Mostrar mensagem
    setTimeout(() => setShowMessage(true), 300);

    // Callback de conclusão
    if (onComplete) {
      setTimeout(onComplete, 3000);
    }
  }, [onComplete]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 rounded-sm animate-confetti"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: particle.color,
              animationDelay: `${particle.delay}s`,
              transform: `rotate(${particle.rotation}deg)`,
            }}
          />
        ))}
      </div>

      {/* Zeni */}
      <div className="animate-bounceIn">
        <ZeniAnimated variant="happy" size={size} idleAnimations={false} />
      </div>

      {/* Mensagem */}
      {showMessage && (
        <p className="mt-4 text-xl font-bold gradient-primary-text animate-slideUp">
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * Hook para usar animações da Zeni contextualmente
 */
export const useZeniMood = () => {
  const [mood, setMood] = useState('default');

  const celebrate = useCallback(() => {
    setMood('celebrating');
    setTimeout(() => setMood('happy'), 3000);
  }, []);

  const worry = useCallback(() => {
    setMood('worried');
  }, []);

  const think = useCallback(() => {
    setMood('thinking');
  }, []);

  const reset = useCallback(() => {
    setMood('default');
  }, []);

  return { mood, celebrate, worry, think, reset, setMood };
};

export default ZeniAnimated;
