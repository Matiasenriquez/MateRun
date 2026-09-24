/**
 * ==============================================================================
 * PROTECTOR DE RUTAS (ProtectedRoute) - MateRun
 * ==============================================================================
 * Componente contenedor que restringe el acceso a las vistas de la aplicación.
 * 1. Si no hay usuario logueado, redirige a `/login`.
 * 2. Si se especifican `allowedRoles` y el usuario no los tiene, bloquea acceso.
 * ==============================================================================
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { getDefaultHomePathForRole } from '../../utils/navigation';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-porcelain flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // 1. Si no hay sesión activa, redirigir limpiamente a /login sin guardar la ruta previa en el estado
  // para evitar que el siguiente usuario que inicie sesión herede una ruta que no le corresponde
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={null} />;
  }

  // 2. Si el usuario intenta acceder a una sección que no corresponde a su rol (ej: SuperAdmin a /my-stats
  // o Corredor a /admin/users), se redirecciona automáticamente a la página de inicio predeterminada de su perfil
  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    return <Navigate to={getDefaultHomePathForRole(user.rol)} replace state={null} />;
  }

  return <>{children}</>;
};
