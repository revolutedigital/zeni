import { useState, useEffect, useRef } from 'react'
import { Send, Image, Bot, User, Sparkles, Shield, BookOpen, PiggyBank } from 'lucide-react'
import { sendMessage, getChatHistory } from '../services/api'

// Configuração dos agentes com cores e ícones
const AGENTS = {
  registrar: {
    name: 'Registrador',
    emoji: '📝',
    icon: PiggyBank,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    description: 'Registra suas transações'
  },
  registrar_vision: {
    name: 'Registrador',
    emoji: '📷',
    icon: PiggyBank,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    description: 'Analisa comprovantes'
  },
  cfo: {
    name: 'CFO',
    emoji: '📊',
    icon: Sparkles,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    description: 'Analisa suas finanças'
  },
  guardian: {
    name: 'Guardião',
    emoji: '🛡️',
    icon: Shield,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    description: 'Protege seu orçamento'
  },
  educator: {
    name: 'Educador',
    emoji: '📚',
    icon: BookOpen,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    description: 'Ensina finanças'
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

    try {
      const result = await sendMessage(userMessage)

      // Tentar parsear se for JSON do registrador
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

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: displayMessage,
        agent: result.agent
      }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Tente novamente.',
        agent: 'error'
      }])
    } finally {
      setLoading(false)
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setShowExamples(false)
    setMessages(prev => [...prev, { role: 'user', content: '📷 Enviando imagem...' }])
    setLoading(true)

    try {
      const result = await sendMessage('', file)

      let displayMessage = result.response
      try {
        const parsed = JSON.parse(result.response)
        if (parsed.confirmation) {
          displayMessage = parsed.confirmation
        }
      } catch (e) {}

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
  }

  function getAgentConfig(agentId) {
    return AGENTS[agentId] || {
      name: 'Zeni',
      emoji: '🤖',
      icon: Bot,
      color: 'text-zeni-primary',
      bgColor: 'bg-zeni-primary/10',
      description: 'Assistente'
    }
  }

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zeni-muted">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Chat com IA</h1>
        <p className="text-zeni-muted text-sm">
          4 agentes especializados prontos para ajudar
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {showExamples && messages.length === 0 && (
          <div className="space-y-6">
            {/* Agentes Grid */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(AGENTS).filter(([id]) => id !== 'registrar_vision').map(([id, agent]) => {
                const Icon = agent.icon
                return (
                  <div
                    key={id}
                    className={`${agent.bgColor} rounded-xl p-3 border border-slate-700`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={16} className={agent.color} />
                      <span className={`font-medium ${agent.color}`}>{agent.name}</span>
                    </div>
                    <p className="text-xs text-zeni-muted">{agent.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Exemplos por Agente */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zeni-muted">Experimente:</h3>

              {/* Registrador */}
              <div>
                <p className="text-xs text-emerald-400 mb-2">📝 Registrar transações:</p>
                <div className="flex flex-wrap gap-2">
                  {['50 mercado', 'almocei 35 reais', 'uber 23,90', 'recebi 5000 de salário'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-emerald-400/10 text-emerald-400 text-sm px-3 py-1 rounded-full hover:bg-emerald-400/20 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* CFO */}
              <div>
                <p className="text-xs text-blue-400 mb-2">📊 Análises financeiras:</p>
                <div className="flex flex-wrap gap-2">
                  {['Como estou esse mês?', 'Quanto gastei em restaurante?', 'Onde mais gasto?'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-blue-400/10 text-blue-400 text-sm px-3 py-1 rounded-full hover:bg-blue-400/20 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guardião */}
              <div>
                <p className="text-xs text-amber-400 mb-2">🛡️ Consultar orçamento:</p>
                <div className="flex flex-wrap gap-2">
                  {['Posso gastar 200 no restaurante?', 'Dá pra comprar um tênis de 300?'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-amber-400/10 text-amber-400 text-sm px-3 py-1 rounded-full hover:bg-amber-400/20 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Educador */}
              <div>
                <p className="text-xs text-purple-400 mb-2">📚 Aprender finanças:</p>
                <div className="flex flex-wrap gap-2">
                  {['O que é CDI?', 'O que é reserva de emergência?', 'Vale a pena parcelar?'].map(ex => (
                    <button
                      key={ex}
                      onClick={() => handleExampleClick(ex)}
                      className="bg-purple-400/10 text-purple-400 text-sm px-3 py-1 rounded-full hover:bg-purple-400/20 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const agentConfig = msg.agent ? getAgentConfig(msg.agent) : null
          const AgentIcon = agentConfig?.icon || Bot

          return (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className={`w-8 h-8 rounded-full ${agentConfig?.bgColor || 'bg-zeni-primary/20'} flex items-center justify-center flex-shrink-0`}>
                  <AgentIcon size={18} className={agentConfig?.color || 'text-zeni-primary'} />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-zeni-primary text-white'
                    : 'bg-zeni-card'
                }`}
              >
                {msg.role === 'assistant' && agentConfig && (
                  <p className={`text-xs ${agentConfig.color} mb-1 font-medium`}>
                    {agentConfig.emoji} {agentConfig.name}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <User size={18} />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-zeni-primary/20 flex items-center justify-center">
              <Bot size={18} className="text-zeni-primary animate-pulse" />
            </div>
            <div className="bg-zeni-card rounded-xl px-4 py-2">
              <p className="text-zeni-muted">Pensando...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-zeni-card hover:bg-slate-600 p-3 rounded-xl transition-colors"
          disabled={loading}
          title="Enviar comprovante"
        >
          <Image size={20} className="text-zeni-muted" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-zeni-card border border-slate-600 rounded-xl px-4 py-2"
          disabled={loading}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-zeni-primary hover:bg-emerald-600 p-3 rounded-xl transition-colors disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}
