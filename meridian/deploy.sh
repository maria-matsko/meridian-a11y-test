#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Meridian Theme — Deploy to cPanel Server
# ═══════════════════════════════════════════════════════════════
#
# Deploys Meridian as a standalone cPanel theme to a remote
# server at /usr/local/cpanel/base/frontend/meridian/.
#
# cPanel discovers themes by scanning /base/frontend/ — once
# deployed, Meridian appears in WHM > Themes and can be set as
# the active theme for any cPanel account.
#
# Uses rsync for a single connection (one password prompt).
#
# Usage:
#   ./deploy.sh user@hostname
#
# Example:
#   ./deploy.sh root@dev-cpanel.example.com
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

REMOTE="${1:?Usage: ./deploy.sh user@hostname}"

print_banner "Deploy" \
    "Target: ${REMOTE}" \
    "Remote path: ${THEME_DIR}"

echo "→ Uploading theme files..."
rsync -avz --delete \
    "${RSYNC_EXCLUDES[@]}" \
    "${SCRIPT_DIR}/" "${REMOTE}:${THEME_DIR}/"

echo ""
echo "→ Setting permissions and ownership..."
ssh "${REMOTE}" "$(declare -f set_theme_permissions); THEME_DIR='${THEME_DIR}'; set_theme_permissions"

echo ""
echo "→ Rebuilding theme cache..."
ssh "${REMOTE}" "/usr/local/cpanel/bin/rebuild_sprites 2>/dev/null || true"

# Extract hostname from user@hostname for the success message
REMOTE_HOST="${REMOTE#*@}"
print_success "${REMOTE_HOST}"
