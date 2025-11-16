# Release Checklist

**Version**: v0.1.0-rc.1 (Release Candidate)
**Date**: 2025-11-15
**Status**: ⚠️ **RELEASE CANDIDATE - Requires Manual Verification**

Use this checklist before tagging and releasing a new version. This release candidate requires manual verification before promoting to final v0.1.0 release.

---

## Pre-Release Verification

### Code Quality

- [ ] All tests passing (119 integration, 99 unit)
  ```bash
  bun run test:integration -- --run
  bun run test:unit -- --run
  ```

- [ ] Biome check passing
  ```bash
  bun run check:dry
  ```

- [ ] No TypeScript errors
  ```bash
  bunx tsc --noEmit
  ```

### Development Environment

- [ ] Development environment working
  ```bash
  bun run start
  # Verify: http://localhost:3000 loads
  # Verify: Can login with test user
  ```

- [ ] Devcontainer working (fast setup < 60s)
  - Open in devcontainer
  - Verify fast setup completes
  - Verify `bun run start` works

### Documentation

- [ ] CHANGELOG.md updated with release notes
- [ ] Version bumped in package.json files
  ```bash
  grep -r '"version": "0.1.0"' package.json ProjectSourceCode/package.json
  ```
- [ ] README.md has quick start section
- [ ] All documentation files updated (if needed)

### Configuration

- [ ] Doppler configured for production
  - Supabase credentials in Doppler
  - CSRF_SECRET set in Doppler
  - Service token created for Render.com

- [ ] Render.com blueprint tested
  - `render.yaml` verified
  - Health check endpoint configured
  - Environment variables documented

### Security

- [ ] CSRF protection verified
  - All forms include CSRF tokens
  - API requests include CSRF tokens
  - CSRF errors handled correctly

- [ ] Security features documented
  - `docs/dev/.devOps/SECURITY.md` created
  - All security features listed
  - Known limitations documented

### Production Readiness

- [ ] Health check endpoint working
  ```bash
  curl http://localhost:3000/api/health
  # Should return: {"ok": true}
  ```

- [ ] Production build successful
  ```bash
  bun run build
  # Verify: dist/ directory created
  ```

- [ ] Production start command works
  ```bash
  NODE_ENV=production bun ProjectSourceCode/src/index.ts
  # Verify: Server starts without errors
  ```

---

## Release Steps

### 1. Final Verification

Run complete verification:
```bash
bun run validate:all
```

### 2. Create Release Branch

```bash
git checkout -b release/v0.1.0
git push origin release/v0.1.0
```

### 3. Create Release Tag

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

### 4. Create GitHub Release

- Go to GitHub → Releases → Draft new release
- Tag: `v0.1.0`
- Title: `v0.1.0`
- Description: Copy from CHANGELOG.md
- Mark as "Latest release"

### 5. Deploy to Production

- Render.com will auto-deploy from tag (if configured)
- Or manually trigger deployment
- Verify deployment successful
- Test production endpoint

### 6. Post-Release

- [ ] Update implementation-status.md
- [ ] Announce release (if applicable)
- [ ] Monitor production logs
- [ ] Verify health check endpoint

---

## Rollback Procedure

If release has issues:

1. **Revert Tag**:
   ```bash
   git tag -d v0.1.0
   git push origin :refs/tags/v0.1.0
   ```

2. **Revert Code**:
   ```bash
   git revert <commit-hash>
   git push
   ```

3. **Rollback Deployment**:
   - Render.com dashboard → Deploys → Rollback

---

## Verification Commands Summary

```bash
# Tests
bun run test:integration -- --run
bun run test:unit -- --run

# Code Quality
bun run check:dry
bunx tsc --noEmit

# Development
bun run start
curl http://localhost:3000/api/health

# Production Build
bun run build
NODE_ENV=production bun ProjectSourceCode/src/index.ts

# Version Check
grep '"version"' package.json ProjectSourceCode/package.json
```

---

## Notes

- All checks must pass before release
- If any check fails, fix issues before proceeding
- Document any known issues in release notes
- Keep release notes concise and user-focused

---

[↑ Back to top](#release-checklist)

