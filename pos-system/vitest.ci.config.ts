import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 5000, // 5 seconds max per test
    hookTimeout: 3000, // 3 seconds for setup/teardown
    // Only run basic unit tests in CI
    include: [
      '**/src/**/*.test.{ts,tsx}',
      '!**/workflow-integration.test.tsx',
      '!**/integration.test.tsx', 
      '!**/PWA.property.test.tsx',
      '!**/integration-summary.test.ts',
      '!**/core-integration.test.ts'
    ],
    // Skip complex tests that require full app setup
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/workflow-integration.test.tsx',
      '**/integration.test.tsx',
      '**/PWA.property.test.tsx',
      '**/integration-summary.test.ts',
      '**/core-integration.test.ts'
    ]
  },
})