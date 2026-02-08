'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    description: 'Main dashboard'
  },
  {
    href: '/chat',
    label: 'Smart Q&A',
    description: 'Ask regulatory questions'
  },
  {
    href: '/obligations',
    label: 'Use Case Analysis',
    description: 'Find your obligations'
  },
  {
    href: '/settings',
    label: 'Settings',
    description: 'Configure API keys'
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-72 border-r bg-gradient-to-b from-slate-50 to-white hidden lg:flex flex-col shadow-sm">
      {/* Logo & Brand */}
      <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
        <h1 className="text-3xl font-bold text-white text-center mb-3">
          RegolAI
        </h1>
        <p className="text-xs text-blue-100 text-center mb-3">
          Regulatory Compliance Platform
        </p>
        <div className="flex gap-1 text-xs justify-center">
          <span className="px-2 py-0.5 rounded bg-white/20 text-white font-medium">AI Act</span>
          <span className="px-2 py-0.5 rounded bg-white/20 text-white font-medium">GDPR</span>
          <span className="px-2 py-0.5 rounded bg-white/20 text-white font-medium">DORA</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-lg px-4 py-3 transition-all ${
                isActive
                  ? 'bg-blue-50 border border-blue-200 shadow-sm'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${
                  isActive ? 'text-blue-700' : 'text-gray-700 group-hover:text-gray-900'
                }`}>
                  {item.label}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.description}
                </div>
              </div>
              {isActive && (
                <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Updated: February 2026
        </p>
      </div>
    </aside>
  )
}
