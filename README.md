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
npx citepo init my-blog
cd my-blog
npx citepo dev
```

### With an AI agent

Send this line to Claude Code, Codex, OpenClaw, Cursor or any agent that can run commands:

```
Set up CitePo for me: https://citepo.com/agent-setup.md
```

The agent installs the CLI and its skill, creates the blog, writes the first post with you
and gets it published. See [docs/agent-setup.md](./docs/agent-setup.md).

## Commands

For convenience, install citepo globally to use the `citepo` command from any directory:

```bash
# Using npm
npm install -g citepo

# Using pnpm
pnpm install -g citepo

# Using Yarn
yarn global add citepo
```

| Command                          | Description                                                        |
| -------------------------------- | ------------------------------------------------------------------ |
| `citepo init [dir]`              | Create a blog (`--name`, `--lang`, `--langs`, `--theme`, `--yes`)  |
| `citepo dev`                     | Start the local preview server                                     |
| `citepo build`                   | Build the static site (images are compressed automatically)        |
| `citepo check`                   | Check posts, images, links and sizes without building              |
| `citepo post new \| list`        | Create a post with frontmatter filled in; list posts and URLs      |
| `citepo tag list`                | List tags and spellings that differ only in case                   |
| `citepo image add \| optimize`   | Add a compressed image to a post; shrink large images in place     |
| `citepo docs [topic]`            | Writing reference: frontmatter, components, config, publish        |
| `citepo skill install \| update` | Install the citepo skill for Claude Code, Codex, OpenClaw and more |
| `citepo auth login \| status`    | Sign in to CitePo by approving a code in the browser               |
| `citepo site create \| connect`  | Create a site and connect its GitHub repository                    |
| `citepo deploy wait \| logs`     | Follow the build of a push until it is live, or see why it failed  |
| `citepo doctor`                  | Check Node.js, citepo, the skill, git and the current folder       |
| `citepo upgrade`                 | Upgrade citepo with the package manager that installed it          |

Every command accepts `--json` and prints a single JSON document; exit codes are 0 for
success, 1 for errors and 2 for warnings only. `citepo new` still works as an alias of
`citepo init`.

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

## Deploy

You can deploy your CitePo blog anywhere that serves static files. The easiest option is [CitePo](https://citepo.com) — connect your GitHub repo, and every push triggers an automatic build and deploy.

1. Push your blog to a GitHub repository
2. Sign in at [citepo.com](https://citepo.com) and create a new site
3. Connect your GitHub repo and select the branch
4. Done — your blog is live at `yoursite.citepo.app`

CitePo also supports custom domains and subdirectory mounting (e.g. `yourdomain.com/blog`).

For other platforms, run `citepo build` and upload the output directory to any static hosting service (Vercel, Netlify, Cloudflare Pages, etc.).

## Documentation

Full documentation: [docs.citepo.com](https://docs.citepo.com)

## License

Apache License 2.0 — see [LICENSE](./LICENSE) for details.
