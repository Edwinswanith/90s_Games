import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { networkInterfaces } from 'node:os';
const ips = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n?.family === 'IPv4')
  .map((n) => n!.address);
export default defineConfig({
  root: 'apps/web',
  envDir: process.cwd(),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.CLIENT_PORT || 5173),
    strictPort: true,
    allowedHosts: ['localhost', ...ips],
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1800 },
});
