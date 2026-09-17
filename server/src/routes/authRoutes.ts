/**
 * ==============================================================================
 * RUTAS DE AUTENTICACIÓN (/api/auth) - MateRun
 * ==============================================================================
 * Expone los endpoints de registro, login, recuperación de contraseña y perfil.
 * ==============================================================================
 */

import { Router } from 'express';
import {
  register,
  login,
  forgotPassword,
  getMe,
  updateMe,
} from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Rutas Públicas
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Rutas Privadas (requieren token JWT)
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateMe);

export default router;
