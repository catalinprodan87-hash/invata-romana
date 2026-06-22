import type { Item } from '../content/types'
import type { Exercise } from '../content/types'
import { similarity } from '../feedback/check'

export function makeRetrieval(item: Item): Extract<Exercise, { type: 'retrieval' }> {
  return { type: 'retrieval', itemId: item.id }
}

/**
 * Returns the bank item (other than `item`) whose `ro` is most phonetically
 * similar to `item.ro`, by highest similarity() score strictly below 1.
 * Returns undefined if the bank has no such item.
 */
export function pickMinimalPairDistractor(item: Item, bank: Item[]): Item | undefined {
  let best: Item | undefined
  let bestScore = -1

  for (const candidate of bank) {
    if (candidate.id === item.id) continue
    const score = similarity(item.ro, candidate.ro)
    if (score < 1 && score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return best
}
