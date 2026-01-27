# CitePo

A lightweight blog publishing CLI powered by Astro. Write in MDX, push to Git, and your blog is live.

- **Zero boilerplate** — no `package.json`, no `node_modules`, just content and config
- **MDX powered** — use React components in your posts
- **Multi-language** — built-in i18n with directory-based routing
- **AI-ready** — auto-generates `llms.txt`, `skill.md` for LLM discoverability
- **SEO built-in** — RSS feed, sitemap, robots.txt out of the box

## Quick Start

```bash
npx citepo new my-blog
cd my-blog
npx citepo dev
```

## Commands

| Command        | Description                      | Key Options                              |
| -------------- | -------------------------------- | ---------------------------------------- |
| `citepo new`   | Create a new blog project        | Interactive setup                        |
| `citepo dev`   | Start local development server   | `-p, --port`, `--base-path`              |
| `citepo build` | Build static site for production | `--base-path`, `--site-url`, `--out-dir` |

## Project Structure

A CitePo blog is a minimal Git repository:

```
my-blog/
├── blog.json        # Blog configuration
├── style.css        # Custom styles (overrides theme)
├── content/         # Blog posts (MDX)
│   ├── hello-world.mdx
│   └── another-post.mdx
├── asset/           # Static assets
└── .gitignore
```

## Documentation

Full documentation: [docs.citepo.com](https://docs.citepo.com)

## License

Proprietary. All rights reserved.
