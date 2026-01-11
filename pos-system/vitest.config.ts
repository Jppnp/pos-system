import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 10000, // 10 seconds max per test
    hookTimeout: 5000, // 5 seconds for setup/teardown
    // Skip slow integration tests in CI
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/workflow-integration.test.tsx', // Skip complex integration tests
      '**/integration.test.tsx', // Skip complex integration tests
      '**/PWA.property.test.tsx' // Skip property-based tests
    ]
  },
})