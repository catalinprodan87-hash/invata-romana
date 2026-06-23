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
export type Theme = 'dark' | 'light'

const STORAGE_KEY_TEXT_SIZE = 'ir.textSize'
const STORAGE_KEY_DAILY_GOAL = 'ir.dailyGoal'
const STORAGE_KEY_THEME = 'ir.theme'
const DEFAULT_TEXT_SIZE: TextSize = 'normal'
const DEFAULT_DAILY_GOAL = 10
const DEFAULT_THEME: Theme = 'dark'

function isTextSize(value: unknown): value is TextSize {
  return value === 'normal' || value === 'large'
}

function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light'
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

function getInitialTheme(): Theme {
  const saved = readStorage(STORAGE_KEY_THEME)
  return isTheme(saved) ? saved : DEFAULT_THEME
}

// Apply saved text size + theme at module load (before first paint) to avoid a
// flash of the wrong size/theme for returning users.
if (typeof document !== 'undefined') {
  document.documentElement.dataset.textSize = getInitialTextSize()
  document.documentElement.dataset.theme = getInitialTheme()
}

interface SettingsContextValue {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
  dailyGoal: number
  setDailyGoal: (goal: number) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>(getInitialTextSize)
  const [dailyGoal, setDailyGoalState] = useState<number>(getInitialDailyGoal)
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  // Reflect the text-size preference on <html> (drives root font-size in CSS).
  useEffect(() => {
    document.documentElement.dataset.textSize = textSize
    writeStorage(STORAGE_KEY_TEXT_SIZE, textSize)
  }, [textSize])

  // Reflect the theme on <html> (drives the data-theme token overrides in CSS).
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeStorage(STORAGE_KEY_THEME, theme)
  }, [theme])

  // Persist daily goal.
  useEffect(() => {
    writeStorage(STORAGE_KEY_DAILY_GOAL, String(dailyGoal))
  }, [dailyGoal])

  const setTextSize = useCallback((size: TextSize) => setTextSizeState(size), [])
  const setDailyGoal = useCallback((goal: number) => setDailyGoalState(goal), [])
  const setTheme = useCallback((t: Theme) => setThemeState(t), [])

  const value = useMemo<SettingsContextValue>(
    () => ({ textSize, setTextSize, dailyGoal, setDailyGoal, theme, setTheme }),
    [textSize, setTextSize, dailyGoal, setDailyGoal, theme, setTheme],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
  return ctx
}
