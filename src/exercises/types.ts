import type { Item } from '../content/types'
import type { Grade } from '../srs/scheduler'
export type { Grade }

export interface ExerciseProps<E> {
  exercise: E
  item?: Item
  bank: Item[]
  onDone: (grade: Grade) => void
}
