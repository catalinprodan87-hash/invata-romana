import { useEffect, useState } from 'react'
import type { ExerciseProps } from './types'
import type { Exercise } from '../content/types'
import { getItemById } from '../content/load'
import { getMeta, setMeta } from '../srs/store'
import SpeakButton from '../ui/components/SpeakButton'
import MicButton from '../ui/components/MicButton'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

type ShadowingExercise = Extract<Exercise, { type: 'shadowing' }>

/** Module-level cache so the privacy check is only async once per session. */
let sessionAck = false

export default function Shadowing({ exercise, item: itemProp, onDone }: ExerciseProps<ShadowingExercise>) {
  const item = itemProp ?? getItemById(exercise.itemId)

  const [done, setDone] = useState(false)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  /** Whether to show the privacy note modal instead of the mic button. */
  const [showPrivacy, setShowPrivacy] = useState(false)
  /** Whether the user has passed the consent gate and the real MicButton is active. */
  const [micUnlocked, setMicUnlocked] = useState(false)

  // Free the recorded clip's object URL when it's replaced or the card unmounts.
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  }, [recordedUrl])

  if (!item) {
    return (
      <div className="text-text-muted text-center p-6">
        {t.itemNotFound}: {exercise.itemId}
      </div>
    )
  }

  async function handleMicTap() {
    if (sessionAck) {
      setMicUnlocked(true)
      return
    }
    const meta = await getMeta()
    if (meta.micPrivacyAck) {
      sessionAck = true
      setMicUnlocked(true)
    } else {
      setShowPrivacy(true)
    }
  }

  async function ackPrivacy() {
    const meta = await getMeta()
    await setMeta({ ...meta, micPrivacyAck: true })
    sessionAck = true
    setShowPrivacy(false)
    setMicUnlocked(true)
  }

  function handleClip(url: string) {
    setRecordedUrl(url)
  }

  function handleGotIt() {
    if (done) return
    setDone(true)
    onDone('good')
  }

  function playYours() {
    if (recordedUrl) void new Audio(recordedUrl).play()
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Word display */}
      <div className="bg-surface rounded-md p-5 text-center space-y-2">
        <p className="text-3xl font-bold text-primary">{item.ro}</p>
        {item.pron_uk && (
          <p className="text-base text-text-muted">[{item.pron_uk}]</p>
        )}
        {item.uk && (
          <p className="text-base text-text">{item.uk}</p>
        )}
      </div>

      {/* Listen to model */}
      <div className="flex items-center gap-4 rounded-md bg-surface p-4 ring-1 ring-hairline">
        <SpeakButton text={item.ro} size="lg" label={t.playModel} />
        <p className="text-base font-medium text-text">{t.playModel}</p>
      </div>

      {/* Privacy note (shown inline when consent is needed) */}
      {showPrivacy && (
        <div className="rounded-lg bg-surface p-5 shadow-sm ring-1 ring-primary/20">
          <p className="flex items-center gap-2 text-base font-semibold text-text">
            <span aria-hidden="true">🔒</span>
            {t.micPrivacyTitle}
          </p>
          <p className="mt-2 text-sm text-text-muted">{t.micPrivacyBody}</p>
          <Button
            variant="primary"
            onClick={ackPrivacy}
            className="mt-4 w-full"
          >
            {t.micPrivacyOk}
          </Button>
        </div>
      )}

      {/* Mic section — shown when privacy is NOT showing */}
      {!showPrivacy && (
        <>
          {!recordedUrl ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-text-muted text-center">{t.yourTurn}</p>
              {micUnlocked ? (
                /* Real MicButton once consent is granted */
                <MicButton onClip={handleClip} label={t.record} />
              ) : (
                /* Gate button — triggers consent check */
                <button
                  type="button"
                  onClick={handleMicTap}
                  aria-label={t.record}
                  className="inline-flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-colors text-2xl"
                >
                  <span aria-hidden="true">🎙</span>
                </button>
              )}
            </div>
          ) : (
            /* After a clip is recorded: compare + self-affirm */
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={playYours}
                  className="min-h-tap flex-1 rounded-md bg-primary/10 px-3 py-3 font-semibold text-primary"
                >
                  ▶︎ {t.playYours}
                </button>
                <SpeakButton text={item.ro} size="md" label={t.playModel} />
              </div>
              <Button
                variant="primary"
                disabled={done}
                onClick={handleGotIt}
                className="w-full"
              >
                {t.gotIt}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Fallback self-affirm — always available (mic denied, skipped, or before any attempt) */}
      {!recordedUrl && !showPrivacy && (
        <Button
          variant="secondary"
          disabled={done}
          onClick={handleGotIt}
          className="w-full text-sm"
        >
          {t.gotIt}
        </Button>
      )}
    </div>
  )
}
