'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Obligation {
  id: string
  name: string
  description: string
  priority?: string
  source_articles?: string[]
  source_regulation?: string
  category?: string
  deadline?: string
  action_items?: string[]
  applies_to?: string[]
  summary?: string
  effort_level?: string
  legal_basis?: string
  what_it_means?: string
  implementation_steps?: string[]
  evidence_required?: string[]
  penalties?: string
  common_pitfalls?: string[]
  related_obligations?: string[]
  tools_and_templates?: string[]
}

interface ObligationCardProps {
  obligation: Obligation
}

export function ObligationCard({ obligation }: ObligationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPriorityStyle = (priority: string | undefined) => {
    if (priority === 'critical') return 'bg-red-100 border-red-300 border-l-red-600'
    if (priority === 'high') return 'bg-orange-50 border-orange-200 border-l-orange-500'
    if (priority === 'medium') return 'bg-yellow-50 border-yellow-200 border-l-yellow-500'
    return 'bg-gray-50 border-gray-200 border-l-gray-400'
  }

  const getPriorityBadge = (priority: string | undefined) => {
    if (priority === 'critical') return 'bg-red-600 text-white'
    if (priority === 'high') return 'bg-orange-500 text-white'
    if (priority === 'medium') return 'bg-yellow-600 text-white'
    return 'bg-gray-500 text-white'
  }

  const getEffortBadge = (effort: string | undefined) => {
    if (effort === 'high') return '🔴 High Effort'
    if (effort === 'medium') return '🟡 Medium Effort'
    if (effort === 'low') return '🟢 Low Effort'
    return null
  }

  const getAppliesToLabel = (role: string) => {
    if (role === 'provider') return { label: 'Provider', color: 'bg-blue-100 text-blue-800' }
    if (role === 'deployer') return { label: 'Deployer', color: 'bg-green-100 text-green-800' }
    if (role === 'third_party_user') return { label: 'Third-Party AI', color: 'bg-purple-100 text-purple-800' }
    return { label: role, color: 'bg-gray-100 text-gray-800' }
  }

  const getRegulationLabel = (reg: string | undefined) => {
    if (!reg) return ''
    if (reg === 'eu_ai_act') return 'AI Act'
    return reg.toUpperCase()
  }

  return (
    <Card 
      className={`mb-3 border-l-4 cursor-pointer transition-all hover:shadow-md ${getPriorityStyle(obligation.priority)}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm leading-tight flex-1">
            {obligation.name}
          </h3>
          <Badge className={`${getPriorityBadge(obligation.priority)} text-xs shrink-0`}>
            {obligation.priority}
          </Badge>
        </div>

        {/* Role & Regulation Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {obligation.applies_to?.map((role) => {
            const { label, color } = getAppliesToLabel(role)
            return (
              <span key={role} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                {label}
              </span>
            )
          })}
          {obligation.source_articles?.slice(0, 2).map((article) => (
            <span key={article} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
              Art. {article}
            </span>
          ))}
          {obligation.deadline && (
            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">
              📅 {obligation.deadline}
            </span>
          )}
        </div>

        {/* Quick Summary */}
        <p className="text-sm text-gray-600 mb-2">
          {obligation.summary || obligation.description}
        </p>

        {/* Quick Actions Preview */}
        {!isExpanded && obligation.action_items && obligation.action_items.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-medium">{obligation.action_items.length} actions required</span>
            <span className="mx-2">•</span>
            <span className="text-blue-600 hover:underline">Click to expand</span>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            
            {/* What You Need to Do - Most Important */}
            {obligation.what_it_means && (
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="text-xs font-bold text-blue-800 mb-1">💡 WHAT THIS MEANS FOR YOU</h4>
                <p className="text-sm text-blue-900">{obligation.what_it_means}</p>
              </div>
            )}

            {/* Action Items - Checklist Style */}
            {obligation.action_items && obligation.action_items.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-2">✅ ACTION CHECKLIST</h4>
                <div className="space-y-1">
                  {obligation.action_items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1 rounded" disabled />
                      <span className="text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Implementation Guide - Collapsible */}
            {obligation.implementation_steps && obligation.implementation_steps.length > 0 && (
              <details className="group">
                <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  📋 STEP-BY-STEP IMPLEMENTATION GUIDE
                </summary>
                <div className="mt-2 pl-4 border-l-2 border-green-300 space-y-1">
                  {obligation.implementation_steps.map((step, i) => (
                    <p key={i} className="text-sm text-gray-600">{step}</p>
                  ))}
                </div>
              </details>
            )}

            {/* Evidence Required */}
            {obligation.evidence_required && obligation.evidence_required.length > 0 && (
              <details className="group">
                <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  📁 DOCUMENTATION REQUIRED
                </summary>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {obligation.evidence_required.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      {item}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Common Mistakes */}
            {obligation.common_pitfalls && obligation.common_pitfalls.length > 0 && (
              <details className="group">
                <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  ⚠️ COMMON MISTAKES TO AVOID
                </summary>
                <div className="mt-2 bg-red-50 rounded p-2 space-y-1">
                  {obligation.common_pitfalls.map((pitfall, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                      <span>✗</span>
                      {pitfall}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Legal Reference */}
            {obligation.legal_basis && (
              <details className="group">
                <summary className="text-xs font-bold text-gray-700 cursor-pointer hover:text-gray-900 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform">▶</span>
                  ⚖️ LEGAL TEXT
                </summary>
                <div className="mt-2 bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-600 italic">"{obligation.legal_basis}"</p>
                </div>
              </details>
            )}

            {/* Penalties */}
            {obligation.penalties && (
              <div className="bg-red-50 rounded p-2 flex items-center gap-2">
                <span className="text-lg">💰</span>
                <div>
                  <span className="text-xs font-bold text-red-800">PENALTY: </span>
                  <span className="text-xs text-red-700">{obligation.penalties}</span>
                </div>
              </div>
            )}

            {/* Tools */}
            {obligation.tools_and_templates && obligation.tools_and_templates.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-gray-500">🛠️ Tools:</span>
                {obligation.tools_and_templates.map((tool, i) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{tool}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
