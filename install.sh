#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="${REPO_OWNER:-pirabyte}"
REPO_NAME="${REPO_NAME:-outline-cli}"
VERSION="${VERSION:-latest}"
INSTALL_MODE="user"
BIN_DIR="${BIN_DIR:-}"
VERIFY_CHECKSUMS=1

usage() {
  cat <<'EOF'
Install outline-cli on Debian/Ubuntu Linux.

Usage:
  ./install.sh [options]

Options:
  --version vX.Y.Z   Install a specific version tag (default: latest)
  --system           Install to /usr/local/bin (may require sudo)
  --bin-dir PATH     Install to a custom bin directory
  --repo OWNER/NAME  Override GitHub repo (default: pirabyte/outline-cli)
  --no-verify        Skip SHA256 checksum verification
  --help             Show this help

Examples:
  ./install.sh
  ./install.sh --version v0.1.1
  ./install.sh --system
EOF
}

log() {
  printf '%s\n' "$*" >&2
}

die() {
  log "Error: $*"
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || die "--version requires a value"
      VERSION="$2"
      shift 2
      ;;
    --system)
      INSTALL_MODE="system"
      shift
      ;;
    --bin-dir)
      [[ $# -ge 2 ]] || die "--bin-dir requires a value"
      BIN_DIR="$2"
      shift 2
      ;;
    --repo)
      [[ $# -ge 2 ]] || die "--repo requires OWNER/NAME"
      REPO_OWNER="${2%%/*}"
      REPO_NAME="${2##*/}"
      [[ -n "$REPO_OWNER" && -n "$REPO_NAME" && "$REPO_OWNER" != "$REPO_NAME" ]] || die "Invalid --repo format (expected OWNER/NAME)"
      shift 2
      ;;
    --no-verify)
      VERIFY_CHECKSUMS=0
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "Unknown option: $1"
      ;;
  esac
done

need_cmd curl
need_cmd tar
need_cmd mktemp

if [[ $VERIFY_CHECKSUMS -eq 1 ]]; then
  need_cmd sha256sum
fi

detect_distro() {
  local distro=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    distro="${ID:-}"
  fi
  case "$distro" in
    debian|ubuntu) printf '%s\n' "$distro" ;;
    *)
      die "This installer currently targets Debian/Ubuntu. Detected: ${distro:-unknown}"
      ;;
  esac
}

detect_arch() {
  local raw=""
  if command -v dpkg >/dev/null 2>&1; then
    raw="$(dpkg --print-architecture 2>/dev/null || true)"
  fi
  if [[ -z "$raw" ]]; then
    raw="$(uname -m)"
  fi

  case "$raw" in
    amd64|x86_64) printf '%s\n' "x64" ;;
    arm64|aarch64) printf '%s\n' "arm64" ;;
    *)
      die "Unsupported architecture: $raw (supported: amd64/x86_64, arm64/aarch64)"
      ;;
  esac
}

resolve_version() {
  if [[ "$VERSION" != "latest" ]]; then
    printf '%s\n' "$VERSION"
    return
  fi

  local url="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"
  local tag
  tag="$(curl -fsSL "$url" | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
  [[ -n "$tag" ]] || die "Failed to resolve latest release tag from GitHub"
  printf '%s\n' "$tag"
}

DISTRO="$(detect_distro)"
ARCH="$(detect_arch)"
TAG="$(resolve_version)"

if [[ -z "$BIN_DIR" ]]; then
  if [[ "$INSTALL_MODE" == "system" ]]; then
    BIN_DIR="/usr/local/bin"
  else
    BIN_DIR="${HOME}/.local/bin"
  fi
fi

ASSET="outline-linux-${ARCH}.tar.gz"
BASE_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${TAG}"
ASSET_URL="${BASE_URL}/${ASSET}"
SUMS_URL="${BASE_URL}/SHA256SUMS.txt"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

log "Detected distro: $DISTRO"
log "Detected architecture: $ARCH"
log "Installing ${REPO_OWNER}/${REPO_NAME} ${TAG}"
log "Target bin dir: $BIN_DIR"

log "Downloading ${ASSET}..."
if ! curl -fL --retry 3 --connect-timeout 10 -o "${TMP_DIR}/${ASSET}" "$ASSET_URL"; then
  if [[ "$ARCH" == "arm64" ]]; then
    die "No Linux arm64 release asset found (${ASSET}). Publish outline-linux-arm64.tar.gz first."
  fi
  die "Failed to download release asset: $ASSET_URL"
fi

if [[ $VERIFY_CHECKSUMS -eq 1 ]]; then
  log "Downloading checksums..."
  curl -fL --retry 3 --connect-timeout 10 -o "${TMP_DIR}/SHA256SUMS.txt" "$SUMS_URL"
  (
    cd "$TMP_DIR"
    grep " ${ASSET}\$" SHA256SUMS.txt >/dev/null || die "Checksum entry for ${ASSET} not found"
    sha256sum -c <(grep " ${ASSET}\$" SHA256SUMS.txt)
  )
fi

log "Extracting..."
tar -xzf "${TMP_DIR}/${ASSET}" -C "$TMP_DIR"
[[ -f "${TMP_DIR}/outline" ]] || die "Archive did not contain expected 'outline' binary"
chmod +x "${TMP_DIR}/outline"

if [[ "$INSTALL_MODE" == "system" ]]; then
  if [[ ! -d "$BIN_DIR" ]]; then
    if command -v sudo >/dev/null 2>&1; then
      sudo mkdir -p "$BIN_DIR"
    else
      mkdir -p "$BIN_DIR"
    fi
  fi

  if [[ -w "$BIN_DIR" ]]; then
    install -m 0755 "${TMP_DIR}/outline" "${BIN_DIR}/outline"
  elif command -v sudo >/dev/null 2>&1; then
    sudo install -m 0755 "${TMP_DIR}/outline" "${BIN_DIR}/outline"
  else
    die "No write access to ${BIN_DIR} and sudo not available"
  fi
else
  mkdir -p "$BIN_DIR"
  install -m 0755 "${TMP_DIR}/outline" "${BIN_DIR}/outline"
fi

log "Installed outline to ${BIN_DIR}/outline"
if ! command -v outline >/dev/null 2>&1; then
  log "Note: ${BIN_DIR} may not be on PATH yet."
  if [[ "$BIN_DIR" == "${HOME}/.local/bin" ]]; then
    log "Add this to your shell config if needed: export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi
fi

log "Done. Try: outline help"
