'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatMessage } from '@/components/chat/chat-message'
import { SourcePanel } from '@/components/chat/source-panel'
import { getLLMHeaders, hasLLMConfig } from '@/lib/llm-config'
import type { Source } from '@/lib/types'

interface RetrievedPassage {
  regulation: string
  article: string
  text: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  url: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  retrieved_passages?: RetrievedPassage[]
  confidence?: 'high' | 'medium' | 'low' | 'none'
  warnings?: string[]
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
          retrieved_passages: data.retrieved_passages,
          confidence: data.confidence,
          warnings: data.warnings,
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

  const [showInfoModal, setShowInfoModal] = useState(false)

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="flex-1 flex flex-col">
        {/* Header with Context and Controls */}
        <div className="border-b-2 border-blue-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-between bg-gradient-to-r from-white to-blue-50 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md text-xs">
                Q&A
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-base sm:text-lg">Smart Q&A</h1>
                <p className="text-xs text-gray-500 hidden sm:block">RAG-powered regulatory assistant</p>
              </div>
            </div>
            <button
              onClick={() => setShowContextPanel(!showContextPanel)}
              className="text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center gap-1 sm:gap-2 transition-all shadow-sm whitespace-nowrap"
            >
              <span className="text-gray-600 hidden sm:inline">Context:</span>
              <span className="font-semibold text-gray-900 text-xs">{userContext.role}</span>
              <span className="text-gray-400 hidden sm:inline">@</span>
              <span className="font-semibold text-blue-600 text-xs hidden sm:inline">{userContext.institution_type}</span>
              <span className="ml-1 text-gray-400">{showContextPanel ? '▲' : '▼'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfoModal(true)}
              className="text-xs px-3 py-2 rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 font-medium transition-all shadow-sm"
              title="How to use Smart Q&A"
            >
              Info
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 text-gray-700 hover:text-red-700 font-medium transition-all shadow-sm"
              >
                Clear
              </button>
            )}
            {!hasConfig && (
              <Link
                href="/settings"
                className="text-xs px-3 py-2 rounded-lg bg-amber-100 border-2 border-amber-300 text-amber-800 hover:bg-amber-200 font-medium shadow-sm"
              >
                Configure API
              </Link>
            )}
          </div>
        </div>

        {/* Context Selection Panel */}
        {showContextPanel && (
          <div className="border-b-2 border-blue-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-inner">
            <p className="text-sm text-blue-800 mb-3 font-semibold">
              Set your context for more relevant answers:
            </p>
            <div className="flex gap-4 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-700 font-medium block mb-2">Your Role</label>
                <select
                  value={userContext.role}
                  onChange={(e) => saveContext({ ...userContext, role: e.target.value as UserContext['role'] })}
                  className="text-sm border-2 border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} - {r.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-700 font-medium block mb-2">Institution Type</label>
                <select
                  value={userContext.institution_type}
                  onChange={(e) => saveContext({ ...userContext, institution_type: e.target.value })}
                  className="text-sm border-2 border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                className="px-4 py-2 text-sm font-semibold text-blue-700 hover:text-blue-900 bg-white border-2 border-blue-300 hover:border-blue-500 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* API Key Notice */}
        {!hasConfig && messages.length === 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-300 px-6 py-4 shadow-inner">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                !
              </div>
              <div>
                <p className="text-sm text-amber-900 font-semibold">
                  API key required to use chat feature
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  <Link href="/settings" className="text-amber-900 underline hover:no-underline font-medium">
                    Go to Settings
                  </Link>{' '}
                  to add your OpenRouter, OpenAI, or Anthropic API key.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-6 space-y-4 bg-transparent">
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
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-blue-200 shadow-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700">Analyzing your question and searching regulatory documents...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t-2 border-blue-200 p-6 bg-white shadow-lg">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder={hasConfig
              ? "Ask about AI Act, GDPR, or DORA compliance..."
              : "Configure API key in Settings to start chatting..."
            }
            disabled={!hasConfig}
          />
          <p className="text-xs text-gray-500 mt-3 text-center">
            Responses are AI-generated for guidance only. Always consult legal counsel for compliance decisions.
          </p>
        </div>
      </div>

      {selectedSource && (
        <SourcePanel source={selectedSource} onClose={() => setSelectedSource(null)} />
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInfoModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">How to Use Smart Q&A</h2>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg px-3 py-1 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3">What is Smart Q&A?</h3>
                <p className="text-gray-700 leading-relaxed">
                  Smart Q&A is a Retrieval-Augmented Generation (RAG) system that answers your regulatory questions using
                  official EUR-Lex documents. It retrieves relevant passages from AI Act, GDPR, and DORA texts and provides
                  grounded answers with direct citations.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3">How It Works</h3>
                <ol className="space-y-3 text-gray-700">
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">1.</span>
                    <div>
                      <strong>Ask Your Question:</strong> Type any question about AI Act compliance, GDPR requirements,
                      or DORA obligations. Be specific for better results.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">2.</span>
                    <div>
                      <strong>Retrieval Phase:</strong> The system searches 1,149 regulatory document chunks and retrieves
                      the most relevant passages based on semantic similarity.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">3.</span>
                    <div>
                      <strong>Answer Generation:</strong> An AI model generates an answer based only on the retrieved passages,
                      ensuring no hallucinations or invented information.
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-blue-600">4.</span>
                    <div>
                      <strong>Review Results:</strong> Check the confidence score (High/Medium/Low) and view the source passages
                      with direct EUR-Lex links for verification.
                    </div>
                  </li>
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Confidence Indicators</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                    <strong className="text-green-800">High Confidence:</strong>
                    <span className="text-gray-700"> Multiple relevant passages found (score ≥0.5). Answer strongly grounded in regulatory text.</span>
                  </div>
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <strong className="text-yellow-800">Medium Confidence:</strong>
                    <span className="text-gray-700"> At least one relevant passage found (score ≥0.3). Some interpretation included.</span>
                  </div>
                  <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                    <strong className="text-red-800">Low Confidence:</strong>
                    <span className="text-gray-700"> Limited relevant passages (score &lt;0.3). Answer may be uncertain or require consultation.</span>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Setting Your Context</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Click the Context button in the header to set your role (Provider/Deployer) and institution type.
                  This helps tailor answers to your specific situation.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Example Questions</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"What are the obligations for deployers of high-risk AI systems?"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"Is credit scoring for consumers considered high-risk under the AI Act?"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"What GDPR requirements apply to automated decision-making?"</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span>"When do I need a Data Protection Impact Assessment?"</span>
                  </li>
                </ul>
              </section>

              <section className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <h3 className="text-lg font-bold text-amber-900 mb-2">Important Disclaimer</h3>
                <p className="text-amber-800 text-sm leading-relaxed">
                  Responses are AI-generated for guidance only and do not constitute legal advice.
                  Always verify critical information with the official EUR-Lex sources (links provided)
                  and consult your legal/compliance team for final decisions.
                </p>
              </section>
            </div>
          </div>
        </div>
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
      color: 'from-blue-500 to-indigo-600',
      questions: [
        'We use AI for credit scoring consumers - what risk level is this under the AI Act?',
        'Is our corporate credit risk AI (B2B) considered high-risk?',
        'What makes life insurance pricing AI high-risk but motor insurance AI not?',
      ]
    },
    {
      category: 'Obligations',
      color: 'from-green-500 to-emerald-600',
      questions: [
        'What are the key obligations for deployers of high-risk AI?',
        'Do we need a Fundamental Rights Impact Assessment for our credit scoring AI?',
        'What GDPR requirements apply to our AI that makes automated loan decisions?',
      ]
    },
    {
      category: 'Roles & Responsibilities',
      color: 'from-purple-500 to-pink-600',
      questions: [
        "We're buying an AI fraud detection system from a vendor - are we a provider or deployer?",
        'What are our obligations under DORA if we use third-party AI?',
        'How do provider and deployer responsibilities differ under the AI Act?',
      ]
    },
    {
      category: 'Timelines & Compliance',
      color: 'from-orange-500 to-red-600',
      questions: [
        "What's the timeline for AI Act compliance? When do different rules apply?",
        'How should we prepare for the August 2026 high-risk AI deadline?',
        'What happens if we deploy AI before completing conformity assessment?',
      ]
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
          Q&A
        </div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Smart Q&A</h1>
        <p className="text-lg text-gray-600 mb-2">
          Ask questions about EU AI Act, GDPR, and DORA compliance
        </p>
        <p className="text-sm text-gray-500">
          Powered by RAG • 1,149 official documents • Zero hallucinations
        </p>
      </div>

      {!hasConfig && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl max-w-2xl shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              !
            </div>
            <div>
              <p className="text-sm text-blue-900 font-semibold mb-2">
                API key required to use chat feature
              </p>
              <p className="text-sm text-blue-700">
                <Link href="/settings" className="text-blue-900 underline hover:no-underline font-bold">
                  Configure in Settings
                </Link>{' '}
                to add your OpenRouter, OpenAI, or Anthropic API key.
              </p>
              <p className="text-xs text-blue-600 mt-3">
                Or use the{' '}
                <Link href="/obligations" className="underline font-medium hover:no-underline">
                  Use Case Analysis
                </Link>{' '}
                page which works without any API key!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full">
        <p className="text-base font-semibold text-gray-700 mb-6">
          {hasConfig ? 'Click any question to get started:' : 'Example questions (configure API key to ask):'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {exampleQuestions.map((category) => (
            <div key={category.category} className="text-left">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 pb-2 border-b-2 border-gray-200">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onExampleClick(q)}
                    disabled={!hasConfig}
                    className={`w-full text-left p-4 rounded-xl border-2 text-sm transition-all shadow-sm ${
                      hasConfig
                        ? 'bg-white hover:bg-blue-50 hover:border-blue-300 hover:shadow-md cursor-pointer'
                        : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
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

      <div className="mt-4 p-6 bg-white border-2 border-gray-200 rounded-2xl max-w-2xl shadow-md">
        <h3 className="font-bold text-gray-900 mb-4">What can I ask?</h3>
        <ul className="text-sm text-gray-700 text-left space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Risk classification</strong> - Is my AI use case high-risk under Annex III?</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 font-bold">•</span>
            <span><strong>Obligations</strong> - What do I need to do to comply with the AI Act?</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 font-bold">•</span>
            <span><strong>Cross-regulation</strong> - How do AI Act, GDPR, and DORA interact?</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">•</span>
            <span><strong>Timelines</strong> - When do different requirements apply?</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-indigo-600 font-bold">•</span>
            <span><strong>Roles</strong> - Am I a provider, deployer, or both?</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
