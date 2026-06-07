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
      // ignoredDependencies are runtime deps that aren't statically imported but
      // must ship: prisma (CLI run by the entrypoint), tslib (tsc importHelpers),
      // rxjs/reflect-metadata (required by NestJS internals at runtime), and
      // multer (used by @nestjs/platform-express's FileInterceptor for uploads
      // and referenced only via its types, not a value import).
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs}',
            '{projectRoot}/webpack.config.{js,cjs,mjs}',
            '{projectRoot}/jest.config.{js,cjs,mjs,ts}',
          ],
          ignoredDependencies: [
            'prisma',
            'tslib',
            'rxjs',
            'reflect-metadata',
            'multer',
          ],
        },
      ],
    },
  },
];
