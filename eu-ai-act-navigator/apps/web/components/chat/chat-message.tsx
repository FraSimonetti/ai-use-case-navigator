'use client'

import { Badge } from '@/components/ui/badge'
import type { Source } from '@/lib/types'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

interface ChatMessageProps {
  message: Message
  onSourceClick?: (source: Source) => void
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        message.role === 'assistant' ? 'bg-gray-50' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant={message.role === 'assistant' ? 'secondary' : 'outline'}>
          {message.role === 'assistant' ? 'AI Act Expert' : 'You'}
        </Badge>
      </div>
      <div className="text-sm space-y-2">
        <FormattedContent content={message.content} />
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t space-y-2">
          <p className="text-xs text-gray-500 font-medium">Sources</p>
          <div className="flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <button
                key={source.id}
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

function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const items = currentList.map((item, i) => (
        <li key={i} className="ml-4">
          {formatInline(item)}
        </li>
      ))
      if (listType === 'ul') {
        elements.push(
          <ul key={elements.length} className="list-disc space-y-1 my-2">
            {items}
          </ul>
        )
      } else {
        elements.push(
          <ol key={elements.length} className="list-decimal space-y-1 my-2">
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
          <h3 key={i} className="font-bold text-base mt-4 mb-2 text-gray-900">
            {formatInline(text)}
          </h3>
        )
      } else if (level === 2) {
        elements.push(
          <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-gray-800">
            {formatInline(text)}
          </h4>
        )
      } else {
        elements.push(
          <h5 key={i} className="font-medium text-sm mt-2 mb-1 text-gray-700">
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
        <p key={i} className="text-gray-700 leading-relaxed">
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
