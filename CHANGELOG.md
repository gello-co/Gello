# [0.1.0-rc.1](https://github.com/gello-co/Gello/compare/v1.0.0-dev.2...v0.1.0-rc.1) (2025-11-15)

**⚠️ Release Candidate - Requires Manual Verification**

This is a release candidate for v0.1.0. Manual verification is required before promoting to final release.

## Features

* **Complete API Implementation**: All 8 API domains implemented (auth, teams, boards, lists, tasks, points, leaderboard, views)
* **Development Environment**: One-command startup (`bun run start`) that starts Supabase, seeds database, and runs dev server
* **Devcontainer Support**: Fully self-contained development environment with fast setup (< 60 seconds)
* **Database Seeding**: Idempotent seed script creates test users and sample data
* **CSRF Protection**: Migrated from deprecated csurf to csrf-csrf with Double Submit Cookie Pattern
* **Comprehensive Testing**: 119 integration tests and 99 unit tests, all passing

## Security

* **CSRF Migration**: Upgraded from deprecated csurf to csrf-csrf library (security improvement)
* **Double Submit Cookie Pattern**: Enhanced CSRF protection implementation
* **Input Validation**: Zod schemas validate all API inputs
* **Rate Limiting**: Applied to all `/api/*` routes
* **Security Headers**: Helmet middleware configured with CSP

## Testing

* **Integration Tests**: 119/119 passing (100% pass rate)
* **Unit Tests**: 99/99 passing (100% pass rate)
* **CSRF Token Handling**: All state-changing requests properly include CSRF tokens
* **Test Helpers**: Reusable helpers for authentication and CSRF token management

## Documentation

* **Setup Guide**: Complete environment setup documentation in `docs/dev/.devOps/setup.md`
* **Runbook**: Essential commands documented in `docs/dev/.devOps/RUNBOOK.md`
* **Devcontainer Guide**: Detailed devcontainer documentation with configuration options

## Bug Fixes

* Fixed CSRF token validation in integration tests
* Fixed double token generation issue in CSRF middleware
* Fixed CSRF cookie handling in test helpers

# [1.0.0-dev.2](https://github.com/gello-co/Gello/compare/v1.0.0-dev.1...v1.0.0-dev.2) (2025-10-28)


### Bug Fixes

* **ci:** bun cache directory warn ([3a0ba7e](https://github.com/gello-co/Gello/commit/3a0ba7e285f6aa5048a91fd018938f37d15ad947))

# 1.0.0-dev.1 (2025-10-28)


### Bug Fixes

* ci compatibility issue with semrel ([29b89dd](https://github.com/gello-co/Gello/commit/29b89dd66d012ae88e792413fce38f1c2c7a5d2c)), closes [#16](https://github.com/gello-co/Gello/issues/16)
* correct command formatting in docker-compose.yml ([efa45e8](https://github.com/gello-co/Gello/commit/efa45e87a924e989efe081e0cf8bffcf2237a9c6))
* skip condition in commit msg ([201bc20](https://github.com/gello-co/Gello/commit/201bc2011363a1167bb20fdc2615d8425dc41e72))
* update docker-compose command for deps ([46d0fc8](https://github.com/gello-co/Gello/commit/46d0fc8e1cf4619ead2b19d3d483e0faafedb639))
* update script path for dev:env and ensure husky runs without failure ([48c974d](https://github.com/gello-co/Gello/commit/48c974dbbe90587daf0cff2b3274349c2aca7e0c))


### Features

* add cleanup script for orphaned dev prerelease tags and deduplication for changelog ([0af2643](https://github.com/gello-co/Gello/commit/0af2643c40389c98755ea01188675a835fdb2d77))
* add version tag detection to skip semantic-release if tags exist ([6cac3d4](https://github.com/gello-co/Gello/commit/6cac3d47bbd6cb8e1b5d60382da7fdd2b0855771))
