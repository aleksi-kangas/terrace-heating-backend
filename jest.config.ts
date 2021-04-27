import type { Config } from '@jest/types';

// module.exports = {
//   transform: { '^.+\\.ts?$': 'ts-jest' },
//   testEnvironment: 'node',
//   testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$',
//   moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
// };

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  roots: ['<rootDir>/src'],
  restoreMocks: true,
};
export default config;
