'use client'

import { ShieldCheckIcon, AlertTriangleIcon, InfoIcon } from '@/components/icons'

interface ValidationData {
  confidence: 'high' | 'medium' | 'low'
  legal_basis: string
  explanation: string
  is_valid: boolean
}

interface ValidationBadgeProps {
  validation: ValidationData
}

export function ValidationBadge({ validation }: ValidationBadgeProps) {
  if (!validation) return null

  const confidenceConfig = {
    high: {
      bg: 'bg-green-50 border-green-300',
      text: 'text-green-800',
      icon: <ShieldCheckIcon className="w-5 h-5 text-green-600" />,
      label: 'High Confidence',
    },
    medium: {
      bg: 'bg-yellow-50 border-yellow-300',
      text: 'text-yellow-800',
      icon: <InfoIcon className="w-5 h-5 text-yellow-600" />,
      label: 'Medium Confidence',
    },
    low: {
      bg: 'bg-red-50 border-red-300',
      text: 'text-red-800',
      icon: <AlertTriangleIcon className="w-5 h-5 text-red-600" />,
      label: 'Low Confidence',
    },
  }

  const config = confidenceConfig[validation.confidence] || confidenceConfig.medium

  return (
    <div className={`rounded-lg border-2 p-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${config.text}`}>
              {config.label}
            </span>
            {!validation.is_valid && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                Review Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mb-1">{validation.explanation}</p>
          {validation.legal_basis && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">Legal basis:</span> {validation.legal_basis}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
