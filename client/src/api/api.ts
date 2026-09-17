/**
 * ==============================================================================
 * CLIENTE HTTP (Axios) - MateRun
 * ==============================================================================
 * Instancia global de Axios configurada para realizar peticiones al backend.
 * Incluye un interceptor que automáticamente extrae el token JWT del
 * localStorage y lo adjunta en la cabecera 'Authorization' de cada petición.
 * ==============================================================================
 */

import axios from 'axios';

// La URL base aprovecha el proxy configurado en vite.config.ts hacia localhost:5000
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Peticiones: Adjuntar el token JWT si existe
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('materun_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas: Manejar cierres de sesión forzados por token expirado
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si el servidor responde 401 (No Autorizado) y no estamos en la ruta de login
      // Significa que el token expiró o es inválido.
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('materun_token');
        // Redirigir suavemente al login sin usar window.location de inmediato si es posible,
        // pero como es un interceptor global, esto asegura protección a prueba de fallos.
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
