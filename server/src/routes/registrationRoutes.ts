/**
 * ==============================================================================
 * RUTAS DE INSCRIPCIONES Y ACREDITACIÓN (/api/registrations) - MateRun
 * ==============================================================================
 * Endpoints para autoinscripción, inscripción por administradores, acreditación
 * de corredores en mesa de entrada y modificación de inscripciones.
 * ==============================================================================
 */

import { Router } from 'express';
import {
  registerRunner,
  registerByAdmin,
  getMyRegistrations,
  getRegistrationsByRace,
  updateAccreditationStatus,
  updateRegistration,
  deleteRegistration,
} from '../controllers/registrationController';
import { verifyToken, requireRole } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren estar autenticado
router.use(verifyToken);

// 1. Inscripción propia del Corredor (asignación automática de menor dorsal libre)
router.post('/', registerRunner);

// 2. Consulta de inscripciones propias del corredor
router.get('/my-registrations', getMyRegistrations);

// 3. Inscripción manual por parte del Administrador (con validación "Dorsal no disponible")
router.post('/admin', requireRole('admin', 'superadmin'), registerByAdmin);

// 4. Listar todas las inscripciones de una carrera (tabla de acreditación e inscriptos)
router.get('/race/:raceId', requireRole('admin', 'superadmin'), getRegistrationsByRace);

// 5. Cambio de estado de acreditación ('Acreditado', 'Retira y no corre', 'Baja', 'Pendiente')
router.put('/:id/accreditation', requireRole('admin', 'superadmin'), updateAccreditationStatus);

// 6. Edición de datos de una inscripción
router.put('/:id', requireRole('admin', 'superadmin'), updateRegistration);

// 7. Baja de una inscripción
router.delete('/:id', requireRole('admin', 'superadmin'), deleteRegistration);

export default router;
