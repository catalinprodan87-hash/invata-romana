import { useState } from 'react'
import type { Mission } from '../content/types'
import SpeakButton from '../ui/components/SpeakButton'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

interface MissionRehearsalProps {
  mission: Mission
  onDone: () => void
}

export default function MissionRehearsal({ mission, onDone }: MissionRehearsalProps) {
  const [checked, setChecked] = useState<boolean[]>(() =>
    mission.realWorld_uk.map(() => false)
  )

  function toggleCheck(i: number) {
    setChecked((prev) => {
      const next = [...prev]
      next[i] = !next[i]
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Mission prompt */}
      <div className="rounded-md bg-surface p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
          {t.missionTitle}
        </p>
        <p className="text-lg font-semibold text-text leading-snug">{mission.prompt_uk}</p>
      </div>

      {/* Dialogue lines — listen + shadow */}
      <div className="flex flex-col gap-3">
        {mission.lines.map((line, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md bg-surface p-4 ring-1 ring-hairline"
          >
            <SpeakButton text={line.ro} size="md" label={t.playModel} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-muted mb-0.5">{line.speaker}</p>
              <p className="text-base font-semibold text-primary leading-snug">{line.ro}</p>
              <p className="text-sm text-text-muted leading-snug mt-0.5">{line.uk}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Real-world checklist */}
      {mission.realWorld_uk.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t.missionDoForReal}
          </p>
          {mission.realWorld_uk.map((item, i) => (
            <label
              key={i}
              className="flex items-start gap-3 min-h-tap rounded-md bg-surface px-4 py-3 ring-1 ring-hairline cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={() => toggleCheck(i)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              />
              <span
                className={[
                  'text-base leading-snug',
                  checked[i] ? 'line-through text-text-muted' : 'text-text',
                ].join(' ')}
              >
                {item}
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Complete button — always enabled */}
      <Button
        variant="primary"
        onClick={onDone}
        className="w-full"
      >
        {t.done}
      </Button>
    </div>
  )
}
