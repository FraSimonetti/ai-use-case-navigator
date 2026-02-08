'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatInputProps {
  onSubmit: (question: string) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder,
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || isLoading || disabled) return
    onSubmit(trimmed)
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="flex-1 relative">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder ?? 'Ask a question...'}
          disabled={isLoading || disabled}
          className="pr-12 h-12 text-base border-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl shadow-sm"
        />
        {value && !isLoading && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
      <Button
        type="submit"
        disabled={isLoading || disabled || !value.trim()}
        className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>Sending...</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>Send</span>
            <span>→</span>
          </span>
        )}
      </Button>
    </form>
  )
}
