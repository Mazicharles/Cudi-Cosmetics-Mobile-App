const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  {
    files: ['scripts/**/*.cjs', '*.cjs'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
      },
    },
  },
  { ignores: ['dist/**', '.expo/**', 'coverage/**', 'android/**', 'ios/**'] },
]);
