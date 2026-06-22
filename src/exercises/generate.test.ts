import { describe, it, expect } from 'vitest'
import { makeRetrieval, pickMinimalPairDistractor } from './generate'
import type { Item } from '../content/types'

function makeItem(id: string, ro: string): Item {
  return {
    id,
    ro,
    uk: '',
    pron_uk: '',
    freqRank: 1,
    cefr: 'A1',
    tags: [],
    example_ro: '',
    example_uk: '',
  }
}

describe('makeRetrieval', () => {
  it('returns an exercise with type retrieval and correct itemId', () => {
    const item = makeItem('abc', 'bună')
    const result = makeRetrieval(item)
    expect(result.type).toBe('retrieval')
    expect(result.itemId).toBe('abc')
  })
})

describe('pickMinimalPairDistractor', () => {
  it('returns undefined for a single-item bank', () => {
    const item = makeItem('a', 'bună')
    expect(pickMinimalPairDistractor(item, [item])).toBeUndefined()
  })

  it('returns the bank item with the highest similarity (but < 1) to the target', () => {
    const target = makeItem('t', 'buna')
    // 'bun' is most similar to 'buna' (distance 1, similarity = 1 - 1/4 = 0.75)
    // 'mere' is far (distance 4, similarity = 1 - 4/4 = 0)
    // 'apa' is also far
    const close = makeItem('c', 'bun')
    const far1 = makeItem('f1', 'mere')
    const far2 = makeItem('f2', 'apa')
    const bank = [target, close, far1, far2]

    const result = pickMinimalPairDistractor(target, bank)
    expect(result).toBeDefined()
    expect(result?.id).toBe('c')
  })

  it('skips the exact same ro value (similarity = 1)', () => {
    const target = makeItem('t', 'buna')
    const exact = makeItem('e', 'buna') // similarity = 1, should be skipped
    const close = makeItem('c', 'bun')
    const bank = [target, exact, close]

    const result = pickMinimalPairDistractor(target, bank)
    // exact match is excluded (similarity == 1); 'bun' should be returned
    expect(result?.id).toBe('c')
  })
})
