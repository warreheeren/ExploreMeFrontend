import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

vi.mock('@/api/tripsApi', () => ({
  getDatePoll: vi.fn(),
  voteDatePoll: vi.fn(),
  openDatePoll: vi.fn(),
  decideDatePoll: vi.fn(),
  closeDatePoll: vi.fn(),
}))
vi.mock('@/services/realtime', () => ({ onRealtime: () => () => {} }))
vi.mock('@/stores/toast', () => ({ useToastStore: () => ({ success: vi.fn(), error: vi.fn() }) }))
vi.mock('@/composables/useConfirm', () => ({ confirm: vi.fn(async () => true) }))

const tripsApi = await import('@/api/tripsApi')
const { default: DatePoll } = await import('./DatePoll.vue')

const person = (name) => ({ userName: name, displayName: name, profilePhotoUrl: null })

function openPoll(overrides = {}) {
  return {
    id: 'p1',
    tripId: 't1',
    rangeStart: '2026-11-02T00:00:00Z',
    rangeEnd: '2026-11-08T00:00:00Z',
    lengthDays: 3,
    status: 'Open',
    decidedStart: null,
    createdByUserName: 'emma',
    createdByDisplayName: 'Emma',
    createdAtUtc: '2026-10-01T10:00:00Z',
    participants: [
      { ...person('emma'), isMe: true, days: {} },
      { ...person('lucas'), isMe: false, days: { '2026-11-03': 'Yes' } },
    ],
    suggestions: [],
    canDecide: true,
    canClose: true,
    ...overrides,
  }
}

const mountPoll = () => mount(DatePoll, { props: { tripId: 't1' }, global: { directives: { clickOutside: {} } } })

describe('DatePoll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cycles a day and saves all own votes', async () => {
    tripsApi.getDatePoll.mockResolvedValue(openPoll())
    tripsApi.voteDatePoll.mockImplementation(async (_, votes) => openPoll({
      participants: [{ ...person('emma'), isMe: true, days: { '2026-11-02': votes[0].availability } }, openPoll().participants[1]],
    }))
    const wrapper = mountPoll()
    await flushPromises()

    const days = wrapper.findAll('button[data-day]')
    expect(days).toHaveLength(7)

    await days[0].trigger('keydown', { key: 'Enter' })
    expect(days[0].classes()).toContain('bg-emerald-50')

    await new Promise((r) => setTimeout(r, 700))
    await flushPromises()
    expect(tripsApi.voteDatePoll).toHaveBeenCalledWith('t1', [{ date: '2026-11-02T00:00:00.000Z', availability: 'Yes' }])
  })

  it('shows the heatmap and suggestions with a pick button for the owner', async () => {
    tripsApi.getDatePoll.mockResolvedValue(openPoll({
      suggestions: [{ start: '2026-11-03T00:00:00Z', end: '2026-11-05T00:00:00Z', score: 2, maxScore: 4, available: [person('lucas')], maybe: [], unavailable: [person('emma')] }],
    }))
    tripsApi.decideDatePoll.mockResolvedValue(openPoll({ status: 'Decided', decidedStart: '2026-11-03T00:00:00Z' }))
    const wrapper = mountPoll()
    await flushPromises()

    const overview = wrapper.findAll('[role="tab"]').find((b) => b.text() === 'Overzicht')
    await overview.trigger('click')
    expect(wrapper.find('button[data-day]').exists()).toBe(false)
    expect(wrapper.findAll('[role="img"]').some((c) => c.attributes('title')?.includes('1 kan'))).toBe(true)

    const pick = wrapper.findAll('button').find((b) => b.text() === 'Kies deze periode')
    await pick.trigger('click')
    await flushPromises()
    expect(tripsApi.decideDatePoll).toHaveBeenCalledWith('t1', '2026-11-03T00:00:00Z')
    expect(wrapper.emitted('decided')).toHaveLength(1)
    expect(wrapper.text()).toContain('Datums gekozen')
  })

  it('offers to start a poll when there is none', async () => {
    tripsApi.getDatePoll.mockResolvedValue(null)
    const wrapper = mountPoll()
    await flushPromises()
    expect(wrapper.text()).toContain('Datums prikken')
  })
})
