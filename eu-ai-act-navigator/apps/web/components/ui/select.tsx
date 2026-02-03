'use client'

import type { ReactElement, ReactNode } from 'react'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
}

interface SelectItemProps {
  value: string
  children: ReactNode
}

interface SelectValueProps {
  placeholder?: string
}

export function Select({ value, onValueChange, children }: SelectProps) {
  const items: Array<{ value: string; label: string }> = []
  let placeholder = 'Select...'

  const collect = (nodes: ReactNode) => {
    if (!nodes) return
    if (Array.isArray(nodes)) {
      nodes.forEach(collect)
      return
    }
    const element = nodes as ReactElement
    if (!element?.type) return

    if ((element.type as any).displayName === 'SelectItem') {
      items.push({
        value: element.props.value,
        label: String(element.props.children),
      })
      return
    }
    if ((element.type as any).displayName === 'SelectValue') {
      placeholder = element.props.placeholder ?? placeholder
      return
    }
    if (element.props?.children) {
      collect(element.props.children)
    }
  }

  collect(children)

  return (
    <select
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  )
}

export function SelectTrigger({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

export function SelectValue({ placeholder }: SelectValueProps) {
  return <span>{placeholder}</span>
}

export function SelectContent({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

export function SelectItem({ children }: SelectItemProps) {
  return <>{children}</>
}

SelectItem.displayName = 'SelectItem'
SelectValue.displayName = 'SelectValue'
