import { describe, expect, it } from 'vitest'
import { appleDisplayName, sha256Hex } from './externalAuth'

describe('externalAuth', () => {
  it('combineert de naam die Apple bij de eerste login meegeeft', () => {
    expect(appleDisplayName({ name: { firstName: 'Zoë', lastName: 'Janssens' } })).toBe('Zoë Janssens')
    expect(appleDisplayName({ name: { firstName: ' Zoë ', lastName: '' } })).toBe('Zoë')
    expect(appleDisplayName({ name: {} })).toBeNull()
    expect(appleDisplayName(undefined)).toBeNull()
  })

  it.runIf(globalThis.crypto?.subtle)('hasht de nonce als SHA-256-hex (zoals de API controleert)', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })
})
