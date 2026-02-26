const { defineConfig } = require('@vscode/test-cli');
module.exports = defineConfig({
  files: 'out/test/**/*.test.js',
  extensionDevelopmentPath: '.',
  mocha: {
    ui: 'tdd',
    color: true,
  },
});
