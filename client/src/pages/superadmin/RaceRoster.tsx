/**
 * ==============================================================================
 * NÓMINA DE INSCRIPTOS (RaceRoster.tsx) - MateRun
 * ==============================================================================
 * Página independiente y dedicada exclusivamente a la visualización y auditoría
 * de todos los corredores inscriptos en una carrera deportiva específica.
 * 
 * Características clave:
 * 1. Acceso restringido para el rol SuperAdmin.
 * 2. Carga dinámica según el identificador de la carrera en la URL (/admin/race-roster/:raceId).
 * 3. Botón explícito "Volver" para retornar al Panel de Control sin depender del navegador.
 * 4. Rediseño y gestión de la columna "Estado":
 *    - Reubicada en la primera posición de la tabla (antes de "Dorsal").
 *    - Estados permitidos: 'Pendiente', 'Acreditado', 'Retira y no corre' (se eliminó 'Baja').
 *    - Estado inicial predeterminado: 'Pendiente'.
 *    - Al pasar el cursor sobre 'Pendiente', se despliegan automáticamente:
 *      * "Acreditar"
 *      * "Retira y no corre"
 *    - Al pasar el cursor sobre 'Acreditado' o 'Retira y no corre', muestra únicamente:
 *      * "Editar Estado"
 *    - Al hacer clic en "Editar Estado", se vuelven a desplegar las 3 opciones:
 *      * "Pendiente" (restablece al estado inicial)
 *      * "Acreditar"
 *      * "Retira y no corre"
 *    - Flujo de popup de confirmación con textos exactos:
 *      * Pendiente: "¿Desea registrar al corredor nuevamente como “Pendiente”?"
 *        Aviso: "Se registró al corredor como: Pendiente."
 *      * Acreditar: "¿Desea acreditar al corredor?"
 *        Aviso: "Se registró al corredor como: Acreditado."
 *      * Retira y no corre: "¿Desea registrar al corredor como “Retira y no corre”?"
 *        Aviso: "Se registró al corredor como: Retira y no corre."
 * 5. Buscador optimizado e insensible a mayúsculas, minúsculas, acentos y tildes
 *    (ej. "Jose" encuentra "José", "MARTA" encuentra "Marta").
 * 6. Columnas independientes para "Nombre" y "Apellido".
 * ==============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Race } from '../../types';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Calendar, 
  MapPin, 
  FileSpreadsheet, 
  Clock, 
  Tag,
  CheckCircle2,
  Package,
  Edit2,
  RotateCcw,
  X,
  Loader2
} from 'lucide-react';

/**
 * Interfaz para el estado del popup modal de confirmación de cambio de estado
 */
interface ConfirmModalState {
  isOpen: boolean;
  registrationId: string;
  runnerName: string;
  targetState: 'Pendiente' | 'Acreditado' | 'Retira y no corre';
  message: string;
}

export const RaceRoster: React.FC = () => {
  // Obtenemos el identificador de la carrera desde los parámetros de la URL
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();

  // Entidad de la carrera seleccionada
  const [race, setRace] = useState<Race | null>(null);
  const [isRaceLoading, setIsRaceLoading] = useState<boolean>(true);

  // Lista de corredores inscriptos en esta carrera
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isRegsLoading, setIsRegsLoading] = useState<boolean>(true);

  // Filtro de búsqueda en tiempo real sobre la tabla de inscriptos
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados para alertas o mensajes de error
  const [errorMsg, setErrorMsg] = useState<string>('');

  // --------------------------------------------------------------------------
  // Estados para la gestión interactiva de la columna "Estado"
  // --------------------------------------------------------------------------
  // Identificador de la inscripción sobre la cual el cursor del mouse está posicionado
  const [hoveredRegId, setHoveredRegId] = useState<string | null>(null);

  // Identificador de la inscripción en la cual se hizo clic en "Editar Estado"
  const [activeEditRegId, setActiveEditRegId] = useState<string | null>(null);

  // Estado del modal de confirmación
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Aviso de confirmación posterior a la modificación del estado
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Limpieza de temporizadores de avisos de confirmación al desmontar
   */
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  /**
   * Efecto 1: Carga los datos de la carrera y su lista de corredores inscriptos
   */
  useEffect(() => {
    if (!raceId) return;

    const fetchRaceAndRegistrations = async () => {
      try {
        setIsRaceLoading(true);
        setIsRegsLoading(true);

        // Peticiones simultáneas: Detalle de la carrera e inscripciones asociadas
        const [raceRes, regsRes] = await Promise.all([
          api.get(`/races/${raceId}`),
          api.get(`/registrations/race/${raceId}`),
        ]);

        setRace(raceRes.data.race);
        setRegistrations(regsRes.data.registrations || []);
      } catch (err: any) {
        console.error('Error al cargar nómina de inscriptos de la carrera:', err);
        setErrorMsg('No se pudo cargar la información de la carrera o sus inscriptos.');
      } finally {
        setIsRaceLoading(false);
        setIsRegsLoading(false);
      }
    };

    fetchRaceAndRegistrations();
  }, [raceId]);

  /**
   * Helper: Formatea fechas de forma segura en formato argentino (dd/mm/aaaa)
   */
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return String(dateString);
    }
  };

  /**
   * Manejador para el botón "Volver":
   * Regresa al Panel de Control de SuperAdmin de forma explícita.
   */
  const handleGoBack = () => {
    navigate('/dashboard');
  };

  /**
   * Helper: Normaliza texto removiendo diacríticos/acentos/tildes y convirtiendo a minúsculas
   * para búsquedas totalmente insensibles a mayúsculas, minúsculas y tildes.
   * Ejemplos:
   * "José" -> "jose"
   * "Jose" -> "jose"
   * "MARTA" -> "marta"
   * "Martín" -> "martin"
   */
  const normalizeText = (text: string | null | undefined): string => {
    if (!text) return '';
    return text
      .toString()
      .normalize('NFD') // Descompone caracteres en letra base + marca de acento
      .replace(/[\u0300-\u036f]/g, '') // Elimina todas las marcas de acento/tilde
      .toLowerCase()
      .trim();
  };

  /**
   * Abre el popup modal de confirmación con las preguntas y condiciones exactas requeridas:
   * - Acreditar: "¿Desea acreditar al corredor?"
   * - Retira y no corre: "¿Desea registrar al corredor como “Retira y no corre”?"
   * - Pendiente: "¿Desea registrar al corredor nuevamente como “Pendiente”?"
   */
  const handleOpenConfirm = (
    reg: any, 
    targetState: 'Pendiente' | 'Acreditado' | 'Retira y no corre'
  ) => {
    const d = reg.datosCorredor || {};
    const runnerName = `${d.nombre || ''} ${d.apellido || ''}`.trim();

    let message = '';
    if (targetState === 'Pendiente') {
      message = '¿Desea registrar al corredor nuevamente como “Pendiente”?';
    } else if (targetState === 'Acreditado') {
      message = '¿Desea acreditar al corredor?';
    } else {
      message = '¿Desea registrar al corredor como “Retira y no corre”?';
    }

    setConfirmModal({
      isOpen: true,
      registrationId: reg._id,
      runnerName,
      targetState,
      message,
    });
  };

  /**
   * Confirma la modificación del estado del corredor:
   * 1. Llama al endpoint PUT /api/registrations/:id/accreditation
   * 2. Actualiza reactivamente el estado local en la tabla
   * 3. Muestra el aviso de confirmación solicitado:
   *    "Se registró al corredor como: Pendiente." o
   *    "Se registró al corredor como: Acreditado." o
   *    "Se registró al corredor como: Retira y no corre."
   */
  const handleConfirmStateChange = async () => {
    if (!confirmModal) return;
    const { registrationId, targetState } = confirmModal;

    try {
      setIsSubmitting(true);

      // Llamada al endpoint oficial de acreditación del backend
      await api.put(`/registrations/${registrationId}/accreditation`, {
        nuevoEstado: targetState,
      });

      // Actualizar la lista local de inscripciones
      setRegistrations((prev) =>
        prev.map((r) =>
          r._id === registrationId ? { ...r, estado: targetState } : r
        )
      );

      // Mostrar la leyenda de confirmación requerida
      setSuccessNotice(`Se registró al corredor como: ${targetState}.`);

      // Auto-ocultar el aviso tras 6 segundos
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => {
        setSuccessNotice(null);
      }, 6000);

      // Cerrar el modal y resetear estados interactivos
      setConfirmModal(null);
      setActiveEditRegId(null);
      setHoveredRegId(null);
    } catch (err: any) {
      console.error('Error al actualizar el estado del corredor:', err);
      alert(err?.response?.data?.message || 'Error al actualizar el estado del corredor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Cancela la modificación del estado:
   * Cierra el modal y deja al corredor en su estado actual sin ningún cambio.
   */
  const handleCancelStateChange = () => {
    setConfirmModal(null);
    setActiveEditRegId(null);
    setHoveredRegId(null);
  };

  /**
   * Filtramos registros eliminando el estado 'Baja' (el cual ya no se contempla)
   * y aplicamos el buscador normalizado e insensible a mayúsculas y acentos.
   */
  const activeRegistrations = registrations.filter((reg) => reg.estado !== 'Baja');

  const filteredRegistrations = activeRegistrations.filter((reg) => {
    if (!searchTerm.trim()) return true;
    const term = normalizeText(searchTerm);
    const datos = reg.datosCorredor || {};

    const nombre = normalizeText(datos.nombre);
    const apellido = normalizeText(datos.apellido);
    const dni = normalizeText(datos.dni);
    const dorsal = normalizeText(String(reg.dorsal || ''));
    const estado = normalizeText(reg.estado || 'Pendiente');
    const email = normalizeText(datos.email);
    const ciudad = normalizeText(datos.ciudad);
    const provincia = normalizeText(datos.provincia);

    return (
      nombre.includes(term) ||
      apellido.includes(term) ||
      dni.includes(term) ||
      dorsal.includes(term) ||
      estado.includes(term) ||
      email.includes(term) ||
      ciudad.includes(term) ||
      provincia.includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* BOTÓN EXPLÍCITO DE REGRESO ("Volver") */}
      <div>
        <button
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-machine" />
          <span>Volver al Panel de Control</span>
        </button>
      </div>

      {/* ENCABEZADO DE LA CARRERA CON SUS MÉTRICAS */}
      {isRaceLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-between">
          <div className="h-6 w-64 bg-slate-200 rounded"></div>
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>
      ) : race ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-0.5 rounded">
                Nómina Oficial de Inscriptos
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                race.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {race.estado}
              </span>
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 mt-1.5 tracking-tight">
              {race.nombre}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-machine" />
                <span>Fecha del evento: <strong>{formatDate(race.fecha)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{race.lugar}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-slate-400" />
                <span>Distancias: {race.distancias?.map(d => `${d}k`).join(', ')}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de métricas de cupo */}
          <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 shrink-0">
            <div className="w-11 h-11 rounded-lg bg-machine-light flex items-center justify-center text-machine font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Total inscriptos</p>
              <p className="text-xl font-black text-slate-800">
                {activeRegistrations.length} <span className="text-xs font-semibold text-slate-400">/ {race.cupoMaximo} cupos</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ALERTA DE ERROR GLOBAL */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* CONTENEDOR DE LA TABLA DE INSCRIPTOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* BARRA SUPERIOR DE LA TABLA CON BUSCADOR INSENSIBLE A MAYÚSCULAS Y TILDES */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-machine" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Listado Detallado de Corredores
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestiona el estado de acreditación de cada corredor y consulta sus datos completos.
            </p>
          </div>

          {/* Buscador optimizado */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido, DNI, dorsal o estado..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
            />
          </div>
        </div>

        {/* AVISO DE CONFIRMACIÓN DE ACCIÓN EXITOSA */}
        {successNotice && (
          <div className={`mx-5 sm:mx-6 mt-4 p-4 rounded-xl border flex items-center justify-between shadow-xs transition-all animate-in fade-in slide-in-from-top-2 ${
            successNotice.includes('Pendiente')
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : successNotice.includes('Retira y no corre')
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                successNotice.includes('Pendiente')
                  ? 'bg-amber-100 text-amber-600'
                  : successNotice.includes('Retira y no corre')
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}>
                {successNotice.includes('Pendiente') ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  Operación Registrada
                </p>
                <p className="text-xs font-bold mt-0.5">
                  {successNotice}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessNotice(null)}
              className="p-1.5 rounded-lg transition-colors cursor-pointer opacity-70 hover:opacity-100"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CONTENIDO DE LA TABLA */}
        {isRegsLoading ? (
          <div className="flex justify-center items-center p-20 gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Cargando nómina de corredores...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          /* Estado vacío */
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {searchTerm ? 'No se encontraron resultados con ese criterio' : 'Aún no hay corredores inscriptos en esta carrera'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? 'Prueba modificando los términos del buscador (no distingue mayúsculas ni tildes).' 
                : 'A medida que los corredores completen el formulario de inscripción, se reflejarán automáticamente en esta tabla.'}
            </p>
          </div>
        ) : (
          /* TABLA CON "ESTADO" EN LA PRIMERA COLUMNA Y NOMBRE/APELLIDO INDEPENDIENTES */
          <div className="overflow-x-auto min-h-[360px] pb-14">
            <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
              {/* ENCABEZADOS DE COLUMNA */}
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold select-none">
                <tr>
                  {/* 1. Columna ESTADO trasladada a la primera posición */}
                  <th className="px-4 py-3.5 text-center min-w-[190px]">Estado</th>
                  {/* 2. Dorsal */}
                  <th className="px-4 py-3.5 text-center">Dorsal</th>
                  {/* 3. Nombre */}
                  <th className="px-4 py-3.5">Nombre</th>
                  {/* 4. Apellido */}
                  <th className="px-4 py-3.5">Apellido</th>
                  {/* 5. DNI */}
                  <th className="px-4 py-3.5">DNI</th>
                  {/* 6. Correo electrónico */}
                  <th className="px-4 py-3.5">Correo electrónico</th>
                  {/* 7. Teléfono */}
                  <th className="px-4 py-3.5">Teléfono</th>
                  {/* 8. Contacto de emergencia */}
                  <th className="px-4 py-3.5">Contacto emergencia</th>
                  {/* 9. Sexo */}
                  <th className="px-4 py-3.5 text-center">Sexo</th>
                  {/* 10. Fecha de nacimiento */}
                  <th className="px-4 py-3.5 text-center">Fecha Nac.</th>
                  {/* 11. Distancia */}
                  <th className="px-4 py-3.5 text-center">Distancia</th>
                  {/* 12. Ciudad y Provincia */}
                  <th className="px-4 py-3.5">Ciudad y Provincia</th>
                  {/* 13. Talle de remera */}
                  <th className="px-4 py-3.5 text-center">Talle</th>
                </tr>
              </thead>

              {/* FILAS DE CORREDORES */}
              <tbody className="divide-y divide-slate-100">
                {filteredRegistrations.map((reg, index) => {
                  const d = reg.datosCorredor || {};
                  
                  // Estado actual normalizado (solo 'Pendiente', 'Acreditado', 'Retira y no corre')
                  const estadoActual = (reg.estado && reg.estado !== 'Baja') ? reg.estado : 'Pendiente';
                  const isHovered = hoveredRegId === reg._id;
                  const isEditing = activeEditRegId === reg._id;
                  
                  // Si estamos en las últimas filas de una lista numerosa, desplegamos hacia arriba para no crear scroll
                  const openUpwards = index >= filteredRegistrations.length - 2 && filteredRegistrations.length > 3;

                  // Formatear contacto de emergencia (puede ser objeto {telefono, nombre} o string directo)
                  const emergencyPhone = typeof d.contactoEmergencia === 'object'
                    ? d.contactoEmergencia?.telefono || '-'
                    : d.contactoEmergencia || '-';

                  return (
                    <tr key={reg._id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* 1. ESTADO (PRIMERA COLUMNA CON INTERACCIÓN HOVER Y MODIFICACIÓN) */}
                      <td className="px-4 py-3 text-center relative">
                        <div 
                          className="relative inline-block text-center py-0.5"
                          onMouseEnter={() => setHoveredRegId(reg._id)}
                          onMouseLeave={() => {
                            setHoveredRegId(null);
                            if (activeEditRegId === reg._id) {
                              setActiveEditRegId(null);
                            }
                          }}
                        >
                          {/* Badge visual del estado actual */}
                          <div
                            onClick={() => {
                              // Soporte para dispositivos táctiles o clic directo para editar
                              if (estadoActual !== 'Pendiente') {
                                setActiveEditRegId(prev => prev === reg._id ? null : reg._id);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full cursor-pointer select-none transition-all shadow-2xs ${
                              estadoActual === 'Acreditado'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : estadoActual === 'Retira y no corre'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              estadoActual === 'Acreditado'
                                ? 'bg-green-600'
                                : estadoActual === 'Retira y no corre'
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`} />
                            <span>{estadoActual}</span>
                          </div>

                          {/* Menú desplegable interactivo según el estado del corredor */}
                          {isHovered && (
                            <div 
                              className={`absolute left-1/2 -translate-x-1/2 z-40 min-w-[170px] ${
                                openUpwards ? 'bottom-full pb-1.5' : 'top-full pt-1.5'
                              } animate-in fade-in zoom-in-95 duration-150`}
                            >
                              <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 flex flex-col gap-1 text-xs text-left">
                                
                                {/* CASO A: Estado 'Pendiente' -> Muestra opciones 'Acreditar' y 'Retira y no corre' */}
                                {estadoActual === 'Pendiente' ? (
                                  <>
                                    {/* Opción Acreditar */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConfirm(reg, 'Acreditado');
                                      }}
                                      className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Acreditar</span>
                                    </button>

                                    {/* Opción Retira y no corre */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConfirm(reg, 'Retira y no corre');
                                      }}
                                      className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>Retira y no corre</span>
                                    </button>
                                  </>
                                ) : !isEditing ? (
                                  /* CASO B: Estado 'Acreditado' o 'Retira y no corre' -> Muestra únicamente 'Editar Estado' */
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveEditRegId(reg._id);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                                    <span>Editar Estado</span>
                                  </button>
                                ) : (
                                  /* CASO C: Al hacer clic en 'Editar Estado' -> Despliega 'Pendiente', 'Acreditar' y 'Retira y no corre' */
                                  <>
                                    {/* Opción 1: Restablecer a Pendiente */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConfirm(reg, 'Pendiente');
                                      }}
                                      className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      <span>Pendiente</span>
                                    </button>

                                    {/* Opción 2: Acreditar */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConfirm(reg, 'Acreditado');
                                      }}
                                      className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      <span>Acreditar</span>
                                    </button>

                                    {/* Opción 3: Retira y no corre */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConfirm(reg, 'Retira y no corre');
                                      }}
                                      className="w-full flex items-center justify-start gap-2 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Package className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                      <span>Retira y no corre</span>
                                    </button>
                                  </>
                                )}

                              </div>
                            </div>
                          )}

                        </div>
                      </td>

                      {/* 2. Dorsal */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-machine bg-machine-light px-2.5 py-1 rounded-md text-xs font-mono">
                          {reg.dorsal ? `#${reg.dorsal}` : '-'}
                        </span>
                      </td>

                      {/* 3. Nombre (Columna independiente) */}
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {d.nombre || '-'}
                      </td>

                      {/* 4. Apellido (Columna independiente) */}
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {d.apellido || '-'}
                      </td>

                      {/* 5. DNI */}
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {d.dni || '-'}
                      </td>

                      {/* 6. Correo electrónico */}
                      <td className="px-4 py-3 text-slate-600">
                        {d.email || '-'}
                      </td>

                      {/* 7. Teléfono */}
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {d.telefono || '-'}
                      </td>

                      {/* 8. Contacto de emergencia */}
                      <td className="px-4 py-3 text-slate-600 font-mono font-medium">
                        {emergencyPhone}
                      </td>

                      {/* 9. Sexo */}
                      <td className="px-4 py-3 text-center text-slate-700">
                        {d.sexo || '-'}
                      </td>

                      {/* 10. Fecha de nacimiento */}
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">
                        {formatDate(d.fechaNacimiento)}
                      </td>

                      {/* 11. Distancia a correr */}
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {reg.distancia} km
                      </td>

                      {/* 12. Ciudad y Provincia */}
                      <td className="px-4 py-3 text-slate-600">
                        {d.ciudad || ''}
                        {d.provincia && d.provincia !== d.ciudad ? `, ${d.provincia}` : ''}
                      </td>

                      {/* 13. Talle de remera */}
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                          {reg.talleRemera || '-'}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PIE DE LA TABLA CON CONTADOR TOTAL */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>Mostrando {filteredRegistrations.length} inscriptos</span>
          {activeRegistrations.length > 0 && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Actualizado en tiempo real
            </span>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* POPUP MODAL DE CONFIRMACIÓN DE CAMBIO DE ESTADO                           */}
      {/* ========================================================================= */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-150">
            
            {/* Ícono representativo */}
            <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${
              confirmModal.targetState === 'Pendiente'
                ? 'bg-amber-100 text-amber-600'
                : confirmModal.targetState === 'Acreditado'
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-blue-100 text-blue-600'
            }`}>
              {confirmModal.targetState === 'Pendiente' ? (
                <RotateCcw className="w-7 h-7" />
              ) : confirmModal.targetState === 'Acreditado' ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <Package className="w-8 h-8" />
              )}
            </div>

            {/* Mensaje de confirmación exacto */}
            <h3 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
              {confirmModal.message}
            </h3>

            {/* Subtítulo informativo del corredor */}
            {confirmModal.runnerName && (
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Corredor: <span className="font-bold text-slate-700">{confirmModal.runnerName}</span>
              </p>
            )}

            {/* Botones de acción "Aceptar" y "Cancelar" */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleCancelStateChange}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStateChange}
                disabled={isSubmitting}
                className={`px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                  confirmModal.targetState === 'Pendiente'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : confirmModal.targetState === 'Acreditado'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <span>Aceptar</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RaceRoster;
