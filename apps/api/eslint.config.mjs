import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
    rules: {
      // Keep apps/api/package.json in sync with what the API actually imports,
      // so the pruned production install (Docker) is correct and reproducible.
      // prisma (CLI, run by the entrypoint) and tslib (tsc importHelpers) are
      // runtime deps that are not statically imported, so they are ignored here.
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs}',
            '{projectRoot}/webpack.config.{js,cjs,mjs}',
            '{projectRoot}/jest.config.{js,cjs,mjs,ts}',
          ],
          ignoredDependencies: ['prisma', 'tslib'],
        },
      ],
    },
  },
];
