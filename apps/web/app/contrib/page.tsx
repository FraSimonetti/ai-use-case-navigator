'use client'

import { useEffect, useState } from 'react'

interface ContribItem {
  id: string
  title: string
  type: 'use_case' | 'regulation'
  filename: string
  data: Record<string, unknown>
}

interface ContribResponse {
  use_cases: ContribItem[]
  regulations: ContribItem[]
}

export default function ContribPage() {
  const [data, setData] = useState<ContribResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/contrib')
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }
        const json = (await response.json()) as ContribResponse
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contributions Preview</h1>
        <p className="text-sm text-gray-600 mt-1">
          Simple preview of proposal files in <code>contrib/use-cases</code> and <code>contrib/regulations</code>.
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Loading contributions...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load contributions: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Use Case Proposals</h2>
              <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                {data.use_cases.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.use_cases.map((item) => (
                <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.filename}</p>
                  <p className="text-xs mt-2 text-gray-700">
                    Risk: <strong>{String(item.data.risk_classification ?? 'n/a')}</strong>
                  </p>
                </article>
              ))}
              {data.use_cases.length === 0 && (
                <p className="text-sm text-gray-500">No use-case proposals yet.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Regulation Proposals</h2>
              <span className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                {data.regulations.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.regulations.map((item) => (
                <article key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-sm text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.filename}</p>
                  <p className="text-xs mt-2 text-gray-700">
                    Status: <strong>{String(item.data.status ?? 'n/a')}</strong>
                  </p>
                </article>
              ))}
              {data.regulations.length === 0 && (
                <p className="text-sm text-gray-500">No regulation proposals yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

