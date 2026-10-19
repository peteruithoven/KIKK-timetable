#!/bin/bash
# Deploys origin/main when it changed since the last deploy. Runs every minute on the
# server (kikk-timetable-deploy.timer) and from `vp run server:deploy`.
# --force rebuilds even when nothing changed.
set -euo pipefail

deploy() {
  cd "$(dirname "$0")/.."
  git fetch --quiet origin main

  local target deployed
  target=$(git rev-parse origin/main)
  deployed=$(git rev-parse --quiet --verify refs/deployed || true)
  if [ "$target" = "$deployed" ] && [ "${1-}" != "--force" ]; then
    return
  fi

  echo "Deploying $(git log --oneline -1 "$target")"
  git merge --ff-only --quiet "$target"
  # Remember it before building, so a broken build isn't retried every minute.
  git update-ref refs/deployed "$target"
  docker compose up -d --build
}

# Bash reads scripts while running them and the merge can replace this file, so the
# whole file is parsed before anything runs.
deploy "$@"
exit
