import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { docPath, DOC_TOPICS, type DocTopic } from './docs.js'

describe('docs topics', () => {
  it('has a reference file for every topic', () => {
    for (const topic of Object.keys(DOC_TOPICS) as DocTopic[]) {
      expect(existsSync(docPath(topic)), topic).toBe(true)
    }
  })
})
