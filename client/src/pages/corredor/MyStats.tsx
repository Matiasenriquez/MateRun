/**
 * ==============================================================================
 * MIS DATOS (MyStats) - MateRun
 * ==============================================================================
 * Vista para el corredor donde visualiza su historial deportivo y estadísticas
 * basadas en el endpoint /api/stats/runner, con soporte reactivo para filtrar
 * por distancia específica y evitar mezclar tiempos de diferentes distancias.
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/api';
import { Activity, Trophy, Timer, Map, TrendingUp, Filter } from 'lucide-react';
import { RaceResult, RunnerStats } from '../../types';

interface RunnerDataResponse {
  results: RaceResult[];
  distanciasDisponibles?: number[];
  stats: RunnerStats;
}

/**
 * Helper para formatear segundos a HH:MM:SS de manera instantánea en el cliente
 */
const formatSeconds = (sec: number | null | undefined): string | null => {
  if (sec == null || isNaN(sec) || sec <= 0) return null;
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
};

export const MyStats: React.FC = () => {
  const [data, setData] = useState<RunnerDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDistancia, setSelectedDistancia] = useState<string>('todas');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/stats/runner'); // Sin userId usa el 'me' por detrás
        setData(res.data);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
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

  // Obtener las distancias únicas en las que ha participado el corredor
  const availableDistances = useMemo(() => {
    if (data?.distanciasDisponibles && data.distanciasDisponibles.length > 0) {
      return data.distanciasDisponibles;
    }
    if (!data?.results) return [];
    const distSet = new Set<number>();
    data.results.forEach((r) => {
      if (typeof r.distancia === 'number' && r.distancia > 0) {
        distSet.add(r.distancia);
      }
    });
    return Array.from(distSet).sort((a, b) => a - b);
  }, [data]);

  // Filtrar los resultados según la distancia seleccionada
  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    if (selectedDistancia === 'todas') return data.results;
    const distNum = Number(selectedDistancia);
    return data.results.filter((r) => r.distancia === distNum);
  }, [data, selectedDistancia]);

  // Calcular las estadísticas de forma reactiva sin mezclar tiempos de distintas distancias
  const computedStats = useMemo(() => {
    const totalCarreras = filteredResults.length;

    // Distancias válidas
    const validDistances = filteredResults.filter(
      (r) => typeof r.distancia === 'number' && r.distancia > 0
    );
    const distanciaPromedio =
      validDistances.length > 0
        ? Number(
            (
              validDistances.reduce((acc, curr) => acc + curr.distancia, 0) /
              validDistances.length
            ).toFixed(1)
          )
        : null;

    // Tiempos válidos: no descalificados y con tiempoSegundos > 0
    const validTimes = filteredResults.filter(
      (r) => !r.descalificado && typeof r.tiempoSegundos === 'number' && r.tiempoSegundos > 0
    );

    const uniqueDistancesInTimes = new Set(validTimes.map((r) => r.distancia));

    let mejorTiempoFormateado: string | null = null;
    let tiempoPromedioFormateado: string | null = null;
    let carreraMejorTiempo: string | null = null;

    // Solo calculamos mejor tiempo y tiempo promedio si:
    // 1) Se seleccionó una distancia específica, O
    // 2) Se seleccionó 'todas' pero el corredor solo corrió una única distancia en su historial.
    // Esto previene estrictamente mezclar tiempos de diferentes distancias.
    if (selectedDistancia !== 'todas' || uniqueDistancesInTimes.size === 1) {
      if (validTimes.length > 0) {
        let mejorRegistro = validTimes[0];
        for (const r of validTimes) {
          if ((r.tiempoSegundos || Infinity) < (mejorRegistro.tiempoSegundos || Infinity)) {
            mejorRegistro = r;
          }
        }
        mejorTiempoFormateado = formatSeconds(mejorRegistro.tiempoSegundos);
        carreraMejorTiempo = `${mejorRegistro.nombreCarrera} (${mejorRegistro.distancia}k)`;

        const sumaSegundos = validTimes.reduce((acc, curr) => acc + (curr.tiempoSegundos || 0), 0);
        const promedioSegundos = Math.round(sumaSegundos / validTimes.length);
        tiempoPromedioFormateado = formatSeconds(promedioSegundos);
      }
    } else {
      mejorTiempoFormateado = null;
      tiempoPromedioFormateado = null;
    }

    return {
      totalCarreras,
      distanciaPromedio,
      mejorTiempoFormateado,
      tiempoPromedioFormateado,
      carreraMejorTiempo,
      isMultipleDistancesInTodas: selectedDistancia === 'todas' && uniqueDistancesInTimes.size > 1,
    };
  }, [filteredResults, selectedDistancia]);

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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mis Datos y Estadísticas</h2>
        <p className="text-slate-500 mt-1">
          Análisis de tu rendimiento histórico en MateRun. Información oficial administrada por la organización.
        </p>
      </div>

      {/* Barra de Filtro por Distancia */}
      <div className="card-panel bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-machine/10 text-machine flex items-center justify-center shrink-0">
            <Filter className="w-5 h-5 text-machine" />
          </div>
          <div>
            <label htmlFor="distancia-filter" className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Distancia
            </label>
            <p className="text-sm font-semibold text-slate-700">
              Filtrar estadísticas por distancia recorrida
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector principal */}
          <div className="relative">
            <select
              id="distancia-filter"
              value={selectedDistancia}
              onChange={(e) => setSelectedDistancia(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-lg focus:ring-machine focus:border-machine py-2 px-3 shadow-2xs min-w-[200px]"
            >
              <option value="todas">Todas las distancias</option>
              {availableDistances.map((dist) => (
                <option key={dist} value={dist.toString()}>
                  {dist}k ({dist} km)
                </option>
              ))}
            </select>
          </div>

          {/* Botones de acceso rápido tipo pastilla */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedDistancia('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedDistancia === 'todas'
                  ? 'bg-machine text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas
            </button>
            {availableDistances.map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => setSelectedDistancia(dist.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedDistancia === dist.toString()
                    ? 'bg-machine text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {dist}k
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Métricas */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${selectedDistancia === 'todas' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {/* Carreras Corridas */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Carreras</p>
            <p className="text-2xl font-black text-slate-800">{computedStats.totalCarreras}</p>
          </div>
        </div>

        {/* Distancia Promedio (Solo visible cuando se selecciona 'todas') */}
        {selectedDistancia === 'todas' && (
          <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
              <Map className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Distancia Promedio</p>
              <div className="mt-0.5">
                {computedStats.distanciaPromedio != null ? (
                  <p className="text-2xl font-black text-slate-800">
                    {computedStats.distanciaPromedio} <span className="text-sm font-semibold text-slate-500">km</span>
                  </p>
                ) : (
                  renderPendingBadge()
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mejor Tiempo */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Mejor Tiempo</p>
            <div className="mt-0.5">
              {computedStats.mejorTiempoFormateado ? (
                <div>
                  <p className="text-2xl font-black text-slate-800 font-mono">{computedStats.mejorTiempoFormateado}</p>
                  {computedStats.carreraMejorTiempo && (
                    <p className="text-[11px] text-slate-400 truncate max-w-[170px]" title={computedStats.carreraMejorTiempo}>
                      {computedStats.carreraMejorTiempo}
                    </p>
                  )}
                </div>
              ) : computedStats.isMultipleDistancesInTodas ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  Seleccionar distancia
                </span>
              ) : (
                renderPendingBadge()
              )}
            </div>
          </div>
        </div>

        {/* Tiempo Promedio */}
        <div className="card-panel bg-white border-l-4 border-l-machine flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Tiempo Promedio</p>
            <div className="mt-0.5">
              {computedStats.tiempoPromedioFormateado ? (
                <p className="text-2xl font-black text-slate-800 font-mono">{computedStats.tiempoPromedioFormateado}</p>
              ) : computedStats.isMultipleDistancesInTodas ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  Seleccionar distancia
                </span>
              ) : (
                renderPendingBadge()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historial Detallado */}
      <div className="card-panel mt-8">
        <div className="border-b border-slate-100 pb-3 mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Historial de Carreras Oficiales
          </h2>
          {selectedDistancia !== 'todas' && (
            <span className="text-xs font-medium text-slate-500">
              Mostrando solo carreras de <span className="font-bold text-machine">{selectedDistancia}k</span> ({filteredResults.length})
            </span>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-md">Fecha</th>
                <th className="px-4 py-3 font-semibold">Carrera</th>
                <th className="px-4 py-3 font-semibold text-center">Distancia</th>
                <th className="px-4 py-3 font-semibold text-center">Tiempo</th>
                <th className="px-4 py-3 font-semibold text-center">Pos. General</th>
                <th className="px-4 py-3 font-semibold text-center">Pos. Sexo</th>
                <th className="px-4 py-3 font-semibold text-center rounded-tr-md">Pos. Categoría</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                    No hay carreras registradas para la distancia seleccionada ({selectedDistancia}k).
                  </td>
                </tr>
              ) : (
                filteredResults.map((hist, idx) => (
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
                            🥇 #1 Gral
                          </span>
                        ) : hist.posicionGeneral === 2 ? (
                          <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥈 #2 Gral
                          </span>
                        ) : hist.posicionGeneral === 3 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-900/10 text-amber-900 border border-amber-900/20 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥉 #3 Gral
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

                    {/* Posición Sexo */}
                    <td className="px-4 py-3.5 text-center">
                      {hist.descalificado ? (
                        <span className="text-slate-400 font-bold text-xs">-</span>
                      ) : hist.posicionSexo != null && hist.posicionSexo > 0 ? (
                        hist.posicionSexo === 1 ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥇 1.º Sexo
                          </span>
                        ) : hist.posicionSexo === 2 ? (
                          <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥈 2.º Sexo
                          </span>
                        ) : hist.posicionSexo === 3 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-900/10 text-amber-900 border border-amber-900/20 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥉 3.º Sexo
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-xs font-bold">
                            #{hist.posicionSexo} Sexo
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
                        hist.posicionCategoria === 1 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥇 1.º {hist.categoria ? `en cat. ${hist.categoria}` : ''}
                          </span>
                        ) : hist.posicionCategoria === 2 ? (
                          <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-800 border border-slate-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥈 2.º {hist.categoria ? `en cat. ${hist.categoria}` : ''}
                          </span>
                        ) : hist.posicionCategoria === 3 ? (
                          <span className="inline-flex items-center gap-1 bg-amber-900/10 text-amber-900 border border-amber-900/20 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                            🥉 3.º {hist.categoria ? `en cat. ${hist.categoria}` : ''}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            {hist.categoria 
                              ? `#${hist.posicionCategoria} en categoría ${hist.categoria}`
                              : `#${hist.posicionCategoria}`
                            }
                          </span>
                        )
                      ) : (
                        renderPendingBadge()
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
