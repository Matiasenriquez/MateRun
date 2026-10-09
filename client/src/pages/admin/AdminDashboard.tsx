/**
 * ==============================================================================
 * PANEL DE CONTROL OPERATIVO - ROL ADMIN (AdminDashboard.tsx) - MateRun
 * ==============================================================================
 * Vista principal para el usuario con rol "Admin" (Acreditaciones y Operatoria).
 * Se eliminaron las secciones obsoletas ("Datos del inscripto" e "Historial
 * de personas que se agregan") para dar paso a la gestión basada en el historial
 * de carreras oficial.
 * ==============================================================================
 */

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="card-panel text-center py-16 bg-white border border-slate-200">
        <ShieldCheck className="w-14 h-14 text-machine mx-auto mb-4" />
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Panel de Administración Operativa
        </h2>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto text-sm">
          Espacio destinado a la gestión operativa de corredores y acreditaciones de carreras disponibles.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
