import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Avatar from './ui/Avatar.vue'
import MentionText from './MentionText.vue'
import StarRating from './StarRating.vue'
import StopTypeChip from './StopTypeChip.vue'

const RouterLinkStub = {
  name: 'RouterLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

describe('Avatar', () => {
  it('toont initialen zonder foto', () => {
    expect(mount(Avatar, { props: { name: 'Emma de Vries' } }).text()).toBe('EV')
    expect(mount(Avatar, { props: { name: 'lotte' } }).text()).toBe('LO')
  })

  it('valt terug op initialen als de foto niet laadt', async () => {
    const wrapper = mount(Avatar, { props: { name: 'Daan Mulder', src: 'https://x.test/kapot.jpg' } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('DM')
  })
})

describe('MentionText', () => {
  it('maakt van vermeldingen links naar profielen', () => {
    const wrapper = mount(MentionText, {
      props: { text: 'Zin in @emma.reist!' },
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/u/emma.reist')
    expect(link.text()).toBe('@emma.reist')
    expect(wrapper.text()).toBe('Zin in @emma.reist!')
  })
})

describe('StarRating', () => {
  it('beschrijft de waarde voor schermlezers', () => {
    const wrapper = mount(StarRating, { props: { modelValue: 4.5 } })
    expect(wrapper.attributes('aria-label')).toBe('4,5 van 5 sterren')
  })

  it('geeft de gekozen ster door en kan ze weer wissen', async () => {
    const wrapper = mount(StarRating, { props: { modelValue: 3, readonly: false } })
    const buttons = wrapper.findAll('button')
    await buttons[4].trigger('click')
    await buttons[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[5], [null]])
  })
})

describe('StopTypeChip', () => {
  it('toont het aantal met het juiste label', () => {
    expect(mount(StopTypeChip, { props: { type: 'Accommodation', count: 3 } }).text()).toBe('3 hotels')
    expect(mount(StopTypeChip, { props: { type: 'FoodSpot' } }).text()).toBe('Foodspot')
  })
})
