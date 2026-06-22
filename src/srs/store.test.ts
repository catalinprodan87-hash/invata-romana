import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clear, createStore } from 'idb-keyval'
import type { SrsState } from './scheduler'
import { getItemState, setItemState, allItemStates, getMeta, setMeta, defaultMeta } from './store'
import type { Meta } from './store'

const itemStoreT = createStore('ir-items', 'states')
const metaStoreT = createStore('ir-meta', 'meta')

beforeEach(async () => {
  await clear(itemStoreT)
  await clear(metaStoreT)
})

const sampleState: SrsState = { ease: 2.5, interval: 1, due: '2026-06-20', lapses: 0, seen: 1 }

describe('store – item states', () => {
  it('round-trips a SrsState via setItemState / getItemState', async () => {
    await setItemState('item-rt-1', sampleState)
    const retrieved = await getItemState('item-rt-1')
    expect(retrieved).toEqual(sampleState)
  })

  it('returns undefined for an id that was never set', async () => {
    const result = await getItemState('item-never-set-xyz')
    expect(result).toBeUndefined()
  })

  it('allItemStates returns a Record containing the items that were set', async () => {
    const a: SrsState = { ease: 2.5, interval: 1, due: '2026-06-20', lapses: 0, seen: 1 }
    const b: SrsState = { ease: 1.8, interval: 3, due: '2026-06-22', lapses: 1, seen: 4 }
    await setItemState('item-all-a', a)
    await setItemState('item-all-b', b)
    const all = await allItemStates()
    expect(all['item-all-a']).toEqual(a)
    expect(all['item-all-b']).toEqual(b)
  })

  it('allItemStates returns an object (not null/undefined)', async () => {
    const all = await allItemStates()
    expect(typeof all).toBe('object')
    expect(all).not.toBeNull()
  })
})

describe('store – meta', () => {
  it('getMeta returns the defaultMeta values before any write', async () => {
    const meta = await getMeta()
    expect(meta).toEqual(defaultMeta())
  })

  it('after setMeta, getMeta returns the stored value', async () => {
    const updated: Meta = {
      xp: 42,
      streak: { count: 3, lastDay: '2026-06-20' },
      daily: { day: '2026-06-21', count: 5 },
      completedLessons: ['lesson-1', 'lesson-2'],
      micPrivacyAck: true,
    }
    await setMeta(updated)
    const retrieved = await getMeta()
    expect(retrieved).toEqual(updated)
  })

  it('defaultMeta has the right shape and zero values', () => {
    const d = defaultMeta()
    expect(d.xp).toBe(0)
    expect(d.streak).toEqual({ count: 0, lastDay: '' })
    expect(d.daily).toEqual({ day: '', count: 0 })
    expect(d.completedLessons).toEqual([])
    expect(d.micPrivacyAck).toBe(false)
  })
})
