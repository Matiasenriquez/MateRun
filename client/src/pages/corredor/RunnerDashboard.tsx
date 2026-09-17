/**
 * ==============================================================================
 * PANEL DEL CORREDOR (RunnerDashboard) - MateRun
 * ==============================================================================
 * Vista principal para el rol "corredor". Muestra las carreras disponibles y
 * permite la autoinscripción rápida con cálculo de cupos.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Race } from '../../types';
import { Calendar, MapPin, Users, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';

export const RunnerDashboard: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      // Obtenemos las carreras (el backend ya filtra por fecha futura o estado activo)
      const res = await api.get('/races');
      setRaces(res.data.races);
    } catch (error) {
      console.error("Error cargando carreras:", error);
      setErrorMsg("Ocurrió un error al cargar las próximas carreras.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (raceId: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setProcessingId(raceId);
    
    // Por simplicidad en la autoinscripción, pedimos un talle predeterminado
    // (En una etapa futura se podría abrir un modal).
    const talleRemera = window.prompt("Ingresa tu talle de remera (XS, S, M, L, XL, XXL):", "M");
    if (!talleRemera) {
      setProcessingId(null);
      return;
    }

    try {
      // El backend asignará automáticamente el dorsal menor disponible
      await api.post('/registrations/self', {
        raceId,
        talleRemera: talleRemera.toUpperCase()
      });
      setSuccessMsg("¡Inscripción exitosa! Tu dorsal ha sido reservado.");
      fetchRaces(); // Refrescar para actualizar cupos
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Error al intentar inscribirte.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Próximas Carreras</h2>
          <p className="text-slate-500 mt-1">Explora los eventos disponibles y asegura tu lugar.</p>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-lg flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {/* Lista de Carreras */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
        </div>
      ) : races.length === 0 ? (
        <div className="card-panel text-center py-16">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No hay carreras disponibles</h3>
          <p className="text-slate-500 mt-2">Vuelve pronto para enterarte de nuevos eventos de Trail Running.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {races.map((race) => {
            const fecha = new Date(race.fecha);
            const cuposDisp = race.cuposDisponibles ?? 0;
            const agotado = cuposDisp <= 0;

            return (
              <div key={race._id} className="card-panel flex flex-col hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-machine-light text-machine font-black text-center rounded-md px-3 py-2 leading-tight">
                    <span className="block text-2xl">{fecha.getDate()}</span>
                    <span className="block text-xs uppercase">{fecha.toLocaleString('es-AR', { month: 'short' })}</span>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                    agotado ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'
                  }`}>
                    {agotado ? 'Agotado' : 'Inscripciones Abiertas'}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight line-clamp-2">
                  {race.nombre}
                </h3>

                <div className="space-y-2 mb-6 flex-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Lugar y distancias: <strong className="text-slate-800">{race.distancias.join('K, ')}K</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Cupos restantes: <strong className={agotado ? 'text-machine' : 'text-slate-800'}>{cuposDisp}</strong></span>
                  </div>
                </div>

                <button 
                  onClick={() => handleRegister(race._id)}
                  disabled={agotado || processingId === race._id}
                  className={`w-full py-2.5 font-bold uppercase tracking-wider rounded flex justify-center items-center gap-2 transition-all ${
                    agotado 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-machine hover:bg-machine-hover text-white shadow-md shadow-machine/20 hover:shadow-machine/30'
                  }`}
                >
                  {processingId === race._id ? 'Procesando...' : (agotado ? 'Sin Cupos' : 'Inscribirme Ahora')}
                  {!agotado && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
