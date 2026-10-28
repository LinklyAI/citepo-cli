# Checking and publishing

## Before every push

```bash
citepo check          # frontmatter, MDX, images, links, tags, sizes
citepo build          # optional: full build into dist/
```

`citepo check` exit codes: 0 clean, 1 errors (the hosted build will fail or pages will
break), 2 warnings only. With `--json`, every issue has `rule`, `severity`, `file`, `line`,
`message` and `hint`. Fix errors before pushing; fix warnings when they are about this
change.

If the blog is served under a sub path that is not in `blog.json` (set in the CitePo
dashboard instead), pass it: `citepo check --base-path /blog`.

## How publishing works

The blog is a Git repository connected to a CitePo site. Every push to the connected branch
starts a build; when it succeeds, the new version goes live at the site's address
(`<name>.citepo.app` or a custom domain). Failed builds leave the previous version online.

Hosted build limits:

- Repository content (`content/` and `asset/`): 100 MB
- Build output: 100 MB; a single file: 20 MB

The build scales down and compresses images automatically. To make the repository smaller,
run `citepo image optimize`.

## Preview locally

`citepo dev` serves the blog at http://localhost:4321 and reloads on changes.
