const globals = require('globals');
const pluginJs = require('@eslint/js');
const tseslint = require('typescript-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = [
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 6,
      sourceType: 'module',
    },
    rules: {
      semi: 0,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
];
