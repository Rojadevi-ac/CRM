import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external / LAN access across different IP addresses
    port: 5173,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-excel': ['xlsx'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['axios', 'socket.io-client', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});
