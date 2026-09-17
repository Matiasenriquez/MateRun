/**
 * ==============================================================================
 * CONFIGURACIÓN DE VITE - FRONTEND (MateRun)
 * ==============================================================================
 * Define los plugins y la configuración del servidor de desarrollo de Vite.
 * Incluye proxy para reenviar peticiones API `/api` al backend Express (puerto 5000)
 * de modo que durante desarrollo no tengamos problemas de CORS ni URLs absolutas.
 * ==============================================================================
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy transparente para redirigir llamadas del frontend (/api/...) al backend Express
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
