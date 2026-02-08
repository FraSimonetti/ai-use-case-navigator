'use client'

import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactNode } from 'react'

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  asChild?: boolean
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-black text-white',
  outline: 'border border-gray-300',
  secondary: 'bg-gray-200 text-gray-900',
  destructive: 'bg-red-600 text-white',
}

export function Button({
  variant = 'default',
  asChild,
  children,
  className,
  ...props
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    variantClasses[variant]
  } ${className ?? ''}`

  if (asChild && isValidElement(children)) {
    const childClassName =
      (children.props as { className?: string }).className ?? ''
    return cloneElement(children, {
      className: `${classes} ${childClassName}`.trim(),
    } as any)
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
