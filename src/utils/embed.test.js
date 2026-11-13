import { describe, expect, it } from 'vitest'
import { embedCode, embedUrl } from './embed'

describe('embed', () => {
  it('builds the embed url with a known theme', () => {
    expect(embedUrl('https://exploreme.app', 'abc', 'dark')).toBe('https://exploreme.app/embed/abc?theme=dark')
    expect(embedUrl('https://exploreme.app', 'abc', 'neon')).toBe('https://exploreme.app/embed/abc?theme=auto')
  })

  it('builds iframe code and escapes the trip title', () => {
    const code = embedCode({ origin: 'https://x.test', token: 'tok', theme: 'light', height: 560, title: 'Rome "&" <Napels>' })
    expect(code).toContain('src="https://x.test/embed/tok?theme=light"')
    expect(code).toContain('height="560"')
    expect(code).toContain('title="Rome &quot;&amp;&quot; &lt;Napels&gt; – ExploreMe"')
    expect(code.startsWith('<iframe ')).toBe(true)
    expect(code.endsWith('></iframe>')).toBe(true)
  })
})
