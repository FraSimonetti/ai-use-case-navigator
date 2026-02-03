// LLM configuration utilities

const STORAGE_KEYS = {
  provider: 'ai_navigator_provider',
  apiKey: 'ai_navigator_api_key',
  model: 'ai_navigator_model',
}

export interface LLMConfig {
  provider: string | null
  apiKey: string | null
  model: string | null
}

/**
 * Get LLM configuration from localStorage
 */
export function getLLMConfig(): LLMConfig {
  if (typeof window === 'undefined') {
    return { provider: null, apiKey: null, model: null }
  }
  
  return {
    provider: localStorage.getItem(STORAGE_KEYS.provider),
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey),
    model: localStorage.getItem(STORAGE_KEYS.model),
  }
}

/**
 * Check if LLM is configured
 */
export function hasLLMConfig(): boolean {
  const config = getLLMConfig()
  return !!(config.provider && config.apiKey && config.model)
}

/**
 * Get headers for LLM-powered API requests
 * Returns standard headers + LLM headers if configured
 */
export function getLLMHeaders(): HeadersInit {
  const config = getLLMConfig()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (config.provider && config.apiKey && config.model) {
    headers['X-LLM-Provider'] = config.provider
    headers['X-LLM-API-Key'] = config.apiKey
    headers['X-LLM-Model'] = config.model
  }
  
  return headers
}

/**
 * Make a fetch request with LLM headers
 */
export async function fetchWithLLM(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const llmHeaders = getLLMHeaders()
  
  return fetch(url, {
    ...options,
    headers: {
      ...llmHeaders,
      ...options.headers,
    },
  })
}
