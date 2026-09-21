/**
 * ==============================================================================
 * PANEL DEL CORREDOR (RunnerDashboard) - MateRun
 * ==============================================================================
 * Vista principal para el rol "corredor". Muestra las carreras disponibles y
 * permite la autoinscripción rápida con cálculo de cupos.
 * 
 * Regla de visualización:
 * - Detecta si el corredor ya posee una inscripción activa en cada carrera.
 * - Si ya está inscripto:
 *   1. El botón pasa a color gris.
 *   2. El texto cambia a "Inscripto" y queda deshabilitado.
 *   3. Se retira la leyenda "Inscripciones abiertas" de la tarjeta.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Race } from '../../types';
import { Calendar, MapPin, Users, ChevronRight, AlertCircle } from 'lucide-react';

export const RunnerDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Lista de carreras disponibles en la plataforma
  const [races, setRaces] = useState<Race[]>([]);
  
  // Conjunto de IDs de carreras donde el corredor actual ya se encuentra inscripto
  const [registeredRaceIds, setRegisteredRaceIds] = useState<string[]>([]);

  // Estados para manejo de carga y errores
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  /**
   * Efecto inicial: Carga simultáneamente las carreras activas y las inscripciones
   * propias del corredor para saber en cuáles ya participa.
   */
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Peticiones paralelas: carreras del sistema e inscripciones del usuario logueado
      const [racesRes, myRegsRes] = await Promise.all([
        api.get('/races'),
        api.get('/registrations/my-registrations'),
      ]);

      setRaces(racesRes.data.races || []);

      // Extraer los identificadores de carreras con inscripción activa (no dadas de baja)
      const myRegistrations = myRegsRes.data.registrations || [];
      const enrolledIds: string[] = myRegistrations
        .filter((reg: any) => reg.estado !== 'Baja')
        .map((reg: any) => {
          if (reg.carrera && typeof reg.carrera === 'object') {
            return String(reg.carrera._id);
          }
          return String(reg.carrera);
        });

      setRegisteredRaceIds(enrolledIds);
    } catch (error) {
      console.error("Error cargando datos del panel del corredor:", error);
      setErrorMsg("Ocurrió un error al cargar las próximas carreras.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Helper para verificar si la fecha de la carrera ya transcurrió o si el evento finalizó.
   * Considera vencida la carrera si su fecha es anterior al momento actual o si su estado es 'finalizada' / 'cancelada'.
   */
  const isRaceExpired = (raceDateStr: string | Date, estado?: string): boolean => {
    if (estado === 'finalizada' || estado === 'cancelada') return true;
    const raceDate = new Date(raceDateStr);
    const now = new Date();
    return raceDate < now;
  };

  /**
   * Navega a la vista dedicada del formulario de inscripción para la carrera elegida.
   */
  const handleGoToRegistration = (raceId: string) => {
    navigate(`/register-race/${raceId}`);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado del catálogo de carreras */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Próximas Carreras</h2>
          <p className="text-slate-500 mt-1">Explora los eventos disponibles y asegura tu lugar.</p>
        </div>
      </div>

      {/* Alerta de error en caso de fallo de red o API */}
      {errorMsg && (
        <div className="p-4 bg-machine-light border border-machine/20 text-machine rounded-lg flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="font-medium">{errorMsg}</p>
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

            // Verificación: ¿El corredor ya está inscripto en esta carrera?
            const isEnrolled = registeredRaceIds.includes(String(race._id));

            // Verificación: ¿La fecha de la carrera ya ha transcurrido?
            const isPastRace = isRaceExpired(race.fecha, race.estado);

            return (
              <div key={race._id} className="card-panel flex flex-col hover:shadow-md transition-shadow group">
                {/* Cabecera de la tarjeta: Fecha a la izquierda y Estado a la derecha */}
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-machine-light text-machine font-black text-center rounded-md px-3 py-2 leading-tight">
                    <span className="block text-2xl">{fecha.getDate()}</span>
                    <span className="block text-xs uppercase">{fecha.toLocaleString('es-AR', { month: 'short' })}</span>
                  </div>

                  {/* REGLA DE ETIQUETA SUPERIOR:
                      1. Si el usuario ya está inscripto, NO se muestra "Inscripciones Abiertas".
                      2. Si la fecha ya transcurrió, se indica claramente "Inscripciones cerradas".
                      3. En caso contrario, se muestra "Inscripciones Abiertas" o "Agotado".
                  */}
                  {!isEnrolled && (
                    isPastRace ? (
                      <div className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                        Inscripciones cerradas
                      </div>
                    ) : (
                      <div className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                        agotado ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'
                      }`}>
                        {agotado ? 'Agotado' : 'Inscripciones Abiertas'}
                      </div>
                    )
                  )}
                </div>

                {/* Título de la carrera */}
                <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight line-clamp-2">
                  {race.nombre}
                </h3>

                {/* Detalles de distancias y cupos */}
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

                {/* BOTÓN DE ACCIÓN:
                    - Si ya está inscripto: fondo gris, texto "Inscripto" y deshabilitado.
                    - Si la fecha ya transcurrió: fondo gris, texto "Inscripciones cerradas" y deshabilitado.
                    - Si está agotado: fondo gris claro, texto "Sin Cupos" y deshabilitado.
                    - Si está disponible: fondo rojo machine, texto "Inscribirme Ahora".
                */}
                <button 
                  onClick={() => handleGoToRegistration(race._id)}
                  disabled={agotado || isEnrolled || isPastRace}
                  className={`w-full py-2.5 font-bold uppercase tracking-wider rounded flex justify-center items-center gap-2 transition-all ${
                    isEnrolled
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed shadow-none'
                      : isPastRace
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
                      : agotado 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-machine hover:bg-machine-hover text-white shadow-md shadow-machine/20 hover:shadow-machine/30'
                  }`}
                >
                  {isEnrolled ? (
                    'Inscripto'
                  ) : isPastRace ? (
                    'Inscripciones cerradas'
                  ) : agotado ? (
                    'Sin Cupos'
                  ) : (
                    <>
                      Inscribirme Ahora
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RunnerDashboard;
