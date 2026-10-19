import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

export function ChevronSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="chevron-select">
    <select {...props} />
    <ChevronDown className="chevron-select-icon" size={16} aria-hidden="true" />
  </span>
}