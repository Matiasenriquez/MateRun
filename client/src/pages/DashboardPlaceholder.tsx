/**
 * ==============================================================================
 * DASHBOARD TEMPORAL (Dashboard Placeholder) - MateRun
 * ==============================================================================
 * Vista temporal para confirmar que el Layout y las Rutas Privadas funcionan
 * correctamente tras el inicio de sesión.
 * ==============================================================================
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export const DashboardPlaceholder: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Panel Principal</h2>
      </div>

      <div className="card-panel">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-machine-light text-machine rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Bienvenido de nuevo, {user?.nombre}</h3>
            <p className="text-sm text-slate-600">
              Estás conectado con el rol: <strong className="uppercase text-machine">{user?.rol}</strong>
            </p>
          </div>
        </div>
        
        <hr className="border-slate-100 my-4" />
        
        <p className="text-sm text-slate-600 leading-relaxed">
          Esta vista confirma que el contexto de autenticación, el enrutador y la capa de estilos
          (Blanco Porcelana y Rojo Machine) están funcionando correctamente. En las próximas etapas
          reemplazaremos este contenido por las tablas de carreras e inscripciones.
        </p>
      </div>
    </div>
  );
};
