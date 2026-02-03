'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PROVIDERS = [
  { 
    id: 'openrouter', 
    name: 'OpenRouter', 
    description: 'Access to 100+ models (GPT-4, Claude, Llama, etc.)',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
    signupUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Fast & Cheap)' },
      { id: 'openai/gpt-4o', name: 'GPT-4o (Best Quality)' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (Fast)' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
      { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
    ]
  },
  { 
    id: 'openai', 
    name: 'OpenAI', 
    description: 'Direct OpenAI API access',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-proj-...',
    signupUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Recommended)' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Cheapest)' },
    ]
  },
  { 
    id: 'anthropic', 
    name: 'Anthropic', 
    description: 'Direct Anthropic API access (Claude)',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
    signupUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Recommended)' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fast & Cheap)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Most Capable)' },
    ]
  },
]

// Storage keys
const STORAGE_KEYS = {
  provider: 'ai_navigator_provider',
  apiKey: 'ai_navigator_api_key',
  model: 'ai_navigator_model',
}

export default function SettingsPage() {
  const [provider, setProvider] = useState('openrouter')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Load saved settings on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEYS.provider)
    const savedKey = localStorage.getItem(STORAGE_KEYS.apiKey)
    const savedModel = localStorage.getItem(STORAGE_KEYS.model)
    
    if (savedProvider) setProvider(savedProvider)
    if (savedKey) setApiKey(savedKey)
    if (savedModel) setModel(savedModel)
  }, [])

  // Update default model when provider changes
  useEffect(() => {
    const currentProvider = PROVIDERS.find(p => p.id === provider)
    if (currentProvider && !model) {
      setModel(currentProvider.models[0].id)
    }
  }, [provider, model])

  const currentProvider = PROVIDERS.find(p => p.id === provider)

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEYS.provider, provider)
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey)
    localStorage.setItem(STORAGE_KEYS.model, model)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEYS.provider)
    localStorage.removeItem(STORAGE_KEYS.apiKey)
    localStorage.removeItem(STORAGE_KEYS.model)
    setApiKey('')
    setModel('')
    setProvider('openrouter')
    setTestResult(null)
  }

  const handleTest = async () => {
    if (!apiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }
    
    setTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-LLM-Provider': provider,
          'X-LLM-API-Key': apiKey,
          'X-LLM-Model': model,
        },
        body: JSON.stringify({ provider, model }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        setTestResult({ success: true, message: `Connection successful! Model: ${data.model}` })
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error - is the backend running?' })
    } finally {
      setTesting(false)
    }
  }

  const maskKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 10) return '••••••••'
    return key.slice(0, 7) + '••••••••' + key.slice(-4)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">
          Configure your AI provider to enable Q&A chat and custom use case analysis.
        </p>
      </div>

      {/* Security Notice */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-800 flex items-center gap-2">
          <span>🔒</span> Your API Key is Secure
        </h3>
        <ul className="mt-2 text-sm text-green-700 space-y-1">
          <li>• Stored only in your browser (localStorage)</li>
          <li>• Never sent to our servers or logged</li>
          <li>• Sent directly to the AI provider from your browser</li>
          <li>• You can delete it anytime</li>
        </ul>
      </div>

      {/* Provider Selection */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">1. Choose AI Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  provider === p.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setProvider(p.id)
                  setModel(p.models[0].id)
                }}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-gray-500 mt-1">{p.description}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">2. Enter API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={currentProvider?.keyPlaceholder || 'Enter your API key...'}
                  className="pr-20 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-500">
              Don't have a key?{' '}
              <a 
                href={currentProvider?.signupUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Get one from {currentProvider?.name} →
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">3. Select Model</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent>
              {currentProvider?.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-2">
            Model ID: <code className="bg-gray-100 px-1 rounded">{model}</code>
          </p>
        </CardContent>
      </Card>

      {/* Test Result */}
      {testResult && (
        <div className={`mb-4 p-4 rounded-lg ${
          testResult.success 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={testResult.success ? 'text-green-800' : 'text-red-800'}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={handleSave} disabled={!apiKey}>
          {saved ? '✅ Saved!' : 'Save Settings'}
        </Button>
        <Button variant="outline" onClick={handleTest} disabled={!apiKey || testing}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button variant="outline" onClick={handleClear} className="text-red-600 hover:text-red-700">
          Clear All
        </Button>
      </div>

      {/* Current Configuration */}
      {apiKey && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">Current Configuration</h3>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Provider:</span> {currentProvider?.name}</p>
            <p><span className="text-gray-500">Model:</span> {model}</p>
            <p><span className="text-gray-500">API Key:</span> {maskKey(apiKey)}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800">What features need an API key?</h3>
        <div className="mt-2 text-sm text-blue-700 space-y-1">
          <p>✅ <strong>Use Case & Obligations</strong> - Works without API key (120+ pre-mapped cases)</p>
          <p>🔑 <strong>AI Q&A Chat</strong> - Requires API key</p>
          <p>🔑 <strong>Custom Use Case Analysis</strong> - Requires API key</p>
        </div>
      </div>
    </div>
  )
}
