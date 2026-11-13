import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/placesApi', () => ({ getPlaceSummary: vi.fn() }))

const placesApi = await import('@/api/placesApi')
const { default: PlaceSummaryCard } = await import('./PlaceSummaryCard.vue')
const { useConsentStore } = await import('@/stores/consent')
const { CONSENT_STORAGE_KEY } = await import('@/utils/consent')

const summary = {
  title: 'Bled',
  extract: 'Bled is een gemeente in Slovenië.',
  thumbnailUrl: 'https://upload.wikimedia.org/bled.jpg',
  pageUrl: 'https://nl.wikipedia.org/wiki/Bled',
  source: 'wikivoyage',
  language: 'nl',
}

describe('PlaceSummaryCard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.removeItem(CONSENT_STORAGE_KEY)
    setActivePinia(createPinia())
    // De Wikimedia-foto is externe inhoud: standaard met toestemming, de placeholder heeft een eigen test.
    useConsentStore().save({ functional: true })
  })

  it('shows the summary with photo, source link and licence', async () => {
    placesApi.getPlaceSummary.mockResolvedValue(summary)
    const wrapper = mount(PlaceSummaryCard, { props: { stopId: 's1' } })
    await flushPromises()

    expect(placesApi.getPlaceSummary).toHaveBeenCalledWith('s1')
    expect(wrapper.find('h2').text()).toBe('Bled')
    expect(wrapper.text()).toContain('Bled is een gemeente in Slovenië.')
    expect(wrapper.find('img').attributes('src')).toBe(summary.thumbnailUrl)
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe(summary.pageUrl)
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.text()).toContain('Wikivoyage')
    expect(wrapper.text()).toContain('CC BY-SA')
  })

  it('shows a placeholder instead of the photo without functional consent and loads it on request', async () => {
    useConsentStore().rejectAll()
    placesApi.getPlaceSummary.mockResolvedValue(summary)
    const wrapper = mount(PlaceSummaryCard, { props: { stopId: 's1' } })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Wikimedia')
    await wrapper.find('button').trigger('click')
    expect(useConsentStore().has('functional')).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe(summary.thumbnailUrl)
  })

  it('renders nothing without a summary or on an error', async () => {
    placesApi.getPlaceSummary.mockResolvedValue(null)
    const empty = mount(PlaceSummaryCard, { props: { stopId: 's1' } })
    await flushPromises()
    expect(empty.find('article').exists()).toBe(false)

    placesApi.getPlaceSummary.mockRejectedValue(new Error('offline'))
    const failed = mount(PlaceSummaryCard, { props: { stopId: 's2' } })
    await flushPromises()
    expect(failed.find('article').exists()).toBe(false)
  })

  it('reloads when the stop changes and hides a broken photo', async () => {
    placesApi.getPlaceSummary.mockResolvedValue(summary)
    const wrapper = mount(PlaceSummaryCard, { props: { stopId: 's1' } })
    await flushPromises()
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)

    placesApi.getPlaceSummary.mockResolvedValue({ ...summary, title: 'Ljubljana', thumbnailUrl: null })
    await wrapper.setProps({ stopId: 's2' })
    await flushPromises()
    expect(placesApi.getPlaceSummary).toHaveBeenLastCalledWith('s2')
    expect(wrapper.find('h2').text()).toBe('Ljubljana')
  })
})
