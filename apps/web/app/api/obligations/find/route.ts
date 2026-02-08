import { proxyJson } from '@/lib/server-api'

export async function POST(request: Request) {
  const body = await request.json()
  return proxyJson('/api/obligations/find', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
