import type { Exercise, Item } from '../content/types'
import type { Grade } from '../srs/scheduler'
import Comprehension from './Comprehension'
import Retrieval from './Retrieval'
import MinimalPairs from './MinimalPairs'
import Dictation from './Dictation'
import Shadowing from './Shadowing'
import Production from './Production'

interface Props {
  exercise: Exercise
  bank: Item[]
  onDone: (grade: Grade) => void
}

/**
 * Renders one graded exercise by its `type`. Each child manages its own
 * check/feedback and calls `onDone(grade)` exactly once. (The end-of-lesson
 * mission is NOT an Exercise — the orchestrator renders MissionRehearsal
 * directly, since it has a different, ungraded contract.)
 */
export default function ExerciseRenderer({ exercise, bank, onDone }: Props) {
  switch (exercise.type) {
    case 'comprehension':
      return <Comprehension exercise={exercise} bank={bank} onDone={onDone} />
    case 'retrieval':
      return <Retrieval exercise={exercise} bank={bank} onDone={onDone} />
    case 'minimalPairs':
      return <MinimalPairs exercise={exercise} bank={bank} onDone={onDone} />
    case 'dictation':
      return <Dictation exercise={exercise} bank={bank} onDone={onDone} />
    case 'shadowing':
      return <Shadowing exercise={exercise} bank={bank} onDone={onDone} />
    case 'production':
      return <Production exercise={exercise} bank={bank} onDone={onDone} />
    default: {
      // Exhaustiveness guard — a new exercise type surfaces here at compile time.
      const _exhaustive: never = exercise
      return _exhaustive
    }
  }
}
