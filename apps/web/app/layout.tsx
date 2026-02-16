import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'RegolAI - EU AI Act Navigator',
  description: 'Navigate EU AI Act, GDPR, and DORA obligations for AI use cases',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light">
          <div className="flex flex-col lg:flex-row h-screen">
            <MobileNav />
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
