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
      '/api/applications': {
        target: 'http://localhost:3001', // Direct to Application Service - bypass gateway
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Extract user ID from JWT token and add as X-User-Id header
            const authHeader = req.headers['authorization'] || req.headers['Authorization'];
            if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
              try {
                const token = authHeader.substring(7);
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                  const userId = payload.sub || payload.id || '00000001-0000-0000-0000-000000000001';
                  proxyReq.setHeader('X-User-Id', userId);
                  console.log('[Vite Proxy] Added X-User-Id header for /api/applications:', userId);
                }
              } catch (e) {
                console.warn('[Vite Proxy] Failed to extract user ID from token:', e);
              }
            }
          });
        },
      },
      '/api/applicants': {
        target: 'http://localhost:3003', // Direct to KYC Service - bypass gateway
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Extract user ID from JWT token and add as X-User-Id header
            const authHeader = req.headers['authorization'] || req.headers['Authorization'];
            if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
              try {
                const token = authHeader.substring(7);
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                  const userId = payload.sub || payload.id || '00000001-0000-0000-0000-000000000001';
                  proxyReq.setHeader('X-User-Id', userId);
                }
              } catch (e) {
                // Silent fail
              }
            }
          });
        },
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
