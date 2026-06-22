import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type TextSize = 'normal' | 'large'

const STORAGE_KEY_TEXT_SIZE = 'ir.textSize'
const STORAGE_KEY_DAILY_GOAL = 'ir.dailyGoal'
const DEFAULT_TEXT_SIZE: TextSize = 'normal'
const DEFAULT_DAILY_GOAL = 10

function isTextSize(value: unknown): value is TextSize {
  return value === 'normal' || value === 'large'
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

function getInitialTextSize(): TextSize {
  const saved = readStorage(STORAGE_KEY_TEXT_SIZE)
  return isTextSize(saved) ? saved : DEFAULT_TEXT_SIZE
}

function getInitialDailyGoal(): number {
  const saved = readStorage(STORAGE_KEY_DAILY_GOAL)
  if (saved !== null) {
    const parsed = parseInt(saved, 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_DAILY_GOAL
}

// Apply the saved text size at module load (before first paint) to avoid a
// flash of the wrong size for returning large-text users.
if (typeof document !== 'undefined') {
  document.documentElement.dataset.textSize = getInitialTextSize()
}

interface SettingsContextValue {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
  dailyGoal: number
  setDailyGoal: (goal: number) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(getInitialTextSize)
  const [dailyGoal, setDailyGoalState] = useState<number>(getInitialDailyGoal)

  // Reflect the text-size preference on <html> (drives root font-size in CSS).
  useEffect(() => {
    document.documentElement.dataset.textSize = textSize
    writeStorage(STORAGE_KEY_TEXT_SIZE, textSize)
  }, [textSize])

  // Persist daily goal.
  useEffect(() => {
    writeStorage(STORAGE_KEY_DAILY_GOAL, String(dailyGoal))
  }, [dailyGoal])

  const setTextSize = useCallback((size: TextSize) => setTextSizeState(size), [])
  const setDailyGoal = useCallback((goal: number) => setDailyGoalState(goal), [])

  const value = useMemo<SettingsContextValue>(
    () => ({ textSize, setTextSize, dailyGoal, setDailyGoal }),
    [textSize, setTextSize, dailyGoal, setDailyGoal],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
