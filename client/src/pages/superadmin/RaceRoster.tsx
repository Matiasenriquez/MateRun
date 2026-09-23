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
 * 4. Tabla completa y organizada con las 13 columnas de datos solicitadas en la inscripción,
 *    con "Nombre" y "Apellido" en columnas independientes.
 * 5. Buscador interactivo en tiempo real para filtrar por Nombre, Apellido, DNI o N° de Dorsal.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
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
  Tag
} from 'lucide-react';

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
   * Filtrado en memoria de la tabla según el texto ingresado en el buscador.
   * Evalúa coincidencias en Nombre, Apellido, DNI o N° de Dorsal.
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
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* BOTÓN EXPLÍCITO DE REGRESO ("Volver") */}
      <div>
        <button
          onClick={handleGoBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors"
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
                {registrations.length} <span className="text-xs font-semibold text-slate-400">/ {race.cupoMaximo} cupos</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ALERTA DE ERROR */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm font-semibold shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* CONTENEDOR DE LA TABLA DE INSCRIPTOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* BARRA SUPERIOR DE LA TABLA CON BUSCADOR */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-machine" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Listado Detallado de Corredores
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualiza en detalle todos los datos provistos en el formulario de inscripción.
            </p>
          </div>

          {/* Buscador en tiempo real */}
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
                ? 'Prueba modificando los términos del buscador.' 
                : 'A medida que los corredores completen el formulario de inscripción, se reflejarán automáticamente en esta tabla.'}
            </p>
          </div>
        ) : (
          /* TABLA CON LAS 13 COLUMNAS REQUERIDAS (Nombre y Apellido independientes) */
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
                  
                  // Formatear contacto de emergencia (puede ser objeto {telefono, nombre} o string directo)
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

export default RaceRoster;
