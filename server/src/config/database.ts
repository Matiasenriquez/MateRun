/**
 * ==============================================================================
 * MÓDULO DE CONFIGURACIÓN DE BASE DE DATOS (Mongoose & MongoDB)
 * ==============================================================================
 * Este archivo gestiona el ciclo de vida de la conexión entre la API de Node/Express
 * y el clúster o instancia local de MongoDB (compatible con MongoDB Compass).
 *
 * Variables de entorno utilizadas:
 * - MONGODB_URI: Cadena de conexión URI a MongoDB (ej. mongodb://127.0.0.1:27017/materun)
 * ==============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno del archivo .env
dotenv.config();

/**
 * Cadena de conexión predeterminada a MongoDB.
 * Si no está definida en el entorno (.env), utiliza el servidor local estándar de MongoDB.
 */
const MONGODB_URI: string =
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Db_MateRun';

/**
 * Función asíncrona encargada de establecer la conexión con la base de datos MongoDB.
 * Incluye configuración de listeners para monitorear el estado de la conexión en tiempo real.
 *
 * @returns Promise<void>
 */
export const connectDB = async (): Promise<void> => {
  try {
    // Configuración de listeners para registrar eventos clave de Mongoose
    mongoose.connection.on('connected', () => {
      console.log('✅ [MongoDB] Conexión establecida con éxito a:', mongoose.connection.name);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [MongoDB] Error durante la conexión:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [MongoDB] Conexión perdida o desconectada');
    });

    // Intentar conectar con Mongoose utilizando las opciones modernas recomendadas
    await mongoose.connect(MONGODB_URI, {
      autoIndex: true, // Construye índices automáticamente en desarrollo
    });
  } catch (error) {
    console.error('❌ [MongoDB] Fallo al iniciar la conexión a la base de datos:');
    console.error(error);
    // Nota: No forzamos process.exit(1) para permitir que el servidor Express arranque
    // y exponga rutas de diagnóstico o que MongoDB pueda reconectarse automáticamente.
  }
};

/**
 * Función para cerrar la conexión con MongoDB de forma limpia y controlada (Graceful Shutdown).
 * Útil cuando se reinicia el servidor o se recibe una señal SIGINT / SIGTERM.
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('🔌 [MongoDB] Conexión cerrada correctamente.');
  } catch (error) {
    console.error('❌ [MongoDB] Error al cerrar la conexión:', error);
  }
};
