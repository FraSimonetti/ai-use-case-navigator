'use client'

import type { ReactNode } from 'react'

interface ThemeProviderProps {
  children: ReactNode
  attribute?: string
  defaultTheme?: string
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
