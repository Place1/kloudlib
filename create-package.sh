#!/bin/bash
set -e

export PACKAGE_NAME="$1"
export PACKAGE_PATH="./packages/$PACKAGE_NAME"

if [[ -z "$PACKAGE_NAME" ]]; then
  echo "USAGE: $0 <package-name>"
  exit 1
fi

mkdir $PACKAGE_PATH 2> /dev/null || true

for file in ./template/*; do
  cat $file | envsubst > $PACKAGE_PATH/$(basename -- "$file")
done

echo "package created at './packages/$PACKAGE_NAME'"
