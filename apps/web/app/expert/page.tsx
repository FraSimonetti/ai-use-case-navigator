'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChatInput } from '@/components/chat/chat-input'
import { getLLMHeaders, hasLLMConfig } from '@/lib/llm-config'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Classification {
  risk_level: string
  classification_basis: string
  use_case: string
  institution_type: string
  role: string
}

interface ObligationItem {
  id: string
  name: string
  description: string
  source_regulation: string
  source_articles: string[]
  deadline: string | null
  priority: string
  action_items: string[]
  category: string
}

interface Obligations {
  ai_act: ObligationItem[]
  gdpr: ObligationItem[]
  dora: ObligationItem[]
  gpai: ObligationItem[]
  sectoral: ObligationItem[]
  total_count: number
}

interface TimelineEvent {
  date: string
  event: string
  impact: string
}

interface ExpertResult {
  classification: Classification
  obligations: Obligations
  timeline: TimelineEvent[]
  warnings: string[]
}

function getRiskBadgeClasses(risk: string): string {
  switch (risk) {
    case 'high_risk': return 'bg-red-100 text-red-800 border-red-300'
    case 'limited_risk': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'minimal_risk': return 'bg-green-100 text-green-800 border-green-300'
    case 'context_dependent': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'exempt_from_high_risk': return 'bg-blue-100 text-blue-800 border-blue-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

function formatRiskLevel(risk: string): string {
  return risk.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export default function ExpertPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [collectedData, setCollectedData] = useState<Record<string, unknown>>({})
  const [phase, setPhase] = useState<string>('interview')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ExpertResult | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHasConfig(hasLLMConfig())
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: question }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)

    try {
      const response = await fetch('/api/expert', {
        method: 'POST',
        headers: getLLMHeaders(),
        body: JSON.stringify({
          messages: newMessages,
          collected_data: collectedData,
          phase: 'interview',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Request failed with status ${response.status}`)
      }

      const data = await response.json()

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      setCollectedData(data.collected_data || collectedData)
      setPhase(data.phase)
      setProgress(data.progress || 0)

      if (data.phase === 'complete' && data.classification) {
        setResult({
          classification: data.classification,
          obligations: data.obligations,
          timeline: data.timeline,
          warnings: data.warnings,
        })
      }
    } catch (error) {
      console.error('Expert error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `**Error:** ${errorMessage}\n\nPlease check your API key in Settings.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!result) return
    setIsGeneratingPDF(true)

    try {
      // Fetch narrative from backend
      let narrative = ''
      try {
        const narrativeResponse = await fetch('/api/expert/generate-report', {
          method: 'POST',
          headers: getLLMHeaders(),
          body: JSON.stringify({
            classification: result.classification,
            obligations: result.obligations,
            collected_data: collectedData,
          }),
        })
        if (narrativeResponse.ok) {
          const narrativeData = await narrativeResponse.json()
          narrative = narrativeData.narrative || ''
        }
      } catch {
        // Continue without narrative
      }

      // Dynamic import of jsPDF to avoid SSR issues
      const { generatePDFReport } = await import('@/components/expert/pdf-generator')
      generatePDFReport({
        classification: result.classification,
        obligations: result.obligations,
        timeline: result.timeline,
        warnings: result.warnings,
        collectedData: collectedData,
        narrative,
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const resetConversation = () => {
    setMessages([])
    setCollectedData({})
    setPhase('interview')
    setProgress(0)
    setResult(null)
  }

  const handleExampleClick = (text: string) => {
    if (!hasConfig) return
    handleSubmit(text)
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-purple-50 via-indigo-50 to-violet-50">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b-2 border-purple-200 px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:justify-between bg-gradient-to-r from-white to-purple-50 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md text-xs sm:text-sm">
              AI
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-base sm:text-lg">RegolAI Expert</h1>
              <p className="text-xs text-gray-500 hidden sm:block">AI-powered classification interview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={resetConversation}
                className="text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 text-gray-700 hover:text-red-700 font-medium transition-all shadow-sm"
              >
                New Interview
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

        {/* Progress Bar */}
        {messages.length > 0 && phase === 'interview' && (
          <div className="px-6 py-2 bg-white border-b border-purple-100">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-purple-700 whitespace-nowrap">Interview Progress</span>
              <div className="flex-1 bg-purple-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-purple-700 whitespace-nowrap">{progress}%</span>
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
                <p className="text-sm text-amber-900 font-semibold">API key required</p>
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
        <div className="flex-1 overflow-auto p-3 sm:p-6 pb-32 sm:pb-6 space-y-4">
          {messages.length === 0 ? (
            <WelcomeScreen hasConfig={hasConfig} onExampleClick={handleExampleClick} />
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'bg-white border-2 border-purple-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-purple-200 shadow-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <span className="text-sm font-medium text-gray-700">Analyzing your response...</span>
                </div>
              )}

              {/* Results Panel */}
              {result && (
                <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-lg font-bold text-white">Classification Results</h2>
                  </div>
                  <div className="p-6 space-y-5">
                    {/* Risk Badge */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-600">Risk Level:</span>
                      <span className={`px-4 py-1.5 rounded-full border-2 font-bold text-sm ${getRiskBadgeClasses(result.classification.risk_level)}`}>
                        {formatRiskLevel(result.classification.risk_level)}
                      </span>
                    </div>

                    {/* Classification Basis */}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Legal Basis:</span>
                      <p className="text-sm text-gray-800 mt-1">{result.classification.classification_basis}</p>
                    </div>

                    {/* Obligation Counts */}
                    <div>
                      <span className="text-sm font-medium text-gray-600">Obligations:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                        {[
                          { label: 'AI Act', count: result.obligations.ai_act.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                          { label: 'GDPR', count: result.obligations.gdpr.length, color: 'bg-green-50 text-green-700 border-green-200' },
                          { label: 'DORA', count: result.obligations.dora.length, color: 'bg-orange-50 text-orange-700 border-orange-200' },
                          { label: 'GPAI', count: result.obligations.gpai.length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                          { label: 'Sectoral', count: result.obligations.sectoral.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                        ].map(item => (
                          <div key={item.label} className={`text-center px-3 py-2 rounded-lg border ${item.color}`}>
                            <div className="text-lg font-bold">{item.count}</div>
                            <div className="text-xs">{item.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warnings */}
                    {result.warnings.length > 0 && (
                      <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-amber-800 mb-2">Warnings</h4>
                        <ul className="space-y-1">
                          {result.warnings.map((w, i) => (
                            <li key={i} className="text-xs text-amber-700">{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Timeline */}
                    {result.timeline.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Key Deadlines:</span>
                        <div className="mt-2 space-y-1">
                          {result.timeline.map((event, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-red-600 font-bold whitespace-nowrap">{event.date}</span>
                              <span className="text-gray-600">{event.event}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PDF Button */}
                    <button
                      onClick={handleGeneratePDF}
                      disabled={isGeneratingPDF}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPDF ? 'Generating PDF Report...' : 'Generate PDF Report'}
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 sm:border-t-2 border-t border-purple-200 p-3 sm:p-6 bg-white shadow-lg z-40">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder={
              hasConfig
                ? phase === 'complete'
                  ? 'Classification complete. Click "New Interview" to start again.'
                  : 'Describe your AI use case or answer the question...'
                : 'Configure API key in Settings to start...'
            }
            disabled={!hasConfig || phase === 'complete'}
          />
          <p className="text-xs text-gray-500 mt-2 sm:mt-3 text-center hidden sm:block">
            Responses are AI-generated for guidance only. Always consult legal counsel for compliance decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

interface WelcomeScreenProps {
  hasConfig: boolean
  onExampleClick: (text: string) => void
}

function WelcomeScreen({ hasConfig, onExampleClick }: WelcomeScreenProps) {
  const examples = [
    'We use AI to automatically approve or reject consumer loan applications based on credit history and income data.',
    'Our bank deploys an AI chatbot that answers customer questions about their accounts and can initiate transfers.',
    'We are building an AI system that screens CVs and ranks job candidates for our HR department.',
    'Our insurance company uses AI to calculate premiums for life insurance policies based on health data.',
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 pt-12 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
          AI
        </div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          RegolAI Expert
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          AI-powered EU AI Act classification interview
        </p>
        <p className="text-sm text-gray-500">
          Describe your AI use case and get a full regulatory assessment with obligations and a PDF report
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
        <div className="text-left bg-white rounded-xl border-2 border-purple-100 p-5 shadow-sm">
          <h3 className="font-bold text-purple-800 mb-3">How it works</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">1.</span>
              <span>Describe your AI use case in plain language</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">2.</span>
              <span>Answer a few follow-up questions about your system</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">3.</span>
              <span>Get your risk classification with legal basis</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-600 font-bold">4.</span>
              <span>Download a comprehensive PDF compliance report</span>
            </li>
          </ol>
        </div>

        <div className="text-left bg-white rounded-xl border-2 border-purple-100 p-5 shadow-sm">
          <h3 className="font-bold text-purple-800 mb-3">What you get</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold mt-0.5">-</span>
              <span>EU AI Act risk classification with Annex III reference</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold mt-0.5">-</span>
              <span>Full obligation mapping: AI Act, GDPR, DORA, GPAI, Sectoral</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold mt-0.5">-</span>
              <span>Compliance timeline with key deadlines</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold mt-0.5">-</span>
              <span>Downloadable PDF report for your compliance team</span>
            </li>
          </ul>
        </div>
      </div>

      {!hasConfig && (
        <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl max-w-2xl shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
              !
            </div>
            <div>
              <p className="text-sm text-purple-900 font-semibold mb-2">API key required</p>
              <p className="text-sm text-purple-700">
                <Link href="/settings" className="text-purple-900 underline hover:no-underline font-bold">
                  Configure in Settings
                </Link>{' '}
                to add your OpenRouter, OpenAI, or Anthropic API key.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        <p className="text-base font-semibold text-gray-700 mb-4">
          {hasConfig ? 'Click an example to get started:' : 'Example starting points:'}
        </p>
        <div className="space-y-3">
          {examples.map((ex, idx) => (
            <button
              key={idx}
              onClick={() => onExampleClick(ex)}
              disabled={!hasConfig}
              className={`w-full text-left p-4 rounded-xl border-2 text-sm transition-all shadow-sm ${
                hasConfig
                  ? 'bg-white hover:bg-purple-50 hover:border-purple-300 hover:shadow-md cursor-pointer'
                  : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
