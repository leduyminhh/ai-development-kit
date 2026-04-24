#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
TARGET="${HOME}/.codex/skills/codex-workflow-kit"

mkdir -p "$(dirname "$TARGET")"
rm -rf "$TARGET"
ln -s "$REPO_ROOT/.agents/skills" "$TARGET"
echo "Linked $TARGET -> $REPO_ROOT/.agents/skills"
