export default {
  displayName: 'api-e2e',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  // Creates/migrates the dedicated e2e database, truncates it, flushes the
  // e2e Redis db, and seeds the SUPERADMIN before any spec runs.
  globalSetup: '<rootDir>/src/support/global-setup.ts',
  // Booting the full AppModule + bcrypt logins need more than Jest's 5s.
  testTimeout: 30000,
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  // 'cjs' so the extensionless import of tools/e2e/db-prep resolves the
  // shared CommonJS plumbing (db-prep.cjs) at runtime.
  moduleFileExtensions: ['ts', 'js', 'cjs', 'html'],
  coverageDirectory: '../../coverage/api-e2e',
};
