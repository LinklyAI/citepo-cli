# Set up CitePo with an AI agent

**For people:** send this one line to your AI agent (Claude Code, Codex, OpenClaw, Cursor,
or any agent that can run commands):

```
Set up CitePo for me: https://citepo.com/agent-setup.md
```

The agent installs the `citepo` CLI and its skill, creates your blog, writes the first post
with you, and gets it published. You will be asked to approve installs, to approve the
CitePo sign-in in your browser, and the first time, to link GitHub and allow the CitePo app on
the repository.

---

## To the AI agent

### Task

Set up the user's CitePo blog on this machine.

Done when:

1. `citepo doctor --json` reports `ready: true`.
2. The citepo skill is installed for you (`citepo skill status --json`).
3. A blog exists with at least one post written with the user, and `citepo check --json`
   reports no errors.
4. The blog is in a GitHub repository, connected to a CitePo site, and the user has the
   published URL — or, if the user stops earlier, they know exactly what is left.

### Rules

- Check the current state first (Step 0) and start at the first step that is not done.
- Ask before installing anything or creating anything outside the current folder.
- Run citepo commands with `--json` and read the result. On `"ok": false`, follow
  `error.hint`. Never wait on an interactive prompt: pass flags (`--yes`).
- Verify each step with its check before moving on. Never report a step as done without
  that check.
- Install the skill only for yourself (`--agent <your app>`), not for every app.
- Pushing to GitHub publishes the blog once it is connected. Push the first time only after
  the user has seen the first post.

### Step 0: Check the current state

```bash
citepo --version && citepo doctor --json
```

| What you see                                 | Start at |
| -------------------------------------------- | -------- |
| `citepo: command not found`                  | Step 1   |
| `skill` check is `warn`                      | Step 2   |
| `project` check is `warn` (no blog.json)     | Step 3   |
| A blog exists but has only the sample posts  | Step 4   |
| `repository` check is `warn` (no git remote) | Step 5   |
| Everything else `ok` (incl. `login` `warn`)  | Step 6   |

If `node` fails, the user needs Node.js 20 or newer first (https://nodejs.org); ask them to
install it.

### Step 1: Install the CLI

Ask the user, then:

```bash
npm install -g citepo     # or: pnpm add -g citepo / bun add -g citepo
```

Check: `citepo --version` prints a version.

### Step 2: Install the skill

```bash
citepo skill install --agent <claude-code | codex | openclaw | cursor | opencode | gemini> --json
```

For another app, use `--dir <its skills folder>`. The skill loads in your next session; for
the rest of this setup, read it directly: `citepo docs` lists the references.

Check: `citepo skill status --json` lists your app.

### Step 3: Create the blog

Ask the user for the blog name, the language (and any extra languages), and the theme
(`clean`: black and white; `wabi`: warm reading theme). Suggest a folder name. Then:

```bash
citepo init <folder> --name "<Blog name>" --lang en --theme clean --yes --json
# extra languages: --langs zh,ja
cd <folder>
```

Check: `citepo check --json` reports `passed: true`.

### Step 4: Write the first post with the user

1. Ask what the first post is about; draft it together.
2. `citepo post new "<Title>" --description "<1–2 sentences>" --tags <tags> --json`, then
   write the body into the returned file. `citepo docs components` shows the available
   components. Add images with `citepo image add <file> --post <slug> --alt "<text>" --json`.
3. Remove the sample posts (`hello-world`, `why-choose-citepo-to-build-blog`) if the user
   does not want them.
4. Optional: `citepo dev` and ask the user to look at http://localhost:4321 (it keeps
   running; stop it afterwards).

Check: `citepo check --json` reports no errors.

### Step 5: Put the blog on GitHub

```bash
git init -b main && git add -A && git commit -m "Create blog"
gh repo create <name> --private --source . --push     # needs `gh auth login`
```

Without the GitHub CLI, ask the user to create an empty repository on github.com, then
`git remote add origin <url> && git push -u origin main`.

Check: `citepo doctor --json` shows the `repository` check as `ok`.

### Step 6: Sign in to CitePo and publish

```bash
citepo auth login --no-wait --json
```

Send the user the `url` and `code` from the result: they open the link on any device, check
that the code matches, and approve (signing up first if they have no account). Then:

```bash
citepo auth login --wait --json        # run again on login_timeout
citepo site create --name "<Blog name>" --slug <subdomain> --json
citepo site connect --json
```

If `site connect` returns `github_not_linked` or `app_not_installed`, send the user the page in
`error.hint`: they link GitHub and install the CitePo GitHub App on the repository once. Run
`citepo site connect --json` again afterwards (or `citepo site status --json` if they connected
the repository on that page).

```bash
citepo deploy wait --json
```

Check: the result is `"status": "success"` with the site `url`. On `deploy_failed`, read the
message, fix the blog (`citepo check`, `citepo build`), commit, push and wait again.

### Step 7: Report

Tell the user:

- what was installed and where the blog folder is
- the repository and the site address
- that the skill loads in a new session of this app
- how to continue, with three example requests, e.g. "Write a post about …",
  "Translate my latest post into Japanese", "Check my blog for problems"

## Troubleshooting

| Problem                                        | Fix                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm install -g` fails with EACCES             | Use pnpm or bun, or set an npm prefix in the user's home folder                |
| `citepo` not found right after installing      | Open a new shell, or check that the package manager's bin folder is on PATH    |
| The skill is not picked up                     | Start a new session; check the folder with `citepo skill status`               |
| `gh repo create` fails                         | `gh auth login`, or create the repository on github.com                        |
| Build fails on CitePo                          | Run `citepo check --json` and `citepo build --json` locally and fix the errors |
| Site is up but links to other posts are broken | If it is served under a sub path, run `citepo check --base-path <path>`        |
