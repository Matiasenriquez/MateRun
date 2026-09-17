/**
 * ==============================================================================
 * RUTAS DE ESTADÍSTICAS Y RESULTADOS (/api/stats) - MateRun
 * ==============================================================================
 * Proporciona el historial de carreras y métricas promedio para la vista "Mis Datos".
 * ==============================================================================
 */

import { Router } from 'express';
import { getRunnerStats } from '../controllers/statsController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

// Consulta de estadísticas (si no se pasa :userId, calcula para el usuario en sesión)
router.get('/runner/:userId?', getRunnerStats);

export default router;
