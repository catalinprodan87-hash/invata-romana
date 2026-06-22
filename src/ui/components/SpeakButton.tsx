import { useEffect, useState } from 'react'
import { isSpeechSupported, speak, RATE_NORMAL } from '../../speech/speech'
import { t } from '../strings'

interface SpeakButtonProps {
  /** Romanian text to speak. */
  text: string
  /** Accessible label override (defaults to t.listen). */
  label?: string
  /** Visual size. */
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'min-h-tap min-w-tap text-base',
  md: 'min-h-tap min-w-tap text-lg',
  lg: 'h-14 w-14 text-2xl',
}

/** Speaker button that reads Romanian aloud using RATE_NORMAL. */
export default function SpeakButton({ text, label, size = 'md' }: SpeakButtonProps) {
  const [active, setActive] = useState(false)

  // Reset the "speaking" state if the component unmounts mid-utterance.
  useEffect(() => () => setActive(false), [])

  if (!isSpeechSupported()) return null

  return (
    <button
      type="button"
      onClick={() =>
        speak(text, {
          rate: RATE_NORMAL,
          onStart: () => setActive(true),
          onEnd: () => setActive(false),
        })
      }
      aria-label={label ?? t.listen}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full text-primary transition-colors',
        'bg-primary/10 hover:bg-primary/20 active:scale-95',
        active ? 'ring-2 ring-primary' : '',
        sizes[size],
      ].join(' ')}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  )
}
