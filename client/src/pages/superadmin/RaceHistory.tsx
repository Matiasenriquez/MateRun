/**
 * ==============================================================================
 * HISTORIAL DE CARRERA (RaceHistory.tsx) - MateRun
 * ==============================================================================
 * Vista exclusiva de auditoría y seguimiento en tiempo real para SuperAdmin.
 * 
 * Requerimientos y Reglas de Negocio:
 * 1. Acceso al historial: Independiente por carrera mediante botón "Historial".
 *    Muestra únicamente los eventos y modificaciones de corredores de esta carrera.
 * 2. Funcionalidad:
 *    - Registra en tiempo real:
 *      * Corredores cuyo estado cambió a "Acreditado".
 *      * Corredores cuyo estado cambió a "Retira y no corre".
 *      * Corredores cuyo estado volvió a "Pendiente".
 *      * Corredores cuyos datos hayan sido modificados (ej. número de dorsal).
 *      * Corredores que hayan sido agregados a la carrera seleccionada.
 * 3. Visualización:
 *    - Meramente informativo y de solo lectura (no permite edición ni borrado).
 *    - Tabla de gran tamaño, aprovechando todo el ancho de la interfaz.
 *    - Identifica: Corredor, Tipo de acción, Datos afectados, Valor anterior,
 *      Nuevo valor, Momento exacto del cambio y Responsable.
 * 4. Transición de valores:
 *    - Representación visual clara del cambio: "valor_anterior > nuevo_valor".
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Race } from '../../types';
import {
  ArrowLeft,
  History,
  Calendar,
  MapPin,
  Tag,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  SlidersHorizontal,
  Filter,
  Trophy,
  FileSpreadsheet
} from 'lucide-react';

interface AuditChange {
  campo: string;
  etiqueta?: string;
  valorAnterior: any;
  nuevoValor: any;
}

interface AuditLogEntry {
  _id: string;
  carrera: string;
  tipo: 'NUEVA_INSCRIPCION' | 'CAMBIO_ESTADO' | 'MODIFICACION' | 'BAJA' | string;
  usuarioResponsable?: {
    _id: string;
    nombre: string;
    apellido: string;
    email: string;
    rol: string;
  };
  descripcion: string;
  detalles?: {
    corredor?: {
      nombre: string;
      apellido: string;
      dni: string;
    };
    dorsal?: number | string;
    distancia?: number;
    estadoAnterior?: string;
    nuevoEstado?: string;
    cambios?: AuditChange[];
  };
  fecha: string | Date;
}

export const RaceHistory: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();

  // Estados de carga y datos
  const [race, setRace] = useState<Race | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('TODOS');

  /**
   * Carga los datos del historial de la carrera
   */
  const fetchHistory = async (showRefreshIndicator = false) => {
    if (!raceId) return;

    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMsg('');

      const res = await api.get(`/history/race/${raceId}`);
      setRace(res.data.race || null);
      setAuditLogs(res.data.auditLogs || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error al cargar historial de la carrera:', err);
      setErrorMsg(
        err.response?.data?.message ||
        'No se pudo cargar el historial de eventos de la carrera. Por favor, reintente.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [raceId]);

  /**
   * Helper: Formatea fecha y hora exacta (dd/mm/aaaa, hh:mm:ss)
   */
  const formatDateTime = (dateString: string | Date | undefined): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(dateString);
    }
  };

  /**
   * Helper: Formato de fecha simple (dd/mm/aaaa)
   */
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  /**
   * Normalización para búsqueda insensible a mayúsculas y acentos
   */
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  /**
   * Filtrado en memoria de los registros de auditoría
   */
  const filteredLogs = useMemo(() => {
    const term = normalize(searchTerm.trim());

    return auditLogs.filter((log) => {
      // 1. Filtro por tipo de evento
      if (selectedType !== 'TODOS') {
        if (selectedType === 'ESTADO' && log.tipo !== 'CAMBIO_ESTADO') return false;
        if (selectedType === 'MODIFICACION' && log.tipo !== 'MODIFICACION') return false;
        if (selectedType === 'ALTA' && log.tipo !== 'NUEVA_INSCRIPCION') return false;
        if (selectedType === 'BAJA' && log.tipo !== 'BAJA') return false;
      }

      // 2. Filtro por texto de búsqueda
      if (!term) return true;

      const corredorNombre = normalize(
        `${log.detalles?.corredor?.nombre || ''} ${log.detalles?.corredor?.apellido || ''}`
      );
      const dni = log.detalles?.corredor?.dni || '';
      const dorsal = String(log.detalles?.dorsal || '');
      const descripcion = normalize(log.descripcion || '');
      const responsable = normalize(
        `${log.usuarioResponsable?.nombre || ''} ${log.usuarioResponsable?.apellido || ''} ${log.usuarioResponsable?.email || ''}`
      );

      // Coincidencia en campos de cambios
      const cambiosMatch = log.detalles?.cambios?.some((c) =>
        normalize(String(c.campo)).includes(term) ||
        normalize(String(c.valorAnterior)).includes(term) ||
        normalize(String(c.nuevoValor)).includes(term)
      );

      return (
        corredorNombre.includes(term) ||
        dni.includes(term) ||
        dorsal.includes(term) ||
        descripcion.includes(term) ||
        responsable.includes(term) ||
        Boolean(cambiosMatch)
      );
    });
  }, [auditLogs, searchTerm, selectedType]);

  /**
   * Métricas y contadores de eventos
   */
  const countAltas = auditLogs.filter((l) => l.tipo === 'NUEVA_INSCRIPCION').length;
  const countEstados = auditLogs.filter((l) => l.tipo === 'CAMBIO_ESTADO').length;
  const countModificaciones = auditLogs.filter((l) => l.tipo === 'MODIFICACION').length;
  const countBajas = auditLogs.filter((l) => l.tipo === 'BAJA').length;

  /**
   * Renderiza el badge del tipo de acción
   */
  const renderTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'NUEVA_INSCRIPCION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Alta de Corredor
          </span>
        );
      case 'CAMBIO_ESTADO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            Cambio de Estado
          </span>
        );
      case 'MODIFICACION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Modificación
          </span>
        );
      case 'BAJA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Baja
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            {tipo}
          </span>
        );
    }
  };

  /**
   * Helper para estilizar los valores de transición según su contenido
   */
  const formatValueBadge = (val: any) => {
    if (val === undefined || val === null || val === '') return '-';
    const str = String(val);

    if (str === 'Acreditado') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Acreditado
        </span>
      );
    }
    if (str === 'Pendiente') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          Pendiente
        </span>
      );
    }
    if (str === 'Retira y no corre') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
          Retira y no corre
        </span>
      );
    }
    if (str === 'Baja') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          Baja
        </span>
      );
    }
    if (str === 'Descalificado') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          🚫 Descalificado
        </span>
      );
    }
    if (str === 'Clasificado') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          Clasificado
        </span>
      );
    }

    return <span className="font-semibold text-slate-800">{str}</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE NAVEGACIÓN Y ACCIONES                                  */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/admin/race-roster/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Volver a la nómina de inscriptos"
          >
            <ArrowLeft className="w-4 h-4 text-machine" />
            <span>Nómina de Inscriptos</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/admin/race-results/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Gestionar resultados oficiales de la carrera"
          >
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>Cargar Resultados</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/admin/race-reports/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Ver informes de inscriptos por distancia, categoría y sexo"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Informes</span>
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

        {/* Botón de Actualizar en Tiempo Real */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-slate-400 font-medium">
            Última actualización: {lastUpdated.toLocaleTimeString('es-AR')}
          </span>
          <button
            type="button"
            onClick={() => fetchHistory(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer disabled:opacity-60"
            title="Actualizar eventos en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-machine ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ENCABEZADO DE LA CARRERA CON INFORMACIÓN OFICIAL                         */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-between">
          <div className="h-6 w-64 bg-slate-200 rounded"></div>
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>
      ) : race ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-0.5 rounded">
                <History className="w-3.5 h-3.5" />
                Historial Oficial de Modificaciones
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Solo Lectura
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                race.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {race.estado}
              </span>
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 mt-2 tracking-tight">
              {race.nombre}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-machine" />
                <span>Fecha del evento: <strong>{formatDate(race.fecha)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{race.lugar || 'Circuito Oficial'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-slate-400" />
                <span>Distancias: {race.distancias?.map((d) => `${d}k`).join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de métrica de registros en historial */}
          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shrink-0">
            <div className="w-11 h-11 rounded-lg bg-machine-light flex items-center justify-center text-machine font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Eventos Registrados</p>
              <p className="text-xl font-black text-slate-800">
                {auditLogs.length} <span className="text-xs font-semibold text-slate-400">acciones</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ALERTA DE ERROR */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm font-semibold shadow-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTADORES RESUMEN DE ACTIVIDAD Y ACCIONES                              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Altas */}
        <div 
          onClick={() => setSelectedType(selectedType === 'ALTA' ? 'TODOS' : 'ALTA')}
          className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer transition-all ${
            selectedType === 'ALTA' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Altas / Nuevos</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {isLoading ? '-' : countAltas}
          </p>
        </div>

        {/* Cambios de Estado */}
        <div 
          onClick={() => setSelectedType(selectedType === 'ESTADO' ? 'TODOS' : 'ESTADO')}
          className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer transition-all ${
            selectedType === 'ESTADO' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Acreditaciones</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {isLoading ? '-' : countEstados}
          </p>
        </div>

        {/* Modificaciones */}
        <div 
          onClick={() => setSelectedType(selectedType === 'MODIFICACION' ? 'TODOS' : 'MODIFICACION')}
          className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer transition-all ${
            selectedType === 'MODIFICACION' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Modificaciones</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {isLoading ? '-' : countModificaciones}
          </p>
        </div>

        {/* Bajas */}
        <div 
          onClick={() => setSelectedType(selectedType === 'BAJA' ? 'TODOS' : 'BAJA')}
          className={`bg-white rounded-2xl border p-4 shadow-sm cursor-pointer transition-all ${
            selectedType === 'BAJA' ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Bajas</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-2">
            {isLoading ? '-' : countBajas}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABLA PRINCIPAL DE GRAN TAMAÑO - SOLO LECTURA                            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Barra de Filtros y Búsqueda en Tiempo Real */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-machine" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Registro Cronológico de Cambios
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría informativa de modificaciones y eventos realizados sobre los corredores inscriptos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Buscador en tiempo real */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por corredor, DNI, dorsal o cambio..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
              />
            </div>

            {/* Selector de Tipo de Acción */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all"
              >
                <option value="TODOS">Todos los eventos</option>
                <option value="ESTADO">Acreditaciones / Estados</option>
                <option value="MODIFICACION">Modificaciones de datos</option>
                <option value="ALTA">Altas de corredores</option>
                <option value="BAJA">Bajas</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLA DE GRAN TAMAÑO */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 w-44">Momento</th>
                <th className="px-5 py-4 w-60">Corredor Involucrado</th>
                <th className="px-5 py-4 w-44">Tipo de Acción</th>
                <th className="px-5 py-4 w-44">Dato Afectado</th>
                <th className="px-5 py-4">Transición de Valores (Anterior &gt; Nuevo)</th>
                <th className="px-5 py-4 w-48 text-right">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-5 w-24 bg-slate-200 rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                    <td className="px-5 py-4"><div className="h-5 w-48 bg-slate-200 rounded"></div></td>
                    <td className="px-5 py-4 text-right"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <History className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-600">No se encontraron eventos en el historial</p>
                      <p className="text-xs text-slate-400">
                        {searchTerm.trim() || selectedType !== 'TODOS'
                          ? 'Intenta ajustar los filtros o el término de búsqueda.'
                          : 'Las acreditaciones y modificaciones de corredores se registrarán automáticamente aquí.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const corredor = log.detalles?.corredor;
                  const cambios = log.detalles?.cambios && log.detalles.cambios.length > 0
                    ? log.detalles.cambios
                    : [
                        {
                          campo: log.tipo === 'CAMBIO_ESTADO' ? 'Estado' : 'Detalle',
                          etiqueta: log.tipo === 'CAMBIO_ESTADO' ? 'Estado de Acreditación' : 'Acción Realizada',
                          valorAnterior: log.detalles?.estadoAnterior || '-',
                          nuevoValor: log.detalles?.nuevoEstado || log.descripcion,
                        },
                      ];

                  return (
                    <tr 
                      key={log._id} 
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* 1. Momento exacto del cambio */}
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-start gap-1.5 text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              {formatDateTime(log.fecha)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Corredor Involucrado */}
                      <td className="px-5 py-4 align-top">
                        {corredor && (corredor.nombre || corredor.apellido || corredor.dni) ? (
                          <div>
                            <p className="font-bold text-slate-800 text-sm">
                              {corredor.nombre} {corredor.apellido}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-slate-500 text-[11px]">
                              {corredor.dni && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                                  DNI {corredor.dni}
                                </span>
                              )}
                              {log.detalles?.dorsal !== undefined && log.detalles?.dorsal !== null && (
                                <span className="bg-machine-light text-machine font-black px-1.5 py-0.5 rounded">
                                  #{log.detalles.dorsal}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-slate-700">
                              {log.detalles?.dorsal ? `Corredor #${log.detalles.dorsal}` : 'Corredor'}
                            </span>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{log.descripcion}</p>
                          </div>
                        )}
                      </td>

                      {/* 3. Tipo de Acción */}
                      <td className="px-5 py-4 align-top">
                        {renderTipoBadge(log.tipo)}
                      </td>

                      {/* 4. Datos Afectados */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-1.5">
                          {cambios.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {c.etiqueta || c.campo}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 5. Transición de Valores: "valor_anterior > nuevo_valor" */}
                      <td className="px-5 py-4 align-top">
                        <div className="space-y-2">
                          {cambios.map((c, idx) => (
                            <div 
                              key={idx}
                              className="inline-flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80"
                            >
                              {/* Valor Anterior */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Antes:</span>
                                {formatValueBadge(c.valorAnterior)}
                              </div>

                              {/* Flecha visual ">" */}
                              <span className="font-black text-machine text-sm px-1">&gt;</span>

                              {/* Nuevo Valor */}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Nuevo:</span>
                                {formatValueBadge(c.nuevoValor)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 6. Responsable */}
                      <td className="px-5 py-4 align-top text-right">
                        {log.usuarioResponsable ? (
                          <div>
                            <p className="font-bold text-slate-800">
                              {log.usuarioResponsable.nombre} {log.usuarioResponsable.apellido}
                            </p>
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                              {log.usuarioResponsable.rol || 'SuperAdmin'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-slate-600">Sistema</span>
                            <span className="block text-[10px] text-slate-400">Automático</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla con resumen de resultados */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>
            Mostrando <strong>{filteredLogs.length}</strong> de <strong>{auditLogs.length}</strong> eventos registrados
          </span>
          <span className="text-[11px] text-slate-400">
            Los cambios quedan registrados con fines de auditoría deportiva oficial
          </span>
        </div>
      </div>
    </div>
  );
};

export default RaceHistory;
