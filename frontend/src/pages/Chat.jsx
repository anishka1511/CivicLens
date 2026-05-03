import { useState, useEffect, useRef, useMemo } from 'react'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [warning, setWarning] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const lastSendRef = useRef(0)
  const API = import.meta.env.VITE_API_URL || ''

  const suggestedQuestions = useMemo(() => [
    'What are the steps to register to vote?',
    'How does the Electoral College work?',
    'What rights do voters have?',
    'How are votes counted and verified?',
    'What happens on election day?'
  ], [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (messageText = null) => {
    const textRaw = (messageText || input || '')
    const text = String(textRaw).trim()
    if (!text) return
    if (text.length > 1000) {
      setWarning('Message exceeds maximum length of 1000 characters')
      return
    }

    // debounce / prevent double sends within 800ms
    const now = Date.now()
    if (now - (lastSendRef.current || 0) < 800) return
    lastSendRef.current = now

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setCharCount(0)
    setIsLoading(true)

    try {
      const history = messages
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content || '') }))
        .filter(h => ['user', 'assistant'].includes(h.role))
        .slice(-20)
      history.push({ role: 'user', content: text })

      let response
      try {
        response = await fetch(`${API}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history })
        })
      } catch (networkError) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Network error – please check your connection.' }])
        return
      }

      if (!response.ok) {
        // parse known API error structure
        let errMsg = 'Sorry, something went wrong.'
        try {
          const errBody = await response.json()
          if (errBody && errBody.error) errMsg = errBody.error
        } catch (_) {}
        setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
        return
      }

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setInput('')
    setCharCount(0)
    setWarning('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Chat with AI Assistant</h1>
        <button
          onClick={clearChat}
          className="text-sm text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors focus:ring-2 focus:ring-red-500 focus:outline-none"
          aria-label="Clear chat messages"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto mt-20">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="text-5xl mb-4">🗳️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CivicLens Chat</h2>
              <p className="text-gray-700 mb-6">Ask anything about elections, voting, and civic processes</p>
              <div className="max-w-md mx-auto">
                <div className="text-sm text-gray-700 mb-3 font-medium">Suggested questions:</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      aria-label={`Ask: ${q}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-lg rounded-lg px-4 py-3 ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-lg px-4 py-3 rounded-bl-none shadow-sm" aria-live="polite" aria-label="Assistant is typing">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            value={input}
            onChange={(e) => {
              const v = e.target.value
              setInput(v)
              setCharCount(v.length)
              if (v.length > 800) setWarning('Approaching 1000 character limit')
              else setWarning('')
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type your election question..."
            className="flex-1 resize-none border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="1"
            aria-label="Type your election question"
          />
          <div className="text-xs text-gray-700 mt-1">{charCount}/1000 {warning && <span className="text-yellow-700"> - {warning}</span>}</div>
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}