import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  roots: ['<rootDir>/src'],
  restoreMocks: true,
  // transform: {
  //   '^.+\\.tsx?$': 'ts-jest',
  // },
};
export default config;
