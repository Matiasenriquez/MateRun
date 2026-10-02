/**
 * ==============================================================================
 * RUTAS DE INFORMES Y REPORTES (/api/reports) - MateRun
 * ==============================================================================
 * Endpoints para:
 * - Consultar informes consolidados y agrupados de inscriptos por carrera
 *   (Distancia + Categoría + Sexo).
 * - Exclusivo para consulta de administración (SuperAdmin y Admin).
 * ==============================================================================
 */

import { Router } from 'express';
import { getRaceReports } from '../controllers/reportsController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Todas las operaciones de informes requieren autenticación
router.use(verifyToken);

// Consulta de informe consolidado de inscriptos por carrera
router.get('/race/:raceId', requireRole('superadmin', 'admin'), getRaceReports);

export default router;
