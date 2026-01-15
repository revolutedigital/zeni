import { useState, useEffect, useRef } from 'react'
import { Send, Image, Bot, User } from 'lucide-react'
import { sendMessage, getChatHistory } from '../services/api'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
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

  function getAgentLabel(agent) {
    const labels = {
      registrar: '📝 Registrador',
      registrar_vision: '📷 Registrador',
      cfo: '📊 CFO',
      guardian: '🛡️ Guardião',
      educator: '📚 Educador'
    }
    return labels[agent] || '🤖 Zeni'
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
          Digite "50 mercado" para registrar ou pergunte sobre suas finanças
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot size={48} className="mx-auto text-zeni-muted mb-4" />
            <p className="text-zeni-muted">Comece uma conversa!</p>
            <div className="mt-4 space-y-2 text-sm text-zeni-muted">
              <p>Exemplos:</p>
              <p className="text-zeni-text">"50 mercado"</p>
              <p className="text-zeni-text">"Como estou esse mês?"</p>
              <p className="text-zeni-text">"Gastei 100 de luz ontem"</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-zeni-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot size={18} className="text-zeni-primary" />
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-zeni-primary text-white'
                  : 'bg-zeni-card'
              }`}
            >
              {msg.role === 'assistant' && msg.agent && (
                <p className="text-xs text-zeni-muted mb-1">
                  {getAgentLabel(msg.agent)}
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
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-zeni-primary/20 flex items-center justify-center">
              <Bot size={18} className="text-zeni-primary" />
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
