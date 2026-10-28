# Post files and frontmatter

## Where posts live

- Single-language blog: `content/<slug>.mdx`
- Multi-language blog (`languages` in `blog.json`): `content/<lang>/<slug>.mdx`.
  The same post in another language uses the same file name in that language's folder.

The URL comes from the file path: `content/zh/hello-world.mdx` is served at `/zh/hello-world`.
Posts in the default language have no language prefix (`content/en/hello-world.mdx` →
`/hello-world`). Path segments are lowercased, spaces become dashes and punctuation is dropped. Set `slug` to
override it. If the blog is served under a sub path (for example `/blog`), every URL starts
with that path.

Create posts with `citepo post new "Title"` instead of writing the file by hand; it fills in
the frontmatter and picks the right folder.

## Frontmatter

Every post starts with a YAML block between `---` lines:

```mdx
---
title: 'How we cut build time in half'
description: 'Two changes to the build pipeline and what they saved.'
date: 2026-03-14
tags: [engineering, performance]
authors: [Jane Doe]
---

The post starts here.
```

| Field         | Required | Format                 | What it does                                                         |
| ------------- | -------- | ---------------------- | -------------------------------------------------------------------- |
| `title`       | yes      | text                   | Page title, share card title                                         |
| `description` | yes      | text                   | Search result snippet and share card text; one or two sentences      |
| `date`        | yes      | `YYYY-MM-DD`           | Publish date; posts are sorted by it                                 |
| `tags`        | no       | list of text           | Tag pages and keywords; reuse existing spellings (`citepo tag list`) |
| `authors`     | no       | list of text           | Shown on the post and in structured data                             |
| `coverImage`  | no       | image path             | Image at the top of the post and in post lists                       |
| `draft`       | no       | `true` / `false`       | Drafts are never published                                           |
| `updated`     | no       | `YYYY-MM-DD`           | Last significant update; sent to search engines as the modified date |
| `noindex`     | no       | `true` / `false`       | Keep it out of search results and the sitemap (still in lists, RSS)  |
| `canonical`   | no       | absolute URL           | Original address when the post is republished from elsewhere         |
| `ogImage`     | no       | image path             | Share image; defaults to `coverImage`, `seo.ogImage`, then a card    |
| `slug`        | no       | `name`, or `lang/name` | Overrides the URL; posts in other languages need the `lang/` prefix  |

Quote titles and descriptions that contain `:` or start with a special character.

## Images

- `/images/<post>/name.webp` → the file `asset/images/<post>/name.webp` (recommended)
- `./name.png` → a file next to the `.mdx` file

`citepo image add <file> --post <slug>` copies an image to the right place, compresses it
and prints the Markdown to paste. Always write alt text: `![What the image shows](/images/...)`.

## Links

Link to other posts by URL, not by file: `[Read more](/hello-world)`, or
`[读更多](/zh/hello-world)`. `citepo post list` shows every post URL. On a blog served under
a sub path, include it: `[Read more](/blog/hello-world)`.
