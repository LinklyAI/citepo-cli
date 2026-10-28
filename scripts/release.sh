#!/bin/bash
# release.sh - Interactive release script for the citepo CLI
# Bumps the version in package.json, commits, tags and pushes. The pushed tag triggers
# .github/workflows/package-runtime.yml, which publishes to npm and uploads the runtime to R2.
# Usage: pnpm release

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

CURRENT_VERSION=""
NEW_VERSION=""

print_success() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

check_workdir() {
  echo -e "${BOLD}Step 1: Check${NC}"

  if [[ -n $(git status -s) ]]; then
    print_error "Working directory has uncommitted changes"
    git status -s
    exit 1
  fi
  print_success "Working directory clean"

  local branch
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$branch" != "main" ]]; then
    print_error "Releases are made from main (current branch: $branch)"
    exit 1
  fi

  git fetch --quiet origin main --tags
  if [[ $(git rev-parse HEAD) != $(git rev-parse origin/main) ]]; then
    print_error "Local main differs from origin/main; pull or push first"
    exit 1
  fi
  print_success "In sync with origin/main"

  CURRENT_VERSION=$(node -p "require('./package.json').version")
  print_success "Current version: $CURRENT_VERSION"
  echo ""
}

select_version() {
  echo -e "${BOLD}Step 2: Select Version${NC}"

  IFS='.' read -r major minor patch <<< "$CURRENT_VERSION"
  local patch_ver="$major.$minor.$((patch + 1))"
  local minor_ver="$major.$((minor + 1)).0"
  local major_ver="$((major + 1)).0.0"

  echo "  1) patch  -> $patch_ver"
  echo "  2) minor  -> $minor_ver"
  echo "  3) major  -> $major_ver"
  echo ""
  read -r -p "Select [1-3]: " choice

  case "$choice" in
    1) NEW_VERSION="$patch_ver" ;;
    2) NEW_VERSION="$minor_ver" ;;
    3) NEW_VERSION="$major_ver" ;;
    *) print_error "Invalid choice"; exit 1 ;;
  esac

  if git rev-parse -q --verify "refs/tags/v$NEW_VERSION" > /dev/null; then
    print_error "Tag v$NEW_VERSION already exists"
    exit 1
  fi

  print_success "Selected: $CURRENT_VERSION -> $NEW_VERSION"
  echo ""
}

show_changes() {
  echo -e "${BOLD}Step 3: Changes${NC}"

  local last_tag notes
  last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

  if [ -n "$last_tag" ]; then
    notes=$(git log "${last_tag}..HEAD" --pretty=format:"- %s" --no-merges)
    echo "Since $last_tag:"
  else
    notes=$(git log --pretty=format:"- %s" --no-merges -10)
    echo "Recent commits:"
  fi

  if [ -z "$notes" ]; then
    echo -e "  ${DIM}(no commits since last tag)${NC}"
  else
    echo "$notes" | head -15
  fi
  echo ""

  echo "  1) Continue"
  echo "  2) Abort"
  read -r -p "Select [1-2]: " choice
  if [[ "$choice" == "2" ]]; then
    echo "Aborted."
    exit 0
  fi
  echo ""
}

run_checks() {
  echo -e "${BOLD}Step 4: Checks${NC}"
  # Same checks as CI, so a broken release fails here instead of after the tag is pushed
  pnpm typecheck
  pnpm test
  print_success "Typecheck and tests passed"
  echo ""
}

update_version() {
  # Rewrite package.json with the same 2-space formatting it already uses
  node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    pkg.version = process.argv[1];
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  ' "$NEW_VERSION"
}

confirm_and_execute() {
  echo -e "${BOLD}Step 5: Confirm${NC}"
  echo -e "  Version: $CURRENT_VERSION -> ${BOLD}$NEW_VERSION${NC}"
  echo "  Tag:     v$NEW_VERSION"
  echo "  Files:   package.json"
  echo "  Action:  Commit, tag, push to origin -> CI publishes to npm and R2"
  echo ""

  read -r -p "Type 'yes' to release: " response
  if [[ "$response" != "yes" ]]; then
    echo "Cancelled."
    exit 0
  fi

  echo ""
  echo -n "Updating version... "
  update_version
  echo -e "${GREEN}OK${NC}"

  echo -n "Committing and tagging... "
  git add package.json
  git commit -m "chore: release v$NEW_VERSION" > /dev/null
  git tag "v$NEW_VERSION"
  echo -e "${GREEN}OK${NC}"

  echo -n "Pushing main... "
  if ! git push origin main 2>&1; then
    echo -e "${RED}FAILED${NC}"
    echo ""
    echo "Manual recovery:"
    echo "  git push origin main"
    echo "  git push origin v$NEW_VERSION"
    exit 1
  fi
  echo -e "${GREEN}OK${NC}"

  echo -n "Pushing tag (triggers CI/CD)... "
  if ! git push origin "v$NEW_VERSION" 2>&1; then
    echo -e "${RED}FAILED${NC}"
    echo ""
    echo "Manual recovery:"
    echo "  git push origin v$NEW_VERSION"
    exit 1
  fi
  echo -e "${GREEN}OK${NC}"

  echo ""
  echo -e "${GREEN}Released v$NEW_VERSION${NC}"
  echo -e "${DIM}CI publishes to npm and uploads the runtime package to R2.${NC}"
  echo -e "${DIM}Hosted builds keep using the old runtime until CITEPO_CLI_VERSION in citepo-worker is updated.${NC}"
}

echo ""
echo -e "${BOLD}citepo CLI Release${NC}"
echo "──────────────────"
echo ""

check_workdir
select_version
show_changes
run_checks
confirm_and_execute
