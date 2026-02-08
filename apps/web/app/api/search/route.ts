import { proxyJson } from '@/lib/server-api'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') ?? ''
  return proxyJson(`/api/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
  })
}
