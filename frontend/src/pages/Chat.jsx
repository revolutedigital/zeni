import { useState, useEffect, useRef } from 'react'
import { Send, Image, User, Sparkles } from 'lucide-react'
import { sendMessage, getChatHistory } from '../services/api'
import ZeniMascot, { ZeniWelcome, ZeniTyping } from '../components/ZeniMascot'
import { QuickActionsGrid, ContextualSuggestions } from '../components/QuickActions'
import { useZeniPersonality } from '../hooks/useZeniPersonality'

// Configuração dos agentes com cores e variante da Zeni
const AGENTS = {
  registrar: {
    name: 'Registrador',
    emoji: '📝',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
    description: 'Registra suas transações',
    zeniVariant: 'happy' // Zeni feliz ao registrar
  },
  registrar_vision: {
    name: 'Registrador',
    emoji: '📷',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/30',
    description: 'Analisa comprovantes',
    zeniVariant: 'default' // Zeni olhando atentamente
  },
  cfo: {
    name: 'CFO',
    emoji: '📊',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/30',
    description: 'Analisa suas finanças',
    zeniVariant: 'thinking' // Zeni pensativa ao analisar
  },
  guardian: {
    name: 'Guardião',
    emoji: '🛡️',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/30',
    description: 'Protege seu orçamento',
    zeniVariant: 'worried' // Zeni preocupada/atenta
  },
  educator: {
    name: 'Educador',
    emoji: '📚',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/30',
    description: 'Ensina finanças',
    zeniVariant: 'waving' // Zeni simpática ensinando
  }
}

// Função para anunciar para screen readers
function announce(message) {
  const announcer = document.getElementById('live-announcer')
  if (announcer) {
    announcer.textContent = message
    setTimeout(() => { announcer.textContent = '' }, 1000)
  }
}

// Função para renderizar markdown básico
function renderMarkdown(text) {
  if (!text) return null

  // Dividir em linhas para processar listas
  const lines = text.split('\n')
  const elements = []
  let currentList = []
  let listKey = 0

  const processInlineMarkdown = (line, key) => {
    // Processar negrito **texto** e __texto__
    // Processar itálico *texto* e _texto_
    const parts = []
    let remaining = line
    let partKey = 0

    // Regex para capturar **negrito**, *itálico*, ou texto normal
    const regex = /(\*\*(.+?)\*\*|__(.+?)__|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_))/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(remaining)) !== null) {
      // Texto antes do match
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index))
      }

      // Negrito
      if (match[2] || match[3]) {
        parts.push(<strong key={`b-${partKey++}`} className="font-semibold">{match[2] || match[3]}</strong>)
      }
      // Itálico
      else if (match[4] || match[5]) {
        parts.push(<em key={`i-${partKey++}`}>{match[4] || match[5]}</em>)
      }

      lastIndex = regex.lastIndex
    }

    // Texto restante
    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex))
    }

    return parts.length > 0 ? parts : [line]
  }

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2">
          {currentList.map((item, i) => (
            <li key={i}>{processInlineMarkdown(item, i)}</li>
          ))}
        </ul>
      )
      currentList = []
    }
  }

  lines.forEach((line, i) => {
    // Lista com bullet (• ou - ou *)
    const listMatch = line.match(/^[\s]*[•\-\*]\s+(.+)$/)
    if (listMatch) {
      currentList.push(listMatch[1])
      return
    }

    // Se não é lista, finaliza lista anterior
    flushList()

    // Linha vazia
    if (line.trim() === '') {
      elements.push(<br key={`br-${i}`} />)
      return
    }

    // Linha normal com markdown inline
    elements.push(
      <span key={`line-${i}`}>
        {processInlineMarkdown(line, i)}
        {i < lines.length - 1 && <br />}
      </span>
    )
  })

  // Finaliza última lista se houver
  flushList()

  return elements
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showExamples, setShowExamples] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

  // Personality system
  const { greeting, react, setLoading: setZeniLoading } = useZeniPersonality()

  // Determinar período do dia para sugestões contextuais
  const getTimePeriod = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    return 'evening'
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadHistory() {
    try {
      const history = await getChatHistory()
      setMessages(history)
      if (history.length > 0) {
        setShowExamples(false)
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setShowExamples(false)
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)
    announce('Enviando mensagem, aguarde a resposta da Zeni')

    try {
      const result = await sendMessage(userMessage)

      let displayMessage = result.response
      try {
        const parsed = JSON.parse(result.response)
        if (parsed.confirmation) {
          displayMessage = parsed.confirmation
        } else if (parsed.error) {
          displayMessage = parsed.error
        }
      } catch (e) {
        // Não é JSON, usar resposta como está
      }

      const agentName = AGENTS[result.agent]?.name || 'Zeni'
      announce(`${agentName} respondeu: ${displayMessage.substring(0, 100)}`)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: displayMessage,
        agent: result.agent
      }])
    } catch (error) {
      announce('Erro ao enviar mensagem')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        agent: 'error'
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setShowExamples(false)
    setMessages(prev => [...prev, { role: 'user', content: '📷 Enviando imagem...' }])
    setLoading(true)
    announce('Enviando imagem para análise')

    try {
      const result = await sendMessage('', file)

      let displayMessage = result.response
      try {
        const parsed = JSON.parse(result.response)
        if (parsed.confirmation) {
          displayMessage = parsed.confirmation
        }
      } catch (e) {}

      announce(`Imagem analisada: ${displayMessage.substring(0, 100)}`)

      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = { role: 'user', content: '📷 Imagem enviada' }
        return [...newMessages, {
          role: 'assistant',
          content: displayMessage,
          agent: result.agent
        }]
      })
    } catch (error) {
      announce('Erro ao processar imagem')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Erro ao processar imagem.',
        agent: 'error'
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleExampleClick(example) {
    setInput(example)
    inputRef.current?.focus()
    announce(`Exemplo selecionado: ${example}`)
  }

  function getAgentConfig(agentId) {
    return AGENTS[agentId] || {
      name: 'Zeni',
      emoji: '💚',
      color: 'text-zeni-primary',
      bgColor: 'bg-zeni-primary/10',
      borderColor: 'border-zeni-primary/30',
      description: 'Assistente',
      zeniVariant: 'default'
    }
  }

  // Handler para QuickActions
  const handleQuickAction = (prompt) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  // Handler para upload via QuickActions
  const handleQuickUpload = () => {
    fileInputRef.current?.click()
  }

  if (loadingHistory) {
    return (
      <div
        className="flex flex-col items-center justify-center h-64 gap-4"
        role="status"
        aria-label="Carregando histórico de conversas"
      >
        <ZeniTyping />
        <div className="text-zeni-muted text-sm animate-pulse">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header - Chat-Centric 2026 */}
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2" id="chat-title">
            <Sparkles size={24} className="text-zeni-primary" />
            Fala com a Zeni
          </h1>
          <p className="page-subtitle">
            {greeting}
          </p>
        </div>
      </header>

      {/* Messages */}
      <section
        className="flex-1 overflow-y-auto space-y-4 mb-4"
        role="log"
        aria-label="Histórico de mensagens"
        aria-live="polite"
        aria-relevant="additions"
      >
        {showExamples && messages.length === 0 && (
          <div className="space-y-6">
            {/* Zeni Welcome - Chat-Centric 2026 */}
            <div className="text-center py-4">
              <div className="animate-float mb-4">
                <ZeniMascot variant="waving" size="full" animated animation="wave" />
              </div>
              <h2 className="text-xl font-bold gradient-primary-text mb-2">
                Oi! Eu sou a Zeni!
              </h2>
              <p className="text-zeni-muted text-sm">
                Sua assistente financeira pessoal. Fala comigo!
              </p>
            </div>

            {/* Quick Actions Grid - Chat-Centric 2026 */}
            <div className="glass-card rounded-2xl p-4 shadow-warm-md">
              <h3 className="text-sm font-medium text-zeni-muted mb-3">O que você quer fazer?</h3>
              <QuickActionsGrid
                onAction={handleQuickAction}
                onUpload={handleQuickUpload}
                disabled={loading}
              />
            </div>

            {/* Agentes compactos */}
            <div className="glass-card rounded-2xl p-4 shadow-warm-sm">
              <h3 className="text-sm font-medium text-zeni-muted mb-3">Nossos agentes especializados</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(AGENTS).filter(([id]) => id !== 'registrar_vision').map(([id, agent]) => (
                  <div
                    key={id}
                    className={`flex items-center gap-2 p-2 rounded-xl ${agent.bgColor} border ${agent.borderColor}`}
                  >
                    <ZeniMascot variant={agent.zeniVariant} size="md" />
                    <div className="min-w-0">
                      <span className={`font-medium text-xs ${agent.color}`}>{agent.name}</span>
                      <p className="text-[10px] text-zeni-muted truncate">{agent.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sugestões Contextuais */}
            <div>
              <h3 className="text-xs font-medium text-zeni-muted mb-2">Sugestões para agora:</h3>
              <ContextualSuggestions
                context={getTimePeriod()}
                onSelect={handleQuickAction}
              />
            </div>

            {/* Exemplos rápidos */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-zeni-muted">Ou experimente digitar:</h3>
              <div className="flex flex-wrap gap-2">
                {['50 mercado', 'almocei 35 reais', 'como estou esse mês?', 'onde mais gasto?'].map(ex => (
                  <button
                    key={ex}
                    onClick={() => handleExampleClick(ex)}
                    className="bg-zeni-card/50 text-zeni-muted text-xs px-3 py-1.5 rounded-full border border-zeni-border hover:border-zeni-primary/50 hover:text-zeni-primary transition-all"
                    aria-label={`Usar exemplo: ${ex}`}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const agentConfig = msg.agent ? getAgentConfig(msg.agent) : null

          return (
            <article
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideUp`}
              style={{ animationDelay: `${i * 0.05}s` }}
              aria-label={msg.role === 'user' ? 'Sua mensagem' : `Mensagem de ${agentConfig?.name || 'Zeni'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="flex-shrink-0"
                  aria-hidden="true"
                >
                  <ZeniMascot
                    variant={agentConfig?.zeniVariant || 'default'}
                    size="lg"
                    animated
                    animation="breathe"
                  />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-warm-sm ${
                  msg.role === 'user'
                    ? 'gradient-primary text-white shadow-glow'
                    : `glass-card border ${agentConfig?.borderColor || 'border-zeni-border'}`
                }`}
              >
                {msg.role === 'assistant' && agentConfig && (
                  <p className={`text-xs ${agentConfig.color} mb-1 font-medium flex items-center gap-1`}>
                    <span aria-hidden="true">{agentConfig.emoji}</span> {agentConfig.name}
                  </p>
                )}
                <div className="text-sm leading-relaxed">{renderMarkdown(msg.content)}</div>
              </div>

              {msg.role === 'user' && (
                <div
                  className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow"
                  aria-hidden="true"
                >
                  <User size={18} className="text-white" />
                </div>
              )}
            </article>
          )
        })}

        {loading && (
          <div
            className="flex gap-3 items-center animate-slideUp"
            role="status"
            aria-label="Zeni está pensando"
          >
            <ZeniMascot variant="thinking" size="lg" animated animation="breathe" />
            <div className="glass-card rounded-2xl px-4 py-3 shadow-warm-sm border border-zeni-border">
              <ZeniTyping />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* Input - Chat-Centric 2026 */}
      <form
        onSubmit={handleSend}
        className="glass-card rounded-2xl p-2 flex gap-2 shadow-warm-md border border-zeni-border"
        aria-label="Enviar mensagem para Zeni"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
          aria-label="Selecionar imagem de comprovante"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-3 rounded-xl hover:bg-zeni-card transition-all duration-200 btn-press"
          disabled={loading}
          aria-label="Enviar comprovante ou imagem"
          title="Enviar comprovante"
        >
          <Image size={20} className="text-zeni-muted" aria-hidden="true" />
        </button>

        <label htmlFor="chat-input" className="sr-only">
          Digite sua mensagem
        </label>
        <input
          ref={inputRef}
          id="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Fala com a Zeni..."
          className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-zeni-text placeholder:text-zeni-muted/50"
          disabled={loading}
          aria-describedby="chat-title"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="gradient-primary p-3 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-glow hover:shadow-glow-lg btn-press"
          aria-label="Enviar mensagem"
          title="Enviar"
        >
          <Send size={20} className="text-white" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
