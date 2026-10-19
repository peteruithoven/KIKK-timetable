#!/bin/bash
# Installs dependencies in Claude Code cloud sessions (claude.ai/code, the Claude app).
# Runs as a SessionStart hook, see .claude/settings.json. Does nothing locally.

[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 1

# Use the pnpm version from devEngines, older preinstalled versions ignore it. npx runs
# outside the project, where devEngines would stop it. postinstall runs `nuxt prepare`.
# Hooks have no TTY, CI keeps pnpm from asking questions. Like `vp install` locally, skip
# the ignored build scripts (esbuild, core-js) without failing, and leave the lockfile alone.
pnpm_version=$(node -p 'require("./package.json").devEngines.packageManager.version') || exit 1
(cd "$HOME" && CI=true npx --yes "pnpm@$pnpm_version" --dir "$CLAUDE_PROJECT_DIR" install \
  --config.strict-dep-builds=false --config.pm-on-fail=ignore) || exit 1

# There's no global Vite+ CLI there, use the project's own `vp`.
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "export PATH=\"$CLAUDE_PROJECT_DIR/node_modules/.bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi
