import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useToastStore } from './toast'

describe('toast store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('toont en verbergt meldingen na de timeout', () => {
    const toast = useToastStore()
    toast.success('Opgeslagen')
    expect(toast.items).toHaveLength(1)
    expect(toast.items[0]).toMatchObject({ type: 'success', message: 'Opgeslagen' })
    vi.advanceTimersByTime(4100)
    expect(toast.items).toHaveLength(0)
  })

  it('houdt maximaal vier meldingen bij en foutmeldingen blijven langer staan', () => {
    const toast = useToastStore()
    for (let i = 0; i < 6; i++) toast.info(`melding ${i}`, { timeout: 0 })
    expect(toast.items.map((t) => t.message)).toEqual(['melding 2', 'melding 3', 'melding 4', 'melding 5'])

    const id = toast.error('Mislukt')
    vi.advanceTimersByTime(4500)
    expect(toast.items.some((t) => t.id === id)).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(toast.items.some((t) => t.id === id)).toBe(false)
  })
})
