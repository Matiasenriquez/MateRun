/**
 * ==============================================================================
 * PANEL DE CONTROL PARA SUPERADMIN (SuperAdminDashboard.tsx) - MateRun
 * ==============================================================================
 * Vista principal exclusiva para el rol "superadmin".
 * 
 * Estructura de la vista:
 * 1. Métricas Globales: Tarjetas superiores de resumen general de la plataforma.
 * 2. Carreras Creadas: Tarjetas horizontales de cada evento deportivo creado.
 *    - Cada tarjeta cuenta con un botón explícito "Ingresar".
 *    - El acceso a la Nómina de Inscriptos se realiza exclusivamente mediante
 *      dicho botón para evitar clics accidentales o ingresos involuntarios.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Race } from '../../types';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Layers, 
  ArrowRight, 
  Award
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Lista de todas las carreras registradas en la plataforma
  const [races, setRaces] = useState<Race[]>([]);
  const [isRacesLoading, setIsRacesLoading] = useState<boolean>(true);

  // Estados para alertas y errores
  const [errorMsg, setErrorMsg] = useState<string>('');

  /**
   * Efecto: Carga inicial de todas las carreras creadas en el sistema
   */
  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      setIsRacesLoading(true);
      const res = await api.get('/races');
      setRaces(res.data.races || []);
    } catch (err: any) {
      console.error('Error al cargar carreras en el panel de SuperAdmin:', err);
      setErrorMsg('No se pudieron cargar las carreras del sistema.');
    } finally {
      setIsRacesLoading(false);
    }
  };


  /**
   * Manejador para el botón "Ingresar":
   * Redirige al SuperAdmin de forma intencional y explícita a la página
   * independiente de la Nómina de Inscriptos de la carrera elegida.
   */
  const handleEnterRaceRoster = (raceId: string) => {
    navigate(`/admin/race-roster/${raceId}`);
  };

  // Métricas agregadas para la cabecera
  const totalCupos = races.reduce((acc, curr) => acc + (curr.cupoMaximo || 0), 0);
  const totalInscriptos = races.reduce((acc, curr) => acc + (curr.totalInscriptos || 0), 0);
  const carrerasActivas = races.filter(r => r.estado === 'activa').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      
      {/* ENCABEZADO PRINCIPAL DE LA VISTA */}
      <div className="border-b border-slate-200 pb-5">
        <span className="text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-1 rounded">
          Panel de Control • SuperAdmin
        </span>
        <h1 className="text-2xl font-black text-slate-800 mt-2 tracking-tight">
          Carreras y Eventos Deportivos
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Gestiona y supervisa las carreras del sistema. Utiliza el botón "Ingresar" de cada tarjeta para acceder a la nómina oficial de inscriptos.
        </p>
      </div>

      {/* MÉTRICAS DE RESUMEN GLOBAL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-machine-light text-machine flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Carreras</p>
            <p className="text-2xl font-black text-slate-800">{races.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Carreras Activas</p>
            <p className="text-2xl font-black text-slate-800">{carrerasActivas}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Inscriptos Registrados</p>
            <p className="text-2xl font-black text-slate-800">
              {totalInscriptos} <span className="text-xs font-semibold text-slate-400">/ {totalCupos} cupos totales</span>
            </p>
          </div>
        </div>
      </div>

      {/* MENSAJE DE ERROR GLOBAL */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* ========================================================================
          SECCIÓN: TARJETAS HORIZONTALES DE CARRERAS CREADAS
          ======================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-machine" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Carreras Creadas en el Sistema
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {races.length} eventos en total
          </span>
        </div>

        {isRacesLoading ? (
          <div className="flex justify-center p-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
          </div>
        ) : races.length === 0 ? (
          <div className="card-panel text-center py-16">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No hay carreras creadas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Comienza creando una nueva carrera desde la sección "Gestión de Carreras" en el menú superior.
            </p>
          </div>
        ) : (
          /* Listado amplio y espacioso de tarjetas horizontales */
          <div className="space-y-4">
            {races.map((race) => {
              const fecha = new Date(race.fecha);
              const cuposDisp = race.cuposDisponibles ?? race.cupoMaximo;
              const inscriptosActivos = race.totalInscriptos ?? (race.cupoMaximo - cuposDisp);
              const isPast = fecha < new Date() || race.estado === 'finalizada';

              return (
                <div
                  key={race._id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  {/* BLOQUE IZQUIERDO: FECHA Y DETALLES PRINCIPALES */}
                  <div className="flex items-start gap-4 flex-1">
                    
                    {/* Fecha deportiva */}
                    <div className={`text-center rounded-xl p-3 leading-tight shrink-0 w-16 ${
                      isPast 
                        ? 'bg-slate-100 text-slate-500' 
                        : 'bg-machine-light text-machine font-black'
                    }`}>
                      <span className="block text-2xl font-black">{fecha.getDate()}</span>
                      <span className="block text-[10px] uppercase font-bold tracking-wider">
                        {fecha.toLocaleString('es-AR', { month: 'short' })}
                      </span>
                    </div>

                    {/* Información de la carrera */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-800 leading-snug">
                          {race.nombre}
                        </h3>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isPast ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'
                        }`}>
                          {isPast ? 'Finalizada / Cerrada' : 'Activa'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{race.lugar}</span>
                      </p>

                      {/* Chips con las distancias habilitadas */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 mr-1">Distancias:</span>
                        {race.distancias?.map((d) => (
                          <span
                            key={d}
                            className="bg-slate-100 text-slate-700 font-bold text-[11px] px-2 py-0.5 rounded-md border border-slate-200/60"
                          >
                            {d}K
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* BLOQUE CENTRAL: CUPOS E INSCRIPTOS */}
                  <div className="flex items-center gap-4 md:border-l md:border-r border-slate-100 md:px-6 py-1 shrink-0">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inscriptos / Cupo</p>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {inscriptosActivos} <span className="text-xs font-semibold text-slate-400">/ {race.cupoMaximo}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Disponibles: <strong className="text-machine font-bold">{cuposDisp}</strong>
                      </p>
                    </div>
                  </div>

                  {/* BLOQUE DERECHO: BOTÓN "INGRESAR" EXCLUSIVO */}
                  <div className="flex items-center md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleEnterRaceRoster(String(race._id))}
                      className="btn-primary w-full md:w-auto px-6 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all group"
                      title={`Ingresar a la nómina de inscriptos de ${race.nombre}`}
                    >
                      <span>Ingresar</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default SuperAdminDashboard;
