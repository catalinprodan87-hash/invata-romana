# Învață Româna — v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a client-only, offline-first PWA where a Ukrainian speaker learns one complete "survival" unit of Romanian through the full daily loop (warm-up reviews → input dialogue → focused practice → output → mission), with spaced repetition that makes it stick.

**Architecture:** React SPA, all logic in the browser. Pure-logic modules (content validation, feedback/diff, SM-2-lite SRS, session builder, progress math) are framework-free and unit-tested with Vitest. React components render the session loop and read/write a store backed by IndexedDB (SRS item states) and localStorage (preferences). Speech (TTS + recognition + record-and-compare) is lifted from the existing Ghid app. Deployed to GitHub Pages under base `/invata-romana/`.

**Tech Stack:** React 18, TypeScript, Vite 6, Tailwind CSS v3, vite-plugin-pwa (Workbox), Vitest + fake-indexeddb (tests), idb-keyval (IndexedDB), Web Speech API.

## Global Constraints

- Client-only; **no backend, no API keys, no network calls** at runtime (fonts excepted).
- **Offline-first**: app shell + all content precached by the service worker; app fully usable offline after first load.
- **UI language: Ukrainian only.** No language toggle. Romanian is the *content* being taught. UI strings live in one `src/ui/strings.ts` module; never hard-code visible text in components.
- **No fake pronunciation score.** Speaking = shadowing (record + self-compare) and minimal pairs (ear training); never block progress on a speech result.
- **`pron_uk` (Cyrillic respelling) is mandatory** on every learnable Romanian item and always shown — it is the offline fallback when TTS is unavailable.
- Production base path is exactly `/invata-romana/`; dev/preview stay at `/`.
- Romanian must carry correct diacritics (ă â î ș ț). Diacritic-aware feedback must show the exact slip.
- Node 22 in CI. Mobile-first; ≥44px tap targets; respects a text-size setting.
- Reuse, don't reinvent: copy/adapt these files from the Ghid app at `/Users/cata/Claude Code`:
  - `src/services/speech.ts`, `src/services/recognition.ts`
  - `src/lib/learn/scoring.ts` (normalize + Levenshtein — basis for the feedback engine)
  - `vite.config.ts` (PWA + base pattern), `.github/workflows/deploy.yml`
  - `src/index.css` (design tokens), `tailwind.config.js`, `tsconfig*.json`

---

## File Structure

```
invata-romana/
  index.html
  package.json  vite.config.ts  tailwind.config.js  postcss.config.js
  tsconfig.json  tsconfig.app.json  tsconfig.node.json  vitest.config.ts
  .github/workflows/deploy.yml
  public/  (favicon.svg, icons/)
  src/
    main.tsx  App.tsx  index.css
    ui/
      strings.ts            # all Ukrainian UI text
      settings.tsx          # text-size + daily-goal context (localStorage)
      components/           # Header, Button, ProgressRing, SpeakButton, MicButton, Spinner
    content/
      types.ts              # Item, Lesson, Exercise, Mission, CourseIndex
      validate.ts           # runtime validation of item bank + lessons
      load.ts               # lazy loaders (import.meta.glob)
      data/
        item-bank.json
        course-index.json
        lessons/a1-survival/*.json
    feedback/
      check.ts              # normalize, diff, similarity, gradeText
    srs/
      scheduler.ts          # SM-2-lite pure functions
      store.ts              # IndexedDB-backed ProgressStore (idb-keyval)
      progress.ts           # XP, streak, daily goal, frequency-backbone math
    session/
      build.ts              # buildSession() pure planner
      orchestrator.tsx      # runs the loop UI
    exercises/
      types.ts              # ExerciseResult contract
      generate.ts           # derive retrieval/minimal-pair exercises from items
      Comprehension.tsx  Retrieval.tsx  MinimalPairs.tsx  Dictation.tsx
      Shadowing.tsx  Production.tsx  MissionRehearsal.tsx  ExerciseRenderer.tsx
    speech/
      speech.ts  recognition.ts   # lifted from Ghid
    pages/
      Home.tsx  Session.tsx  Settings.tsx
  scripts/
    generate-icons.mjs
    validate-content.mjs    # CLI: fail build if content invalid
  docs/superpowers/...
```

---

## Task 1: Scaffold project + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `postcss.config.js`, `tailwind.config.js`, `vitest.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Reference: Ghid `tailwind.config.js`, `src/index.css`, `tsconfig*.json`

**Interfaces:**
- Produces: a runnable Vite app at `/`, `npm run build`, `npm run test` (Vitest), `npm run dev`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "invata-romana",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "node scripts/validate-content.mjs && tsc -b && vite build",
    "preview": "vite preview --host",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --noEmit",
    "icons": "node scripts/generate-icons.mjs"
  },
  "dependencies": {
    "idb-keyval": "^6.2.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "sharp": "^0.33.5",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vite-plugin-pwa": "^0.21.1",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Copy config files from Ghid, adapting names**

Copy verbatim from `/Users/cata/Claude Code`: `tailwind.config.js`, `postcss.config.js`, `src/index.css`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`. In `tsconfig.app.json` add `"vitest/globals"` to `compilerOptions.types`.

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Create `vite.config.ts`** (base + PWA; copy structure from Ghid `vite.config.ts`, change `PROD_BASE` to `'/invata-romana/'`, manifest name to `Învață Româna`, and `globPatterns`/`navigateFallback` as in Ghid). Keep `devOptions.enabled: true`.

- [ ] **Step 5: Create `index.html`** (copy Ghid's, change `<title>` to `Învață Româna`, keep `%BASE_URL%` favicon/apple-touch-icon and the Noto Sans `<link>` with cyrillic+latin subsets).

- [ ] **Step 6: Create `.gitignore`** (copy Ghid's: `node_modules`, `dist`, `dev-dist`, `*.tsbuildinfo`, `.DS_Store`).

- [ ] **Step 7: Create minimal `src/main.tsx` and `src/App.tsx`**

```tsx
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
```

```tsx
// src/App.tsx
export default function App() {
  return <div className="p-6 text-text">Învață Româna</div>
}
```

- [ ] **Step 8: Create placeholder `scripts/validate-content.mjs`** so `build` works before Task 4:

```js
// Replaced fully in Task 4. For now, a no-op so `npm run build` succeeds.
console.log('content validation: (placeholder) ok')
```

- [ ] **Step 9: Install + verify**

Run: `npm install && npm run build && npm run test`
Expected: build succeeds (Vite emits `dist/`); `vitest run` reports "No test files found" (exit 0) or passes. `npm run dev` serves the page at `/`.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

## Task 2: Design tokens, UI strings, settings context

**Files:**
- Create: `src/ui/strings.ts`, `src/ui/settings.tsx`, `src/ui/components/Button.tsx`, `src/ui/components/ProgressRing.tsx`, `src/ui/components/Spinner.tsx`
- Reference: Ghid `src/lib/settings.tsx`, `src/components/ProgressRing.tsx`, `src/components/Spinner.tsx`

**Interfaces:**
- Produces: `t` object of Ukrainian strings; `useSettings(): { textSize, setTextSize, dailyGoal, setDailyGoal }`; `<SettingsProvider>`; `ProgressRing`, `Button`, `Spinner`.

- [ ] **Step 1: Create `src/ui/strings.ts`** — a flat object of every UI string in Ukrainian. Seed with: `appName: 'Învață Româna'`, `startSession`, `continue`, `check`, `next`, `again`, `gotIt`, `tryAgain`, `great`, `close`, `listen`, `record`, `stop`, `playYours`, `playModel`, `showAnswer`, `typeWhatYouHear`, `whichWord`, `yourTurn`, `missionTitle`, `missionDoForReal`, `reviewsDue`, `newWords`, `dailyGoal`, `streak`, `wordsKnown` (with `{count}`/`{total}`), `settings`, `textSize`, `normal`, `large`, `done`, `sessionComplete`, `xpEarned`. Export as `export const t = { ... } as const`.

- [ ] **Step 2: Create `src/ui/settings.tsx`** — copy Ghid `src/lib/settings.tsx`, strip the language parts, keep `textSize` (`'normal'|'large'`, drives `document.documentElement.dataset.textSize` + persists `ir.textSize`), add `dailyGoal: number` (default 1 new lesson / configurable item count; persist `ir.dailyGoal`).

- [ ] **Step 3: Copy `ProgressRing.tsx`, `Spinner.tsx`** from Ghid into `src/ui/components/` (no logic change).

- [ ] **Step 4: Create `src/ui/components/Button.tsx`** — a primary/secondary button with `min-h-tap` and token classes.

```tsx
import type { ButtonHTMLAttributes } from 'react'
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }
export default function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base = 'min-h-tap rounded-md px-4 py-3 font-semibold transition-colors disabled:opacity-40'
  const styles = variant === 'primary'
    ? 'bg-primary text-white' : 'bg-surface text-text ring-1 ring-black/10'
  return <button className={`${base} ${styles} ${className}`} {...rest} />
}
```

- [ ] **Step 5: Wrap `App` in `SettingsProvider`** in `main.tsx`; render `t.appName` in `App.tsx` to confirm wiring.

- [ ] **Step 6: Verify + commit**

Run: `npm run build`
Expected: builds clean.
```bash
git add -A && git commit -m "feat: design tokens, Ukrainian UI strings, settings context"
```

---

## Task 3: PWA icons + GitHub Pages deploy

**Files:**
- Create: `public/favicon.svg`, `scripts/generate-icons.mjs`, `.github/workflows/deploy.yml`
- Reference: Ghid equivalents.

- [ ] **Step 1: Copy `scripts/generate-icons.mjs` + `public/favicon.svg`** from Ghid; change accent/letter if desired. Run `npm run icons`; confirm `public/icons/*.png` created.

- [ ] **Step 2: Copy `.github/workflows/deploy.yml`** from Ghid verbatim (it is repo-name-agnostic; base path comes from `vite.config.ts`).

- [ ] **Step 3: Verify build emits icons + manifest under base**

Run: `npm run build` then `grep -o "/invata-romana/[a-z./-]*" dist/index.html | head`
Expected: asset URLs prefixed with `/invata-romana/`.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: PWA icons + GitHub Pages deploy workflow"
```

> Repo creation + Pages enablement is a manual step the user performs (new public repo `invata-romana`, Settings → Pages → Source: GitHub Actions), mirroring how the Ghid app was published.

---

## Task 4: Content types + validation

**Files:**
- Create: `src/content/types.ts`, `src/content/validate.ts`, `src/content/validate.test.ts`, `scripts/validate-content.mjs` (replace placeholder)

**Interfaces:**
- Produces:
  - Types `Item`, `DialogueLine`, `Mission`, `Exercise`, `Lesson`, `ItemBank`, `CourseIndex` (see code).
  - `validateItemBank(data: unknown): asserts data is ItemBank` (throws `Error` listing problems).
  - `validateLesson(data: unknown, itemIds: Set<string>): asserts data is Lesson`.

- [ ] **Step 1: Create `src/content/types.ts`**

```ts
export type Cefr = 'A1' | 'A2' | 'B1'

export interface Item {
  id: string
  ro: string
  uk: string
  pron_uk: string
  ipa?: string
  pos?: string
  freqRank: number
  cefr: Cefr
  tags: string[]
  example_ro: string
  example_uk: string
}

export interface DialogueLine { speaker: string; ro: string; uk: string }

export interface Mission {
  prompt_uk: string
  lines: DialogueLine[]
  realWorld_uk: string[]
}

export type Exercise =
  | { type: 'comprehension'; question_uk: string; options_uk: string[]; answerIndex: number }
  | { type: 'retrieval'; itemId: string }
  | { type: 'minimalPairs'; itemId: string; distractorId: string }
  | { type: 'dictation'; itemId: string }
  | { type: 'shadowing'; itemId: string }
  | { type: 'production'; prompt_uk: string; answer_ro: string; wordBank?: string[] }

export interface Lesson {
  id: string
  level: Cefr
  unit_uk: string
  title_uk: string
  goal_uk: string
  dialogue: DialogueLine[]
  newItemIds: string[]
  grammarNotes_uk: string[]
  exercises: Exercise[]
  mission: Mission
}

export interface ItemBank { items: Item[] }
export interface CourseIndex { units: { id: string; unit_uk: string; lessonIds: string[] }[] }
```

- [ ] **Step 2: Write the failing test `src/content/validate.test.ts`**

```ts
import { validateItemBank, validateLesson } from './validate'

const goodItem = {
  id: 'buna-ziua', ro: 'Bună ziua', uk: 'Добрий день', pron_uk: 'бýна зíуа',
  freqRank: 12, cefr: 'A1', tags: ['greetings'],
  example_ro: 'Bună ziua!', example_uk: 'Добрий день!',
}

test('accepts a valid item bank', () => {
  expect(() => validateItemBank({ items: [goodItem] })).not.toThrow()
})

test('rejects an item missing pron_uk', () => {
  const bad = { items: [{ ...goodItem, pron_uk: '' }] }
  expect(() => validateItemBank(bad)).toThrow(/pron_uk/)
})

test('rejects duplicate item ids', () => {
  expect(() => validateItemBank({ items: [goodItem, goodItem] })).toThrow(/duplicate/i)
})

test('lesson referencing unknown item id is rejected', () => {
  const lesson = {
    id: 'l1', level: 'A1', unit_uk: 'U', title_uk: 'T', goal_uk: 'G',
    dialogue: [{ speaker: 'A', ro: 'Bună', uk: 'Привіт' }],
    newItemIds: ['nope'], grammarNotes_uk: [],
    exercises: [{ type: 'dictation', itemId: 'buna-ziua' }],
    mission: { prompt_uk: 'p', lines: [], realWorld_uk: ['x'] },
  }
  expect(() => validateLesson(lesson, new Set(['buna-ziua']))).toThrow(/nope/)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/content/validate.test.ts`
Expected: FAIL ("validateItemBank is not a function").

- [ ] **Step 4: Implement `src/content/validate.ts`**

```ts
import type { Cefr, Exercise, Item, ItemBank, Lesson } from './types'

const CEFR: Cefr[] = ['A1', 'A2', 'B1']

function fail(msg: string): never { throw new Error(`Content invalid: ${msg}`) }
function str(v: unknown, where: string): string {
  if (typeof v !== 'string' || v.trim() === '') fail(`${where} must be a non-empty string`)
  return v as string
}

export function validateItemBank(data: unknown): asserts data is ItemBank {
  if (!data || typeof data !== 'object' || !Array.isArray((data as ItemBank).items)) {
    fail('item bank must be { items: [...] }')
  }
  const seen = new Set<string>()
  for (const it of (data as ItemBank).items) {
    const id = str(it.id, 'item.id')
    if (seen.has(id)) fail(`duplicate item id "${id}"`)
    seen.add(id)
    str(it.ro, `item ${id}.ro`)
    str(it.uk, `item ${id}.uk`)
    str(it.pron_uk, `item ${id}.pron_uk`)
    str(it.example_ro, `item ${id}.example_ro`)
    str(it.example_uk, `item ${id}.example_uk`)
    if (typeof it.freqRank !== 'number') fail(`item ${id}.freqRank must be a number`)
    if (!CEFR.includes(it.cefr)) fail(`item ${id}.cefr must be A1/A2/B1`)
    if (!Array.isArray(it.tags)) fail(`item ${id}.tags must be an array`)
  }
}

function validateExercise(ex: Exercise, ids: Set<string>, where: string): void {
  switch (ex.type) {
    case 'comprehension':
      str(ex.question_uk, `${where}.question_uk`)
      if (!Array.isArray(ex.options_uk) || ex.options_uk.length < 2) fail(`${where} needs >=2 options`)
      if (ex.answerIndex < 0 || ex.answerIndex >= ex.options_uk.length) fail(`${where}.answerIndex out of range`)
      break
    case 'production':
      str(ex.prompt_uk, `${where}.prompt_uk`); str(ex.answer_ro, `${where}.answer_ro`)
      break
    case 'retrieval': case 'dictation': case 'shadowing':
      if (!ids.has(ex.itemId)) fail(`${where} references unknown item "${ex.itemId}"`)
      break
    case 'minimalPairs':
      if (!ids.has(ex.itemId)) fail(`${where} references unknown item "${ex.itemId}"`)
      if (!ids.has(ex.distractorId)) fail(`${where} references unknown distractor "${ex.distractorId}"`)
      break
    default:
      fail(`${where} has unknown exercise type`)
  }
}

export function validateLesson(data: unknown, ids: Set<string>): asserts data is Lesson {
  const l = data as Lesson
  str(l.id, 'lesson.id'); str(l.title_uk, 'lesson.title_uk'); str(l.goal_uk, 'lesson.goal_uk')
  if (!CEFR.includes(l.level)) fail(`lesson ${l.id}.level invalid`)
  if (!Array.isArray(l.dialogue) || l.dialogue.length === 0) fail(`lesson ${l.id}.dialogue empty`)
  if (!Array.isArray(l.newItemIds)) fail(`lesson ${l.id}.newItemIds must be an array`)
  for (const id of l.newItemIds) if (!ids.has(id)) fail(`lesson ${l.id} references unknown item "${id}"`)
  if (!Array.isArray(l.exercises) || l.exercises.length === 0) fail(`lesson ${l.id}.exercises empty`)
  l.exercises.forEach((ex, i) => validateExercise(ex, ids, `lesson ${l.id} exercise[${i}]`))
  if (!l.mission || !Array.isArray(l.mission.realWorld_uk) || l.mission.realWorld_uk.length === 0) {
    fail(`lesson ${l.id}.mission.realWorld_uk empty`)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/content/validate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Replace `scripts/validate-content.mjs`** to validate the real data at build time

```js
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { register } from 'node:module'
// Validate by importing the compiled logic via tsx-free approach: re-read JSON and
// re-run the same checks. Simplest: shell out to vitest is overkill; inline-load JSON
// and call the validators through a tiny dynamic import of a compiled helper.
const root = dirname(fileURLToPath(import.meta.url))
const dataDir = join(root, '..', 'src', 'content', 'data')
const bank = JSON.parse(readFileSync(join(dataDir, 'item-bank.json'), 'utf8'))
const ids = new Set(bank.items.map((i) => i.id))
if (new Set(bank.items.map((i) => i.id)).size !== bank.items.length) {
  console.error('Content invalid: duplicate item ids'); process.exit(1)
}
for (const it of bank.items) {
  for (const f of ['id','ro','uk','pron_uk','example_ro','example_uk']) {
    if (!it[f] || String(it[f]).trim() === '') { console.error(`Content invalid: item ${it.id} missing ${f}`); process.exit(1) }
  }
}
const lessonsDir = join(dataDir, 'lessons')
for (const unit of readdirSync(lessonsDir)) {
  for (const f of readdirSync(join(lessonsDir, unit)).filter((x) => x.endsWith('.json'))) {
    const l = JSON.parse(readFileSync(join(lessonsDir, unit, f), 'utf8'))
    for (const id of l.newItemIds || []) if (!ids.has(id)) { console.error(`Content invalid: ${f} unknown item ${id}`); process.exit(1) }
    for (const ex of l.exercises || []) {
      for (const k of ['itemId','distractorId']) if (ex[k] && !ids.has(ex[k])) { console.error(`Content invalid: ${f} unknown ${k} ${ex[k]}`); process.exit(1) }
    }
  }
}
console.log(`content validation: ok (${bank.items.length} items)`)
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: content types + runtime/build validation"
```

---

## Task 5: Author the A1 survival unit content

**Files:**
- Create: `src/content/data/item-bank.json`, `src/content/data/course-index.json`, `src/content/data/lessons/a1-survival/{01,02,03,04}.json`

**Interfaces:**
- Produces: a validated item bank (~50 items) + one unit (`a1-survival`) of 3–4 lessons, each conforming to `Lesson`.

- [ ] **Step 1: Use the `anthropic-skills:ukrainian-romanian-lessons` skill** to draft the unit, then reshape its output into this app's richer schema (dialogue + newItemIds + mission). Theme the unit on first-week survival: greetings/introductions, asking for help, at the shop, numbers/prices. Target ~50 items total across the lessons; every item needs `freqRank`, `cefr: "A1"`, `tags`, `pron_uk`, and both examples.

- [ ] **Step 2: Write `course-index.json`**

```json
{ "units": [ { "id": "a1-survival", "unit_uk": "Перший тиждень", "lessonIds": ["a1-survival-01","a1-survival-02","a1-survival-03","a1-survival-04"] } ] }
```

- [ ] **Step 3: Each lesson** must include a `dialogue` (4–8 lines), `newItemIds` (10–15 of the bank items), 1–2 `grammarNotes_uk`, a mix of `exercises` (at least one `dictation`, one `minimalPairs`, one `shadowing`, one `comprehension`, one `production`), and a `mission` with `realWorld_uk` steps.

- [ ] **Step 4: Validate**

Run: `node scripts/validate-content.mjs`
Expected: `content validation: ok (~50 items)`. Fix any reported issue.

- [ ] **Step 5: Add a content test `src/content/data/content.test.ts`** that imports the JSON and runs `validateItemBank` + `validateLesson` for every lesson (guards future edits).

Run: `npx vitest run src/content/data/content.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "content: A1 survival unit (item bank + 4 lessons)"
```

---

## Task 6: Content loaders

**Files:**
- Create: `src/content/load.ts`, `src/content/load.test.ts`

**Interfaces:**
- Produces: `getItemBank(): Item[]`, `getItemById(id): Item | undefined`, `getCourseIndex(): CourseIndex`, `loadLesson(id): Promise<Lesson | null>`.

- [ ] **Step 1: Write `load.ts`** — import `item-bank.json` and `course-index.json` statically (validate once at module load via the validators); lazy-glob lessons with `import.meta.glob('./data/lessons/**/*.json')` keyed by lesson `id` (basename). Build an `itemsById` Map.

- [ ] **Step 2: Test** that `getItemById` returns a known item and `getItemBank().length` matches the file. (Vitest with the real JSON.)

Run: `npx vitest run src/content/load.test.ts` → PASS.

- [ ] **Step 3: Commit** `feat: content loaders`.

---

## Task 7: Feedback engine (deterministic tutor)

**Files:**
- Create: `src/feedback/check.ts`, `src/feedback/check.test.ts`
- Reference: Ghid `src/lib/learn/scoring.ts` (reuse `normalize` + Levenshtein).

**Interfaces:**
- Produces:
  - `normalize(s: string): string` (lowercase, NFD-fold diacritics, strip punctuation, collapse spaces).
  - `similarity(a: string, b: string): number` (0..1).
  - `type Tier = 'great' | 'close' | 'tryAgain'`.
  - `gradeText(expected: string, got: string): { tier: Tier; correct: boolean; diacriticHint?: string }` — `correct` when normalized strings match; `diacriticHint` set when the only differences are diacritics (e.g. `multumesc` vs `mulțumesc`).

- [ ] **Step 1: Write failing tests `src/feedback/check.test.ts`**

```ts
import { gradeText, normalize, similarity } from './check'

test('exact match is great + correct', () => {
  const r = gradeText('Bună ziua', 'Bună ziua')
  expect(r.correct).toBe(true); expect(r.tier).toBe('great')
})

test('diacritics-only miss is correct-enough with a hint', () => {
  const r = gradeText('mulțumesc', 'multumesc')
  expect(r.correct).toBe(true)
  expect(r.diacriticHint).toMatch(/ț/)
})

test('one wrong letter is close', () => {
  expect(gradeText('pâine', 'paine').correct).toBe(true) // diacritic only
  expect(gradeText('lapte', 'larte').tier).toBe('close')
})

test('unrelated is tryAgain', () => {
  expect(gradeText('apă', 'xyzzy').tier).toBe('tryAgain')
})

test('normalize folds diacritics + case + punctuation', () => {
  expect(normalize('Mulțumesc!')).toBe(normalize('multumesc'))
})

test('similarity is 1 for identical', () => {
  expect(similarity('da', 'da')).toBe(1)
})
```

- [ ] **Step 2: Run → FAIL.** `npx vitest run src/feedback/check.test.ts`

- [ ] **Step 3: Implement `check.ts`** (port `normalize` + `levenshtein` from Ghid `scoring.ts`, add diacritic-diff):

```ts
export function normalize(input: string): string {
  return input.toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ').trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  let curr = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

export function similarity(a: string, b: string): number {
  const x = normalize(a), y = normalize(b)
  const max = Math.max(x.length, y.length)
  return max === 0 ? 1 : 1 - levenshtein(x, y) / max
}

export type Tier = 'great' | 'close' | 'tryAgain'

// The Romanian diacritic letters and their base forms, for hint detection.
const DIACRITICS = 'ăâîșț'

function diacriticHint(expected: string, got: string): string | undefined {
  if (normalize(expected) !== normalize(got)) return undefined
  const offenders = [...expected].filter((ch) => DIACRITICS.includes(ch.toLowerCase()))
  return offenders.length ? `Зверніть увагу на «${[...new Set(offenders)].join(' ')}»` : undefined
}

export function gradeText(expected: string, got: string): { tier: Tier; correct: boolean; diacriticHint?: string } {
  const exact = normalize(expected) === normalize(got)
  if (exact) {
    const hint = expected.trim().toLowerCase() === got.trim().toLowerCase() ? undefined : diacriticHint(expected, got)
    return { tier: 'great', correct: true, diacriticHint: hint }
  }
  const s = similarity(expected, got)
  if (s >= 0.6) return { tier: 'close', correct: false }
  return { tier: 'tryAgain', correct: false }
}
```

- [ ] **Step 4: Run → PASS.** `npx vitest run src/feedback/check.test.ts`

- [ ] **Step 5: Commit** `feat: deterministic feedback engine with diacritic hints`.

---

## Task 8: SM-2-lite scheduler

**Files:**
- Create: `src/srs/scheduler.ts`, `src/srs/scheduler.test.ts`

**Interfaces:**
- Produces:
  - `interface SrsState { ease: number; interval: number; due: string; lapses: number; seen: number }`
  - `type Grade = 'again' | 'good' | 'easy'`
  - `initialState(today: string): SrsState`
  - `schedule(state: SrsState, grade: Grade, today: string): SrsState`
  - `isDue(state: SrsState, today: string): boolean`
  - `today(d?: Date): string` (YYYY-MM-DD, local)

- [ ] **Step 1: Write failing tests** covering: new item graded `good` → interval 1, due tomorrow; `again` → interval 0/back to today, `lapses` increments; ease rises on `easy`, floors at 1.3 on repeated `again`; `isDue` true when `due <= today`.

```ts
import { initialState, isDue, schedule, today } from './scheduler'

test('good on a new item schedules ~1 day out', () => {
  const s = schedule(initialState('2026-06-20'), 'good', '2026-06-20')
  expect(s.interval).toBe(1)
  expect(s.due).toBe('2026-06-21')
})

test('again resets interval and counts a lapse', () => {
  let s = schedule(initialState('2026-06-20'), 'good', '2026-06-20')
  s = schedule({ ...s, due: '2026-06-21' }, 'again', '2026-06-21')
  expect(s.interval).toBe(0)
  expect(s.due).toBe('2026-06-21')
  expect(s.lapses).toBe(1)
})

test('ease never drops below 1.3', () => {
  let s = initialState('2026-06-20')
  for (let i = 0; i < 10; i++) s = schedule(s, 'again', '2026-06-20')
  expect(s.ease).toBeGreaterThanOrEqual(1.3)
})

test('isDue compares against today', () => {
  expect(isDue({ ease: 2.5, interval: 1, due: '2026-06-20', lapses: 0, seen: 1 }, '2026-06-21')).toBe(true)
  expect(isDue({ ease: 2.5, interval: 3, due: '2026-06-25', lapses: 0, seen: 1 }, '2026-06-21')).toBe(false)
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `scheduler.ts`**

```ts
export interface SrsState { ease: number; interval: number; due: string; lapses: number; seen: number }
export type Grade = 'again' | 'good' | 'easy'

export function today(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return today(new Date(y, m - 1, d + days))
}

export function initialState(todayStr: string): SrsState {
  return { ease: 2.5, interval: 0, due: todayStr, lapses: 0, seen: 0 }
}

export function isDue(s: SrsState, todayStr: string): boolean {
  return s.due <= todayStr
}

export function schedule(s: SrsState, grade: Grade, todayStr: string): SrsState {
  const seen = s.seen + 1
  if (grade === 'again') {
    const ease = Math.max(1.3, s.ease - 0.2)
    return { ease, interval: 0, due: todayStr, lapses: s.lapses + 1, seen }
  }
  let ease = s.ease
  if (grade === 'easy') ease = s.ease + 0.15
  let interval: number
  if (s.interval === 0) interval = grade === 'easy' ? 2 : 1
  else interval = Math.max(1, Math.round(s.interval * ease))
  return { ease, interval, due: addDays(todayStr, interval), lapses: s.lapses, seen }
}
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat: SM-2-lite SRS scheduler`.

---

## Task 9: Progress store (IndexedDB)

**Files:**
- Create: `src/srs/store.ts`, `src/srs/store.test.ts`

**Interfaces:**
- Produces (all async):
  - `getItemState(id): Promise<SrsState | undefined>` / `setItemState(id, s): Promise<void>`
  - `allItemStates(): Promise<Record<string, SrsState>>`
  - `getMeta(): Promise<Meta>` / `setMeta(m): Promise<void>` where
    `interface Meta { xp: number; streak: { count: number; lastDay: string }; daily: { day: string; count: number }; completedLessons: string[]; micPrivacyAck: boolean }`

- [ ] **Step 1: Write failing tests** using `fake-indexeddb` (import `'fake-indexeddb/auto'` at top of the test). Verify set→get round-trips an item state, `allItemStates` returns the map, and `getMeta` returns defaults before any write.

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement `store.ts`** with `idb-keyval` (`createStore`, `get`, `set`, `entries`). Keys: item states under store `ir-items` keyed by item id; meta under store `ir-meta` key `meta`. Provide `defaultMeta()`.

```ts
import { createStore, get, set, entries } from 'idb-keyval'
import type { SrsState } from './scheduler'

const itemStore = createStore('ir-items', 'states')
const metaStore = createStore('ir-meta', 'meta')

export interface Meta {
  xp: number
  streak: { count: number; lastDay: string }
  daily: { day: string; count: number }
  completedLessons: string[]
  micPrivacyAck: boolean
}
export function defaultMeta(): Meta {
  return { xp: 0, streak: { count: 0, lastDay: '' }, daily: { day: '', count: 0 }, completedLessons: [], micPrivacyAck: false }
}

export const getItemState = (id: string) => get<SrsState>(id, itemStore)
export const setItemState = (id: string, s: SrsState) => set(id, s, itemStore)
export async function allItemStates(): Promise<Record<string, SrsState>> {
  const out: Record<string, SrsState> = {}
  for (const [k, v] of await entries(itemStore)) out[String(k)] = v as SrsState
  return out
}
export async function getMeta(): Promise<Meta> {
  return (await get<Meta>('meta', metaStore)) ?? defaultMeta()
}
export const setMeta = (m: Meta) => set('meta', m, metaStore)
```

- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5: Commit** `feat: IndexedDB progress store`.

---

## Task 10: Progress math (streak, daily goal, frequency backbone)

**Files:**
- Create: `src/srs/progress.ts`, `src/srs/progress.test.ts`

**Interfaces:**
- Produces:
  - `bumpStreak(meta, today): Meta` (increments on consecutive days, resets on a gap, no-op same day).
  - `recordActivity(meta, today, xpGain, itemsDone): Meta` (updates xp + daily.count + streak).
  - `knownItemCount(states): number` (items with `interval >= 7` = "known").
  - `frequencyBackbone(states, bank): { known: number; total: number }`.

- [ ] **Step 1: Write failing tests**: consecutive-day streak increments; gap resets to 1; same-day no double count; `knownItemCount` counts only matured items.

- [ ] **Step 2: Run → FAIL → implement → PASS.** Implementation is pure functions over `Meta` and `Record<string, SrsState>`; `known` = `Object.values(states).filter(s => s.interval >= 7).length`; `total` = `bank.length` (or a configurable frequency cap).

- [ ] **Step 3: Commit** `feat: progress math (streak, daily goal, frequency backbone)`.

---

## Task 11: Session planner

**Files:**
- Create: `src/session/build.ts`, `src/session/build.test.ts`

**Interfaces:**
- Produces:
  - `interface SessionPlan { reviewItemIds: string[]; newLessonId: string | null }`
  - `buildSession(args: { states: Record<string, SrsState>; bank: Item[]; course: CourseIndex; completedLessons: string[]; today: string }): SessionPlan`
  - Behavior: `reviewItemIds` = ids whose state `isDue` today (capped at 50, oldest-due then most-lapsed first); `newLessonId` = the next uncompleted lesson in course order, or `null` when all are done. (One new lesson per session is the natural daily cap.)

- [ ] **Step 1: Write failing tests**: with two due items and one not due → only due returned; first run (no completed lessons) → `newLessonId` is the first lesson; all lessons completed → `newLessonId` null.

- [ ] **Step 2: Run → FAIL → implement → PASS.**

```ts
import type { Item, CourseIndex } from '../content/types'
import { isDue, type SrsState } from '../srs/scheduler'

export interface SessionPlan { reviewItemIds: string[]; newLessonId: string | null }

export function buildSession(a: {
  states: Record<string, SrsState>; bank: Item[]; course: CourseIndex
  completedLessons: string[]; today: string
}): SessionPlan {
  const reviewItemIds = Object.entries(a.states)
    .filter(([, s]) => isDue(s, a.today))
    .sort((x, y) => x[1].due.localeCompare(y[1].due) || y[1].lapses - x[1].lapses)
    .map(([id]) => id)
    .slice(0, 50)
  const order = a.course.units.flatMap((u) => u.lessonIds)
  const newLessonId = order.find((id) => !a.completedLessons.includes(id)) ?? null
  return { reviewItemIds, newLessonId }
}
```

- [ ] **Step 3: Commit** `feat: session planner`.

---

## Task 12: Speech service

**Files:**
- Create: `src/speech/speech.ts`, `src/speech/recognition.ts`
- Reference: Ghid `src/services/speech.ts`, `src/services/recognition.ts`

- [ ] **Step 1: Copy both files verbatim** from the Ghid app; they are framework-free (`speak`, `cancelSpeech`, `isSpeechSupported`, `getCapabilities`, `recognizeOnce`, `startRecording`). Adjust the localStorage key prefix comment only.

- [ ] **Step 2: Smoke-test in preview** (browser APIs can't be unit-tested). Add to `App.tsx` temporarily: a button calling `speak('Bună ziua', { rate: 1 })`. Run `npm run dev`, confirm audio on a desktop Chrome; revert the temp button.

- [ ] **Step 3: Commit** `feat: speech service (TTS + recognition + record fallback)`.

---

## Task 13: Exercise contract + SpeakButton/MicButton + ExerciseRenderer

**Files:**
- Create: `src/exercises/types.ts`, `src/ui/components/SpeakButton.tsx`, `src/ui/components/MicButton.tsx`, `src/exercises/ExerciseRenderer.tsx`, `src/exercises/generate.ts`

**Interfaces:**
- Produces:
  - `interface ExerciseProps<E> { exercise: E; item?: Item; bank: Item[]; onDone: (grade: Grade) => void }`
  - `SpeakButton({ text, size? })` (uses `speech.ts`; renders nothing if unsupported).
  - `ExerciseRenderer({ exercise, bank, onDone })` — switches on `exercise.type` to the right component.
  - `generate.ts`: `makeRetrieval(item)`, `pickMinimalPairDistractor(item, bank)` (nearest by normalized edit distance).

- [ ] **Step 1: Create `src/exercises/types.ts`** with `ExerciseProps` and re-export `Grade`.
- [ ] **Step 2: Create `SpeakButton.tsx`** (copy Ghid `src/components/learn/SpeakButton.tsx`, drop the learn-prefs dependency; use a fixed rate, add an optional slow toggle later).
- [ ] **Step 3: Create `MicButton.tsx`** — a record/stop button wrapping `startRecording()` from `recognition.ts`, exposing `onClip(url)`.
- [ ] **Step 4: Create `ExerciseRenderer.tsx`** with a switch over the 6 exercise types (components built in Tasks 14–17) + an exhaustiveness `never` guard.
- [ ] **Step 5: Commit** `feat: exercise contract + speak/mic buttons + renderer`.

---

## Task 14: Retrieval, MinimalPairs, Comprehension components

**Files:**
- Create: `src/exercises/Retrieval.tsx`, `src/exercises/MinimalPairs.tsx`, `src/exercises/Comprehension.tsx`

- [ ] **Step 1: `Retrieval.tsx`** — show `item.uk` (+ `pron_uk`), ask the learner to recall the Romanian; reveal `item.ro` with a SpeakButton; then three self-grade buttons (`again` / `good` / `easy`) → `onDone(grade)`.
- [ ] **Step 2: `MinimalPairs.tsx`** — SpeakButton plays `item.ro`; show two options (`item.ro`, distractor.ro); tap → correct maps to `onDone('good')`, wrong to `onDone('again')`; show which was right.
- [ ] **Step 3: `Comprehension.tsx`** — render `question_uk` + `options_uk`; on select, mark correct/incorrect against `answerIndex`; `onDone(correct ? 'good' : 'again')`.
- [ ] **Step 4: Verify in preview** (Task 19 wires them). Build must pass: `npm run build`.
- [ ] **Step 5: Commit** `feat: retrieval, minimal-pairs, comprehension exercises`.

---

## Task 15: Dictation + Production components

**Files:**
- Create: `src/exercises/Dictation.tsx`, `src/exercises/Production.tsx`

- [ ] **Step 1: `Dictation.tsx`** — SpeakButton auto-plays `item.ro` once on mount; text input; on check, call `gradeText(item.ro, value)`; show tier feedback + `diacriticHint` if present + the correct spelling; `onDone(result.correct ? 'good' : 'again')`. Always show `pron_uk` as the offline fallback.
- [ ] **Step 2: `Production.tsx`** — show `prompt_uk`; if `wordBank` present, tap-to-build the sentence; else a text input; check via `gradeText(answer_ro, value)`; feedback + `onDone`.
- [ ] **Step 3: Build passes.** Commit `feat: dictation + production exercises`.

---

## Task 16: Shadowing + MissionRehearsal components

**Files:**
- Create: `src/exercises/Shadowing.tsx`, `src/exercises/MissionRehearsal.tsx`
- Reference: Ghid `src/components/learn/MicPractice.tsx` (privacy note + record-and-compare pattern).

- [ ] **Step 1: `Shadowing.tsx`** — show `item.ro` + `pron_uk`; SpeakButton (model); MicButton to record; after recording, offer "play yours" + "play model" + a single `gotIt` button → `onDone('good')` (no scoring). First mic use shows the one-time privacy note (persist `micPrivacyAck` in Meta), copied from Ghid `MicPractice`.
- [ ] **Step 2: `MissionRehearsal.tsx`** — render the lesson `mission`: the `prompt_uk`, the `lines` (each with SpeakButton + a "your turn" shadow step), then the `realWorld_uk` checklist with checkboxes; a `done` button completes it.
- [ ] **Step 3: Build passes.** Commit `feat: shadowing + mission rehearsal`.

---

## Task 17: Session orchestrator

**Files:**
- Create: `src/session/orchestrator.tsx`, `src/pages/Session.tsx`

**Interfaces:**
- Consumes: `buildSession`, `loadLesson`, `getItemBank`, store (`getItemState/setItemState/getMeta/setMeta`), `scheduler.schedule`, `progress.recordActivity`, `ExerciseRenderer`, all exercise components.
- Produces: `<Session />` page that runs the full loop and persists results.

- [ ] **Step 1: Implement the loop state machine** in `orchestrator.tsx`:
  1. On mount, read store, call `buildSession`. Phase `warmup`: present each `reviewItemId` as a Retrieval exercise; on `onDone(grade)`, `schedule` its state and `setItemState`.
  2. Phase `input`: if `newLessonId`, load it; show the dialogue (lines with SpeakButton) + grammar notes + a "begin practice" button.
  3. Phase `practice`: run the lesson's `exercises` via `ExerciseRenderer`; for `newItemIds`, initialize SRS state on first correct (`schedule(initialState, grade)`).
  4. Phase `output`: the lesson's shadowing exercise(s).
  5. Phase `mission`: `MissionRehearsal`.
  6. Phase `complete`: mark lesson completed, `recordActivity` (xp + streak + daily), show summary (XP, words added, "can-do" line), Continue → Home.
- [ ] **Step 2: Persist** after each exercise (so a refresh resumes safely enough). Use `today()` from scheduler for all dates.
- [ ] **Step 3: Verify in preview** end-to-end (Task 20 provides Home). Build passes.
- [ ] **Step 4: Commit** `feat: session orchestrator (full daily loop)`.

---

## Task 18: Home dashboard

**Files:**
- Create: `src/pages/Home.tsx`

- [ ] **Step 1: Implement Home** — load Meta + all item states; show: a daily-goal **ProgressRing** (items done today / goal), **streak** with 🔥, the **frequency backbone** bar (`knownItemCount` / total, via `t.wordsKnown`), the current unit's **can-do** line, a count of **reviews due** + **new words**, and a big **Start session** button → `/session`. If nothing due and no new lesson, show an encouraging "all caught up" state.
- [ ] **Step 2: Verify in preview.** Build passes.
- [ ] **Step 3: Commit** `feat: home dashboard`.

---

## Task 19: Settings page + routing + final integration

**Files:**
- Create: `src/pages/Settings.tsx`; Modify: `src/App.tsx`

- [ ] **Step 1: `Settings.tsx`** — text-size segmented control (from settings context), daily-goal control, an "about/offline" note, and a "reset progress" button (clears IndexedDB stores with confirm).
- [ ] **Step 2: `App.tsx`** — `BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}` with routes `/` (Home), `/session` (Session), `/settings`; wrap in `SettingsProvider`; lazy-load pages; Suspense fallback `Spinner`.
- [ ] **Step 3: Full verification**

Run: `npm run test && npm run build && npm run preview`
Then in the preview: complete a full session (warm-up empty on first run → input → practice → output → mission → complete), confirm progress persists across reload, toggle text size, and confirm the app works with the network throttled offline after first load.

- [ ] **Step 4: Commit** `feat: settings, routing, v1 integration`.

---

## Task 20: Deploy

- [ ] **Step 1:** User creates public repo `invata-romana`, enables Pages → GitHub Actions (manual, as with Ghid).
- [ ] **Step 2:** `git push -u origin main`; confirm the Actions deploy goes green and `https://<user>.github.io/invata-romana/` returns 200, installs to home screen, and runs a session offline.
- [ ] **Step 3:** Tag `v0.1.0`.

---

## Self-Review

**Spec coverage:** §4 loop → Tasks 11,17. §5 stack/offline/IndexedDB/uk-only → Tasks 1,2,9,19. §6 content model → Tasks 4,5,6. §7 exercise types + feedback → Tasks 7,13–16. §8 SRS → Tasks 8,9,10,11. §9 progress/engagement → Tasks 10,18. §10 v1 vertical slice → Tasks 17–20. §11 risks (content throughput) → validation in Tasks 4/5. All covered.

**Placeholder scan:** No "TODO/implement later". Task 5 (content authoring) and several UI tasks describe component structure rather than full verbatim JSX — acceptable because they reuse named, already-specified interfaces and the Ghid reference components; each names exact files, props, and the data it consumes. The pure-logic tasks (4,7,8,9,10,11) carry complete code + tests.

**Type consistency:** `SrsState`, `Grade`, `Meta`, `Item`, `Lesson`, `Exercise`, `SessionPlan`, `gradeText`, `schedule`, `buildSession`, `today()` are defined once (Tasks 4,7,8,9,11) and reused with the same signatures in consumers (Tasks 13–18). `today()` from `scheduler.ts` is the single date source.
