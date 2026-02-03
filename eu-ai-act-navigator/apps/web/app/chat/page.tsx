'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatMessage } from '@/components/chat/chat-message'
import { SourcePanel } from '@/components/chat/source-panel'
import { getLLMHeaders, hasLLMConfig } from '@/lib/llm-config'
import type { Source } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

interface UserContext {
  role: 'deployer' | 'provider' | 'provider_and_deployer' | 'importer'
  institution_type: string
}

const INSTITUTION_TYPES = [
  { value: 'bank', label: 'Bank / Credit Institution' },
  { value: 'insurer', label: 'Insurance Company' },
  { value: 'investment_firm', label: 'Investment Firm' },
  { value: 'payment_provider', label: 'Payment Service Provider' },
  { value: 'crypto_provider', label: 'Crypto Asset Service Provider' },
  { value: 'asset_manager', label: 'Asset Manager' },
  { value: 'fintech', label: 'Fintech Company' },
]

const ROLES = [
  { value: 'deployer', label: 'Deployer', description: 'I use AI built by others' },
  { value: 'provider', label: 'Provider', description: 'I develop AI for others' },
  { value: 'provider_and_deployer', label: 'Both', description: 'I build and use my own AI' },
  { value: 'importer', label: 'Importer', description: 'I bring non-EU AI to market' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [hasConfig, setHasConfig] = useState(false)
  const [showContextPanel, setShowContextPanel] = useState(false)
  const [userContext, setUserContext] = useState<UserContext>({
    role: 'deployer',
    institution_type: 'bank',
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasConfig(hasLLMConfig())
    // Load saved context from localStorage
    const savedContext = localStorage.getItem('ai_navigator_chat_context')
    if (savedContext) {
      try {
        setUserContext(JSON.parse(savedContext))
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const saveContext = (ctx: UserContext) => {
    setUserContext(ctx)
    localStorage.setItem('ai_navigator_chat_context', JSON.stringify(ctx))
  }

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMessage])

    try {
      // Build conversation history for context (last 6 messages)
      const recentHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getLLMHeaders(),
        body: JSON.stringify({
          question,
          context: {
            ...userContext,
            conversation_history: recentHistory,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `**Error:** ${errorMessage}\n\nPlease check your API key in [Settings](/settings), or try again. If the problem persists, the AI provider may be temporarily unavailable.`,
          sources: [],
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = (question: string) => {
    if (!hasConfig) return
    handleSubmit(question)
  }

  const clearConversation = () => {
    setMessages([])
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        {/* Header with Context and Controls */}
        <div className="border-b px-4 py-2 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-gray-700">AI Act Q&A</h1>
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="text-xs px-2 py-1 rounded bg-white border hover:bg-gray-100 flex items-center gap-1"
            >
              <span className="text-gray-500">Context:</span>
              <span className="font-medium">{userContext.role}</span>
              <span className="text-gray-400">@</span>
              <span className="font-medium">{userContext.institution_type}</span>
              <span className="ml-1 text-gray-400">▼</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-100 text-gray-600"
              >
                Clear Chat
              </button>
            )}
            {!hasConfig && (
              <Link
                href="/settings"
                className="text-xs px-2 py-1 rounded bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200"
              >
                Configure API Key
              </Link>
            )}
          </div>
        </div>

        {/* Context Selection Panel */}
        {showContextPanel && (
          <div className="border-b px-4 py-3 bg-blue-50">
            <p className="text-xs text-blue-700 mb-2 font-medium">
              Set your context for more relevant answers:
            </p>
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Your Role</label>
                <select
                  value={userContext.role}
                  onChange={(e) => saveContext({ ...userContext, role: e.target.value as UserContext['role'] })}
                  className="text-sm border rounded px-2 py-1"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} - {r.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Institution Type</label>
                <select
                  value={userContext.institution_type}
                  onChange={(e) => saveContext({ ...userContext, institution_type: e.target.value })}
                  className="text-sm border rounded px-2 py-1"
                >
                  {INSTITUTION_TYPES.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowContextPanel(false)}
                className="self-end text-xs text-blue-600 hover:underline"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* API Key Notice */}
        {!hasConfig && messages.length === 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-800">
              <strong>API key required.</strong>{' '}
              <Link href="/settings" className="text-amber-900 underline hover:no-underline">
                Go to Settings
              </Link>{' '}
              to add your OpenRouter, OpenAI, or Anthropic API key.
            </p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <WelcomeScreen hasConfig={hasConfig} onExampleClick={handleExampleClick} />
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  onSourceClick={setSelectedSource}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span className="text-sm">Analyzing your question...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-white">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder={hasConfig
              ? "Ask about AI Act, GDPR, or DORA compliance..."
              : "Configure API key in Settings to start chatting..."
            }
            disabled={!hasConfig}
          />
          <p className="text-xs text-gray-400 mt-2 text-center">
            Responses are AI-generated for guidance only. Always consult legal counsel for compliance decisions.
          </p>
        </div>
      </div>

      {selectedSource && (
        <SourcePanel source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}
    </div>
  )
}

interface WelcomeScreenProps {
  hasConfig: boolean
  onExampleClick: (question: string) => void
}

function WelcomeScreen({ hasConfig, onExampleClick }: WelcomeScreenProps) {
  const exampleQuestions = [
    {
      category: 'Risk Classification',
      questions: [
        'We use AI for credit scoring consumers - what risk level is this under the AI Act?',
        'Is our corporate credit risk AI (B2B) considered high-risk?',
        'What makes life insurance pricing AI high-risk but motor insurance AI not?',
      ]
    },
    {
      category: 'Obligations',
      questions: [
        'What are the key obligations for deployers of high-risk AI?',
        'Do we need a Fundamental Rights Impact Assessment for our credit scoring AI?',
        'What GDPR requirements apply to our AI that makes automated loan decisions?',
      ]
    },
    {
      category: 'Roles & Responsibilities',
      questions: [
        "We're buying an AI fraud detection system from a vendor - are we a provider or deployer?",
        'What are our obligations under DORA if we use third-party AI?',
        'How do provider and deployer responsibilities differ under the AI Act?',
      ]
    },
    {
      category: 'Timelines & Compliance',
      questions: [
        "What's the timeline for AI Act compliance? When do different rules apply?",
        'How should we prepare for the August 2026 high-risk AI deadline?',
        'What happens if we deploy AI before completing conformity assessment?',
      ]
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">AI Regulatory Q&A</h1>
      <p className="text-gray-500 mb-2">
        Ask questions about EU AI Act, GDPR, and DORA compliance for financial institutions
      </p>
      <p className="text-xs text-gray-400 mb-6">
        Powered by your configured LLM - responses tailored to your institution context
      </p>

      {!hasConfig && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> This feature requires an API key.{' '}
            <Link href="/settings" className="text-blue-900 underline font-medium">
              Configure in Settings
            </Link>
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Or use the{' '}
            <Link href="/obligations" className="underline font-medium">
              Use Case & Obligations
            </Link>{' '}
            page which works without any API key!
          </p>
        </div>
      )}

      <div className="w-full">
        <p className="text-sm text-gray-500 mb-4">
          {hasConfig ? 'Click any question to get started:' : 'Example questions (configure API key to ask):'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exampleQuestions.map((category) => (
            <div key={category.category} className="text-left">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onExampleClick(q)}
                    disabled={!hasConfig}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      hasConfig
                        ? 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-lg">
        <h3 className="font-semibold text-gray-700 mb-2">What can I ask?</h3>
        <ul className="text-sm text-gray-600 text-left space-y-1">
          <li>• <strong>Risk classification</strong> - Is my AI use case high-risk?</li>
          <li>• <strong>Obligations</strong> - What do I need to do to comply?</li>
          <li>• <strong>Cross-regulation</strong> - How do AI Act, GDPR, and DORA interact?</li>
          <li>• <strong>Timelines</strong> - When do requirements apply?</li>
          <li>• <strong>Roles</strong> - Am I a provider, deployer, or both?</li>
        </ul>
      </div>
    </div>
  )
}
