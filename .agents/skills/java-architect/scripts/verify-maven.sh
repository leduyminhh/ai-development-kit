#!/usr/bin/env sh
set -eu

if [ -x "./mvnw" ]; then
  MVN="./mvnw"
else
  MVN="mvn"
fi

if [ "$#" -gt 0 ]; then
  exec "$MVN" "$@"
fi

exec "$MVN" test
