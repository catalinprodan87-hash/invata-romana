import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }

export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'min-h-tap rounded-md px-4 py-3 font-semibold transition-colors disabled:opacity-40'
  const styles = variant === 'primary'
    ? 'bg-primary text-onPrimary' : 'bg-surface text-text ring-1 ring-hairline-strong'
  return <button className={`${base} ${styles} ${className}`} {...rest} />
}
