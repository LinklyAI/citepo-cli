# CitePo

A lightweight CLI for creating, previewing, and building blogs. Create with one command, write in MDX, push to Git — your blog is truly yours.

- **Zero boilerplate** — no `package.json`, no `node_modules`, just content and config
- **MDX powered** — use React components in your posts
- **Multi-language** — built-in i18n with directory-based routing
- **AI-ready** — auto-generates `llms.txt`, `skill.md` for LLM discoverability
- **SEO built-in** — RSS feed, sitemap, robots.txt out of the box
- **Agent friendly** — generates a clean document structure, perfect for coding agents like Codex and Claude Code to edit directly
- **Launch fast** — deploy your blog quickly with the [CitePo](https://citepo.com) platform

## Quick Start

```bash
npx citepo new my-blog
cd my-blog
npx citepo dev
```

## Commands

For convenience, install citepo globally to use the `citepo` command from any directory:

```bash
# Using npm
npm install -g citepo

# Using pnpm
pnpm install -g citepo

# Using Yarn
yarn install -g citepo
```

| Command         | Description                      | Key Options                              |
| --------------- | -------------------------------- | ---------------------------------------- |
| `citepo new`    | Create a new blog project        | Interactive setup                        |
| `citepo dev`    | Start local development server   | `-p, --port`, `--base-path`              |
| `citepo build`  | Build static site for production | `--base-path`, `--site-url`, `--out-dir` |
| `citepo --help` | Show help information            | N/A                                      |

> **Tip:** `ctp` is available as a short alias — `npx ctp dev` is equivalent to `npx citepo dev`.

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
