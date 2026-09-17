/**
 * ==============================================================================
 * RUTAS DE CARRERAS (/api/races) - MateRun
 * ==============================================================================
 * Define endpoints para visualización de carreras (todos los roles)
 * y operaciones de creación/edición/eliminación exclusivas para 'superadmin'.
 * ==============================================================================
 */

import { Router } from 'express';
import {
  getAllRaces,
  getRaceById,
  createRace,
  updateRace,
  deleteRace,
} from '../controllers/raceController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren estar autenticado
router.use(verifyToken);

// Consulta de carreras accesible a todos los roles autenticados
router.get('/', getAllRaces);
router.get('/:id', getRaceById);

// Operaciones de gestión de carreras reservadas únicamente para 'superadmin'
router.post('/', requireRole('superadmin'), createRace);
router.put('/:id', requireRole('superadmin'), updateRace);
router.delete('/:id', requireRole('superadmin'), deleteRace);

export default router;
