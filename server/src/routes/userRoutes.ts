/**
 * ==============================================================================
 * RUTAS DE USUARIOS Y CORREDORES (/api/users) - MateRun
 * ==============================================================================
 * Permite a los perfiles de administración realizar operaciones CRUD sobre
 * los corredores y asignar roles (SuperAdmin).
 * ==============================================================================
 */

import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  changeUserRole,
  deleteUser,
} from '../controllers/userController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

// CRUD de usuarios disponible para administradores
router.get('/', requireRole('admin', 'superadmin'), getAllUsers);
router.get('/:id', requireRole('admin', 'superadmin'), getUserById);
router.put('/:id', requireRole('admin', 'superadmin'), updateUser);
router.delete('/:id', requireRole('admin', 'superadmin'), deleteUser);

// Asignación de roles exclusivo para SuperAdmin
router.patch('/:id/role', requireRole('superadmin'), changeUserRole);

export default router;
