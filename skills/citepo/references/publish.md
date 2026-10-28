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

## Publishing from the CLI

```bash
citepo auth login                 # once per machine; agents: --no-wait --json, then --wait --json
citepo site create --name "My Blog" --slug my-blog --json   # address my-blog.citepo.app
citepo site connect --json        # connects the GitHub repo of this folder (git remote origin)
citepo deploy wait --json         # waits until the pushed commit is live, or reports why it failed
```

- `citepo auth login --no-wait --json` returns `url` and `code`. The user opens the link on any
  device, checks the code and approves; then `citepo auth login --wait --json` finishes (run it
  again on `login_timeout`). On servers, `CITEPO_TOKEN` can carry the token instead
  (`citepo auth token` prints it on a machine that is signed in).
- The first `site connect` of an account may fail with `github_not_linked` or
  `app_not_installed`: the user has to link GitHub and install the CitePo GitHub App once, in
  the browser. The error's `hint` names the page. Later connects work from the CLI.
- After each `git push`, `citepo deploy wait --json` follows the build of that commit.
  `citepo deploy logs` shows every build stage; `citepo deploy start` builds again.
- `citepo site status --json` shows the address, repository and last deploy.

## Preview locally

`citepo dev` serves the blog at http://localhost:4321 and reloads on changes.
