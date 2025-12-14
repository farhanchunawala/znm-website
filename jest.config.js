/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Increase timeout for MongoDB Memory Server setup
  testTimeout: 30000,
  
  // 💡 FIX ALIASES FOR JEST
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },

  // allow .ts & .tsx
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],

  // if using ESM modules
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  }
};
