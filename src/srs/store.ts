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
