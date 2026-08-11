import { defineConfig, globalIgnores } from '@eslint/config-helpers';
import globals from 'globals';
import { recommended } from '@adobe/eslint-config-helix';

export default defineConfig([
  globalIgnores([
    'node_modules/*',
    'coverage/*',
    'hlx_statics/scripts/jszip.js',
    'hlx_statics/scripts/prism.js',
    'hlx_statics/scripts/prism-grammars/*',
    'hlx_statics/scripts/prism-loader.js',
  ]),
  {
    extends: [recommended],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
        instantsearch: 'readonly',
      },
    },
    rules: {
      'no-param-reassign': ['error', { props: false }],
      'linebreak-style': ['error', 'unix'],
      'header/header': 'off',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
      },
    },
  },
]);
