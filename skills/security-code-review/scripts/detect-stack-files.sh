#!/usr/bin/env sh
set -eu

check() {
  if [ -e "$1" ]; then
    printf '%s\n' "$2"
  fi
}

check "pom.xml" "java:maven"
check "build.gradle" "java:gradle"
check "build.gradle.kts" "java:gradle-kts"
check "package.json" "node:package-json"
check "pnpm-lock.yaml" "node:pnpm"
check "yarn.lock" "node:yarn"
check "requirements.txt" "python:requirements"
check "pyproject.toml" "python:pyproject"
check "go.mod" "go:module"
check "Dockerfile" "container:dockerfile"
check ".github/workflows" "ci:github-actions"
check ".gitlab-ci.yml" "ci:gitlab"
check "src/main/resources/application.yml" "spring:application-yml"
check "src/main/resources/application.yaml" "spring:application-yaml"
check "src/main/resources/application.properties" "spring:application-properties"
