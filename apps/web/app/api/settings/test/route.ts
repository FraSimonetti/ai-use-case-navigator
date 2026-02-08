import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const provider = request.headers.get('X-LLM-Provider')
  const apiKey = request.headers.get('X-LLM-API-Key')
  const model = request.headers.get('X-LLM-Model')

  if (!provider || !apiKey || !model) {
    return NextResponse.json(
      { success: false, error: 'Missing provider, API key, or model' },
      { status: 400 }
    )
  }

  try {
    let response: Response
    
    if (provider === 'openrouter') {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Say "Connection successful" in 3 words.' }],
          max_tokens: 20,
        }),
      })
    } else if (provider === 'openai') {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Say "Connection successful" in 3 words.' }],
          max_tokens: 20,
        }),
      })
    } else if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 20,
          messages: [{ role: 'user', content: 'Say "Connection successful" in 3 words.' }],
        }),
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Unknown provider' },
        { status: 400 }
      )
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.error?.type || response.statusText
      return NextResponse.json(
        { success: false, error: `API Error: ${errorMessage}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, model })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    )
  }
}
