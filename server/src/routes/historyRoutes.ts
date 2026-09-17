/**
 * ==============================================================================
 * RUTAS DE HISTORIAL Y AUDITORÍA (/api/history) - MateRun
 * ==============================================================================
 * Suministra datos para la pantalla de doble historial:
 * - Panel Izquierdo: Corredores Acreditados
 * - Panel Derecho: Auditoría de Bajas, Modificaciones y Nuevas Inscripciones
 * ==============================================================================
 */

import { Router } from 'express';
import { getRaceHistory, getRecentAuditHistory } from '../controllers/historyController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);
router.use(requireRole('admin', 'superadmin'));

router.get('/race/:raceId', getRaceHistory);
router.get('/recent', getRecentAuditHistory);

export default router;
