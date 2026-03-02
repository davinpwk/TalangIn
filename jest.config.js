module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          strict: true,
          esModuleInterop: true,
          target: 'ES2022',
          module: 'CommonJS',
          rootDir: '.',
          types: ['jest', 'node']
        }
      }
    ]
  }
};
