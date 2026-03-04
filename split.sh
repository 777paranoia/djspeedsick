#!/usr/bin/env bash

INPUT="$1"

if [ -z "$INPUT" ]; then
  echo "usage: split_code.sh compiled-output.txt"
  exit 1
fi

current_file=""

while IFS= read -r line; do

  if [[ "$line" =~ ^[[:space:]]*//[[:space:]]*=====[[:space:]]*(.*)[[:space:]]*=====[[:space:]]*$ ]]; then
      current_file="${BASH_REMATCH[1]}"

      dir=$(dirname "$current_file")
      mkdir -p "$dir"

      : > "$current_file"
      continue
  fi

  if [ -n "$current_file" ]; then
      printf "%s\n" "$line" >> "$current_file"
  fi

done < "$INPUT"
