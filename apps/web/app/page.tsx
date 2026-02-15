'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3Icon, ClipboardListIcon, CalendarIcon, ClockIcon, ShieldCheckIcon, AlertTriangleIcon, TrashIcon } from '@/components/icons'

interface SavedAnalysis {
  id: string
  name: string
  use_case: string
  risk_classification: string
  total_obligations: number
  timestamp: string
}

const KEY_DEADLINES = [
  { date: '2025-02-02', event: 'Prohibited AI practices ban', impact: 'critical' },
  { date: '2025-08-02', event: 'GPAI obligations apply', impact: 'critical' },
  { date: '2026-08-02', event: 'High-risk AI (Annex III) obligations', impact: 'critical' },
  { date: '2027-08-02', event: 'Full AI Act enforcement', impact: 'high' },
]

function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function HomePage() {
  const [recentAnalyses, setRecentAnalyses] = useState<SavedAnalysis[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('regolai_saved_analyses')
      if (saved) setRecentAnalyses(JSON.parse(saved))
    } catch {}
  }, [])

  const deleteAnalysis = (id: string) => {
    const updated = recentAnalyses.filter(a => a.id !== id)
    setRecentAnalyses(updated)
    localStorage.setItem('regolai_saved_analyses', JSON.stringify(updated))
  }

  const riskCounts = recentAnalyses.reduce(
    (acc, a) => {
      const r = a.risk_classification
      if (r === 'high_risk') acc.high++
      else if (r === 'limited_risk') acc.limited++
      else if (r === 'minimal_risk') acc.minimal++
      else acc.dependent++
      return acc
    },
    { high: 0, limited: 0, minimal: 0, dependent: 0 }
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              RegolAI
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              EU AI Act, GDPR & DORA compliance platform
            </p>
          </div>
          <Badge variant="outline" className="text-xs">Updated Feb 2026</Badge>
        </div>

        {/* Key Deadlines Strip */}
        <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-orange-600" />
              Key EU AI Act Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {KEY_DEADLINES.map((d) => {
                const days = getDaysUntil(d.date)
                const isPast = days < 0
                const isUrgent = days >= 0 && days <= 90
                return (
                  <div
                    key={d.date}
                    className={`p-3 rounded-lg border ${
                      isPast ? 'bg-green-50 border-green-200' : isUrgent ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <p className="text-xs font-medium text-gray-500">
                      {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{d.event}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {isPast ? (
                        <>
                          <ShieldCheckIcon className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs font-medium text-green-700">In effect</span>
                        </>
                      ) : (
                        <>
                          <ClockIcon className="w-3.5 h-3.5 text-orange-600" />
                          <span className={`text-xs font-bold ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
                            {days}d remaining
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution + Quick Actions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3Icon className="w-4 h-4 text-blue-600" />
                Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAnalyses.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No analyses yet. Run your first use case analysis to see risk distribution.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-600" />
                      <span className="text-sm">High-Risk</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">{riskCounts.high}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-600" />
                      <span className="text-sm">Limited Risk</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{riskCounts.limited}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-600" />
                      <span className="text-sm">Minimal Risk</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{riskCounts.minimal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      <span className="text-sm">Context-Dependent</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{riskCounts.dependent}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/obligations" className="block">
                  <div className="p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all bg-white">
                    <div className="flex items-center gap-3">
                      <ClipboardListIcon className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Use Case Analysis</p>
                        <p className="text-xs text-gray-500">161 pre-mapped use cases with obligation mapping</p>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/chat" className="block">
                  <div className="p-4 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all bg-white">
                    <div className="flex items-center gap-3">
                      <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
                      <div>
                        <p className="font-semibold text-gray-900">Smart Q&A</p>
                        <p className="text-xs text-gray-500">RAG-powered answers from 1,149 regulatory documents</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Analyses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-gray-500" />
                Recent Analyses
              </span>
              {recentAnalyses.length > 0 && (
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    localStorage.removeItem('regolai_saved_analyses')
                    setRecentAnalyses([])
                  }}
                >
                  Clear All
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAnalyses.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardListIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No saved analyses yet</p>
                <p className="text-xs text-gray-400 mt-1">Your analyses will appear here after you save them</p>
                <Button asChild className="mt-4">
                  <Link href="/obligations">Start Your First Analysis</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAnalyses.slice(0, 10).map((a) => (
                  <Link key={a.id} href={`/obligations?edit=${a.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-8 rounded-full ${
                        a.risk_classification === 'high_risk' ? 'bg-red-500' :
                        a.risk_classification === 'limited_risk' ? 'bg-yellow-500' :
                        a.risk_classification === 'minimal_risk' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                        <p className="text-xs text-gray-500">
                          {a.total_obligations} obligations
                          {' \u00B7 '}
                          {new Date(a.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={
                        a.risk_classification === 'high_risk' ? 'bg-red-100 text-red-800' :
                        a.risk_classification === 'limited_risk' ? 'bg-yellow-100 text-yellow-800' :
                        a.risk_classification === 'minimal_risk' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {a.risk_classification.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-indigo-600 font-medium">Edit</span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteAnalysis(a.id); }}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete analysis"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Professional regulatory compliance platform &bull; Updated February 2026
          </p>
        </div>
      </div>
    </div>
  )
}
