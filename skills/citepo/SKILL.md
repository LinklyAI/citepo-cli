---
name: citepo
description: Create and maintain a CitePo blog with the citepo CLI — set up a new blog, write and edit MDX posts, add images, translate posts, check everything before publishing, and publish by pushing to GitHub. Use when the user wants to start a blog, write or update a blog post, translate posts, fix blog build or check errors, or mentions CitePo, citepo, blog.json or a content/ folder of .mdx posts.
license: Apache-2.0
---

# CitePo blogs

A CitePo blog is a folder with `blog.json`, posts in `content/` (`.mdx`), files in `asset/`,
kept in a Git repository. The `citepo` CLI creates, checks and previews it; CitePo builds and
publishes it on every push to GitHub.

## Ground rules

- Run commands with `--json` when you need to read the result. Output is one JSON document:
  `{"ok": true, "data": ...}` or `{"ok": false, "error": {"code", "message", "hint"}}`.
  Follow `error.hint`; it names the next command or fix.
- Exit codes: 0 success, 1 error, 2 warnings only.
- Never wait on prompts: pass every option as a flag (`citepo init ... --yes`).
- Run `citepo check --json` after every change and before every push. Fix all errors.
- Use only the MDX components listed in `references/components.md`. Nothing can be imported.
- Reuse existing tags (`citepo tag list --json`) instead of inventing new spellings.
- Pushing publishes the blog. Push only when the user asked to publish, or confirm first.
- If a result contains `update`, tell the user a new citepo version exists (`citepo upgrade`).

First check the CLI: `citepo --version`. If it is missing, ask the user, then install it with
`npm install -g citepo` (Node.js 20+). `citepo doctor --json` reports Node.js, git, GitHub CLI
and whether the current folder is a blog.

## Start a new blog

1. Ask for the blog name, language(s) and theme (`clean` or `wabi`) if the user has not said.
2. Create it:
   ```bash
   citepo init my-blog --name "My Blog" --lang en --theme clean --yes --json
   # several languages: --lang en --langs zh,ja
   ```
3. Replace the two sample posts in `content/` with the user's first post (see below), or
   delete them.
4. Put it on GitHub: `git init && git add -A && git commit -m "Create blog"`, then create a
   repository and push, e.g. `gh repo create my-blog --private --source . --push`.
5. Publishing: the user connects the repository to a CitePo site at https://citepo.com
   (sign in → New site → choose the repository). This installs the CitePo GitHub App on the
   repository, which needs the user's browser. After that, every push publishes the blog.

## Write a post

1. Create the file with frontmatter filled in:
   ```bash
   citepo post new "Post title" --description "One or two sentences." --tags guide,release --json
   # non-ASCII titles need a slug: citepo post new "你好世界" --slug hello-world --lang zh
   # all languages at once: --all-langs
   ```
   The result gives the file path and URL.
2. Write the body in that file: Markdown plus components. Start with the point, use `##`
   headings, short paragraphs, and code blocks with a language.
3. Images: `citepo image add <path> --post <slug> --alt "What it shows" --json`, then paste
   the returned `markdown`. Never reference images outside the project.
4. Link other posts by URL (`citepo post list --json` lists them), never by `.mdx` file.
5. `citepo check --json`; fix every error, and the warnings about this post.
6. Optional preview: `citepo dev` (http://localhost:4321; it keeps running).
7. Commit; push when the user wants it published.

## Update a post

Edit the file, set `updated: YYYY-MM-DD` in the frontmatter for meaningful changes (not
typo fixes), then check and commit as above. Do not change `date` or the file name: the
file name is the URL.

## Translate posts

`citepo post list --json` shows `missingLanguages` for each post. For each missing
language, create `content/<lang>/<same-file-name>.mdx` with the same frontmatter fields,
translated `title`, `description` and body, and the same `date`, image paths and
`coverImage`. Keep component names and props as they are; translate only visible text.
Tags may be translated, but keep each language's spellings consistent.

## Fix check results

| Rule                               | Fix                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `invalid_frontmatter`              | Correct the field named in the message (`references/frontmatter.md`)         |
| `mdx_syntax`                       | Close tags; escape `{`, `}`, `<` in text as `\{`, `\}`, `&lt;`               |
| `unknown_component`                | Replace with a listed component or plain Markdown                            |
| `missing_image`                    | Put the file at the path in `hint`, or fix the path                          |
| `broken_link`                      | Use a URL from `citepo post list`; drafts are not published                  |
| `source_link`                      | Replace the `.mdx` link with the URL in `hint`                               |
| `tag_case`                         | Pick one spelling and use it in every post                                   |
| `duplicate_url`                    | Rename one file or set a different `slug`                                    |
| `large_images`, `source_too_large` | `citepo image optimize` (shrinks images in place)                            |
| `missing_translation`              | Informational; translate if the user wants every language                    |
| `base_path_links`                  | The blog is served under a sub path: rerun `citepo check --base-path <path>` |

## Reference

Read these when you need details; they are also printed by `citepo docs <topic>`:

- `references/frontmatter.md`: file layout, URLs, every frontmatter field, images, links
- `references/components.md`: Callout, Card, Steps, Accordion, Badge, CodeGroup with examples
- `references/config.md`: `blog.json`, `style.css`, `asset/`
- `references/publish.md`: checks before pushing, how publishing works, size limits
