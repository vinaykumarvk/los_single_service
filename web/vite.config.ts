import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build configurations for different personas
const persona = process.env.VITE_PERSONA || 'all';

const personaConfigs: Record<string, { entry: string; outDir: string; base: string }> = {
  rm: {
    entry: 'src/rm/main.tsx',
    outDir: 'dist/rm',
    base: '/rm/',
  },
  admin: {
    entry: 'src/admin/main.tsx',
    outDir: 'dist/admin',
    base: '/admin/',
  },
  operations: {
    entry: 'src/operations/main.tsx',
    outDir: 'dist/operations',
    base: '/operations/',
  },
  all: {
    entry: 'src/main.tsx',
    outDir: 'dist',
    base: '/',
  },
};

const buildConfig = personaConfigs[persona] || personaConfigs.all;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    allowedHosts: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3016', // Auth service - direct connection, bypassing gateway
        changeOrigin: true,
        secure: false,
        timeout: 30000,
      },
      '/api': {
        target: 'http://localhost:3000', // Gateway for other API calls
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: buildConfig.outDir,
    rollupOptions: {
      input: buildConfig.entry,
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'recharts'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps in production for smaller bundles
  },
  base: buildConfig.base,
});
