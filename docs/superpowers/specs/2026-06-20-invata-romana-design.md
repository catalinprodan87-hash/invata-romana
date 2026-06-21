# Învață Româna — Design Spec (v1)

**Date:** 2026-06-20
**Status:** Approved (brainstorming) — pending implementation plan
**Repo:** `invata-romana` (new, standalone)

---

## 1. Summary

A dedicated, offline-first PWA that helps **Ukrainian speakers genuinely learn
Romanian**. It is built around a single daily **learning loop** grounded in the
two techniques with the strongest evidence behind them — **comprehensible input**
and **spaced retrieval** — and tied to the learner's real life in Romania via
**missions**. Client-only, free to run, installable, works offline. UI and all
explanations are in **Ukrainian**; the language being taught is **Romanian**.

This is a separate product from the existing *Ghid România* guide PWA. The guide
stays a guide; this app does one thing well: get people to actually speak and
understand Romanian.

## 2. Goals & non-goals

**Goals**
- Real acquisition (productive ability), not token exercises.
- Long-term retention via spaced repetition as the backbone.
- Speaking practice that is honest about what's measurable client-side.
- Relevance: learning is tied to things the user will actually do this week.
- Encouraging, low-anxiety tone; no guilt mechanics.
- Works offline on cheap phones after first load.

**Non-goals (v1)**
- Conversational / generative AI tutor.
- Cloud speech recognition or any "pronunciation score."
- Accounts, login, or cloud sync.
- A full B1+ curriculum or multiple games.
- Human-recorded audio (TTS is acceptable for v1).

## 3. Target user

Ukrainian adults living in Romania, varied tech comfort, often on weak data and
inexpensive phones, with urgent real-world needs (doctor, school, landlord,
paperwork, work). Their L1 is Slavic and Romanian is Romance — genuinely foreign
— so Cyrillic pronunciation respelling (`pron_uk`) is mandatory and cognates are
leveraged where they help. Their built-in advantage over a generic learner is
**immersion + urgency**; the product is designed around that advantage.

## 4. Learning model (the core idea)

**The daily loop (~10–15 min):**
`warm-up reviews → understandable input → focused practice → output → mission`

Principles:
- **Input-led.** Short, leveled **audio dialogues** are the spine. Grammar
  appears as tiny "notice this pattern" notes, not chapters of drills.
- **Spaced retrieval is the backbone**, not a side feature. Every session is
  mostly due reviews plus a little new input.
- **Frequency-first vocabulary**, survival-weighted. The ~1,000 most frequent
  spoken words are the visible backbone ("340 / 1000 useful words"), with
  newcomer-urgent items boosted.
- **Honest about speech.** No fake pronunciation scoring. Instead: **shadowing**
  (listen → repeat), **minimal pairs** (ear training, fully reliable offline),
  and **dictation** (where the deterministic spelling tutor shines).
- **CEFR as a measuring stick, not walls.** Difficulty is CEFR-tagged and
  ordered, surfaced as **"can-do" checkpoints** ("you can handle a pharmacy"),
  while the SRS + frequency drive pacing continuously.

The signature feature is **real-life missions**: a short rehearsal of something
the user will actually do soon, followed by a "go do it for real" checklist —
the app→street bridge where learning consolidates.

## 5. Architecture & stack

Reuse the proven, free path from the Ghid app:

- **React 18 + TypeScript + Vite + Tailwind CSS + vite-plugin-pwa (Workbox)**.
- **GitHub Pages** deploy via an Actions workflow; production served from a
  sub-path base (`/invata-romana/`).
- **Client-only, offline-first.** App shell + content precached by the service
  worker.
- **Storage:** `localStorage` for preferences and small progress summaries;
  **IndexedDB** for the SRS item-state store (scales past localStorage limits)
  and transient audio recordings (never uploaded).
- **i18n:** Ukrainian only — no language toggle. (Romanian is content, not UI.)
- **Speech:** lift and adapt `speech.ts` (TTS, `ro-RO`) and `recognition.ts`
  (Web Speech STT where supported + `MediaRecorder` record-and-compare fallback)
  from the Ghid app.

**Module boundaries (each independently understandable/testable):**
- `content/` — load + validate item bank and lessons.
- `srs/` — item memory model, scheduler, session queue builder.
- `session/` — orchestrates the daily loop from due items + new lesson.
- `exercises/` — one component per exercise type, shared contract.
- `feedback/` — deterministic answer checking (normalize, diff, hints).
- `speech/` — TTS + recognition + record/playback.
- `progress/` — XP, streak, daily goal, can-do checkpoints, frequency backbone.
- `ui/` — shell, navigation, settings.

## 6. Content model

The content is the product; the engine is plumbing. Two pieces:

**Item bank** — the SRS's source of truth and the frequency backbone. Each item:
```jsonc
{
  "id": "buna-ziua",
  "ro": "Bună ziua",
  "uk": "Добрий день",
  "pron_uk": "бýна зíуа",
  "ipa": "ˈbu.nə ˈzi.wa",      // optional
  "pos": "phrase",              // optional
  "freqRank": 12,               // lower = more frequent
  "cefr": "A1",
  "tags": ["greetings", "survival"],
  "example_ro": "Bună ziua, mă numesc Olena.",
  "example_uk": "Добрий день, мене звати Олена."
}
```

**Lesson** — a unit of the loop:
```jsonc
{
  "id": "a1-greetings-01",
  "level": "A1",
  "unit_uk": "Перші зустрічі",
  "title_uk": "Привітання",
  "goal_uk": "Після цього уроку ви зможете привітатися і назвати своє ім'я.",
  "dialogue": [
    { "speaker": "A", "ro": "Bună ziua!", "uk": "Добрий день!" },
    { "speaker": "B", "ro": "Bună ziua! Mă numesc Ion.", "uk": "Добрий день! Мене звати Йон." }
  ],
  "newItemIds": ["buna-ziua", "ma-numesc", "..."],
  "grammarNotes_uk": ["«Mă numesc…» — щоб назвати своє ім'я."],
  "exercises": [ /* explicit specs; engine may also generate some from items */ ],
  "mission": {
    "prompt_uk": "Привітайтеся з сусідом і назвіть своє ім'я.",
    "lines": [ /* the rehearsal dialogue */ ],
    "realWorld_uk": ["Сьогодні привітайтеся румунською з однією людиною."]
  }
}
```

Authored via the **lessons skill (extended for this richer schema)**, with a
**JSON schema validation script** run in CI and locally. Some exercises
(retrieval, minimal pairs) are **generated** by the engine from the item bank +
distractors, so authors don't hand-write every card.

## 7. Exercise types & feedback engine

Modalities (each a small component with a shared `onResult` contract):
- **Comprehension** — listen/read the dialogue, then a quick understanding check.
- **Retrieval** — recall meaning or form of an item (the SRS core; flashcard-like
  with graded self-report or a typed/choice check).
- **Minimal pairs** — hear two similar words, tap which was said. Fully reliable
  offline; trains the ear.
- **Dictation** — hear an item/sentence, type it with diacritics. The
  **deterministic spelling tutor**: diacritic-aware diff + targeted hints
  (e.g. "you wrote *multumesc* — it's *mulțumesc*, watch the **ț**").
- **Shadowing** — hear the model, record yourself, play back side-by-side,
  self-mark. (No score.)
- **Production** — build or complete a sentence from parts.
- **Mission rehearsal** — run the real-life dialogue, then the real-world
  checklist.

**Feedback engine (deterministic):**
- Normalize for matching (lowercase, fold diacritics, strip punctuation) but
  **display** a diacritic-sensitive diff so the learner sees the exact slip.
- Levenshtein similarity → encouraging tiers (great / close / try again).
- Targeted hints keyed to the specific error (wrong diacritic, wrong ending).
- Speech: Web Speech STT where supported for speaking checks; otherwise
  record-and-compare. Never block progress on a speech result.

## 8. Spaced repetition & adaptivity

- **SM-2-lite** (ease factor + interval, not raw Leitner boxes) per item:
  `{ ease, interval, due, lapses, seen }`, persisted in IndexedDB.
- A session = **all due reviews + a capped number of new items** (configurable,
  default small).
- **Mastery** levels drive the "useful words known" count and can-do checkpoints.
- **Test-out**: a quick check lets a learner skip items they already know.
- **Weakness surfacing**: frequently-lapsed items reappear sooner and in more
  modalities.

## 9. Progress & engagement (no dark patterns)

- **Can-do checkpoints** per unit ("you can handle greetings / a pharmacy").
- **Frequency backbone** progress: "X / 1000 most useful words."
- Gentle **streak + daily goal** (configurable by minutes or items); never
  guilt-based.
- **Missions list**: rehearse → do for real → check off.
- Achievements kept minimal and meaningful.

## 10. v1 scope — the thin vertical slice

Ship the **whole loop, narrow**:
- New repo, offline PWA, GitHub Pages deploy.
- Content schema + validation script.
- Item bank + **one complete survival unit (~40–60 items, ~3–4 lessons)** with
  dialogues, all exercise types, and missions.
- SRS engine + session orchestrator.
- Progress + frequency backbone + can-do checkpoint for the unit.
- Ukrainian UI, installable, works offline after first load.

**Acceptance:** on a real phone, a user can install it, do daily sessions
offline, learn and retain the unit's items (tracked by the SRS), shadow and take
dictation on them, and complete the unit's mission — and it feels like a real,
encouraging course.

## 11. Risks & mitigations

- **Content throughput** (the real risk): mitigate with a strict schema, the
  lessons skill as a production line, validation, and engine-generated exercises.
- **Web Speech variance** across devices: mitigate with honest design
  (shadowing/minimal-pairs/dictation) and graceful fallbacks; never block.
- **Scope creep**: the loop + one unit is the line for v1; levels and games are
  separate specs.
- **Romanian TTS quality**: acceptable for v1; flag human audio as a later
  upgrade.

## 12. Future specs (post-v1)

A2/B1 content, more units and the full frequency list, learning games
(minimal-pair speed quiz, etc.), richer adaptivity, optional human audio, and a
possible link/handoff from the Ghid app's Learn section to this app.
