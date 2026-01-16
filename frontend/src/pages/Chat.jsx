import { useState, useEffect, useRef } from 'react'
import { Send, Image, User } from 'lucide-react'
import { sendMessage, getChatHistory } from '../services/api'
import ZeniMascot, { ZeniWelcome } from '../components/ZeniMascot'

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

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showExamples, setShowExamples] = useState(true)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputRef = useRef(null)

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

  if (loadingHistory) {
    return (
      <div
        className="flex items-center justify-center h-64"
        role="status"
        aria-label="Carregando histórico de conversas"
      >
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <header className="mb-4">
        <h1 className="page-title" id="chat-title">Chat com IA</h1>
        <p className="page-subtitle">
          4 agentes especializados prontos para ajudar
        </p>
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
            {/* Zeni Welcome */}
            <ZeniWelcome
              title="Oi! Eu sou a Zeni!"
              subtitle="Quer organizar? Fala comigo!"
            />

            {/* Agentes Grid com Zeni */}
            <div
              className="grid grid-cols-2 gap-3"
              role="list"
              aria-label="Agentes disponíveis"
            >
              {Object.entries(AGENTS).filter(([id]) => id !== 'registrar_vision').map(([id, agent]) => {
                return (
                  <article
                    key={id}
                    className={`${agent.bgColor} rounded-xl p-3 border ${agent.borderColor}`}
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ZeniMascot variant={agent.zeniVariant} size="xs" />
                      <span className={`font-medium text-sm ${agent.color}`}>{agent.name}</span>
                    </div>
                    <p className="text-xs text-zeni-muted">{agent.description}</p>
                  </article>
                )
              })}
            </div>

            {/* Exemplos por Agente */}
            <nav className="space-y-4" aria-label="Exemplos de mensagens">
              <h2 className="text-sm font-medium text-zeni-muted">Experimente:</h2>

              {/* Registrador */}
              <div role="group" aria-label="Exemplos para registrar transações">
                <p className="text-xs text-emerald-400 mb-2">📝 Registrar transações:</p>
                <div className="flex flex-wrap gap-2">
                  {['50 mercado', 'almocei 35 reais', 'uber 23,90', 'recebi 5000 de salário'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-emerald-400/10 text-emerald-400 text-sm px-3 py-1 rounded-full hover:bg-emerald-400/20 transition-colors"
                      aria-label={`Usar exemplo: ${ex}`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* CFO */}
              <div role="group" aria-label="Exemplos de análises financeiras">
                <p className="text-xs text-blue-400 mb-2">📊 Análises financeiras:</p>
                <div className="flex flex-wrap gap-2">
                  {['Como estou esse mês?', 'Quanto gastei em restaurante?', 'Onde mais gasto?'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-blue-400/10 text-blue-400 text-sm px-3 py-1 rounded-full hover:bg-blue-400/20 transition-colors"
                      aria-label={`Usar exemplo: ${ex}`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guardião */}
              <div role="group" aria-label="Exemplos para consultar orçamento">
                <p className="text-xs text-amber-400 mb-2">🛡️ Consultar orçamento:</p>
                <div className="flex flex-wrap gap-2">
                  {['Posso gastar 200 no restaurante?', 'Dá pra comprar um tênis de 300?'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-amber-400/10 text-amber-400 text-sm px-3 py-1 rounded-full hover:bg-amber-400/20 transition-colors"
                      aria-label={`Usar exemplo: ${ex}`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Educador */}
              <div role="group" aria-label="Exemplos para aprender sobre finanças">
                <p className="text-xs text-purple-400 mb-2">📚 Aprender finanças:</p>
                <div className="flex flex-wrap gap-2">
                  {['O que é CDI?', 'O que é reserva de emergência?', 'Vale a pena parcelar?'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-purple-400/10 text-purple-400 text-sm px-3 py-1 rounded-full hover:bg-purple-400/20 transition-colors"
                      aria-label={`Usar exemplo: ${ex}`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        )}

        {messages.map((msg, i) => {
          const agentConfig = msg.agent ? getAgentConfig(msg.agent) : null

          return (
            <article
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              aria-label={msg.role === 'user' ? 'Sua mensagem' : `Mensagem de ${agentConfig?.name || 'Zeni'}`}
            >
              {msg.role === 'assistant' && (
                <div
                  className="flex-shrink-0"
                  aria-hidden="true"
                >
                  <ZeniMascot
                    variant={agentConfig?.zeniVariant || 'default'}
                    size="sm"
                  />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-zeni-primary text-white'
                    : `bg-zeni-card border ${agentConfig?.borderColor || 'border-slate-700'}`
                }`}
              >
                {msg.role === 'assistant' && agentConfig && (
                  <p className={`text-xs ${agentConfig.color} mb-1 font-medium`}>
                    <span aria-hidden="true">{agentConfig.emoji}</span> {agentConfig.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {msg.role === 'user' && (
                <div
                  className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <User size={18} />
                </div>
              )}
            </article>
          )
        })}

        {loading && (
          <div
            className="flex gap-3 items-center"
            role="status"
            aria-label="Zeni está pensando"
          >
            <div className="animate-pulse">
              <ZeniMascot variant="thinking" size="md" />
            </div>
            <div className="bg-zeni-card rounded-xl px-4 py-2">
              <p className="text-zeni-muted">Pensando...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex gap-2"
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
          className="bg-zeni-card hover:bg-slate-600 p-3 rounded-xl transition-colors"
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
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-zeni-card border border-slate-600 rounded-xl px-4 py-2"
          disabled={loading}
          aria-describedby="chat-title"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-zeni-primary hover:bg-emerald-600 p-3 rounded-xl transition-colors disabled:opacity-50"
          aria-label="Enviar mensagem"
          title="Enviar"
        >
          <Send size={20} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
