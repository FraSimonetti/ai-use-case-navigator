'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Source } from '@/lib/types'

interface SourcePanelProps {
  source: Source
  onClose: () => void
}

export function SourcePanel({ source, onClose }: SourcePanelProps) {
  return (
    <aside className="w-96 border-l bg-white p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Source Detail</h3>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500">Title</p>
          <p className="font-medium">{source.title}</p>
        </div>
        {(source.regulation || source.article) && (
          <div className="flex gap-2 flex-wrap">
            {source.regulation && <Badge>{source.regulation}</Badge>}
            {source.article && <Badge variant="outline">Art. {source.article}</Badge>}
          </div>
        )}
        {source.excerpt && (
          <div>
            <p className="text-sm text-gray-500">Excerpt</p>
            <p className="text-sm whitespace-pre-wrap">{source.excerpt}</p>
          </div>
        )}
        {source.url && (
          <a
            href={source.url}
            className="text-sm text-blue-600 underline"
            target="_blank"
            rel="noreferrer"
          >
            View original source
          </a>
        )}
      </div>
    </aside>
  )
}
