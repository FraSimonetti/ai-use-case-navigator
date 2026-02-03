'use client'

import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/chat', label: 'AI Act Q&A' },
  { href: '/obligations', label: 'Use Case & Obligations' },
  { href: '/settings', label: '⚙️ Settings' },
]

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-gray-50 hidden lg:flex flex-col">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">AI Use Case Navigator</h2>
        <p className="text-xs text-gray-500">
          EU AI Act • GDPR • DORA
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
