/**
 * ==============================================================================
 * RUTAS DE GESTIÓN DE RESULTADOS (/api/results) - MateRun
 * ==============================================================================
 * Endpoints para:
 * - Consultar resultados oficiales de una carrera
 * - Guardar o editar podio, ganadores por categoría y tiempos de corredores (SuperAdmin)
 * - Actualizar el estado de la carrera a 'finalizada' o 'activa' (SuperAdmin)
 * ==============================================================================
 */

import { Router } from 'express';
import {
  getRaceResults,
  saveRaceResults,
  updateRaceStatus,
} from '../controllers/resultsController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Todas las operaciones requieren autenticación
router.use(verifyToken);

// Consulta de resultados de una carrera (SuperAdmin o Admin)
router.get('/race/:raceId', getRaceResults);

// Carga, edición y guardado de resultados (Exclusivo SuperAdmin)
router.post('/race/:raceId', requireRole('superadmin'), saveRaceResults);
router.put('/race/:raceId', requireRole('superadmin'), saveRaceResults);

// Cambio de estado de la carrera (Exclusivo SuperAdmin)
router.put('/race/:raceId/status', requireRole('superadmin'), updateRaceStatus);

export default router;
