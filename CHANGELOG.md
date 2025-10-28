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
