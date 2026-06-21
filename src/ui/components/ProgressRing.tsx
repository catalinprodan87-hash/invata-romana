interface ProgressRingProps {
  /** 0..1 fill fraction. */
  value: number
  /** Big text in the center (e.g. XP). */
  center: string
  /** Small caption under the center text. */
  caption: string
  size?: number
}

/** Lightweight SVG daily-goal ring — no dependencies, scales with the layout. */
export default function ProgressRing({
  value,
  center,
  caption,
  size = 96,
}: ProgressRingProps) {
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, value))
  const offset = c * (1 - clamped)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-bg)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-bold leading-none text-text">{center}</span>
        <span className="mt-0.5 text-xs text-text-muted">{caption}</span>
      </div>
    </div>
  )
}
