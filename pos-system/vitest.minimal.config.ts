import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node', // Use node instead of jsdom for speed
    globals: true,
    testTimeout: 2000, // 2 seconds max per test
    hookTimeout: 1000, // 1 second for setup/teardown
    // Only run the most basic tests
    include: [
      '**/src/test/basic.test.ts',
      '**/src/utils/localization.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.test.tsx', // Skip all React component tests
      '**/integration*.test.*',
      '**/workflow*.test.*',
      '**/PWA*.test.*',
      '**/SearchEngine.test.ts', // Skip database-dependent tests
      '**/ProductService.test.ts',
      '**/TransactionService.test.ts',
      '**/ReceiptService.test.ts'
    ]
  },
})