#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Meridian Theme — Deploy to Local Sandbox
# ═══════════════════════════════════════════════════════════════
#
# Deploys Meridian as a standalone cPanel theme locally to:
#   /usr/local/cpanel/base/frontend/meridian/
#
# Unlike deploy.sh (which targets a remote server via SSH/rsync),
# this script copies files directly on the local machine — ideal
# for iterating on a development sandbox.
#
# Usage:
#   ./deploy-sandbox.sh            # prompts for confirmation
#   ./deploy-sandbox.sh --force    # skip confirmation
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=deploy-common.sh
source "${SCRIPT_DIR}/deploy-common.sh"

FORCE=0

for arg in "$@"; do
    case "$arg" in
        --force|-f) FORCE=1 ;;
        --help|-h)
            echo "Usage: ./deploy-sandbox.sh [--force]"
            echo ""
            echo "Deploys the Meridian theme to the local sandbox at:"
            echo "  ${THEME_DIR}"
            echo ""
            echo "Options:"
            echo "  --force, -f   Skip confirmation prompt"
            echo "  --help, -h    Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg" >&2
            echo "Usage: ./deploy-sandbox.sh [--force]" >&2
            exit 1
            ;;
    esac
done

print_banner "Local Sandbox Deploy" \
    "Source: ${SCRIPT_DIR}" \
    "Target: ${THEME_DIR}"

# Verify we're on a cPanel system
if [[ ! -d /usr/local/cpanel/base/frontend ]]; then
    echo "ERROR: /usr/local/cpanel/base/frontend/ does not exist." >&2
    echo "       This script must be run on a cPanel server." >&2
    exit 1
fi

# Confirm unless --force
if [[ "${FORCE}" -eq 0 ]]; then
    if [[ -d "${THEME_DIR}" ]]; then
        echo " ⚠  ${THEME_DIR} already exists and will be overwritten."
        echo ""
    fi
    read -rp " Deploy now? [y/N] " confirm
    if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
        echo " Aborted."
        exit 0
    fi
    echo ""
fi

echo "→ Syncing theme files..."
mkdir -p "${THEME_DIR}"
rsync -av --delete \
    "${RSYNC_EXCLUDES[@]}" \
    "${SCRIPT_DIR}/" "${THEME_DIR}/"

echo ""
echo "→ Setting permissions and ownership..."
set_theme_permissions

echo ""
echo "→ Rebuilding theme cache..."
rebuild_theme_cache

print_success "$(hostname)"
