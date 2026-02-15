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
  breadcrumb?: string
}

interface MatchedArticle {
  regulation: string
  article: string
  breadcrumb?: string
}

interface ExplorationMeta {
  intent: 'article_clarification' | 'obligation_finder' | 'concept_explainer' | 'cross_regulation_compare' | 'general'
  regulation_focus: 'all' | 'EU AI Act' | 'GDPR' | 'DORA'
  suggested_questions: string[]
  matched_articles: MatchedArticle[]
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  retrieved_passages?: RetrievedPassage[]
  confidence?: 'high' | 'medium' | 'low' | 'none'
  warnings?: string[]
  exploration?: ExplorationMeta
}

interface UserContext {
  role: 'deployer' | 'provider' | 'provider_and_deployer' | 'importer'
  institution_type: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
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

const INTENT_MODES = [
  { value: 'general', label: 'General Q&A' },
  { value: 'article_clarification', label: 'Clarify Article' },
  { value: 'obligation_finder', label: 'Find Obligations' },
  { value: 'concept_explainer', label: 'Explain Concept' },
  { value: 'cross_regulation_compare', label: 'Compare Regulations' },
] as const

const CHAT_HISTORY_KEY = 'ai_navigator_chat_history_v1'
const ACTIVE_CHAT_KEY = 'ai_navigator_chat_active_id'

const REGULATION_FOCUSES = [
  { value: 'all', label: 'All Regulations' },
  { value: 'EU AI Act', label: 'EU AI Act' },
  { value: 'GDPR', label: 'GDPR' },
  { value: 'DORA', label: 'DORA' },
] as const

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [hasConfig, setHasConfig] = useState(false)
  const [showContextPanel, setShowContextPanel] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(true)
  const [showHistoryPanel, setShowHistoryPanel] = useState(true)
  const [showMobileHistoryPanel, setShowMobileHistoryPanel] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [actionMenuSessionId, setActionMenuSessionId] = useState<string | null>(null)
  const [intentMode, setIntentMode] = useState<ExplorationMeta['intent']>('general')
  const [regulationFocus, setRegulationFocus] = useState<ExplorationMeta['regulation_focus']>('all')
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
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
    const savedIntent = localStorage.getItem('ai_navigator_chat_intent')
    if (savedIntent) {
      setIntentMode(savedIntent as ExplorationMeta['intent'])
    }
    const savedFocus = localStorage.getItem('ai_navigator_chat_focus')
    if (savedFocus) {
      setRegulationFocus(savedFocus as ExplorationMeta['regulation_focus'])
    }

    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY)
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory) as ChatSession[]
        const sorted = parsed.sort((a, b) => b.updatedAt - a.updatedAt)
        setChatHistory(sorted)
        const savedActiveId = localStorage.getItem(ACTIVE_CHAT_KEY)
        const active = savedActiveId
          ? sorted.find((session) => session.id === savedActiveId)
          : sorted[0]
        if (active) {
          setActiveChatId(active.id)
          setMessages(active.messages || [])
        }
      } catch (_e) {
        // Ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory))
  }, [chatHistory])

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId)
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY)
    }
  }, [activeChatId])

  useEffect(() => {
    if (!activeChatId) return
    setChatHistory((prev) => {
      const updated = prev.map((session) =>
        session.id === activeChatId
          ? { ...session, messages, updatedAt: Date.now() }
          : session
      )
      return [...updated].sort((a, b) => b.updatedAt - a.updatedAt)
    })
  }, [messages, activeChatId])

  const saveContext = (ctx: UserContext) => {
    setUserContext(ctx)
    localStorage.setItem('ai_navigator_chat_context', JSON.stringify(ctx))
  }

  const updateIntentMode = (mode: ExplorationMeta['intent']) => {
    setIntentMode(mode)
    localStorage.setItem('ai_navigator_chat_intent', mode)
  }

  const updateRegulationFocus = (focus: ExplorationMeta['regulation_focus']) => {
    setRegulationFocus(focus)
    localStorage.setItem('ai_navigator_chat_focus', focus)
  }

  const startNewConversation = () => {
    setActiveChatId(null)
    setMessages([])
    setEditingSessionId(null)
    setEditingTitle('')
    setActionMenuSessionId(null)
  }

  const openConversation = (sessionId: string) => {
    const session = chatHistory.find((item) => item.id === sessionId)
    if (!session) return
    setActiveChatId(session.id)
    setMessages(session.messages || [])
    setEditingSessionId(null)
    setEditingTitle('')
    setActionMenuSessionId(null)
  }

  const startRenameConversation = (sessionId: string) => {
    const session = chatHistory.find((item) => item.id === sessionId)
    if (!session) return
    setEditingSessionId(sessionId)
    setEditingTitle(session.title)
  }

  const saveRenameConversation = (sessionId: string) => {
    const nextTitle = editingTitle.trim()
    if (!nextTitle) return
    setChatHistory((prev) =>
      prev.map((item) =>
        item.id === sessionId ? { ...item, title: nextTitle, updatedAt: Date.now() } : item
      )
    )
    setEditingSessionId(null)
    setEditingTitle('')
    setActionMenuSessionId(null)
  }

  const restartConversation = (sessionId: string) => {
    setChatHistory((prev) =>
      prev.map((item) =>
        item.id === sessionId ? { ...item, messages: [], updatedAt: Date.now() } : item
      )
    )
    if (activeChatId === sessionId) {
      setMessages([])
    }
    setActionMenuSessionId(null)
  }

  const duplicateConversation = (sessionId: string) => {
    const source = chatHistory.find((item) => item.id === sessionId)
    if (!source) return
    const now = Date.now()
    const duplicate: ChatSession = {
      id: `chat_${now}`,
      title: `${source.title} (copy)`,
      createdAt: now,
      updatedAt: now,
      messages: [...source.messages],
    }
    setChatHistory((prev) => [duplicate, ...prev].slice(0, 40))
    setActiveChatId(duplicate.id)
    setMessages(duplicate.messages)
    setActionMenuSessionId(null)
  }

  const deleteConversation = (sessionId: string) => {
    const remaining = chatHistory.filter((item) => item.id !== sessionId)
    setChatHistory(remaining)
    if (editingSessionId === sessionId) {
      setEditingSessionId(null)
      setEditingTitle('')
    }
    if (actionMenuSessionId === sessionId) {
      setActionMenuSessionId(null)
    }
    if (activeChatId !== sessionId) return
    if (remaining.length > 0) {
      setActiveChatId(remaining[0].id)
      setMessages(remaining[0].messages || [])
    } else {
      setActiveChatId(null)
      setMessages([])
    }
  }

  const handleSubmit = async (question: string) => {
    if (!question.trim()) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: question }
    if (!activeChatId) {
      const now = Date.now()
      const newSession: ChatSession = {
        id: `chat_${now}`,
        title: question.trim().slice(0, 70),
        createdAt: now,
        updatedAt: now,
        messages: [],
      }
      setActiveChatId(newSession.id)
      setChatHistory((prev) => [newSession, ...prev].slice(0, 40))
    }
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
            intent: intentMode,
            regulation_focus: regulationFocus,
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
          exploration: data.exploration,
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
    startNewConversation()
  }

  const [showInfoModal, setShowInfoModal] = useState(false)

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {showHistoryPanel && (
        <aside className="hidden lg:flex w-72 border-r border-blue-200 bg-white/95 backdrop-blur flex-col">
          <div className="p-4 border-b border-blue-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Chat History</p>
            <button
              onClick={startNewConversation}
              className="text-xs px-2 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {chatHistory.length === 0 && (
              <p className="text-xs text-gray-500 px-2 py-3">No saved conversations yet.</p>
            )}
            {chatHistory.map((session) => (
              <div
                key={session.id}
                className={`rounded-lg border p-2.5 ${
                  activeChatId === session.id
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
              >
                {editingSessionId === session.id ? (
                  <div className="space-y-2">
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full text-xs border border-blue-300 rounded px-2 py-1"
                      maxLength={90}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveRenameConversation(session.id)}
                        className="text-[11px] px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingSessionId(null)
                          setEditingTitle('')
                        }}
                        className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openConversation(session.id)}
                      className="w-full text-left"
                    >
                      <p className="text-xs font-semibold text-gray-900 truncate">{session.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {new Date(session.updatedAt).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {session.messages.length} messages
                      </p>
                    </button>
                    <div className="mt-2 flex justify-end relative">
                      <button
                        onClick={() =>
                          setActionMenuSessionId((prev) => (prev === session.id ? null : session.id))
                        }
                        className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                        aria-label="Chat actions"
                      >
                        ...
                      </button>
                      {actionMenuSessionId === session.id && (
                        <div className="absolute right-0 top-8 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                          <button
                            onClick={() => startRenameConversation(session.id)}
                            className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-gray-50"
                          >
                            Rename
                          </button>
                          <button
                            onClick={() => restartConversation(session.id)}
                            className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-amber-50 text-amber-700"
                          >
                            Restart
                          </button>
                          <button
                            onClick={() => duplicateConversation(session.id)}
                            className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-blue-50 text-blue-700"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => deleteConversation(session.id)}
                            className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-red-50 text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      {showMobileHistoryPanel && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileHistoryPanel(false)}
            aria-label="Close chat history"
          />
          <aside className="absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-white border-l border-blue-200 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-blue-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Chat History</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={startNewConversation}
                  className="text-xs px-2 py-1 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  New
                </button>
                <button
                  onClick={() => setShowMobileHistoryPanel(false)}
                  className="text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {chatHistory.length === 0 && (
                <p className="text-xs text-gray-500 px-2 py-3">No saved conversations yet.</p>
              )}
              {chatHistory.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-2.5 ${
                    activeChatId === session.id
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300'
                  }`}
                >
                  {editingSessionId === session.id ? (
                    <div className="space-y-2">
                      <input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full text-xs border border-blue-300 rounded px-2 py-1"
                        maxLength={90}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveRenameConversation(session.id)}
                          className="text-[11px] px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingSessionId(null)
                            setEditingTitle('')
                          }}
                          className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          openConversation(session.id)
                          setShowMobileHistoryPanel(false)
                        }}
                        className="w-full text-left"
                      >
                        <p className="text-xs font-semibold text-gray-900 truncate">{session.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {new Date(session.updatedAt).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {session.messages.length} messages
                        </p>
                      </button>
                      <div className="mt-2 flex justify-end relative">
                        <button
                          onClick={() =>
                            setActionMenuSessionId((prev) => (prev === session.id ? null : session.id))
                          }
                          className="text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                          aria-label="Chat actions"
                        >
                          ...
                        </button>
                        {actionMenuSessionId === session.id && (
                          <div className="absolute right-0 top-8 z-20 w-36 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
                            <button
                              onClick={() => startRenameConversation(session.id)}
                              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-gray-50"
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => restartConversation(session.id)}
                              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-amber-50 text-amber-700"
                            >
                              Restart
                            </button>
                            <button
                              onClick={() => duplicateConversation(session.id)}
                              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-blue-50 text-blue-700"
                            >
                              Duplicate
                            </button>
                            <button
                              onClick={() => deleteConversation(session.id)}
                              className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-red-50 text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
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
                <p className="text-xs text-gray-500 hidden sm:block">Guided regulation explorer</p>
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
              onClick={() => setShowMobileHistoryPanel(true)}
              className="lg:hidden text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-medium transition-all shadow-sm"
              title="Open chat history"
            >
              History
            </button>
            <button
              onClick={() => setShowHistoryPanel((prev) => !prev)}
              className="hidden lg:inline-flex text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-medium transition-all shadow-sm"
              title="Open/close chat history"
            >
              History
            </button>
            <button
              onClick={() => setShowFiltersPanel((prev) => !prev)}
              className="text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-700 font-medium transition-all shadow-sm"
              title="Open/close filter menu"
            >
              Filters
            </button>
            <button
              onClick={() => setShowInfoModal(true)}
              className="text-xs px-3 py-2 rounded-lg border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 font-medium transition-all shadow-sm"
              title="How to use Smart Q&A"
            >
              Info
            </button>
            <button
              onClick={startNewConversation}
              className="text-xs px-3 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 font-medium transition-all shadow-sm"
              title="Start a new chat"
            >
              New Chat
            </button>
            {messages.length > 0 && (
              <button
                onClick={() => activeChatId && restartConversation(activeChatId)}
                className="text-xs px-3 py-2 rounded-lg border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-50 text-amber-700 font-medium transition-all shadow-sm"
              >
                Restart
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

        {showFiltersPanel && (
        <div className="border-b border-blue-100 px-3 sm:px-6 py-3 bg-white/70">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {INTENT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateIntentMode(mode.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    intentMode === mode.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {REGULATION_FOCUSES.map((reg) => (
                <button
                  key={reg.value}
                  onClick={() => updateRegulationFocus(reg.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    regulationFocus === reg.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {reg.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

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
                <p className="text-xs text-amber-700 mt-1">
                  Use <strong>Filters</strong> to switch mode (General Q&A, Clarify Article, etc.) and
                  <strong> History</strong> to reopen earlier conversations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 pb-32 sm:pb-6 space-y-4 bg-transparent">
          {messages.length === 0 ? (
            <WelcomeScreen
              hasConfig={hasConfig}
              onExampleClick={handleExampleClick}
              intentMode={intentMode}
              regulationFocus={regulationFocus}
            />
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={idx}
                  message={msg}
                  onSourceClick={setSelectedSource}
                  onSuggestedQuestion={handleExampleClick}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-blue-200 shadow-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-blue-600"></div>
                  <span className="text-sm font-medium text-gray-700">Exploring regulations and retrieving relevant articles...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area - Fixed on mobile, normal on desktop */}
        <div className="fixed sm:relative bottom-0 left-0 right-0 sm:border-t-2 border-t border-blue-200 p-3 sm:p-6 bg-white shadow-lg z-40">
          <ChatInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder={hasConfig
              ? "Ask an article, obligation, or concept across AI Act / GDPR / DORA..."
              : "Configure API key in Settings to start chatting..."
            }
            disabled={!hasConfig}
          />
          <p className="text-xs text-gray-500 mt-2 sm:mt-3 text-center hidden sm:block">
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
                <h3 className="text-lg font-bold text-gray-900 mb-3">Filters Menu (New)</h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Use the <strong>Filters</strong> button to open/close the filter panel and keep the chat area clean.
                </p>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>General Q&A:</strong> Broad retrieval across regulations.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Clarify Article:</strong> Best when you have a specific article number.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Find Obligations:</strong> Focuses answers on actionable obligations and duties.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Explain Concept:</strong> Better for terms like FRIA, DPIA, GPAI, profiling.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-600">•</span>
                    <span><strong>Compare Regulations:</strong> Highlights differences between AI Act, GDPR, and DORA.</span>
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Chat History (New)</h3>
                <p className="text-gray-700 leading-relaxed">
                  Use the <strong>History</strong> button to open/close conversation history. You can reopen, continue,
                  start a new chat, or delete old chats.
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
  intentMode: ExplorationMeta['intent']
  regulationFocus: ExplorationMeta['regulation_focus']
}

function WelcomeScreen({ hasConfig, onExampleClick, intentMode, regulationFocus }: WelcomeScreenProps) {
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
    <div className="flex flex-col items-center justify-center h-full text-center p-8 pt-12 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl">
          Q&A
        </div>
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Regulation Explorer</h1>
        <p className="text-lg text-gray-600 mb-2">
          Explore EU AI Act, GDPR, and DORA by article, obligation, and concept
        </p>
        <p className="text-sm text-gray-500">
          Guided RAG mode: <span className="font-semibold">{intentMode.replaceAll('_', ' ')}</span> · Scope: <span className="font-semibold">{regulationFocus}</span>
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
              <p className="text-xs text-blue-600 mt-2">
                Tip: open <strong>Filters</strong> to set intent/scope and <strong>History</strong> to continue past chats.
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
