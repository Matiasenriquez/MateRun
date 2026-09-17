/**
 * ==============================================================================
 * PANEL DE ADMINISTRACIÓN (AdminDashboard) - MateRun
 * ==============================================================================
 * Esta es la vista basada exactamente en la imagen de referencia:
 * Dos columnas (Paneles).
 * - IZQUIERDA: Formulario "DATOS DEL INSCRIPTO" para asignar dorsal y remera.
 * - DERECHA: Tabla "HISTORIAL" con los últimos registros de la base de datos.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { User, Race } from '../../types';
import { Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  // Estados para datos maestros
  const [races, setRaces] = useState<Race[]>([]);
  const [runners, setRunners] = useState<User[]>([]);
  const [recentHistory, setRecentHistory] = useState<any[]>([]);

  // Estados del Formulario (Panel Izquierdo)
  const [selectedRunner, setSelectedRunner] = useState('');
  const [selectedRace, setSelectedRace] = useState('');
  const [dorsal, setDorsal] = useState('');
  const [talleRemera, setTalleRemera] = useState('M');
  const [estado, setEstado] = useState('Acreditado');
  
  // Estado de interfaz
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Carga inicial de datos
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Usamos Promise.all para cargar carreras, corredores y el historial al mismo tiempo
      const [racesRes, usersRes, historyRes] = await Promise.all([
        api.get('/races'),
        api.get('/users'), // En un entorno real con miles, se usaría búsqueda/paginación
        api.get('/history/recent')
      ]);

      setRaces(racesRes.data.races || []);
      // Filtramos solo los usuarios que son "corredores"
      setRunners((usersRes.data.users || []).filter((u: User) => u.rol === 'corredor'));
      setRecentHistory(historyRes.data.history || []);
    } catch (error) {
      console.error("Error al cargar datos del panel:", error);
      setErrorMsg("No se pudieron cargar los datos del servidor.");
    }
  };

  // Manejador para el envío del formulario (Acreditar Corredor)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    
    if (!selectedRunner || !selectedRace || !dorsal) {
      setErrorMsg('Por favor complete corredor, carrera y asigne un dorsal.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/registrations/admin', {
        corredorId: selectedRunner,
        raceId: selectedRace,
        talleRemera,
        dorsal: Number(dorsal),
        estado
      });

      setSuccessMsg('¡Acreditación exitosa!');
      // Limpiar formulario parcialmente para el siguiente
      setSelectedRunner('');
      setDorsal('');
      
      // Recargar historial para que aparezca a la derecha
      fetchInitialData();
    } catch (error: any) {
      // Capturamos el error exacto solicitado por la regla de negocio
      const msg = error.response?.data?.message || 'Error al guardar la inscripción.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejador para limpiar formulario (Botón Cancelar)
  const handleCancel = () => {
    setSelectedRunner('');
    setSelectedRace('');
    setDorsal('');
    setTalleRemera('M');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <div className="card-panel flex flex-col h-full">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Datos del inscripto
          </h2>
        </div>

        {/* Alertas */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-machine-light border border-machine/20 text-machine rounded-md text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{successMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="space-y-4 flex-1">
            {/* Selección de Corredor */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Corredor</label>
              <select 
                value={selectedRunner}
                onChange={(e) => setSelectedRunner(e.target.value)}
                className="input-field"
              >
                <option value="">-- Seleccionar Corredor --</option>
                {runners.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.apellido}, {r.nombre} (DNI: {r.dni || 'S/D'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de Carrera */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Carrera (Distancia)</label>
              <select 
                value={selectedRace}
                onChange={(e) => setSelectedRace(e.target.value)}
                className="input-field"
              >
                <option value="">-- Seleccionar Carrera --</option>
                {races.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.nombre} ({r.distancias.join('K, ')}K) - {new Date(r.fecha).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Número de Dorsal y Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">N° de Dorsal asignado</label>
                <input 
                  type="number"
                  min="1"
                  value={dorsal}
                  onChange={(e) => setDorsal(e.target.value)}
                  className="input-field font-bold text-machine"
                  placeholder="Ej: 105"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Estado</label>
                <select 
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="input-field"
                >
                  <option value="Acreditado">Acreditado (Recibe Kit)</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Retira y no corre">Retira y no corre</option>
                </select>
              </div>
            </div>

            {/* Talle de Remera (Radio Buttons estilo Chips) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Talle de remera</label>
              <div className="flex flex-wrap gap-2">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(talle => (
                  <button
                    key={talle}
                    type="button"
                    onClick={() => setTalleRemera(talle)}
                    className={`px-4 py-2 text-sm font-bold rounded-md border transition-colors ${
                      talleRemera === talle 
                        ? 'bg-machine border-machine text-white' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {talle}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Botones de Acción (Basados en la imagen: Rojo y Gris) */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex gap-3">
            <button 
              type="submit" 
              disabled={isLoading}
              className="btn-primary flex-1 py-3 text-sm font-bold uppercase tracking-wider"
            >
              <Plus className="w-5 h-5" />
              {isLoading ? 'Procesando...' : 'Agregar / Acreditar'}
            </button>
            <button 
              type="button" 
              onClick={handleCancel}
              disabled={isLoading}
              className="btn-secondary flex-none py-3 px-6 text-sm font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-600 border-none shadow-none"
            >
              <X className="w-5 h-5" />
              Cancelar
            </button>
          </div>
        </form>
      </div>

      {/* PANEL DERECHO: HISTORIAL RECIENTE */}
      <div className="card-panel flex flex-col h-full overflow-hidden">
        <div className="border-b border-slate-100 pb-3 mb-5">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Historial de personas que se agregan (Recientes)
          </h2>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-semibold rounded-tl-md">Fecha/Hora</th>
                <th className="px-4 py-3 font-semibold">Corredor</th>
                <th className="px-4 py-3 font-semibold">Carrera</th>
                <th className="px-4 py-3 font-semibold text-center">Dorsal</th>
                <th className="px-4 py-3 font-semibold rounded-tr-md">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No hay registros recientes.
                  </td>
                </tr>
              ) : (
                recentHistory.map((log: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {new Date(log.fecha).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {log.corredorNombre || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="truncate max-w-[150px] block" title={log.carreraNombre}>
                        {log.carreraNombre || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block bg-machine-light text-machine font-bold px-2 py-0.5 rounded text-xs">
                        {log.dorsal || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        log.estadoFinal === 'Acreditado' ? 'bg-green-100 text-green-700' :
                        log.estadoFinal === 'Baja' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.estadoFinal || log.accion}
                      </span>
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
