const coverageSettings = {
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js']
};

module.exports = {
  // The integration tests share ONE database and TRUNCATE it between cases,
  // so they must not run in parallel: one file would wipe the rows another
  // file is asserting on. Unit tests are fast enough to run serially too.
  maxWorkers: 1,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/*.test.js'],
      ...coverageSettings
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.js',
      // Points DATABASE_URL at the test database before app modules load.
      setupFiles: ['<rootDir>/tests/setup/env.js'],
      ...coverageSettings
    }
  ],
  forceExit: true
}
