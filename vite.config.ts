import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@vercel/analytics/react', '@vercel/speed-insights/react'],
  },
  build: {
    rollupOptions: {
      output: {
        // Recharts (+ d3) rất nặng và ít đổi: tách riêng để được cache lâu giữa các lần deploy.
        manualChunks: id => (/node_modules\/(recharts|d3-|victory-vendor|recharts-scale)/.test(id) ? 'charts' : undefined),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
