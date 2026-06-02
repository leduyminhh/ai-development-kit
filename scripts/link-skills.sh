#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
MANIFEST="${REPO_ROOT}/skills/manifest.toml"
LINK_NAME="codex-workflow-kit"
LINKED_SOURCE="skills"

manifest_value() {
  section="$1"
  key="$2"
  awk -v section="$section" -v key="$key" '
    /^\[/ { in_section = ($0 == "[" section "]") }
    in_section && $1 == key {
      value = $0
      sub("^[^=]+=[[:space:]]*", "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' "$MANIFEST"
}

if [ -f "$MANIFEST" ]; then
  configured_link_name=$(manifest_value "external_discovery" "link_name")
  configured_linked_source=$(manifest_value "external_discovery" "linked_source")
  if [ -n "$configured_link_name" ]; then LINK_NAME="$configured_link_name"; fi
  if [ -n "$configured_linked_source" ]; then LINKED_SOURCE="$configured_linked_source"; fi
fi

TARGET="${HOME}/.codex/skills/${LINK_NAME}"
SOURCE="${REPO_ROOT}/${LINKED_SOURCE}"

mkdir -p "$(dirname "$TARGET")"
rm -rf "$TARGET"
ln -s "$SOURCE" "$TARGET"
echo "Linked $TARGET -> $SOURCE"
