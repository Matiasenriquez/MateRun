/**
 * ==============================================================================
 * SERVIDOR PRINCIPAL DE APLICACIÓN - EXPRESS API (MateRun)
 * ==============================================================================
 * Este archivo es el punto de entrada (entrypoint) del backend. Se encarga de:
 * 1. Inicializar la aplicación Express.
 * 2. Cargar variables de entorno desde el archivo `.env`.
 * 3. Configurar middlewares globales (CORS, parseo de JSON, codificación URL).
 * 4. Conectar a la base de datos MongoDB vía Mongoose (base de datos: Db_MateRun).
 * 5. Montar las rutas modulares de la API REST:
 *    - /api/auth          -> Autenticación, registro, login, recuperación y perfil
 *    - /api/races         -> CRUD y consulta de carreras y maratones
 *    - /api/registrations -> Inscripciones, acreditación y validación de dorsales
 *    - /api/history       -> Doble panel de historial (acreditados y auditoría)
 *    - /api/stats         -> Historial deportivo y estadísticas calculadas de corredores
 *    - /api/users         -> Gestión de usuarios y asignación de roles
 * 6. Iniciar el servidor HTTP en el puerto configurado.
 * ==============================================================================
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database';

// Importación de rutas modulares
import authRoutes from './routes/authRoutes';
import raceRoutes from './routes/raceRoutes';
import registrationRoutes from './routes/registrationRoutes';
import historyRoutes from './routes/historyRoutes';
import statsRoutes from './routes/statsRoutes';
import userRoutes from './routes/userRoutes';

// ------------------------------------------------------------------------------
// 1. CARGA DE VARIABLES DE ENTORNO
// ------------------------------------------------------------------------------
dotenv.config();

// Instancia principal de Express
const app: Application = express();

// Puerto de ejecución del servidor (por defecto 5000 si no se define en .env)
const PORT = process.env.PORT || 5000;

// URL permitida para llamadas desde el Frontend React (CORS)
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ------------------------------------------------------------------------------
// 2. CONFIGURACIÓN DE MIDDLEWARES GLOBALES
// ------------------------------------------------------------------------------

/**
 * Middleware: CORS (Cross-Origin Resource Sharing)
 * Permite que clientes web (como nuestra app de React en el puerto 5173) puedan
 * consumir esta API de forma segura enviando cabeceras y credenciales.
 */
app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * Middleware: express.json()
 * Analiza las peticiones entrantes con cargas útiles (payloads) formateadas en JSON.
 */
app.use(express.json());

/**
 * Middleware: express.urlencoded()
 * Analiza peticiones codificadas en URL (formularios estándar).
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Middleware de Registro Básico (Request Logger para desarrollo)
 * Muestra en la consola de Node el método y la ruta de cada petición entrante.
 */
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`📡 [${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ------------------------------------------------------------------------------
// 3. MONTAJE DE RUTAS DE LA API REST
// ------------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/users', userRoutes);

// ------------------------------------------------------------------------------
// 4. RUTAS BASE Y DE SALUD (HEALTH CHECK)
// ------------------------------------------------------------------------------

/**
 * Ruta: GET /api/health
 * Propósito: Verificar que la API de Express esté arriba y responder con el estado
 * del servidor y la conexión a MongoDB.
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    project: 'MateRun API',
    description: 'Sistema de gestión de inscripciones para trail running y maratones',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Ruta raíz de bienvenida
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(200).send('🏃‍♂️ API de MateRun en funcionamiento. Visita /api/health para verificar el estado.');
});

// ------------------------------------------------------------------------------
// 5. MANEJO DE RUTAS NO ENCONTRADAS (404)
// ------------------------------------------------------------------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
  });
});

// ------------------------------------------------------------------------------
// 6. MANEJO GLOBAL DE ERRORES (Error Handler)
// ------------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('💥 Error no controlado en la aplicación:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: err.message || 'Ocurrió un fallo inesperado',
  });
});

// ------------------------------------------------------------------------------
// 7. INICIO DEL SERVIDOR Y CONEXIÓN A BASE DE DATOS
// ------------------------------------------------------------------------------
const startServer = async () => {
  try {
    // Conectar a MongoDB antes de empezar a escuchar peticiones
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 [MateRun API] Servidor ejecutándose en: http://localhost:${PORT}`);
      console.log(`🌿 [MateRun API] Estado de salud: http://localhost:${PORT}/api/health`);
      console.log(`🌐 [MateRun API] Frontend permitido: ${CLIENT_URL}`);
      console.log('====================================================');
    });

    // Manejo de apagado elegante (Graceful shutdown)
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Recibida señal de apagado (${signal}). Cerrando conexiones...`);
      server.close(async () => {
        await disconnectDB();
        console.log('🏁 Servidor Express cerrado correctamente.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();

export default app;
