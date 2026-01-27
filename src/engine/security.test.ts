import { describe, it, expect } from 'vitest'
import { scanMdxContent } from './security.js'

describe('scanMdxContent', () => {
  it('should return empty issues for clean content', () => {
    const content = `---
title: Clean Post
---

This is a clean blog post with no issues.

## Section

Some **bold** text and a [link](https://example.com).
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toEqual([])
  })

  it('should detect import statements', () => {
    const content = `---
title: Test
---

import React from 'react'

Hello world
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.severity).toBe('error')
    expect(issues[0]!.message).toContain('Import')
  })

  it('should detect export statements', () => {
    const content = `---
title: Test
---

export const meta = {}

Hello world
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.severity).toBe('error')
    expect(issues[0]!.message).toContain('Export')
  })

  it('should detect script tags', () => {
    const content = `---
title: Test
---

<script>alert('xss')</script>
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.severity).toBe('error')
    expect(issues[0]!.message).toContain('Script')
  })

  it('should detect event handler attributes as warnings', () => {
    const content = `---
title: Test
---

<div onClick={handleClick}>Click me</div>
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toHaveLength(1)
    expect(issues[0]!.severity).toBe('warning')
    expect(issues[0]!.message).toContain('Event handler')
  })

  it('should not report issues inside frontmatter', () => {
    const content = `---
title: import export script onClick
---

Clean content here.
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toEqual([])
  })

  it('should not report issues inside code blocks', () => {
    const content = `---
title: Test
---

Here is a code example:

\`\`\`javascript
import React from 'react'
export default function App() {}
\`\`\`

More content.
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toEqual([])
  })

  it('should report correct file name', () => {
    const content = `---
title: Test
---

import foo from 'bar'
`
    const issues = scanMdxContent(content, 'en/my-post.mdx')
    expect(issues[0]!.file).toBe('en/my-post.mdx')
  })

  it('should report correct line numbers', () => {
    const content = `---
title: Test
---

Line 5 is clean

import something from 'somewhere'
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues[0]!.line).toBe(7)
  })

  it('should detect multiple issues', () => {
    const content = `---
title: Test
---

import React from 'react'
export const x = 1
<script>bad()</script>
<div onClick={x}>y</div>
`
    const issues = scanMdxContent(content, 'test.mdx')
    expect(issues).toHaveLength(4)

    const errors = issues.filter((i) => i.severity === 'error')
    const warnings = issues.filter((i) => i.severity === 'warning')
    expect(errors).toHaveLength(3)
    expect(warnings).toHaveLength(1)
  })
})
