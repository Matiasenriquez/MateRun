/**
 * ==============================================================================
 * ENRUTADOR DE DASHBOARD (Dashboard.tsx) - MateRun
 * ==============================================================================
 * Componente que actúa como un "Switch" inteligente. Dependiendo del rol del
 * usuario conectado (corredor, admin, superadmin), renderiza la vista
 * principal correspondiente (RunnerDashboard o AdminDashboard).
 * ==============================================================================
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SuperAdminDashboard } from './superadmin/SuperAdminDashboard';
import { AdminDashboard } from './admin/AdminDashboard';
import { RunnerDashboard } from './corredor/RunnerDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  // Si es superadmin, mostramos el nuevo panel con tarjetas de carreras y tabla de inscriptos
  if (user.rol === 'superadmin') {
    return <SuperAdminDashboard />;
  }

  // Si es administrador operativo, mostramos el panel de acreditaciones e historial
  if (user.rol === 'admin') {
    return <AdminDashboard />;
  }

  // Si es corredor, mostramos el catálogo de carreras disponibles
  return <RunnerDashboard />;
};
