'use client'

import type { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'outline' | 'secondary' | 'destructive'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-black text-white',
  outline: 'border border-gray-300 text-gray-800',
  secondary: 'bg-gray-200 text-gray-900',
  destructive: 'bg-red-600 text-white',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${variantClasses[variant]} ${
        className ?? ''
      }`}
      {...props}
    />
  )
}
