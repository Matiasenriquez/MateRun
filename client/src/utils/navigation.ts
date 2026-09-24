/**
 * ==============================================================================
 * UTILIDADES DE NAVEGACIÓN Y REDIRECCIÓN POR ROL (navigation.ts) - MateRun
 * ==============================================================================
 * Centraliza la definición de páginas iniciales predeterminadas para cada rol:
 * - SuperAdmin: "Panel de Control" (/dashboard)
 * - Corredor: "Próximas Carreras" (/dashboard)
 * - Admin: "Panel de Control" (/dashboard)
 * 
 * Regla de negocio:
 * Al iniciar sesión o cerrar sesión, el sistema ignora cualquier ruta interna
 * previa y garantiza que cada usuario ingrese directamente a su sección inicial.
 * ==============================================================================
 */

import { UserRole } from '../types';

/**
 * Retorna la página de inicio predeterminada para el rol de usuario especificado.
 * 
 * @param rol Rol del usuario autenticado ('superadmin' | 'corredor' | 'admin')
 * @returns Ruta de la página de inicio predeterminada correspondiente a su perfil
 */
export const getDefaultHomePathForRole = (rol?: UserRole | string | null): string => {
  switch (rol) {
    case 'superadmin':
      // Panel de Control de SuperAdmin (Carreras y Eventos Deportivos)
      return '/dashboard';

    case 'corredor':
      // Próximas Carreras de Corredor (Catálogo de Eventos)
      return '/dashboard';

    case 'admin':
      // Panel de Control del Administrador Operativo (Mesa de Entrada y Acreditaciones)
      return '/dashboard';

    default:
      // Ruta por defecto segura
      return '/dashboard';
  }
};
