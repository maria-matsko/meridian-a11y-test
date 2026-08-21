#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Meridian Theme — Shared Deploy Functions
# ═══════════════════════════════════════════════════════════════
#
# Sourced by deploy.sh and deploy-sandbox.sh.
# Do not execute directly.
#
# ═══════════════════════════════════════════════════════════════

# Resolve SCRIPT_DIR from the caller's location, not this file's
SCRIPT_DIR="${SCRIPT_DIR:-$(cd "$(dirname "$0")" && pwd)}"
THEME_DIR="/usr/local/cpanel/base/frontend/meridian"

# Files that should never be deployed into the theme
RSYNC_EXCLUDES=(
    --exclude='deploy.sh'
    --exclude='deploy-sandbox.sh'
    --exclude='deploy-common.sh'
    --exclude='.DS_Store'
    --exclude='*.swp'
)

print_banner() {
    local subtitle="$1"
    shift
    echo "═══════════════════════════════════════════════════"
    echo " Meridian Theme → ${subtitle}"
    echo "═══════════════════════════════════════════════════"
    echo ""
    # Print each detail line passed as remaining arguments
    while [[ $# -gt 0 ]]; do
        echo " $1"
        shift
    done
    echo ""
}

print_success() {
    local host="$1"
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo " ✓ Deployed successfully"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo " The Meridian theme is now installed at:"
    echo "   ${THEME_DIR}"
    echo ""
    echo " To activate:"
    echo "   1. Log into WHM at https://${host}:2087"
    echo "   2. Go to Server Configuration > Tweak Settings"
    echo "   3. Set 'Default cPanel theme' to 'meridian'"
    echo "   — or —"
    echo "   Set per-account via WHM > List Accounts > Edit > Theme"
    echo ""
    echo " Once active, access any cPanel account:"
    echo "   https://${host}:2083/cpsessTOKEN/frontend/meridian/index/"
    echo ""
    echo " Pages:"
    echo "   index/        — Dashboard"
    echo "   websites/     — Websites"
    echo "   email/        — Email"
    echo "   files/        — Files"
    echo "   databases/    — Databases"
    echo "   security/     — Security"
    echo "   onboarding/   — Get Started"
    echo "   profile/      — Profile & Settings"
    echo ""
}

set_theme_permissions() {
    find "${THEME_DIR}" -type f -exec chmod 644 {} +
    find "${THEME_DIR}" -type d -exec chmod 755 {} +
    chown -R root:root "${THEME_DIR}"
}

rebuild_theme_cache() {
    /usr/local/cpanel/bin/rebuild_sprites 2>/dev/null || true
}
