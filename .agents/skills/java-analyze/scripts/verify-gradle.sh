#!/usr/bin/env sh
set -eu

if [ -x "./gradlew" ]; then
  GRADLE="./gradlew"
else
  GRADLE="gradle"
fi

if [ "$#" -gt 0 ]; then
  exec "$GRADLE" "$@"
fi

exec "$GRADLE" test
