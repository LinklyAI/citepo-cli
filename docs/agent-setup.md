# Set up CitePo with an AI agent

**For people:** send this one line to your AI agent (Claude Code, Codex, OpenClaw, Cursor,
or any agent that can run commands):

```
Set up CitePo for me: https://citepo.com/agent-setup.md
```

New to CitePo? The agent installs the `citepo` CLI and its skill, creates your blog, writes
the first post with you, and gets it published. Already have a CitePo blog? Say so: the
agent signs you in, brings your blog onto this computer, and from then on writes and
publishes posts for you.

You will be asked to approve installs, to approve the CitePo sign-in in your browser, and,
the first time, to allow access on GitHub.

---

## To the AI agent

### Task

Set up the user's CitePo blog on this machine, so that from now on you can write and
publish posts for them.

Done when:

1. `citepo doctor --json` reports `ready: true` with the latest CLI.
2. The citepo skill is installed for you (`citepo skill status --json`).
3. You are in the blog's folder, it is connected to the user's CitePo site, and
   `citepo check --json` reports no errors.
4. The user has the published URL — or, if they stop earlier, they know exactly what is left.

### Rules

- The user may not be a programmer. Talk in plain words, never ask them to run a command
  or edit a file, and tell them only what to open or click, and why.
- Ask before installing anything or creating anything outside the current folder.
- Run citepo commands with `--json` and read the result. On `"ok": false`, follow
  `error.hint`. Never wait on an interactive prompt: pass flags (`--yes`).
- Verify each step with its check before moving on. Never report a step as done without
  that check.
- Install the skill only for yourself (`--agent <your app>`), not for every app.
- Never create a second blog or site for a user who already has one: find theirs (Step 3).
- Pushing to GitHub publishes a connected blog. Push only content the user has seen and
  approved.

### Step 0: Check the current state

```bash
citepo --version && citepo doctor --json
```

| What you see                                            | Go to  |
| ------------------------------------------------------- | ------ |
| `citepo: command not found`                             | Step 1 |
| `unknown command 'doctor'` (a CLI older than 0.2.0)     | Step 1 |
| `citepo` check says a newer version is available        | Step 1 |
| `citepo skill status --json` does not list your app     | Step 2 |
| `project` check is `ok` (you are in a blog folder)      | Step 3 |
| `project` check is `warn` (no blog.json in this folder) | Step 3 |

If `node` fails, the user needs Node.js 20 or newer first (https://nodejs.org); ask them to
install it and tell you when it is done. If `git` fails, run `git --version`: on macOS it
offers to install the developer tools; ask the user to click Install and tell you when it
finishes.

Check the skill for your own app with `citepo skill status --json` (its `installed` list):
the `skill` check in `doctor` is `ok` when any app has it.

### Step 1: Install or update the CLI

Ask the user, then:

```bash
npm install -g citepo@latest     # or: pnpm add -g citepo@latest / bun add -g citepo@latest
```

On CLI 0.2.0 or newer, `citepo upgrade --json` does the same with the package manager that
installed it.

Check: `citepo doctor --json` runs and its `citepo` check no longer offers a newer version.

### Step 2: Install the skill

```bash
citepo skill install --agent <claude-code | codex | openclaw | cursor | opencode | gemini> --json
```

If an older copy is installed, use `citepo skill update --json`. For another app, use
`--dir <its skills folder>`. The skill loads in your next session; for the rest of this setup,
read it directly: `citepo docs` lists the references.

Check: `citepo skill status --json` lists your app (with `--dir`: `<dir>/citepo/SKILL.md`
exists; `skill status` does not look there).

### Step 3: New blog or existing blog?

- **You are in a blog folder** (`project` is `ok`): this is an existing blog on this computer.
  Go to Step E1.
- **Otherwise, ask the user:** "Do you already have a CitePo blog (on citepo.app or your own
  domain)?"
  - Yes → Step E1.
  - No → Step N1.

---

### Existing blog

#### Step E1: Sign in to CitePo

If `citepo auth status --json` shows `signedIn: true`, ask the user whether that email is
their CitePo account; if so, skip to Step E2. Otherwise:

```bash
citepo auth login --no-wait --json
```

Send the user the `url` and `code` from the result: they open the link on any device, check
that the page shows the same code, and approve. Then:

```bash
citepo auth login --wait --json        # run again on login_timeout
```

Check: `citepo auth status --json` shows the user's email.

#### Step E2: Find their site

```bash
citepo site list --json
```

- In a blog folder already: compare each site's `repo.fullName` with this folder's GitHub
  remote (`git remote get-url origin`). A match is this blog's site: go to Step E4.
- One site: that is theirs. Several: show their names and addresses and ask which one.
- No sites: they have no blog on this account. Ask whether they signed up with another
  email (sign out with `citepo auth logout` and repeat E1), or go to Step N1.

Note the site's `slug` and `repo.fullName`.

#### Step E3: Bring the blog onto this computer

If the site has no repository (`repo` is null), connect a blog to it instead of creating a
new site:

- In a blog folder with a GitHub remote: `citepo site connect --site <slug> --json`.
- In a blog folder without a remote: Step N3 first, then connect as above.
- Not in a blog folder: Steps N1 to N3, then connect as above.

Handle `github_not_linked` / `app_not_installed` as in Step N4, run `citepo deploy wait --json`,
then go to Step 5.

Otherwise get a copy of its repository. First ask whether the blog's folder is already on
this computer; if the user does not know, assume it is not. To download it:

```bash
gh auth status
```

If gh is not signed in, sign in as described in "Signing in to GitHub" below (with the
account that owns the repository). Then suggest a folder (for example `~/CitePo/<slug>`),
ask, and:

```bash
gh repo clone <repo.fullName> <folder>
cd <folder>
```

Without the GitHub CLI, ask the user before installing it (https://cli.github.com).

Check: in the folder, `citepo site status --json` returns the site with this `repo.fullName`
(with one site in the account it returns that site even when nothing matches, so compare).

#### Step E4: Check the blog

```bash
citepo check --json
```

Blogs made with older versions may report problems the new CLI checks for. Fix the errors
(`error.hint` and `citepo docs` say how), tell the user in one or two sentences what you
changed, and push only after they agree:

```bash
git add -A && git commit -m "Fix issues found by citepo check" && git push
citepo deploy wait --json
```

Check: `citepo check --json` reports no errors. Then go to Step 5.

---

### New blog

#### Step N1: Create the blog

Ask the user for the blog name, the language (and any extra languages), and the theme
(`clean`: black and white; `wabi`: warm reading theme). Suggest a folder name. Then:

```bash
citepo init <folder> --name "<Blog name>" --lang en --theme clean --yes --json
# extra languages: --langs zh,ja
cd <folder>
```

Check: `citepo check --json` reports `passed: true`.

#### Step N2: Write the first post with the user

1. Ask what the first post is about; draft it together.
2. `citepo post new "<Title>" --description "<1–2 sentences>" --tags <tags> --json`, then
   write the body into the returned file. `citepo docs components` shows the available
   components. Add images with `citepo image add <file> --post <slug> --alt "<text>" --json`.
3. Remove the sample posts (`hello-world`, `why-choose-citepo-to-build-blog`) if the user
   does not want them.
4. Optional: `citepo dev` and ask the user to look at http://localhost:4321 (it keeps
   running; stop it afterwards).

Check: `citepo check --json` reports no errors.

#### Step N3: Put the blog on GitHub

```bash
git init -b main && git add -A && git commit -m "Create blog"
gh auth status          # if not signed in: see "Signing in to GitHub" below
gh repo create <name> --private --source . --push
```

Without the GitHub CLI, ask the user before installing it (https://cli.github.com), or ask
them to create an empty repository on github.com, then
`git remote add origin <url> && git push -u origin main`.

Check: `citepo doctor --json` shows the `repository` check as `ok`.

#### Step N4: Sign in to CitePo and publish

Sign in as in Step E1 (signing up first if they have no account). Then check
`citepo site list --json` before creating anything: if the account already has a site, ask the
user whether this blog is for it. If yes, connect to it with
`citepo site connect --site <slug> --json` instead of creating a new one. Otherwise:

```bash
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

---

### Step 5: Report

Tell the user, in plain words:

- that setup is done, and where the blog folder is
- the site address
- that the skill loads in a new session of this app
- how to continue, with three example requests, e.g. "Write a post about …",
  "Translate my latest post into Japanese", "Check my blog for problems"

For an existing blog, offer to write their next post now.

## Signing in to GitHub

`gh auth login` waits until the user approves, so run it in the background and read its
output:

```bash
gh auth login --web --git-protocol https --hostname github.com > ~/.citepo-gh-login.log 2>&1 &
sleep 3; cat ~/.citepo-gh-login.log
```

Send the user the one-time code and the github.com/login/device link from the log, and wait
until they say they approved. Then:

```bash
gh auth status && gh auth setup-git && rm -f ~/.citepo-gh-login.log
```

If the log shows no code, a browser window may have opened: ask the user to approve there.

## Writing and publishing a post later

When the user asks for a new post: `citepo post new …`, write it, `citepo check --json`, show
it to the user, and after they approve: commit, `git push`, then `citepo deploy wait --json`
and send them the post's URL. The skill has the details.

## Troubleshooting

| Problem                                                       | Fix                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm install -g` fails with EACCES                            | Use pnpm or bun, or set an npm prefix in the user's home folder                |
| `citepo` not found right after installing                     | Open a new shell, or check that the package manager's bin folder is on PATH    |
| pnpm: `ERR_PNPM_GLOBAL_BIN_DIR_NOT_IN_PATH`                   | Run `pnpm setup` yourself, then open a new shell                               |
| pnpm installs an older version than `npm view citepo version` | pnpm skips versions younger than a day: `pnpm add -g citepo@<version>`         |
| macOS asks to install "command line developer tools" for git  | Ask the user to click Install and tell you when it finishes                    |
| The skill is not picked up                                    | Start a new session; check the folder with `citepo skill status`               |
| `gh repo clone` or `gh repo create` fails                     | `gh auth login --web`; make sure the user signed in with the right account     |
| `site list` is empty but the user has a blog                  | They may use another email: `citepo auth logout`, then sign in again           |
| Build fails on CitePo                                         | Run `citepo check --json` and `citepo build --json` locally and fix the errors |
| Site is up but links to other posts are broken                | If it is served under a sub path, run `citepo check --base-path <path>`        |
