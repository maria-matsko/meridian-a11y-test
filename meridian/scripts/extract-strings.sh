#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Meridian — Extract Translatable Strings
# ═══════════════════════════════════════════════════════════════
#
# Scans source files for t('...') i18n function calls and outputs
# a sorted, deduplicated list of all translatable strings.
#
# Usage:
#   ./extract-strings.sh                  # list all strings
#   ./extract-strings.sh --json           # output as JSON skeleton
#   ./extract-strings.sh --diff es        # show untranslated strings for a locale
#   ./extract-strings.sh --count          # count total strings
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
THEME_DIR="$(dirname "$SCRIPT_DIR")"

# Extract t('...') calls — must be preceded by word boundary or start of expression
# Matches: t('string'), _t('string'), window.t('string')
# Excludes: .split(', .filter(', CSS selectors, template vars
extract_strings() {
  find "$THEME_DIR" \( -name "*.tt" -o -name "*.js" \) \
    -not -path "*/locale/*" -not -path "*/scripts/*" -not -path "*/node_modules/*" -print0 \
    | xargs -0 cat \
    | grep -oE "(^|[^a-zA-Z.])_?t\('[A-Z{][^']{2,}'" \
    | sed "s/.*t('//;s/'$//" \
    | sort -u
}

case "${1:-}" in
  --json)
    echo "{"
    extract_strings | while IFS= read -r str; do
      printf '  "%s": "",\n' "$str"
    done | sed '$ s/,$//'
    echo "}"
    ;;
  --diff)
    LOCALE="${2:?Usage: extract-strings.sh --diff <locale_tag>}"
    LOCALE_FILE="$THEME_DIR/_assets/locale/$LOCALE.json"
    if [ ! -f "$LOCALE_FILE" ]; then
      echo "Error: $LOCALE_FILE not found" >&2
      exit 1
    fi
    echo "=== Strings missing from $LOCALE.json ==="
    extract_strings | while IFS= read -r str; do
      if ! grep -qF "\"$str\"" "$LOCALE_FILE"; then
        echo "  $str"
      fi
    done
    echo ""
    echo "=== Orphaned keys in $LOCALE.json (no longer in source) ==="
    grep -o '"[^"]*":' "$LOCALE_FILE" | sed 's/"//g;s/:$//' | while IFS= read -r key; do
      if ! extract_strings | grep -qxF "$key"; then
        echo "  $key"
      fi
    done
    ;;
  --count)
    COUNT=$(extract_strings | wc -l | tr -d ' ')
    echo "$COUNT translatable strings found"
    ;;
  *)
    extract_strings
    ;;
esac
