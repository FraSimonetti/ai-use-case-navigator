'use client'

import { Badge } from '@/components/ui/badge'

interface TimelineViewProps {
  deadlines: Array<{
    date: string
    event: string
    impact?: string
  }>
}

export function TimelineView({ deadlines }: TimelineViewProps) {
  if (!deadlines || deadlines.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No deadlines available for the selected context.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {deadlines.map((deadline) => (
        <div
          key={`${deadline.date}-${deadline.event}`}
          className="flex items-center justify-between border rounded-md p-3"
        >
          <div>
            <p className="text-sm font-medium">{deadline.event}</p>
            <p className="text-xs text-gray-500">{deadline.date}</p>
          </div>
          {deadline.impact && <Badge>{deadline.impact}</Badge>}
        </div>
      ))}
    </div>
  )
}
