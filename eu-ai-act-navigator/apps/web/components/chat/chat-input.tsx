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
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder ?? 'Ask a question...'}
        disabled={isLoading || disabled}
      />
      <Button type="submit" disabled={isLoading || disabled}>
        {isLoading ? 'Sending...' : 'Send'}
      </Button>
    </form>
  )
}
