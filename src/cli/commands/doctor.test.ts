import { describe, expect, it } from 'vitest'
import { checkNode } from './doctor.js'

describe('checkNode', () => {
  it('accepts supported versions and rejects old ones', () => {
    expect(checkNode('22.14.1').status).toBe('ok')
    expect(checkNode('18.17.0').status).toBe('ok')
    expect(checkNode('18.16.1')).toMatchObject({
      status: 'fail',
      hint: expect.stringContaining('20'),
    })
    expect(checkNode('16.20.0').status).toBe('fail')
  })
})
