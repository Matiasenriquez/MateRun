/**
 * ==============================================================================
 * VISTA: INFORMES Y REPORTES DE CARRERA (RaceReports.tsx) - SuperAdmin
 * ==============================================================================
 * Nueva sección destinada exclusivamente a la visualización y consulta de información
 * sobre los corredores inscriptos en una carrera individual.
 * 
 * Reglas de negocio y especificaciones:
 * 1. Acceso independiente por carrera (/admin/race-reports/:raceId).
 * 2. Tabla de informes: Visualiza la cantidad de corredores inscriptos agrupados por:
 *    - Distancia (ej: 21k)
 *    - Categoría de edad (ej: 30-35)
 *    - Sexo (Hombres / Mujeres)
 *    - Cantidad (contador automático en tiempo real)
 *    - Acción: Botón "Ver inscriptos"
 * 3. Botón "Ver inscriptos": Despliega la lista detallada de corredores que forman
 *    parte de ese grupo específico. La cantidad mostrada coincide exactamente con
 *    el número indicado en la columna "Cantidad".
 * 4. Carácter meramente informativo y de consulta:
 *    - Exclusivamente de solo lectura.
 *    - No permite modificar datos, eliminar inscripciones ni cambiar estados.
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  Calendar,
  History,
  Trophy,
  Users,
  Search,
  Eye,
  RefreshCw,
  Tag,
  MapPin,
  X,
  FileSpreadsheet,
  AlertCircle,
  ShieldAlert,
  Info
} from 'lucide-react';
import api from '../../api/api';
import { ReportGroup, RaceReportsData } from '../../types';

export const RaceReports: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados de datos
  const [reportsData, setReportsData] = useState<RaceReportsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de filtrado en la tabla de informes
  const [selectedDistance, setSelectedDistance] = useState<string>('all');
  const [selectedSexo, setSelectedSexo] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hideZeroCount, setHideZeroCount] = useState<boolean>(true);

  // Estado del modal "Ver Inscriptos"
  const [selectedGroupModal, setSelectedGroupModal] = useState<ReportGroup | null>(null);
  const [modalSexoTab, setModalSexoTab] = useState<'all' | 'Hombres' | 'Mujeres'>('all');
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');

  /**
   * Abre el modal de inscriptos permitiendo preseleccionar sexo o ver todos
   */
  const handleOpenModal = (group: ReportGroup, initialTab: 'all' | 'Hombres' | 'Mujeres' = 'all') => {
    setSelectedGroupModal(group);
    if (initialTab === 'Hombres' && group.cantidadHombres === 0 && group.cantidadMujeres > 0) {
      setModalSexoTab('Mujeres');
    } else if (initialTab === 'Mujeres' && group.cantidadMujeres === 0 && group.cantidadHombres > 0) {
      setModalSexoTab('Hombres');
    } else {
      setModalSexoTab(initialTab);
    }
    setModalSearchTerm('');
  };

  /**
   * Carga el reporte consolidado de la carrera desde la API
   */
  const fetchReports = useCallback(async (isRefresh = false) => {
    if (!raceId) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const response = await api.get(`/reports/race/${raceId}`);
      if (response.data && response.data.success) {
        setReportsData(response.data);
      } else {
        setErrorMessage('No se pudieron obtener los datos del informe.');
      }
    } catch (err: any) {
      console.error('Error al cargar informes de la carrera:', err);
      setErrorMessage(
        err.response?.data?.message ||
        'Ocurrió un error al cargar el informe de la carrera. Por favor, reintente.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [raceId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Carrera obtenida del reporte
  const race = reportsData?.race;
  const totals = reportsData?.totals;
  const groups = reportsData?.groups || [];

  /**
   * Distancias disponibles para el filtro
   */
  const availableDistances = useMemo(() => {
    const setDist = new Set<number>();
    if (race?.distancias) {
      race.distancias.forEach((d) => setDist.add(d));
    }
    groups.forEach((g) => setDist.add(g.distancia));
    return Array.from(setDist).sort((a, b) => a - b);
  }, [race, groups]);

  /**
   * Grupos filtrados según los criterios seleccionados
   */
  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      // 1. Filtro por Distancia
      if (selectedDistance !== 'all' && group.distancia.toString() !== selectedDistance) {
        return false;
      }

      // 2. Filtro por Sexo
      if (selectedSexo === 'Hombres' && group.cantidadHombres === 0) {
        return false;
      }
      if (selectedSexo === 'Mujeres' && group.cantidadMujeres === 0) {
        return false;
      }
      if (selectedSexo === 'Ambos' && (group.cantidadHombres === 0 || group.cantidadMujeres === 0)) {
        return false;
      }

      // 3. Filtro para ocultar grupos con 0 inscriptos
      const groupTotal = group.total ?? group.cantidad ?? 0;
      if (hideZeroCount && groupTotal === 0) {
        return false;
      }

      // 4. Filtro por texto de búsqueda (categoría o distancia)
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase().trim();
        const catMatch = group.categoria.toLowerCase().includes(term);
        const distMatch = group.distanciaLabel.toLowerCase().includes(term);
        if (!catMatch && !distMatch) {
          return false;
        }
      }

      return true;
    });
  }, [groups, selectedDistance, selectedSexo, hideZeroCount, searchTerm]);

  /**
   * Total de inscriptos en los grupos filtrados actualmente
   */
  const totalInscriptosFiltrados = useMemo(() => {
    return filteredGroups.reduce((acc, curr) => acc + (curr.total ?? curr.cantidad ?? 0), 0);
  }, [filteredGroups]);

  const totalHombresFiltrados = useMemo(() => {
    return filteredGroups.reduce((acc, curr) => acc + (curr.cantidadHombres ?? 0), 0);
  }, [filteredGroups]);

  const totalMujeresFiltrados = useMemo(() => {
    return filteredGroups.reduce((acc, curr) => acc + (curr.cantidadMujeres ?? 0), 0);
  }, [filteredGroups]);

  /**
   * Corredores activos según la pestaña seleccionada en el modal
   */
  const modalRunnersByTab = useMemo(() => {
    if (!selectedGroupModal) return [];
    if (modalSexoTab === 'Hombres') return selectedGroupModal.inscriptosHombres || [];
    if (modalSexoTab === 'Mujeres') return selectedGroupModal.inscriptosMujeres || [];
    return selectedGroupModal.inscriptosTodos || selectedGroupModal.inscriptos || [];
  }, [selectedGroupModal, modalSexoTab]);

  /**
   * Corredores filtrados dentro del modal "Ver Inscriptos"
   */
  const modalFilteredRunners = useMemo(() => {
    if (!modalSearchTerm.trim()) return modalRunnersByTab;

    const term = modalSearchTerm.toLowerCase().trim();
    return modalRunnersByTab.filter((r) => {
      const d = r.datosCorredor || {};
      const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.toLowerCase();
      const dni = String(d.dni || '').toLowerCase();
      const dorsal = String(r.dorsal || '').toLowerCase();
      const email = String(d.email || '').toLowerCase();
      const ciudad = String(d.ciudad || '').toLowerCase();

      return (
        nombreCompleto.includes(term) ||
        dni.includes(term) ||
        dorsal.includes(term) ||
        email.includes(term) ||
        ciudad.includes(term)
      );
    });
  }, [modalRunnersByTab, modalSearchTerm]);

  /**
   * Formateador de fecha deportiva
   */
  const formatRaceDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Calcula la edad a partir de la fecha de nacimiento
   */
  const formatAge = (birthDateString?: string) => {
    if (!birthDateString) return '-';
    try {
      const birth = new Date(birthDateString);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return `${age} años`;
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN Y ACCIONES                               */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Enlaces de regreso */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/admin/race-roster/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Volver a la nómina oficial de inscriptos"
          >
            <ArrowLeft className="w-4 h-4 text-machine" />
            <span>Nómina de Inscriptos</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Volver al panel principal"
          >
            <span>Panel de Control</span>
          </button>
        </div>

        {/* Botones de acción cruzada (Historial, Resultados y Actualizar) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(`/admin/race-history/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Ver historial oficial de la carrera"
          >
            <History className="w-4 h-4 text-machine" />
            <span>Historial</span>
          </button>

          {user?.rol === 'superadmin' && (
            <button
              type="button"
              onClick={() => navigate(`/admin/race-results/${raceId}`)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Gestionar resultados oficiales de la carrera"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Cargar Resultados</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchReports(true)}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            title="Actualizar datos del informe en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-machine ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ENCABEZADO DE LA CARRERA Y AVISO DE CARÁCTER INFORMATIVO              */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex flex-col gap-4">
          <div className="h-6 w-72 bg-slate-200 rounded"></div>
          <div className="h-4 w-96 bg-slate-100 rounded"></div>
        </div>
      ) : race ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-1 rounded-md">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-machine" />
                  Sección Oficial de Informes
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                    race.estado === 'activa'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {race.estado}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {race.nombre}
              </h1>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 capitalize">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatRaceDate(race.fecha)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {race.lugar}
                </span>
                {race.organizador && (
                  <span>
                    Org: <strong className="text-slate-700 font-semibold">{race.organizador}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Badges de distancias */}
            <div className="flex flex-col items-start md:items-end gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Distancias habilitadas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {race.distancias?.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {d}k
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Banner explícito de solo lectura y carácter informativo */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-start sm:items-center gap-3 text-xs text-blue-900">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong>Carácter exclusivamente informativo y de consulta:</strong> Esta sección permite analizar la
              distribución de corredores inscriptos por distancia, categoría y sexo. Los datos son de{' '}
              <strong>solo lectura</strong> y no permiten alterar estados ni registros.
            </p>
          </div>
        </div>
      ) : null}

      {/* Alerta de error si ocurre */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TARJETAS DE MÉTRICAS Y TOTALES CONSOLIDADOS                            */}
      {/* ========================================================================= */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Inscriptos */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Inscriptos
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {totals.totalInscriptos}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {race?.cupoMaximo ? `Cupo: ${race.cupoMaximo}` : 'Corredores activos'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-machine-light text-machine flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Total Hombres */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                Hombres Inscriptos
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {totals.totalHombres}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {totals.totalInscriptos > 0
                  ? `${Math.round((totals.totalHombres / totals.totalInscriptos) * 100)}% del total`
                  : '0% del total'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Total Mujeres */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
                Mujeres Inscriptas
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {totals.totalMujeres}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {totals.totalInscriptos > 0
                  ? `${Math.round((totals.totalMujeres / totals.totalInscriptos) * 100)}% del total`
                  : '0% del total'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Grupos / Categorías activas */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Categorías con Inscriptos
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                {groups.filter((g) => (g.total ?? g.cantidad ?? 0) > 0).length}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {groups.length} combinaciones
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <Tag className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SECCIÓN PRINCIPAL: TABLA DE INFORMES Y FILTROS                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Barra de herramientas y filtros */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-machine" />
              <span>Tabla de Informes por Distancia, Categoría y Sexo</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualización unificada por distancia y categoría con recuento discriminado de hombres y mujeres.
            </p>
          </div>

          {/* Filtros de la tabla */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Buscador de Categoría / Texto */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar categoría o distancia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Selector de Distancia */}
            <select
              value={selectedDistance}
              onChange={(e) => setSelectedDistance(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all min-w-[130px]"
              title="Filtrar por distancia"
            >
              <option value="all">Distancias (Todas)</option>
              {availableDistances.map((d) => (
                <option key={d} value={d.toString()}>
                  {d}k
                </option>
              ))}
            </select>

            {/* Selector de Sexo */}
            <select
              value={selectedSexo}
              onChange={(e) => setSelectedSexo(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all min-w-[140px]"
              title="Filtrar por sexo"
            >
              <option value="all">Sexo (Todos)</option>
              <option value="Hombres">Con Hombres (&gt;0)</option>
              <option value="Mujeres">Con Mujeres (&gt;0)</option>
              <option value="Ambos">Con Ambos (&gt;0)</option>
            </select>

            {/* Checkbox: Ocultar vacíos */}
            <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                checked={hideZeroCount}
                onChange={(e) => setHideZeroCount(e.target.checked)}
                className="rounded text-machine focus:ring-machine h-4 w-4"
              />
              <span>Solo con inscriptos (&gt;0)</span>
            </label>

            {/* Limpiar filtros si alguno está activo */}
            {(selectedDistance !== 'all' || selectedSexo !== 'all' || searchTerm.trim() !== '' || !hideZeroCount) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDistance('all');
                  setSelectedSexo('all');
                  setSearchTerm('');
                  setHideZeroCount(true);
                }}
                className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Restablecer todos los filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* TABLA PRINCIPAL DE INFORMES                                             */}
        {/* ======================================================================= */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none">
              <tr>
                <th className="px-6 py-4">Distancia</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Hombres</th>
                <th className="px-6 py-4 text-center">Cantidad</th>
                <th className="px-6 py-4">Mujeres</th>
                <th className="px-6 py-4 text-center">Cantidad</th>
                <th className="px-6 py-4 text-center">Ver inscriptos</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-3 border-slate-200 border-t-machine rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-slate-500">Cargando informes de la carrera...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="max-w-md mx-auto space-y-2">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-700">
                        No se encontraron filas en el informe
                      </h3>
                      <p className="text-xs text-slate-500">
                        No hay registros que coincidan con los filtros seleccionados. Intenta desactivar el filtro de
                        "Solo con inscriptos" o restablecer la búsqueda.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => {
                  return (
                    <tr
                      key={group.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. DISTANCIA */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                          {group.distanciaLabel}
                        </span>
                      </td>

                      {/* 2. CATEGORÍA */}
                      <td className="px-6 py-4 font-bold text-slate-800 text-xs sm:text-sm">
                        {group.categoria}
                      </td>

                      {/* 3. HOMBRES */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>Hombres</span>
                        </span>
                      </td>

                      {/* 4. CANTIDAD (HOMBRES) */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => group.cantidadHombres > 0 && handleOpenModal(group, 'Hombres')}
                          disabled={group.cantidadHombres === 0}
                          className={`inline-flex items-center justify-center min-w-[42px] px-3 py-1 rounded-full text-xs font-black transition-all ${
                            group.cantidadHombres > 0
                              ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs hover:bg-blue-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                          }`}
                          title={group.cantidadHombres > 0 ? `Consultar los ${group.cantidadHombres} hombres inscriptos` : '0 hombres inscriptos'}
                        >
                          {group.cantidadHombres}
                        </button>
                      </td>

                      {/* 5. MUJERES */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <Users className="w-3.5 h-3.5 text-rose-600" />
                          <span>Mujeres</span>
                        </span>
                      </td>

                      {/* 6. CANTIDAD (MUJERES) */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => group.cantidadMujeres > 0 && handleOpenModal(group, 'Mujeres')}
                          disabled={group.cantidadMujeres === 0}
                          className={`inline-flex items-center justify-center min-w-[42px] px-3 py-1 rounded-full text-xs font-black transition-all ${
                            group.cantidadMujeres > 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs hover:bg-rose-200 cursor-pointer'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                          }`}
                          title={group.cantidadMujeres > 0 ? `Consultar las ${group.cantidadMujeres} mujeres inscriptas` : '0 mujeres inscriptas'}
                        >
                          {group.cantidadMujeres}
                        </button>
                      </td>

                      {/* 7. VER INSCRIPTOS */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(group, 'all')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-machine hover:text-machine-dark bg-machine-light hover:bg-emerald-100/70 border border-machine/20 rounded-lg shadow-2xs transition-all cursor-pointer"
                            title={`Ver inscriptos de ${group.distanciaLabel} — ${group.categoria}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver inscriptos</span>
                          </button>

                          {/* Accesos directos rápidos para Hombres y Mujeres */}
                          <button
                            type="button"
                            onClick={() => handleOpenModal(group, 'Hombres')}
                            disabled={group.cantidadHombres === 0}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              group.cantidadHombres > 0
                                ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 cursor-pointer shadow-2xs'
                                : 'text-slate-300 bg-slate-50 border border-slate-100 cursor-not-allowed opacity-50'
                            }`}
                            title={group.cantidadHombres > 0 ? `Consultar Hombres (${group.cantidadHombres})` : 'Sin hombres inscriptos'}
                          >
                            <span className="text-[10px] uppercase font-black">H</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenModal(group, 'Mujeres')}
                            disabled={group.cantidadMujeres === 0}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                              group.cantidadMujeres > 0
                                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer shadow-2xs'
                                : 'text-slate-300 bg-slate-50 border border-slate-100 cursor-not-allowed opacity-50'
                            }`}
                            title={group.cantidadMujeres > 0 ? `Consultar Mujeres (${group.cantidadMujeres})` : 'Sin mujeres inscriptas'}
                          >
                            <span className="text-[10px] uppercase font-black">M</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla con resumen */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Mostrando <strong>{filteredGroups.length}</strong> {filteredGroups.length === 1 ? 'categoría' : 'categorías'} con un
            total de <strong>{totalInscriptosFiltrados}</strong> inscriptos (<strong>{totalHombresFiltrados}</strong> hombres, <strong>{totalMujeresFiltrados}</strong> mujeres).
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Actualizado en tiempo real</span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL "VER INSCRIPTOS": LISTA DETALLADA DE CORREDORES                   */}
      {/* ========================================================================= */}
      {selectedGroupModal && (() => {
        const activeCount = modalSexoTab === 'Hombres'
          ? selectedGroupModal.cantidadHombres
          : modalSexoTab === 'Mujeres'
          ? selectedGroupModal.cantidadMujeres
          : selectedGroupModal.total;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              {/* Cabecera del Modal */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-machine text-white">
                      {selectedGroupModal.distanciaLabel}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-slate-200 text-slate-800">
                      Categoría {selectedGroupModal.categoria}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mt-2">
                    Nómina de Inscriptos: {selectedGroupModal.distanciaLabel} — {selectedGroupModal.categoria}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>Cantidad registrada:</span>
                    <strong className={`px-2 py-0.5 rounded font-black ${
                      modalSexoTab === 'Hombres'
                        ? 'bg-blue-100 text-blue-800'
                        : modalSexoTab === 'Mujeres'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {modalSexoTab === 'Hombres'
                        ? `${selectedGroupModal.cantidadHombres} ${selectedGroupModal.cantidadHombres === 1 ? 'hombre' : 'hombres'}`
                        : modalSexoTab === 'Mujeres'
                        ? `${selectedGroupModal.cantidadMujeres} ${selectedGroupModal.cantidadMujeres === 1 ? 'mujer' : 'mujeres'}`
                        : `${selectedGroupModal.total} ${selectedGroupModal.total === 1 ? 'corredor' : 'corredores'}`}
                    </strong>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-500 italic">
                      Coincide con la columna "Cantidad"{modalSexoTab !== 'all' ? ` de ${modalSexoTab}` : ''}
                    </span>
                  </p>

                  {/* Selector de pestañas para distinguir Hombres, Mujeres o Todos */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200/80">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                      Consultar por sexo:
                    </span>

                    {/* Tab: Hombres */}
                    <button
                      type="button"
                      onClick={() => setModalSexoTab('Hombres')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalSexoTab === 'Hombres'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Hombres</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        modalSexoTab === 'Hombres' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-800'
                      }`}>
                        {selectedGroupModal.cantidadHombres}
                      </span>
                    </button>

                    {/* Tab: Mujeres */}
                    <button
                      type="button"
                      onClick={() => setModalSexoTab('Mujeres')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalSexoTab === 'Mujeres'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Mujeres</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        modalSexoTab === 'Mujeres' ? 'bg-white/20 text-white' : 'bg-rose-200 text-rose-800'
                      }`}>
                        {selectedGroupModal.cantidadMujeres}
                      </span>
                    </button>

                    {/* Tab: Todos */}
                    <button
                      type="button"
                      onClick={() => setModalSexoTab('all')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        modalSexoTab === 'all'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      <span>Todos</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        modalSexoTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {selectedGroupModal.total}
                      </span>
                    </button>
                  </div>

                </div>

                {/* Botón Cerrar */}
                <button
                  type="button"
                  onClick={() => setSelectedGroupModal(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner de solo lectura dentro del modal */}
              <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Vista de solo lectura:</strong> Esta lista es exclusivamente informativa. No permite modificar datos,
                    eliminar inscripciones ni cambiar estados.
                  </span>
                </div>
              </div>

              {/* Buscador dentro del modal */}
              {activeCount > 0 && (
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar corredor por nombre, apellido, DNI o dorsal..."
                      value={modalSearchTerm}
                      onChange={(e) => setModalSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    />
                    {modalSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setModalSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cuerpo del Modal: Tabla de corredores del grupo */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                {activeCount === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      No hay {modalSexoTab === 'Hombres' ? 'hombres inscriptos' : modalSexoTab === 'Mujeres' ? 'mujeres inscriptas' : 'corredores inscriptos'} en esta categoría
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Actualmente el recuento es 0 para {selectedGroupModal.distanciaLabel} — {selectedGroupModal.categoria} ({modalSexoTab === 'all' ? 'Total' : modalSexoTab}).
                    </p>
                  </div>
                ) : modalFilteredRunners.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      No se encontraron coincidencias para "{modalSearchTerm}"
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none">
                        <tr>
                          <th className="px-4 py-3 text-center">Dorsal</th>
                          <th className="px-4 py-3">Corredor</th>
                          <th className="px-4 py-3">DNI</th>
                          <th className="px-4 py-3 text-center">Sexo</th>
                          <th className="px-4 py-3">Edad / Nac.</th>
                          <th className="px-4 py-3 text-center">Talle</th>
                          <th className="px-4 py-3">Contacto</th>
                          <th className="px-4 py-3">Origen</th>
                          <th className="px-4 py-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {modalFilteredRunners.map((runner) => {
                          const d = runner.datosCorredor || {};
                          const nombreCompleto = `${d.nombre || ''} ${d.apellido || ''}`.trim();
                          const sexoRunner = runner.sexoNormalizado || (d.sexo?.toLowerCase().startsWith('f') ? 'Mujeres' : 'Hombres');

                          return (
                            <tr
                              key={runner._id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              {/* Dorsal */}
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs shadow-2xs">
                                  {runner.dorsal}
                                </span>
                              </td>

                              {/* Nombre y Apellido */}
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {nombreCompleto || 'Sin nombre'}
                              </td>

                              {/* DNI */}
                              <td className="px-4 py-3 font-semibold text-slate-700">
                                {d.dni || '-'}
                              </td>

                              {/* Sexo */}
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    sexoRunner === 'Hombres'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {sexoRunner}
                                </span>
                              </td>

                              {/* Edad / Fecha Nacimiento */}
                              <td className="px-4 py-3 text-slate-600">
                                {formatAge(d.fechaNacimiento)}
                              </td>

                              {/* Talle Remera */}
                              <td className="px-4 py-3 text-center">
                                <span className="px-2 py-0.5 rounded font-black text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                                  {runner.talleRemera || '-'}
                                </span>
                              </td>

                              {/* Contacto (Email y Teléfono) */}
                              <td className="px-4 py-3">
                                <div className="flex flex-col text-[11px]">
                                  <span className="text-slate-800 font-medium">{d.email || '-'}</span>
                                  <span className="text-slate-400">{d.telefono || '-'}</span>
                                </div>
                              </td>

                              {/* Origen (Ciudad y Provincia) */}
                              <td className="px-4 py-3 text-slate-600">
                                {d.ciudad ? `${d.ciudad}, ${d.provincia || ''}` : '-'}
                              </td>

                              {/* Estado oficial */}
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    runner.estado === 'Acreditado'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : runner.estado === 'Retira y no corre'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                                  }`}
                                >
                                  {runner.estado || 'Pendiente'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pie del Modal */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Mostrando <strong>{modalFilteredRunners.length}</strong> de <strong>{activeCount}</strong> inscriptos{modalSexoTab !== 'all' ? ` (${modalSexoTab.toLowerCase()})` : ''}.
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedGroupModal(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default RaceReports;
