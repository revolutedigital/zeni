import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import Button from './Button'

/**
 * Modal - Componente de modal do Design System Zeni
 *
 * @param {boolean} isOpen - Controla visibilidade
 * @param {function} onClose - Callback ao fechar
 * @param {string} title - Título do modal
 * @param {string} size - 'sm' | 'md' | 'lg' | 'full'
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
  closeOnEsc = true,
  className = '',
  ...props
}) {
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  }

  // Gerenciar foco e ESC
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      modalRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }

    const handleEsc = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, closeOnEsc])

  // Trap focus dentro do modal
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return

    const focusable = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable?.[0]
    const last = focusable?.[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last?.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first?.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      onKeyDown={handleTabKey}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Content - Glassmorphism 2026 */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={`
          relative w-full ${sizes[size]} glass-card rounded-2xl shadow-warm-xl
          animate-scaleIn transform
          ${className}
        `}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-zeni-border">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-zeni-text">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-zeni-muted hover:text-zeni-text rounded-lg transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * ModalFooter - Rodapé padronizado para modal
 */
export function ModalFooter({
  children,
  className = '',
  ...props
}) {
  return (
    <div
      className={`flex justify-end gap-3 pt-4 border-t border-zeni-border mt-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * ConfirmModal - Modal de confirmação pré-configurado
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar ação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-zeni-muted">{message}</p>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm} loading={loading}>
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
