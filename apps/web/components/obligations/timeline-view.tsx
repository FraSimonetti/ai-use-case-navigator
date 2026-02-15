'use client'

import { Badge } from '@/components/ui/badge'
import { CalendarIcon, ClockIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/icons'

interface TimelineViewProps {
  deadlines: Array<{
    date: string
    event: string
    impact?: string
  }>
}

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getUrgencyConfig(days: number) {
  if (days < 0) return { color: 'border-l-red-600 bg-red-50', dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Overdue' }
  if (days <= 30) return { color: 'border-l-orange-500 bg-orange-50', dotColor: 'bg-orange-500', textColor: 'text-orange-700', label: 'Urgent' }
  if (days <= 90) return { color: 'border-l-yellow-500 bg-yellow-50', dotColor: 'bg-yellow-500', textColor: 'text-yellow-700', label: 'Upcoming' }
  return { color: 'border-l-green-500 bg-green-50', dotColor: 'bg-green-500', textColor: 'text-green-700', label: 'On Track' }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function TimelineView({ deadlines }: TimelineViewProps) {
  if (!deadlines || deadlines.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No deadlines available for the selected context.
      </p>
    )
  }

  const sorted = [...deadlines].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {sorted.map((deadline, idx) => {
          const days = getDaysUntil(deadline.date)
          const urgency = getUrgencyConfig(days)
          const isPast = days < 0

          return (
            <div
              key={`${deadline.date}-${deadline.event}-${idx}`}
              className={`relative flex gap-4 pl-10 border-l-4 rounded-r-lg p-3 ${urgency.color}`}
            >
              {/* Timeline dot */}
              <div className={`absolute left-[13px] top-5 w-3.5 h-3.5 rounded-full border-2 border-white ${urgency.dotColor} shadow-sm`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{deadline.event}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600">{formatDate(deadline.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Days counter */}
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${urgency.textColor} bg-white border`}>
                      {isPast ? (
                        <AlertTriangleIcon className="w-3 h-3" />
                      ) : days === 0 ? (
                        <ClockIcon className="w-3 h-3" />
                      ) : (
                        <CheckCircleIcon className="w-3 h-3" />
                      )}
                      <span>
                        {isPast
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? 'Today'
                          : `${days}d left`}
                      </span>
                    </div>

                    {deadline.impact && (
                      <Badge variant={deadline.impact === 'critical' ? 'destructive' : 'default'}>
                        {deadline.impact}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
