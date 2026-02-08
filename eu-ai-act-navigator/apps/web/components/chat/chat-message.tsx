'use client'

import { Badge } from '@/components/ui/badge'
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

interface ChatMessageProps {
  message: Message
  onSourceClick?: (source: Source) => void
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  return (
    <div
      className={`rounded-xl border-2 p-5 shadow-sm transition-all hover:shadow-md ${
        message.role === 'assistant'
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        {message.role === 'assistant' ? (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            AI
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gray-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            U
          </div>
        )}
        <Badge
          variant={message.role === 'assistant' ? 'secondary' : 'outline'}
          className={`text-sm font-semibold ${
            message.role === 'assistant'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-white border-gray-300'
          }`}
        >
          {message.role === 'assistant' ? 'AI Act Expert' : 'You'}
        </Badge>
        {message.role === 'assistant' && message.confidence && message.confidence !== 'none' && (
          <ConfidenceBadge confidence={message.confidence} />
        )}
      </div>

      {/* Warnings */}
      {message.warnings && message.warnings.length > 0 && (
        <div className="mb-3 space-y-2">
          {message.warnings.map((warning, idx) => (
            <div key={`warning-${idx}-${warning.substring(0, 20)}`} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Answer Content */}
      <div className="text-sm space-y-2">
        <FormattedContent content={message.content} />
      </div>

      {/* Retrieved Passages */}
      {message.retrieved_passages && message.retrieved_passages.length > 0 && (
        <div className="mt-4 pt-3 border-t space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Retrieved Regulatory Texts</span>
            <span className="text-xs text-gray-400">({message.retrieved_passages.length} passages)</span>
          </div>
          <div className="space-y-2">
            {message.retrieved_passages.map((passage, idx) => (
              <RetrievedPassageCard
                key={`passage-${idx}-${passage.regulation}-${passage.article}`}
                passage={passage}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t space-y-2">
          <p className="text-xs text-gray-500 font-medium">Sources</p>
          <div className="flex flex-wrap gap-2">
            {message.sources.map((source, idx) => (
              <button
                key={`source-${idx}-${source.id || source.title}`}
                onClick={() => onSourceClick?.(source)}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
              >
                {source.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const config = {
    high: {
      bg: 'bg-gradient-to-r from-green-100 to-emerald-100',
      text: 'text-green-800',
      border: 'border-green-300',
      label: 'High Confidence',
      desc: 'Strongly grounded in regulatory text',
      shadow: 'shadow-green-200'
    },
    medium: {
      bg: 'bg-gradient-to-r from-yellow-100 to-amber-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      label: 'Medium Confidence',
      desc: 'Some interpretation included',
      shadow: 'shadow-yellow-200'
    },
    low: {
      bg: 'bg-gradient-to-r from-red-100 to-rose-100',
      text: 'text-red-800',
      border: 'border-red-300',
      label: 'Low Confidence',
      desc: 'Limited regulatory grounding',
      shadow: 'shadow-red-200'
    },
  }[confidence]

  return (
    <div
      className={`text-xs px-3 py-1.5 rounded-lg border-2 font-semibold shadow-sm ${config.bg} ${config.text} ${config.border}`}
      title={config.desc}
    >
      {config.label}
    </div>
  )
}

function RetrievedPassageCard({ passage }: { passage: RetrievedPassage }) {
  const confidenceConfig = {
    high: {
      border: 'border-green-300',
      bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      badge: 'bg-green-600 text-white'
    },
    medium: {
      border: 'border-yellow-300',
      bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
      badge: 'bg-yellow-600 text-white'
    },
    low: {
      border: 'border-red-300',
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      badge: 'bg-red-600 text-white'
    },
  }[passage.confidence]

  return (
    <div className={`border-2 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow ${confidenceConfig.border} ${confidenceConfig.bg}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="px-2 py-1 rounded-lg bg-white border border-gray-300 shadow-sm">
              <span className="text-xs font-bold text-gray-900">{passage.regulation}</span>
            </div>
            <span className="text-xs text-gray-400">→</span>
            <div className="px-2 py-1 rounded-lg bg-blue-600 text-white shadow-sm">
              <span className="text-xs font-bold">{passage.article}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">
              Relevance: <span className="font-bold">{(passage.score * 100).toFixed(1)}%</span>
            </span>
            <div className={`text-xs px-2 py-1 rounded-full font-bold ${confidenceConfig.badge}`}>
              {passage.confidence.toUpperCase()}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed mb-3 bg-white/50 p-3 rounded-lg border border-gray-200">
        {passage.text.length > 300 ? `${passage.text.substring(0, 300)}...` : passage.text}
      </p>
      <a
        href={passage.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
      >
        <span>View Full Article on EUR-Lex →</span>
      </a>
    </div>
  )
}

function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let keyCounter = 0 // Unique key counter

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const items = currentList.map((item, i) => (
        <li key={i} className="ml-4">
          {formatInline(item)}
        </li>
      ))
      const listKey = `list-${keyCounter++}` // Use unique key
      if (listType === 'ul') {
        elements.push(
          <ul key={listKey} className="list-disc space-y-1 my-2">
            {items}
          </ul>
        )
      } else {
        elements.push(
          <ol key={listKey} className="list-decimal space-y-1 my-2">
            {items}
          </ol>
        )
      }
      currentList = []
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.match(/^#{1,3}\s/)) {
      flushList()
      const level = line.match(/^(#+)/)?.[1].length ?? 1
      const text = line.replace(/^#+\s*/, '')
      if (level === 1) {
        elements.push(
          <h3 key={`h3-${keyCounter++}`} className="font-bold text-base mt-4 mb-2 text-gray-900">
            {formatInline(text)}
          </h3>
        )
      } else if (level === 2) {
        elements.push(
          <h4 key={`h4-${keyCounter++}`} className="font-semibold text-sm mt-3 mb-1 text-gray-800">
            {formatInline(text)}
          </h4>
        )
      } else {
        elements.push(
          <h5 key={`h5-${keyCounter++}`} className="font-medium text-sm mt-2 mb-1 text-gray-700">
            {formatInline(text)}
          </h5>
        )
      }
    } else if (line.match(/^[-*]\s/)) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      currentList.push(line.replace(/^[-*]\s*/, ''))
    } else if (line.match(/^\d+\.\s/)) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      currentList.push(line.replace(/^\d+\.\s*/, ''))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      elements.push(
        <p key={`p-${keyCounter++}`} className="text-gray-700 leading-relaxed">
          {formatInline(line)}
        </p>
      )
    }
  }

  flushList()
  return <>{elements}</>
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const citationMatch = remaining.match(/\[([^\]]+)\s+Art\.\s*([^\]]+)\]/)
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)

    let firstMatch: {
      index: number
      length: number
      node: React.ReactNode
    } | null = null

    if (citationMatch && citationMatch.index !== undefined) {
      const [full, reg, art] = citationMatch
      firstMatch = {
        index: citationMatch.index,
        length: full.length,
        node: (
          <span
            key={key++}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium"
          >
            {reg} Art. {art}
          </span>
        ),
      }
    }

    if (
      boldMatch &&
      boldMatch.index !== undefined &&
      (!firstMatch || boldMatch.index < firstMatch.index)
    ) {
      const [full, inner] = boldMatch
      firstMatch = {
        index: boldMatch.index,
        length: full.length,
        node: (
          <strong key={key++} className="font-semibold text-gray-900">
            {inner}
          </strong>
        ),
      }
    }

    if (firstMatch) {
      if (firstMatch.index > 0) {
        parts.push(remaining.slice(0, firstMatch.index))
      }
      parts.push(firstMatch.node)
      remaining = remaining.slice(firstMatch.index + firstMatch.length)
    } else {
      parts.push(remaining)
      break
    }
  }

  return <>{parts}</>
}
