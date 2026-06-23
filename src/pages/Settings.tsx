import { useNavigate } from 'react-router-dom'
import { useSettings, type TextSize, type Theme } from '../ui/settings'
import { resetProgress } from '../srs/store'
import Button from '../ui/components/Button'
import { t } from '../ui/strings'

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={[
              'min-h-tap flex-1 rounded-md px-3 py-2 font-semibold transition-colors',
              active ? 'bg-primary text-onPrimary' : 'bg-bg text-text ring-1 ring-hairline-strong',
            ].join(' ')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { textSize, setTextSize, dailyGoal, setDailyGoal, theme, setTheme } = useSettings()

  async function handleReset() {
    if (!window.confirm(t.resetConfirm)) return
    await resetProgress()
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-screen-sm items-center gap-3 px-4 pt-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label={t.continue}
          className="min-h-tap min-w-tap text-2xl leading-none text-text-muted"
        >
          ‹
        </button>
        <h1 className="text-xl font-bold text-text">{t.settings}</h1>
      </header>

      <main className="mx-auto flex max-w-screen-sm flex-col gap-4 px-4 pb-12 pt-4">
        <section className="rounded-lg bg-surface p-4 ring-1 ring-hairline">
          <p className="mb-2 text-base font-semibold text-text">{t.theme}</p>
          <Segmented<Theme>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'dark', label: t.themeDark },
              { value: 'light', label: t.themeLight },
            ]}
          />
        </section>

        <section className="rounded-lg bg-surface p-4 ring-1 ring-hairline">
          <p className="mb-2 text-base font-semibold text-text">{t.textSize}</p>
          <Segmented<TextSize>
            value={textSize}
            onChange={setTextSize}
            options={[
              { value: 'normal', label: t.normal },
              { value: 'large', label: t.large },
            ]}
          />
        </section>

        <section className="rounded-lg bg-surface p-4 ring-1 ring-hairline">
          <p className="mb-2 text-base font-semibold text-text">{t.dailyGoal}</p>
          <Segmented<number>
            value={dailyGoal}
            onChange={setDailyGoal}
            options={[
              { value: 10, label: '10' },
              { value: 20, label: '20' },
              { value: 30, label: '30' },
            ]}
          />
        </section>

        <section className="rounded-lg bg-surface p-4 ring-1 ring-hairline">
          <p className="text-base font-semibold text-text">{t.about}</p>
          <p className="mt-1 text-sm text-text-muted">{t.aboutBody}</p>
        </section>

        <Button variant="secondary" onClick={handleReset} className="w-full text-danger">
          {t.resetProgress}
        </Button>
      </main>
    </div>
  )
}
