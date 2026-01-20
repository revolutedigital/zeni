import React, { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Target, PiggyBank, Receipt, Calculator, Sparkles } from 'lucide-react';

/**
 * QuickActions - Botões de ação rápida contextuais
 * Chat-Centric UX 2026
 *
 * Aparecem no chat para ações comuns sem digitar
 */

// Ações disponíveis
const QUICK_ACTIONS = {
  // Registrar transações
  register: [
    { id: 'expense', icon: TrendingDown, label: 'Gasto', color: 'text-red-400', bg: 'bg-red-400/10', prompt: 'Quero registrar um gasto' },
    { id: 'income', icon: TrendingUp, label: 'Receita', color: 'text-emerald-400', bg: 'bg-emerald-400/10', prompt: 'Quero registrar uma receita' },
    { id: 'receipt', icon: Receipt, label: 'Comprovante', color: 'text-blue-400', bg: 'bg-blue-400/10', action: 'upload' },
  ],

  // Análises
  analyze: [
    { id: 'summary', icon: Calculator, label: 'Resumo do mês', color: 'text-blue-400', bg: 'bg-blue-400/10', prompt: 'Como estou esse mês?' },
    { id: 'spending', icon: TrendingDown, label: 'Maiores gastos', color: 'text-amber-400', bg: 'bg-amber-400/10', prompt: 'Onde mais gasto?' },
    { id: 'budget', icon: Target, label: 'Orçamento', color: 'text-purple-400', bg: 'bg-purple-400/10', prompt: 'Como está meu orçamento?' },
  ],

  // Metas e economia
  goals: [
    { id: 'save', icon: PiggyBank, label: 'Economizar', color: 'text-emerald-400', bg: 'bg-emerald-400/10', prompt: 'Dicas para economizar' },
    { id: 'goal', icon: Target, label: 'Nova meta', color: 'text-purple-400', bg: 'bg-purple-400/10', prompt: 'Quero criar uma meta' },
    { id: 'tip', icon: Sparkles, label: 'Dica', color: 'text-amber-400', bg: 'bg-amber-400/10', prompt: 'Me dá uma dica financeira' },
  ],
};

/**
 * QuickActionButton - Botão individual de ação
 */
const QuickActionButton = ({ icon: Icon, label, color, bg, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center gap-2 px-4 py-2.5
      ${bg} ${color}
      rounded-xl border border-transparent
      hover:border-current/20 hover:shadow-warm-sm
      transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
      btn-press
    `}
  >
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

/**
 * QuickActionsBar - Barra horizontal de ações
 */
export const QuickActionsBar = ({ onAction, onUpload, disabled = false, category = 'register' }) => {
  const actions = QUICK_ACTIONS[category] || QUICK_ACTIONS.register;

  const handleClick = (action) => {
    if (action.action === 'upload' && onUpload) {
      onUpload();
    } else if (action.prompt && onAction) {
      onAction(action.prompt);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
      {actions.map((action) => (
        <QuickActionButton
          key={action.id}
          icon={action.icon}
          label={action.label}
          color={action.color}
          bg={action.bg}
          onClick={() => handleClick(action)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

/**
 * QuickActionsGrid - Grade de ações para tela inicial
 */
export const QuickActionsGrid = ({ onAction, onUpload, disabled = false }) => {
  const [activeCategory, setActiveCategory] = useState('register');

  const categories = [
    { id: 'register', label: 'Registrar', icon: Plus },
    { id: 'analyze', label: 'Analisar', icon: Calculator },
    { id: 'goals', label: 'Economia', icon: PiggyBank },
  ];

  const handleClick = (action) => {
    if (action.action === 'upload' && onUpload) {
      onUpload();
    } else if (action.prompt && onAction) {
      onAction(action.prompt);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex gap-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-zeni-primary/20 text-zeni-primary'
                  : 'text-zeni-muted hover:text-zeni-text hover:bg-zeni-card'
                }
              `}
            >
              <Icon size={16} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS[activeCategory]?.map((action) => (
          <button
            key={action.id}
            onClick={() => handleClick(action)}
            disabled={disabled}
            className={`
              flex flex-col items-center gap-2 p-4
              glass-card rounded-2xl
              ${action.color}
              hover:shadow-warm-md hover:scale-[1.02]
              transition-all duration-200
              disabled:opacity-50
              card-interactive
            `}
          >
            <div className={`p-2 rounded-xl ${action.bg}`}>
              <action.icon size={24} />
            </div>
            <span className="text-xs font-medium text-zeni-text">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * FloatingQuickAction - FAB com ações rápidas
 */
export const FloatingQuickAction = ({ onAction, onUpload }) => {
  const [isOpen, setIsOpen] = useState(false);

  const mainActions = [
    { id: 'expense', icon: TrendingDown, label: 'Gasto', color: 'bg-red-500', prompt: 'Quero registrar um gasto' },
    { id: 'income', icon: TrendingUp, label: 'Receita', color: 'bg-emerald-500', prompt: 'Quero registrar uma receita' },
    { id: 'receipt', icon: Receipt, label: 'Foto', color: 'bg-blue-500', action: 'upload' },
  ];

  const handleClick = (action) => {
    if (action.action === 'upload' && onUpload) {
      onUpload();
    } else if (action.prompt && onAction) {
      onAction(action.prompt);
    }
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {/* Actions - shown when open */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-slideUp">
          {mainActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleClick(action)}
              className={`
                flex items-center gap-3 px-4 py-2.5 pr-5
                ${action.color} text-white
                rounded-full shadow-warm-lg
                animate-popIn
                hover:scale-105 transition-transform
              `}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <action.icon size={20} />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-14 h-14 rounded-full
          gradient-primary shadow-glow
          flex items-center justify-center
          transition-all duration-300
          hover:scale-110
          ${isOpen ? 'rotate-45' : ''}
        `}
        aria-label={isOpen ? 'Fechar menu' : 'Adicionar transação'}
      >
        <Plus size={28} className="text-white" />
      </button>
    </div>
  );
};

/**
 * ContextualSuggestions - Sugestões baseadas no contexto
 */
export const ContextualSuggestions = ({ context, onSelect }) => {
  // Sugestões baseadas no contexto
  const suggestions = {
    morning: [
      { label: 'Registrar café da manhã', prompt: 'gastei no café da manhã' },
      { label: 'Ver resumo do mês', prompt: 'como estou esse mês?' },
    ],
    afternoon: [
      { label: 'Registrar almoço', prompt: 'gastei no almoço' },
      { label: 'Conferir orçamento', prompt: 'como está meu orçamento?' },
    ],
    evening: [
      { label: 'Registrar jantar', prompt: 'gastei no jantar' },
      { label: 'Fechamento do dia', prompt: 'resumo de hoje' },
    ],
    default: [
      { label: 'Registrar gasto', prompt: 'quero registrar um gasto' },
      { label: 'Ver resumo', prompt: 'como estou esse mês?' },
    ],
  };

  const currentSuggestions = suggestions[context] || suggestions.default;

  return (
    <div className="flex gap-2 flex-wrap">
      {currentSuggestions.map((sug, i) => (
        <button
          key={i}
          onClick={() => onSelect(sug.prompt)}
          className="
            px-3 py-1.5 text-sm
            bg-zeni-card/50 text-zeni-muted
            rounded-full border border-zeni-border
            hover:border-zeni-primary/50 hover:text-zeni-primary
            transition-all duration-200
          "
        >
          {sug.label}
        </button>
      ))}
    </div>
  );
};

export default QuickActionsBar;
