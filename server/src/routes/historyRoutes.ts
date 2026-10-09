/**
 * ==============================================================================
 * RUTAS DE HISTORIAL Y AUDITORÍA (/api/history) - MateRun
 * ==============================================================================
 * Suministra datos para la pantalla de historial por carrera:
 * - Panel Izquierdo: Corredores Acreditados
 * - Panel Derecho: Auditoría de Bajas, Modificaciones y Nuevas Inscripciones
 * ==============================================================================
 */

import { Router } from 'express';
import { getRaceHistory } from '../controllers/historyController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.use(requireRole('admin', 'superadmin'));

router.get('/race/:raceId', getRaceHistory);

export default router;
