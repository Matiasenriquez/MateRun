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
import { AdminDashboard } from './admin/AdminDashboard';
import { RunnerDashboard } from './corredor/RunnerDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  // Si es admin o superadmin, le mostramos el panel dividido de gestión
  if (user.rol === 'admin' || user.rol === 'superadmin') {
    return <AdminDashboard />;
  }

  // Si es corredor, le mostramos la lista de carreras disponibles
  return <RunnerDashboard />;
};
