#!/usr/bin/env sh
set -eu

BASE_REF="${1:-HEAD}"

git diff --name-status "$BASE_REF" -- \
  '*.java' \
  '*.kt' \
  '*.js' \
  '*.jsx' \
  '*.ts' \
  '*.tsx' \
  '*.py' \
  '*.go' \
  '*.cs' \
  '*.rb' \
  '*.php' \
  '*.yml' \
  '*.yaml' \
  '*.json' \
  '*.toml' \
  '*.properties' \
  '*.conf' \
  'pom.xml' \
  'build.gradle' \
  'build.gradle.kts' \
  'settings.gradle' \
  'settings.gradle.kts' \
  'package.json' \
  'package-lock.json' \
  'pnpm-lock.yaml' \
  'yarn.lock' \
  'requirements.txt' \
  'poetry.lock' \
  'pyproject.toml' \
  'go.mod' \
  'go.sum' \
  'Dockerfile*'
