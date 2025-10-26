import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // Polyfills for Node.js modules required by Nexus SDK
            buffer: 'buffer',
            process: 'process/browser',
        },
    },
    define: {
        // Required for Nexus SDK to work in browser
        'global': 'globalThis',
        'process.env': {},
    },
    optimizeDeps: {
        include: ['buffer'],
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: 'globalThis'
            },
        },
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
