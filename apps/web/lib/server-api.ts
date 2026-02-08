export const API_BASE_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function proxyJson(
  path: string,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
    const data = await response.json()
    return Response.json(data, { status: response.status })
  } catch (error) {
    return Response.json(
      { error: 'Backend unavailable', detail: (error as Error).message },
      { status: 502 }
    )
  }
}
