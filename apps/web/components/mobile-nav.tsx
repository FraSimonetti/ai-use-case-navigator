'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/', label: 'Home', description: 'Main dashboard' },
  { href: '/chat', label: 'Smart Q&A', description: 'Ask regulatory questions' },
  { href: '/obligations', label: 'Use Case Analysis', description: 'Find your obligations' },
  { href: '/expert', label: 'RegolAI Expert', description: 'AI classification interview' },
  { href: '/settings', label: 'Settings', description: 'Configure API keys' },
]

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="lg:hidden">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">RegolAI</h1>
          </div>

          {/* Hamburger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <nav className="border-t bg-white">
            <div className="p-4 space-y-2">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block rounded-lg px-4 py-3 transition-colors ${
                      isActive
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className={`font-semibold text-sm ${
                      isActive ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.description}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Mobile Footer Stats */}
            <div className="px-4 pb-4 border-t bg-gray-50">
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div>
                  <div className="text-xs text-gray-600">Use Cases</div>
                  <div className="text-sm font-bold text-blue-600">161</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Regulations</div>
                  <div className="text-sm font-bold text-green-600">3</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Documents</div>
                  <div className="text-sm font-bold text-purple-600">1,149</div>
                </div>
              </div>
            </div>
          </nav>
        )}
      </header>
    </div>
  )
}
