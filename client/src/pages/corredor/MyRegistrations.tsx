/**
 * ==============================================================================
 * MIS INSCRIPCIONES (MyRegistrations) - MateRun
 * ==============================================================================
 * Lista las inscripciones actuales y pasadas del corredor logueado.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';

import { FileText } from 'lucide-react';

export const MyRegistrations: React.FC = () => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyRegistrations = async () => {
      try {
        const res = await api.get('/registrations/my-registrations');
        setRegistrations(res.data.registrations);
      } catch (error) {
        console.error("Error al cargar inscripciones:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyRegistrations();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mis Inscripciones</h2>
        <p className="text-slate-500 mt-1">Sigue el estado de tu acreditación y dorsal asignado.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
        </div>
      ) : registrations.length === 0 ? (
        <div className="card-panel text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No tienes inscripciones vigentes</h3>
          <p className="text-slate-500 mt-2">Visita la sección "Próximas Carreras" para anotarte.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.map((reg) => (
            <div key={reg._id} className="card-panel flex flex-col hover:shadow-md transition-shadow relative overflow-hidden">
              {/* Barra lateral de estado colorida */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                reg.estado === 'Acreditado' ? 'bg-green-500' :
                reg.estado === 'Pendiente' ? 'bg-amber-400' :
                'bg-slate-300'
              }`}></div>
              
              <div className="pl-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-800 leading-tight">
                    {reg.carrera.nombre}
                  </h3>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                    reg.estado === 'Acreditado' ? 'bg-green-100 text-green-700' :
                    reg.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {reg.estado}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 mb-4">
                  {new Date(reg.carrera.fecha).toLocaleDateString()}
                </p>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Dorsal Asignado</p>
                    <p className="text-xl font-black text-machine">
                      {reg.dorsal ? `#${reg.dorsal}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Talle Remera</p>
                    <p className="text-lg font-bold text-slate-700">
                      {reg.talleRemera}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
