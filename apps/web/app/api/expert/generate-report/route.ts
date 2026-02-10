import { proxyJson } from '@/lib/server-api'

const LLM_HEADERS = ['X-LLM-Provider', 'X-LLM-API-Key', 'X-LLM-Model'] as const

export async function POST(request: Request) {
  const body = await request.json()
  const headers: Record<string, string> = {}
  for (const name of LLM_HEADERS) {
    const value = request.headers.get(name)
    if (value) headers[name] = value
  }
  return proxyJson('/api/expert/generate-report', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}
