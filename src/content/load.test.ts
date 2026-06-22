import { describe, expect, test } from 'vitest'
import bankJson from './data/item-bank.json'
import { getItemBank, getItemById, getCourseIndex, loadLesson } from './load'

describe('getItemBank', () => {
  test('returns all items from the bank', () => {
    const items = getItemBank()
    expect(items.length).toBe(bankJson.items.length)
    expect(items.length).toBeGreaterThan(50)
  })
})

describe('getItemById', () => {
  test('returns the item for a real id', () => {
    const firstId = bankJson.items[0].id
    const item = getItemById(firstId)
    expect(item).toBeDefined()
    expect(item!.id).toBe(firstId)
  })

  test('returns undefined for an unknown id', () => {
    expect(getItemById('nope')).toBeUndefined()
  })
})

describe('getCourseIndex', () => {
  test('first unit is a1-survival', () => {
    const index = getCourseIndex()
    expect(index.units[0].id).toBe('a1-survival')
  })
})

describe('loadLesson', () => {
  test('resolves to the lesson for a real id', async () => {
    const lesson = await loadLesson('a1-survival-01')
    expect(lesson).not.toBeNull()
    expect(lesson!.id).toBe('a1-survival-01')
  })

  test('resolves to null for an unknown id', async () => {
    const lesson = await loadLesson('nope')
    expect(lesson).toBeNull()
  })
})
