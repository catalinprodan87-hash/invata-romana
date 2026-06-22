import { useState, useRef } from 'react'
import { startRecording, RecorderHandle } from '../../speech/recognition'
import { t } from '../strings'

interface MicButtonProps {
  /** Called with an object URL for the recorded audio clip. */
  onClip: (url: string) => void
  /** Accessible label override. */
  label?: string
}

/** Record/stop toggle button. First click starts recording; second click stops and emits the clip. */
export default function MicButton({ onClip, label }: MicButtonProps) {
  const [recording, setRecording] = useState(false)
  const handleRef = useRef<RecorderHandle | null>(null)
  const startingRef = useRef(false)

  async function handleClick() {
    if (!recording) {
      if (startingRef.current) return
      startingRef.current = true
      try {
        const handle = await startRecording()
        handleRef.current = handle
        setRecording(true)
      } catch {
        // Mic denied or unavailable — stay idle, don't crash
        setRecording(false)
        handleRef.current = null
      } finally {
        startingRef.current = false
      }
    } else {
      const handle = handleRef.current
      handleRef.current = null
      setRecording(false)
      if (handle) {
        const url = await handle.stop()
        onClip(url)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label ?? (recording ? t.stop : t.record)}
      aria-pressed={recording}
      className={[
        'inline-flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-full transition-colors',
        recording
          ? 'bg-red-500 text-white ring-2 ring-red-400 active:scale-95'
          : 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95',
      ].join(' ')}
    >
      <span aria-hidden="true">{recording ? '⏹' : '🎙'}</span>
      {recording && (
        <span className="ml-1 text-sm font-medium">{t.recording}</span>
      )}
    </button>
  )
}
