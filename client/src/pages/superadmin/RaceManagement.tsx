/**
 * ==============================================================================
 * GESTIÓN DE CARRERAS (RaceManagement) - MateRun
 * ==============================================================================
 * Panel exclusivo para SuperAdmin. Permite ver y crear nuevas carreras.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Race } from '../../types';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';

export const RaceManagement: React.FC = () => {
  const [races, setRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formulario de nueva carrera
  const [showModal, setShowModal] = useState(false);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [distancias, setDistancias] = useState('10,21');
  const [cupoMaximo, setCupoMaximo] = useState('500');

  useEffect(() => {
    fetchRaces();
  }, []);

  const fetchRaces = async () => {
    try {
      const res = await api.get('/races');
      setRaces(res.data.races);
    } catch (error) {
      console.error("Error al cargar carreras:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const distArray = distancias.split(',').map(d => Number(d.trim()));
      await api.post('/races', {
        nombre,
        fecha,
        distancias: distArray,
        cupoMaximo: Number(cupoMaximo)
      });
      setShowModal(false);
      fetchRaces();
      // Limpiar
      setNombre(''); setFecha(''); setDistancias('10,21'); setCupoMaximo('500');
    } catch (error) {
      alert("Error al crear la carrera. Verifique los datos.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Carreras</h2>
          <p className="text-slate-500 mt-1">Administra los eventos deportivos (Exclusivo SuperAdmin).</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Nueva Carrera
        </button>
      </div>

      <div className="card-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nombre</th>
                <th className="px-6 py-4 font-semibold">Fecha</th>
                <th className="px-6 py-4 font-semibold text-center">Distancias</th>
                <th className="px-6 py-4 font-semibold text-center">Inscritos / Cupo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-8">Cargando...</td></tr>
              ) : races.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8">No hay carreras registradas.</td></tr>
              ) : (
                races.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800">{r.nombre}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-slate-400" />
                        {new Date(r.fecha).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {r.distancias.join(', ')} km
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">
                        {r.totalInscriptos} / {r.cupoMaximo}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Sencillo para Crear Carrera */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Nueva Carrera</h3>
            <form onSubmit={handleCreateRace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Nombre de la Carrera</label>
                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="input-field" placeholder="Ej: Ultra Trail de los Andes" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Fecha</label>
                <input required type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Distancias (separadas por coma)</label>
                <input required type="text" value={distancias} onChange={e => setDistancias(e.target.value)} className="input-field" placeholder="10, 21, 42" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Cupo Máximo</label>
                <input required type="number" value={cupoMaximo} onChange={e => setCupoMaximo(e.target.value)} className="input-field" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="btn-primary flex-1">Guardar Carrera</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-none">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
