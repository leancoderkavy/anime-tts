#!/usr/bin/env bash
# Compile Swift visual effects to native binaries.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts"
OUT="$ROOT/bin"

mkdir -p "$OUT"

build() {
  local name="$1"
  echo "→ Compiling $name"
  swiftc -O -o "$OUT/$name" "$SRC/$name.swift"
}

build flash
build border-glow
build sparkle
build attention-panel

echo "Done. Binaries → $OUT"
