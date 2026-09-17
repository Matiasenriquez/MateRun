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
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

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

  if (!isAuthenticated) {
    // Redirigir al login guardando la ruta intentada para redirigirlo de vuelta después
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    // Si está autenticado pero no tiene el rol necesario, mostrar error o redirigir
    return (
      <div className="min-h-screen bg-porcelain flex items-center justify-center p-4">
        <div className="card-panel max-w-md w-full text-center py-10">
          <div className="w-16 h-16 bg-machine-light text-machine rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-black">!</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Tu rol actual ({user.rol}) no tiene permisos para acceder a esta sección.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary w-full max-w-[200px] mx-auto"
          >
            Volver atrás
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
