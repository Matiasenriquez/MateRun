/**
 * ==============================================================================
 * MIS DATOS (MyStats) - MateRun
 * ==============================================================================
 * Vista para el corredor donde visualiza su historial deportivo y estadísticas
 * basadas en el endpoint /api/stats/me.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Activity, Trophy, Timer, Map, TrendingUp } from 'lucide-react';
import { RaceResult, RunnerStats } from '../../types';

interface RunnerDataResponse {
  results: RaceResult[];
  stats: RunnerStats;
}

export const MyStats: React.FC = () => {
  const [data, setData] = useState<RunnerDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/runner'); // Sin userId usa el 'me' por detrás
        setData(res.data);
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Helper para renderizar la leyenda "Pendiente" de forma consistente en campos no cargados
  const renderPendingBadge = () => (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      Pendiente
    </span>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.stats.totalCarreras === 0) {
    return (
      <div className="card-panel text-center py-16 max-w-2xl mx-auto mt-8">
        <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800">No hay datos deportivos aún</h3>
        <p className="text-slate-500 mt-2">
          Cuando participes en tu primera carrera oficial y se carguen los resultados, 
          podrás visualizar aquí tus métricas, tiempos y promedios.
        </p>
      </div>
    );
  }

  const { stats, results } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mis Datos y Estadísticas</h2>
        <p className="text-slate-500 mt-1">
          Análisis de tu rendimiento histórico en MateRun. Información oficial administrada por la organización.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Carreras Corridas */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Carreras</p>
            <p className="text-2xl font-black text-slate-800">{stats.totalCarreras}</p>
          </div>
        </div>

        {/* Distancia Promedio */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <Map className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Distancia Promedio</p>
            <div className="mt-0.5">
              {stats.distanciaPromedio != null ? (
                <p className="text-2xl font-black text-slate-800">
                  {stats.distanciaPromedio} <span className="text-sm font-semibold text-slate-500">km</span>
                </p>
              ) : (
                renderPendingBadge()
              )}
            </div>
          </div>
        </div>

        {/* Mejor Tiempo */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Mejor Tiempo</p>
            <div className="mt-0.5">
              {stats.mejorTiempoFormateado ? (
                <p className="text-2xl font-black text-slate-800 font-mono">{stats.mejorTiempoFormateado}</p>
              ) : (
                renderPendingBadge()
              )}
            </div>
          </div>
        </div>

        {/* Promedio General */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tiempo Promedio</p>
            <div className="mt-0.5">
              {stats.tiempoPromedioFormateado ? (
                <p className="text-2xl font-black text-slate-800 font-mono">{stats.tiempoPromedioFormateado}</p>
              ) : (
                renderPendingBadge()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historial Detallado */}
      <div className="card-panel mt-8">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Historial de Carreras Oficiales
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-md">Fecha</th>
                <th className="px-4 py-3 font-semibold">Carrera</th>
                <th className="px-4 py-3 font-semibold text-center">Distancia</th>
                <th className="px-4 py-3 font-semibold text-center">Tiempo</th>
                <th className="px-4 py-3 font-semibold text-center">Pos. Gral</th>
                <th className="px-4 py-3 font-semibold text-center rounded-tr-md">Pos. Categoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((hist, idx) => (
                <tr key={hist._id || idx} className="hover:bg-slate-50/80 transition-colors">
                  {/* Fecha */}
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    {hist.fecha ? new Date(hist.fecha).toLocaleDateString() : renderPendingBadge()}
                  </td>

                  {/* Carrera */}
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    {hist.nombreCarrera || renderPendingBadge()}
                  </td>

                  {/* Distancia */}
                  <td className="px-4 py-3.5 text-center">
                    {hist.distancia != null && hist.distancia > 0 ? (
                      <span className="text-slate-700 font-medium">{hist.distancia} km</span>
                    ) : (
                      renderPendingBadge()
                    )}
                  </td>

                  {/* Tiempo */}
                  <td className="px-4 py-3.5 text-center font-mono font-medium">
                    {hist.descalificado ? (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs font-black uppercase">
                        🚫 Descalificado
                      </span>
                    ) : hist.tiempoFormateado ? (
                      <span className="text-slate-800">{hist.tiempoFormateado}</span>
                    ) : (
                      renderPendingBadge()
                    )}
                  </td>

                  {/* Posición General */}
                  <td className="px-4 py-3.5 text-center">
                    {hist.descalificado ? (
                      <span className="text-slate-400 font-bold text-xs">-</span>
                    ) : hist.posicionGeneral != null && hist.posicionGeneral > 0 ? (
                      hist.posicionGeneral === 1 ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                          🥇 #1
                        </span>
                      ) : hist.posicionGeneral === 2 ? (
                        <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                          🥈 #2
                        </span>
                      ) : hist.posicionGeneral === 3 ? (
                        <span className="inline-flex items-center gap-1 bg-amber-900/10 text-amber-900 border border-amber-900/20 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                          🥉 #3
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-bold">
                          #{hist.posicionGeneral}
                        </span>
                      )
                    ) : (
                      renderPendingBadge()
                    )}
                  </td>

                  {/* Posición por Categoría */}
                  <td className="px-4 py-3.5 text-center">
                    {hist.descalificado ? (
                      <span className="text-slate-400 font-bold text-xs">-</span>
                    ) : hist.posicionCategoria != null && hist.posicionCategoria > 0 ? (
                      <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {hist.categoria 
                          ? `#${hist.posicionCategoria} en categoría ${hist.categoria}`
                          : `#${hist.posicionCategoria}`
                        }
                      </span>
                    ) : (
                      renderPendingBadge()
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
