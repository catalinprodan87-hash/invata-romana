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
