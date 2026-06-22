import type { CourseIndex, Item, Lesson } from './types'
import { validateItemBank } from './validate'
import bankRaw from './data/item-bank.json'
import courseIndexRaw from './data/course-index.json'

// Validate once at module load — fails fast if the bank is malformed.
validateItemBank(bankRaw)

const _items: Item[] = bankRaw.items
const _courseIndex: CourseIndex = courseIndexRaw as CourseIndex

// O(1) lookup map built once.
const itemsById = new Map<string, Item>(_items.map((item) => [item.id, item]))

// Lazy-load lesson modules keyed by file path.
const lessonModules = import.meta.glob<{ default: Lesson }>('./data/lessons/**/*.json')

// Map lesson id → loader function.
// Lesson files live at ./data/lessons/<unit>/<nn>.json.
// The lesson id is stored inside the JSON (e.g. "a1-survival-01"), so we
// derive it from the path: <unit-dir>/<basename> with the directory separator
// replaced by "-" and the numeric file padded (e.g. a1-survival/01 → a1-survival-01).
// This avoids eagerly loading every file just to read their ids.
const lessonLoaders = new Map<string, () => Promise<{ default: Lesson }>>()
for (const [path, loader] of Object.entries(lessonModules)) {
  // path looks like ./data/lessons/a1-survival/01.json
  const parts = path.replace(/^\.\/data\/lessons\//, '').replace(/\.json$/, '').split('/')
  // parts = ['a1-survival', '01']
  // lesson id convention: <unit>-<nn> e.g. a1-survival-01
  const lessonId = parts.join('-')
  lessonLoaders.set(lessonId, loader)
}

// Cache resolved lessons so each file is fetched at most once.
const lessonCache = new Map<string, Lesson>()

export function getItemBank(): Item[] {
  return _items
}

export function getItemById(id: string): Item | undefined {
  return itemsById.get(id)
}

export function getCourseIndex(): CourseIndex {
  return _courseIndex
}

export async function loadLesson(id: string): Promise<Lesson | null> {
  const cached = lessonCache.get(id)
  if (cached) return cached

  const loader = lessonLoaders.get(id)
  if (!loader) return null

  const mod = await loader()
  lessonCache.set(id, mod.default)
  return mod.default
}
