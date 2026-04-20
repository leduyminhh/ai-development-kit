#!/usr/bin/env sh
set -eu

BASE_REF="${1:-HEAD}"

git diff --name-status "$BASE_REF" -- \
  '*.java' \
  '*.kt' \
  '*.xml' \
  '*.sql' \
  '*.yml' \
  '*.yaml' \
  'pom.xml' \
  'build.gradle' \
  'build.gradle.kts' \
  'settings.gradle' \
  'settings.gradle.kts'
