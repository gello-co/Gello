#!/usr/bin/env bash
set -euo pipefail

# Cleanup orphaned prerelease tags for the dev channel that are not reachable from the current HEAD
# Run this only on the dev branch and in CI before semantic-release to avoid duplicate prerelease calculations

channel_regex='^v[0-9]+\.[0-9]+\.[0-9]+-dev\.[0-9]+$'

echo "[tag-cleanup] Fetching tags..."
git fetch --tags --prune --force

# List tags not merged into current HEAD matching the dev prerelease pattern
mapfile -t orphan_tags < <(git tag --list | grep -E "$channel_regex" | xargs -r -I{} bash -lc 'git merge-base --is-ancestor {} HEAD && exit 1 || echo {}' || true)

if [[ ${#orphan_tags[@]} -eq 0 ]]; then
  echo "[tag-cleanup] No orphaned dev prerelease tags found."
  exit 0
fi

echo "[tag-cleanup] Orphaned dev prerelease tags not reachable from HEAD:" "${orphan_tags[@]}"

for tag in "${orphan_tags[@]}"; do
  echo "[tag-cleanup] Deleting remote tag $tag (if exists)"
  git push origin ":refs/tags/${tag}" || true
  echo "[tag-cleanup] Deleting local tag $tag"
  git tag -d "$tag" || true
  # Optionally delete the GitHub Release if gh CLI and token are available
  if command -v gh >/dev/null 2>&1; then
    echo "[tag-cleanup] Attempting to delete GitHub release for $tag (if exists)"
    GH_TOKEN=${GITHUB_TOKEN:-${GH_TOKEN:-}} gh release delete "$tag" -y || true
  fi
done

echo "[tag-cleanup] Done."
