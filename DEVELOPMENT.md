# Development Guide

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** (this project uses pnpm as the package manager)

## Getting Started

```bash
git clone <repo-url> citepo-cli
cd citepo-cli
pnpm install
pnpm build
```

## Project Structure

```
src/
├── cli/                    # CLI entry point and commands
│   ├── index.ts            # Main CLI entry (commander setup)
│   ├── utils.ts            # CLI utilities (version, package root)
│   ├── version-check.ts    # Background update checker
│   ├── error.ts            # Unified error handling
│   └── commands/           # CLI command implementations
│       ├── new.ts          # `citepo new` — scaffold a blog
│       ├── dev.ts          # `citepo dev` — start dev server
│       └── build.ts        # `citepo build` — production build
│
├── engine/                 # Core engine logic (no CLI dependency)
│   ├── config.ts           # blog.json schema (Zod) and loader
│   ├── content.ts          # MDX content reader, frontmatter parser
│   ├── security.ts         # MDX security scanner
│   ├── astro.ts            # Astro config generator + Vite plugins
│   ├── post-build.ts       # Post-build artifact generation
│   ├── schema.ts           # JSON Schema generator
│   ├── schema-cli.ts       # JSON Schema CLI script
│   └── generators/         # Static file generators
│       ├── robots-txt.ts   # robots.txt
│       ├── llms-txt.ts     # llms.txt / llms-full.txt
│       └── skill-md.ts     # skill.md (AI agent metadata)
│
├── astro-project/          # Astro project template (runtime)
├── theme/                  # Theme files (shipped with package)
├── mdx-components/         # Built-in MDX React components
└── scaffold/               # New project template files
```

## Development Workflow

### Watch Mode

```bash
pnpm dev          # Rebuild CLI on file changes (tsup --watch)
```

### Code Quality

```bash
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint with auto-fix
pnpm format       # Prettier formatting
```

### Testing

```bash
pnpm test              # Run all tests (vitest)
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage report
```

Test files follow the `*.test.ts` convention and are co-located with their source files.

## Architecture

The CLI follows a clear separation between the command layer and the engine layer:

```
CLI Commands (src/cli/)
  │
  ├── citepo new   → scaffold/ templates
  ├── citepo dev   → engine/config → engine/astro → Astro dev server
  └── citepo build → engine/config → engine/security → engine/astro → Astro build
                                                         → engine/post-build → generators/
```

**Key design decisions:**

- **Engine is CLI-agnostic**: The `engine/` directory contains pure logic with no CLI dependencies. This makes functions easy to test and potentially reusable.
- **Astro Programmatic API**: Instead of generating an Astro project on disk, we use Astro's programmatic `dev()` and `build()` APIs with dynamically generated configuration.
- **Vite Virtual Modules**: Blog configuration is injected into the Astro build via Vite virtual modules (`virtual:blog-config`), avoiding file-system coupling.
- **Security scanning**: MDX content is scanned before build to prevent dangerous patterns (imports, exports, scripts).

## Adding a New Command

1. Create a new file in `src/cli/commands/`, e.g., `my-command.ts`:

   ```typescript
   import { Command } from 'commander'

   export const myCommand = new Command('my-command')
     .description('What it does')
     .action(async () => {
       // Implementation
     })
   ```

2. Register it in `src/cli/index.ts`:

   ```typescript
   import { myCommand } from './commands/my-command.js'
   program.addCommand(myCommand)
   ```

## Adding MDX Components

1. Create a React component in `src/mdx-components/`, e.g., `MyComponent.tsx`
2. Export it from `src/mdx-components/index.ts`
3. The component will be automatically available in user MDX files

## Build & Packaging

The build process uses **tsup** to bundle the CLI entry point into a single ESM file:

```bash
pnpm build    # Runs: tsup && tsx src/engine/schema-cli.ts
```

This produces:

- `dist/cli/index.js` — Bundled CLI executable
- `dist/schema.json` — JSON Schema for blog.json

The following directories are shipped as raw source (not bundled):

- `src/astro-project/` — Astro project template
- `src/theme/` — Theme files
- `src/mdx-components/` — MDX components
- `src/scaffold/` — New project template

## Publishing to npm

1. Update version in `package.json`
2. Build the package:
   ```bash
   pnpm build
   ```
3. Verify the package contents:
   ```bash
   npm pack
   tar tzf citepo-<version>.tgz | head -50
   ```
4. Publish:
   ```bash
   npm publish
   ```

Ensure the following are included in the tarball:

- `dist/cli/index.js` (CLI executable)
- `dist/schema.json` (JSON Schema)
- `src/astro-project/`, `src/theme/`, `src/mdx-components/`, `src/scaffold/` (runtime files)
