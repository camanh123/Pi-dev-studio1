import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Subdomain routing - no base path needed
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['.tesslate.com', 'localhost', '.studio-test.tesslate.com'],
    proxy: {
      // Proxy /api requests to backend
      '/api': {
        // In container, both frontend and backend are on the same host
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => {
          // Remove /api prefix
          // e.g., /api/health -> /health
          return path.replace(/^\/api/, '')
        },
      },
    },
    hmr: {
      // Configure HMR WebSocket for proxy environments
      protocol: process.env.VITE_HMR_PROTOCOL || 'ws',
      host: process.env.VITE_HMR_HOST || undefined,
      clientPort: process.env.VITE_HMR_PORT ? parseInt(process.env.VITE_HMR_PORT) : 80,
    },
    watch: {
      // Use polling for reliable file watching in Docker containers
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      interval: process.env.CHOKIDAR_INTERVAL ? parseInt(process.env.CHOKIDAR_INTERVAL) : 1000,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
