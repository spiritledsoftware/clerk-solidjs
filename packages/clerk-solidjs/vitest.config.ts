import solid from '@solidjs/vite-plugin';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const { name, version } = require('./package.json');
const {
  version: clerkJsVersion
} = require('./node_modules/@clerk/clerk-js/package.json');

export default defineConfig({
  plugins: [solid()],
  define: {
    PACKAGE_NAME: `"${name}"`,
    PACKAGE_VERSION: `"${version}"`,
    JS_PACKAGE_VERSION: `"${clerkJsVersion}"`,
    __DEV__: 'true'
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./node_modules/@testing-library/jest-dom/vitest']
  },
  resolve: {
    conditions: ['development', 'browser'],
    tsconfigPaths: true
  }
});
