# MDX components

Posts are MDX: Markdown plus the components below. No imports are needed, and nothing else
can be imported. Scripts, `import`/`export` lines and event handlers (`onClick`) are rejected.

In plain text, `{`, `}` and `<` start MDX syntax: write `\{`, `\}` and `&lt;`, or put the text
in backticks.

## Callout

```mdx
<Callout type="tip" title="Optional title">
  Text with **Markdown**.
</Callout>
```

`type`: `info` (default), `tip`, `warning`, `error`.

## Card and CardGroup

```mdx
<CardGroup cols={2}>
  <Card title="Docs" icon="book-open" href="https://example.com/docs">
    Short description.
  </Card>
  <Card title="Changelog" icon="history" href="/changelog">
    Short description.
  </Card>
</CardGroup>
```

`Card`: `title` (required), `icon`, `href`. `CardGroup`: `cols` is `2` or `3`.
Icons are Lucide icon names in kebab-case (https://lucide.dev/icons), e.g. `zap`, `git-branch`.

## Accordion and AccordionGroup

```mdx
<AccordionGroup>
  <Accordion title="Do I need an account?">Answer.</Accordion>
  <Accordion title="Is it free?">Answer.</Accordion>
</AccordionGroup>
```

## Steps

```mdx
<Steps>
  <Step title="Install">Run `npm install -g citepo`.</Step>
  <Step title="Create a blog">Run `citepo init my-blog`.</Step>
</Steps>
```

## Badge

```mdx
<Badge color="green" icon="circle-check">
  Passed
</Badge>
```

`color`: `gray`, `blue`, `green`, `yellow`, `orange`, `red`, `purple`. `size`: `sm`, `md`, `lg`.
`shape`: `rounded`, `pill`. `stroke` for an outlined badge. `icon`: a Lucide icon name.

## CodeGroup

Tabs of code blocks. The word after the language is the tab label:

````mdx
<CodeGroup>
```bash npm
npm install -g citepo
```

```bash pnpm
pnpm add -g citepo
```

</CodeGroup>
````

## Code blocks

Fenced code blocks are highlighted by language: ` ```ts `, ` ```bash `, ` ```json `.

## Images

`![Alt text](/images/post/name.webp)` or `<img src="/images/post/name.webp" alt="..." />`.
Images load lazily; the build scales them down and compresses them.
