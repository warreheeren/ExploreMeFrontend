import { describe, expect, it } from 'vitest'
import { highlightSnippet, plainSnippet } from './searchHighlight'

describe('highlightSnippet', () => {
  it('turns markers into <mark>', () => {
    expect(highlightSnippet('Fietsen in [[Barcelona]] en [[Girona]]')).toBe('Fietsen in <mark>Barcelona</mark> en <mark>Girona</mark>')
  })

  it('escapes HTML before adding marks (no XSS)', () => {
    const html = highlightSnippet('<img src=x onerror="alert(1)"> [[<script>]]')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script>')
    expect(html).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; <mark>&lt;script&gt;</mark>')
  })

  it('cannot inject attributes through the marked text', () => {
    expect(highlightSnippet('[[" onmouseover="x]]')).toBe('<mark>&quot; onmouseover=&quot;x</mark>')
  })

  it('leaves unmatched markers as plain text', () => {
    expect(highlightSnippet('a [[b')).toBe('a [[b')
    expect(highlightSnippet('a ]] b')).toBe('a ]] b')
    expect(highlightSnippet('[[]]')).toBe('[[]]')
  })

  it('handles empty input', () => {
    expect(highlightSnippet(null)).toBe('')
    expect(highlightSnippet('')).toBe('')
  })
})

describe('plainSnippet', () => {
  it('removes the markers', () => {
    expect(plainSnippet('in [[Bled]] aan het [[meer]]')).toBe('in Bled aan het meer')
    expect(plainSnippet(undefined)).toBe('')
  })
})
