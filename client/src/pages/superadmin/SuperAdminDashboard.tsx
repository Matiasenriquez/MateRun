/**
 * ==============================================================================
 * PANEL DE CONTROL PARA SUPERADMIN (SuperAdminDashboard.tsx) - MateRun
 * ==============================================================================
 * Vista principal exclusiva para el rol "superadmin".
 * 
 * Estructura de la vista:
 * 1. Métricas Globales: Tarjetas superiores de resumen general de la plataforma.
 * 2. Filtros Combinados por Año y Mes: Permiten localizar carreras de acuerdo con
 *    el año y mes del evento deportivo.
 * 3. Carreras Creadas: Tarjetas horizontales de cada evento deportivo creado.
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
  Award,
  Filter,
  X,
  Tag,
  Eye,
  EyeOff
} from 'lucide-react';

/**
 * Lista de meses para el filtro combinado
 */
const MESES = [
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

export const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Lista de todas las carreras registradas en la plataforma
  const [races, setRaces] = useState<Race[]>([]);
  const [isRacesLoading, setIsRacesLoading] = useState<boolean>(true);

  // Filtros combinados por Año y Mes
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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

  // Años disponibles extraídos de las fechas de las carreras creadas
  const availableYears = Array.from(
    new Set(
      races
        .map((r) => {
          try {
            return new Date(r.fecha).getFullYear().toString();
          } catch {
            return null;
          }
        })
        .filter((y): y is string => Boolean(y) && !isNaN(Number(y)))
    )
  ).sort((a, b) => Number(b) - Number(a));

  /**
   * Filtrado combinado por Año y Mes:
   * Cuando se selecciona un año y un mes, se muestran únicamente las carreras
   * que coincidan con ambos criterios.
   */
  const filteredRaces = races.filter((race) => {
    if (!race.fecha) return true;
    try {
      const raceDate = new Date(race.fecha);
      const raceYear = raceDate.getFullYear().toString();
      const raceMonth = raceDate.getMonth().toString();

      // Filtro por Año
      if (selectedYear && raceYear !== selectedYear) {
        return false;
      }

      // Filtro por Mes
      if (selectedMonth !== '' && raceMonth !== selectedMonth) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  });

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
          SECCIÓN: TARJETAS HORIZONTALES DE CARRERAS CREADAS CON FILTROS AÑO Y MES
          ======================================================================== */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-machine" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Carreras Creadas en el Sistema
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Mostrando {filteredRaces.length} de {races.length} eventos
          </span>
        </div>

        {/* BARRA DE FILTROS POR AÑO Y MES COMBINADOS */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-machine" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Localizar carreras por fecha:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filtro Año */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-year" className="text-xs font-semibold text-slate-500">
                Año:
              </label>
              <select
                id="filter-year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all min-w-[130px]"
              >
                <option value="">Todos los años</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Mes */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-month" className="text-xs font-semibold text-slate-500">
                Mes:
              </label>
              <select
                id="filter-month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all min-w-[140px]"
              >
                <option value="">Todos los meses</option>
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón Limpiar Filtros */}
            {(selectedYear !== '' || selectedMonth !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedYear('');
                  setSelectedMonth('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Limpiar filtros de año y mes"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}

          </div>
        </div>

        {isRacesLoading ? (
          <div className="flex justify-center p-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
          </div>
        ) : races.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 text-center py-16 p-6">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No hay carreras creadas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Comienza creando una nueva carrera desde la sección "Gestión de Carreras" en el menú superior.
            </p>
          </div>
        ) : filteredRaces.length === 0 ? (
          /* Estado cuando los filtros de año/mes no devuelven coincidencias */
          <div className="bg-white rounded-2xl border border-slate-200 text-center py-16 p-6">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              No se encontraron carreras para los filtros seleccionados
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              No hay eventos programados que coincidan simultáneamente con{' '}
              {selectedYear ? `el año ${selectedYear}` : ''}
              {selectedYear && selectedMonth !== '' ? ' y ' : ''}
              {selectedMonth !== '' ? `el mes de ${MESES.find(m => m.value === selectedMonth)?.label}` : ''}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedYear('');
                setSelectedMonth('');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          /* Listado amplio y espacioso de tarjetas horizontales */
          <div className="space-y-4">
            {filteredRaces.map((race) => {
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
                        : 'bg-machine-light text-machine font-bold'
                    }`}>
                      <span className="block text-2xl font-black">
                        {fecha.getDate() || '1'}
                      </span>
                      <span className="block text-[10px] uppercase font-bold tracking-wider">
                        {fecha.toLocaleString('es-AR', { month: 'short' })}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-semibold">
                        {fecha.getFullYear()}
                      </span>
                    </div>

                    {/* Información de la carrera */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          race.estado === 'activa' && !isPast
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPast ? 'Finalizada' : race.estado}
                        </span>

                        {/* Badge de Visibilidad para SuperAdmin */}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          race.visibilidad === 'Oculta'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {race.visibilidad === 'Oculta' ? (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-500" />
                              <span>Oculta</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>Visible</span>
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-slate-600 font-medium">{race.lugar}</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-black text-slate-800 leading-snug">
                        {race.nombre}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                        {/* Chips de Distancias */}
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <div className="flex gap-1">
                            {race.distancias?.map((d) => (
                              <span
                                key={d}
                                className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]"
                              >
                                {d}k
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Organizador */}
                        {race.organizador && (
                          <span className="text-slate-400">
                            Org: <strong className="text-slate-600 font-semibold">{race.organizador}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE DERECHO: MÉTRICAS DE CUPOS Y BOTÓN DE ACCIÓN ("Ingresar") */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    
                    {/* Contador de inscriptos vs cupo máximo */}
                    <div className="text-left md:text-right">
                      <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                        Inscriptos
                      </p>
                      <p className="text-lg font-black text-slate-800">
                        {inscriptosActivos} <span className="text-xs font-semibold text-slate-400">/ {race.cupoMaximo}</span>
                      </p>
                    </div>

                    {/* BOTÓN EXPLÍCITO: INGRESAR */}
                    <button
                      type="button"
                      onClick={() => handleEnterRaceRoster(race._id)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-xl shadow-xs transition-all cursor-pointer group"
                      title={`Ingresar a la nómina de inscriptos de ${race.nombre}`}
                    >
                      <span>Ingresar</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
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
