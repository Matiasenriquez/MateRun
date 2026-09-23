/**
 * ==============================================================================
 * PANEL DE CONTROL PARA SUPERADMIN (SuperAdminDashboard.tsx) - MateRun
 * ==============================================================================
 * Vista principal exclusiva para el rol "superadmin".
 * 
 * Estructura de la vista:
 * 1. Sección Superior: Selector interactivo compuesto por tarjetas horizontales
 *    que representan cada una de las carreras creadas en la plataforma.
 * 2. Sección Inferior: Tabla organizada y exhaustiva que muestra en tiempo real
 *    todos los corredores inscriptos en la carrera seleccionada.
 *    - Columnas independientes para Nombre y Apellido.
 *    - Todos los datos personales y deportivos cargados en la inscripción.
 *    - Buscador en tiempo real por Nombre, Apellido, DNI o N° de Dorsal.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Race } from '../../types';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet,
  Layers
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  // Lista de todas las carreras disponibles en la plataforma
  const [races, setRaces] = useState<Race[]>([]);
  const [isRacesLoading, setIsRacesLoading] = useState<boolean>(true);

  // Carrera actualmente seleccionada en el panel
  const [selectedRaceId, setSelectedRaceId] = useState<string>('');

  // Lista de corredores inscriptos en la carrera seleccionada
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isRegsLoading, setIsRegsLoading] = useState<boolean>(false);

  // Filtro de búsqueda en tiempo real sobre la tabla de inscriptos
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estados para alertas y errores
  const [errorMsg, setErrorMsg] = useState<string>('');

  /**
   * Efecto 1: Carga inicial de todas las carreras creadas en el sistema.
   * Selecciona por defecto la primera carrera encontrada.
   */
  useEffect(() => {
    const fetchRaces = async () => {
      try {
        setIsRacesLoading(true);
        const res = await api.get('/races');
        const raceList: Race[] = res.data.races || [];
        setRaces(raceList);

        // Preseleccionar la primera carrera si existe
        if (raceList.length > 0) {
          setSelectedRaceId(String(raceList[0]._id));
        }
      } catch (err: any) {
        console.error('Error al cargar carreras en el panel de SuperAdmin:', err);
        setErrorMsg('No se pudieron obtener las carreras creadas.');
      } finally {
        setIsRacesLoading(false);
      }
    };

    fetchRaces();
  }, []);

  /**
   * Efecto 2: Cada vez que el SuperAdmin selecciona una carrera diferente,
   * se consultan los corredores inscriptos únicamente para esa carrera.
   */
  useEffect(() => {
    if (!selectedRaceId) return;

    const fetchRegistrationsForRace = async () => {
      try {
        setIsRegsLoading(true);
        setSearchTerm(''); // Reiniciar término de búsqueda
        const res = await api.get(`/registrations/race/${selectedRaceId}`);
        setRegistrations(res.data.registrations || []);
      } catch (err: any) {
        console.error('Error al cargar inscriptos de la carrera:', err);
        setErrorMsg('No se pudieron cargar los inscriptos de la carrera seleccionada.');
      } finally {
        setIsRegsLoading(false);
      }
    };

    fetchRegistrationsForRace();
  }, [selectedRaceId]);

  /**
   * Helper: Formateo de fecha seguro para tablas y tarjetas (dd/mm/aaaa)
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

  // Obtener la entidad de la carrera seleccionada
  const currentRace = races.find((r) => String(r._id) === selectedRaceId);

  /**
   * Filtrado en memoria de la tabla de inscriptos según el texto ingresado en el buscador.
   * Evalúa coincidencias en: Nombre, Apellido, DNI y Número de Dorsal.
   */
  const filteredRegistrations = registrations.filter((reg) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const datos = reg.datosCorredor || {};
    const nombre = (datos.nombre || '').toLowerCase();
    const apellido = (datos.apellido || '').toLowerCase();
    const dni = (datos.dni || '').toLowerCase();
    const dorsal = String(reg.dorsal || '');

    return (
      nombre.includes(term) ||
      apellido.includes(term) ||
      dni.includes(term) ||
      dorsal.includes(term)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* ENCABEZADO PRINCIPAL DE LA VISTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-1 rounded">
            Panel de Control • SuperAdmin
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2 tracking-tight">
            Gestión de Carreras e Inscriptos
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Selecciona una carrera para auditar y consultar en tiempo real su nómina completa de corredores.
          </p>
        </div>

        {/* Métricas rápidas */}
        {currentRace && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Inscriptos en este evento</p>
              <p className="text-lg font-black text-slate-800">
                {registrations.length} <span className="text-xs font-semibold text-slate-400">/ {currentRace.cupoMaximo} cupos</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MENSAJE DE ERROR GLOBAL */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* ========================================================================
          SECCIÓN 1: TARJETAS HORIZONTALES DE CARRERAS CREADAS
          ======================================================================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-machine" />
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Carreras Creadas
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {races.length} eventos registrados
          </span>
        </div>

        {isRacesLoading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
          </div>
        ) : races.length === 0 ? (
          <div className="card-panel text-center py-12">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No hay carreras creadas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Puedes crear una nueva carrera desde la sección "Gestión de Carreras".
            </p>
          </div>
        ) : (
          /* Cuadrícula de tarjetas horizontales cómodas y espaciosas */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {races.map((race) => {
              const isSelected = String(race._id) === selectedRaceId;
              const fecha = new Date(race.fecha);
              const cuposDisp = race.cuposDisponibles ?? race.cupoMaximo;
              const isPast = fecha < new Date() || race.estado === 'finalizada';

              return (
                <div
                  key={race._id}
                  onClick={() => setSelectedRaceId(String(race._id))}
                  className={`cursor-pointer rounded-xl p-4 transition-all duration-150 flex flex-col justify-between relative select-none ${
                    isSelected
                      ? 'bg-white border-2 border-machine ring-4 ring-machine/10 shadow-md'
                      : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Fila superior: Fecha a la izquierda, Estado y Selección a la derecha */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {/* Bloque de fecha deportiva */}
                      <div className={`text-center rounded-lg px-2.5 py-1.5 leading-tight shrink-0 ${
                        isSelected 
                          ? 'bg-machine text-white font-black' 
                          : 'bg-slate-100 text-slate-700 font-bold'
                      }`}>
                        <span className="block text-xl">{fecha.getDate()}</span>
                        <span className="block text-[10px] uppercase tracking-wider">
                          {fecha.toLocaleString('es-AR', { month: 'short' })}
                        </span>
                      </div>

                      {/* Título de la carrera */}
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1" title={race.nombre}>
                          {race.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{race.lugar}</span>
                        </p>
                      </div>
                    </div>

                    {/* Badge de seleccionado o estado */}
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-machine text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Activa
                      </span>
                    ) : isPast ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded shrink-0">
                        Cerrada
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 px-2 py-0.5 rounded shrink-0">
                        Vigente
                      </span>
                    )}
                  </div>

                  {/* Fila inferior: Chips de distancias y Cupos */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    {/* Chips con las distancias habilitadas */}
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {race.distancias?.map((d) => (
                        <span
                          key={d}
                          className="bg-slate-100 text-slate-600 font-bold text-[10px] px-1.5 py-0.5 rounded"
                        >
                          {d}K
                        </span>
                      ))}
                    </div>

                    {/* Cupos restantes */}
                    <span className="text-[11px] font-medium text-slate-500">
                      Cupos: <strong className="text-slate-700">{cuposDisp}</strong>
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================
          SECCIÓN 2: TABLA DE CORREDORES INSCRIPTOS DE LA CARRERA SELECCIONADA
          ======================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* ENCABEZADO DE LA TABLA Y BUSCADOR */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-machine" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Nómina de Inscriptos
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Carrera: <strong className="text-slate-800">{currentRace?.nombre || 'Ninguna seleccionada'}</strong>
            </p>
          </div>

          {/* Barra de búsqueda en tiempo real */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido, DNI o dorsal..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
            />
          </div>
        </div>

        {/* CONTENIDO DE LA TABLA */}
        {isRegsLoading ? (
          <div className="flex justify-center items-center p-16 gap-3">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Cargando inscriptos...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          /* Estado vacío */
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">
              {searchTerm ? 'No se encontraron inscriptos con ese criterio' : 'No hay corredores inscriptos en esta carrera'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? 'Prueba modificando el texto de búsqueda.' 
                : 'Cuando los corredores se inscriban a través de la plataforma figurarán automáticamente en esta lista.'}
            </p>
          </div>
        ) : (
          /* TABLA CON LAS 13 COLUMNAS REQUERIDAS */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
              {/* ENCABEZADOS DE COLUMNA */}
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold select-none">
                <tr>
                  <th className="px-4 py-3.5 text-center">Dorsal</th>
                  <th className="px-4 py-3.5">Nombre</th>
                  <th className="px-4 py-3.5">Apellido</th>
                  <th className="px-4 py-3.5">DNI</th>
                  <th className="px-4 py-3.5">Correo electrónico</th>
                  <th className="px-4 py-3.5">Teléfono</th>
                  <th className="px-4 py-3.5">Contacto emergencia</th>
                  <th className="px-4 py-3.5 text-center">Sexo</th>
                  <th className="px-4 py-3.5 text-center">Fecha Nac.</th>
                  <th className="px-4 py-3.5 text-center">Distancia</th>
                  <th className="px-4 py-3.5">Ciudad y Provincia</th>
                  <th className="px-4 py-3.5 text-center">Talle</th>
                  <th className="px-4 py-3.5 text-center">Estado</th>
                </tr>
              </thead>

              {/* FILAS DE CORREDORES */}
              <tbody className="divide-y divide-slate-100">
                {filteredRegistrations.map((reg) => {
                  const d = reg.datosCorredor || {};
                  
                  // Formatear contacto de emergencia (puede ser objeto o string)
                  const emergencyPhone = typeof d.contactoEmergencia === 'object'
                    ? d.contactoEmergencia?.telefono || '-'
                    : d.contactoEmergencia || '-';

                  return (
                    <tr key={reg._id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* 1. Dorsal */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-black text-machine bg-machine-light px-2.5 py-1 rounded-md text-xs font-mono">
                          {reg.dorsal ? `#${reg.dorsal}` : '-'}
                        </span>
                      </td>

                      {/* 2. Nombre (Columna independiente) */}
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {d.nombre || '-'}
                      </td>

                      {/* 3. Apellido (Columna independiente) */}
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {d.apellido || '-'}
                      </td>

                      {/* 4. DNI */}
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {d.dni || '-'}
                      </td>

                      {/* 5. Correo electrónico */}
                      <td className="px-4 py-3 text-slate-600">
                        {d.email || '-'}
                      </td>

                      {/* 6. Teléfono */}
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {d.telefono || '-'}
                      </td>

                      {/* 7. Contacto de emergencia */}
                      <td className="px-4 py-3 text-slate-600 font-mono font-medium">
                        {emergencyPhone}
                      </td>

                      {/* 8. Sexo */}
                      <td className="px-4 py-3 text-center text-slate-700">
                        {d.sexo || '-'}
                      </td>

                      {/* 9. Fecha de nacimiento */}
                      <td className="px-4 py-3 text-center text-slate-600 font-medium">
                        {formatDate(d.fechaNacimiento)}
                      </td>

                      {/* 10. Distancia a correr */}
                      <td className="px-4 py-3 text-center font-bold text-slate-800">
                        {reg.distancia} km
                      </td>

                      {/* 11. Ciudad y Provincia */}
                      <td className="px-4 py-3 text-slate-600">
                        {d.ciudad || ''}
                        {d.provincia && d.provincia !== d.ciudad ? `, ${d.provincia}` : ''}
                      </td>

                      {/* 12. Talle de remera */}
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px]">
                          {reg.talleRemera || '-'}
                        </span>
                      </td>

                      {/* 13. Estado */}
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          reg.estado === 'Acreditado' ? 'bg-green-100 text-green-700' :
                          reg.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                          reg.estado === 'Retira y no corre' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {reg.estado || 'Pendiente'}
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
          {registrations.length > 0 && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Actualizado en tiempo real
            </span>
          )}
        </div>

      </div>

    </div>
  );
};

export default SuperAdminDashboard;
