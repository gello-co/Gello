export default {
  // Format and lint staged code files
  "*.{js,ts,tsx,json,css,md}": ["biome format --write", "biome lint --write"],
};
