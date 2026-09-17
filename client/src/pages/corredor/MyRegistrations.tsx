/**
 * ==============================================================================
 * MIS INSCRIPCIONES (MyRegistrations) - MateRun
 * ==============================================================================
 * Lista las inscripciones vigentes y pasadas del corredor en sesión.
 * Permite visualizar el dorsal asignado, el talle de remera y el estado.
 * 
 * Funcionalidad agregada:
 * - Botón "Ver inscripción" en cada tarjeta.
 * - Modal emergente interactivo que muestra el desglose exhaustivo de todos los
 *   datos cargados durante el registro (datos personales, carrera, dorsal y emergencia).
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { 
  FileText, 
  Eye, 
  X, 
  Calendar, 
  User, 
  Phone 
} from 'lucide-react';

export const MyRegistrations: React.FC = () => {
  // Lista de inscripciones del corredor
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estado para controlar la inscripción seleccionada que se visualiza en el modal
  const [selectedReg, setSelectedReg] = useState<any | null>(null);

  /**
   * Carga inicial de las inscripciones del usuario logueado
   */
  useEffect(() => {
    fetchMyRegistrations();
  }, []);

  const fetchMyRegistrations = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/registrations/my-registrations');
      setRegistrations(res.data.registrations || []);
    } catch (error) {
      console.error("Error al cargar mis inscripciones:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Helper para formatear fechas de manera segura evitando desfases horarios
   */
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return String(dateString);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado de la sección */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mis Inscripciones</h2>
        <p className="text-slate-500 mt-1">Sigue el estado de tu acreditación, dorsal y consulta tus datos cargados.</p>
      </div>

      {/* Indicador de carga */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
        </div>
      ) : registrations.length === 0 ? (
        // Estado vacío: no hay inscripciones
        <div className="card-panel text-center py-16">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No tienes inscripciones vigentes</h3>
          <p className="text-slate-500 mt-2">Visita la sección "Próximas Carreras" para anotarte.</p>
        </div>
      ) : (
        // Cuadrícula de tarjetas de inscripciones
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registrations.map((reg) => {
            const carreraObj = reg.carrera || {};

            return (
              <div 
                key={reg._id} 
                className="card-panel flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden bg-white border border-slate-200 rounded-xl p-5"
              >
                {/* Barra lateral de estado colorida */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  reg.estado === 'Acreditado' ? 'bg-green-500' :
                  reg.estado === 'Pendiente' ? 'bg-amber-400' :
                  reg.estado === 'Retira y no corre' ? 'bg-blue-500' :
                  'bg-slate-300'
                }`}></div>
                
                <div className="pl-2.5">
                  {/* Título de la carrera y estado */}
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <h3 className="text-lg font-black text-slate-800 leading-snug line-clamp-1" title={carreraObj.nombre}>
                      {carreraObj.nombre || 'Carrera sin título'}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shrink-0 ${
                      reg.estado === 'Acreditado' ? 'bg-green-100 text-green-700' :
                      reg.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                      reg.estado === 'Retira y no corre' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {reg.estado}
                    </span>
                  </div>
                  
                  {/* Fecha de la carrera */}
                  <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(carreraObj.fecha)}</span>
                    {carreraObj.lugar && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="truncate">{carreraObj.lugar}</span>
                      </>
                    )}
                  </p>

                  {/* Resumen rápido: Dorsal y Talle */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Dorsal Asignado</p>
                      <p className="text-lg font-black text-machine mt-0.5">
                        {reg.dorsal ? `#${reg.dorsal}` : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Distancia / Talle</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {reg.distancia}K <span className="text-slate-400 font-normal">|</span> Talle {reg.talleRemera}
                      </p>
                    </div>
                  </div>

                  {/* BOTÓN: VER INSCRIPCIÓN */}
                  <button
                    onClick={() => setSelectedReg(reg)}
                    className="mt-3 w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider bg-slate-100 hover:bg-machine hover:text-white text-slate-700 rounded-lg flex items-center justify-center gap-2 transition-all duration-150 border border-slate-200 group"
                  >
                    <Eye className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    <span>Ver inscripción</span>
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================
          MODAL DETALLE COMPLETO DE INSCRIPCIÓN ("Ver inscripción")
          ======================================================================== */}
      {selectedReg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-200 max-h-[90vh] flex flex-col">
            
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-machine bg-machine-light px-2 py-0.5 rounded">
                  Ficha de Inscripción
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1 leading-snug">
                  {selectedReg.carrera?.nombre || 'Detalle de la Carrera'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable con todos los datos */}
            <div className="overflow-y-auto space-y-5 pr-1 text-xs">
              
              {/* Bloque 1: Resumen de Carrera y Dorsal */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Estado en el Evento
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    selectedReg.estado === 'Acreditado' ? 'bg-green-100 text-green-700' :
                    selectedReg.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                    selectedReg.estado === 'Retira y no corre' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedReg.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Dorsal</p>
                    <p className="text-xl font-black text-machine">{selectedReg.dorsal ? `#${selectedReg.dorsal}` : '-'}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Distancia</p>
                    <p className="text-base font-bold text-slate-800">{selectedReg.distancia} km</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Talle Remera</p>
                    <p className="text-base font-bold text-slate-800">{selectedReg.talleRemera || '-'}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Fecha Carrera</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1">{formatDate(selectedReg.carrera?.fecha)}</p>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Información Personal del Corredor */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-machine" />
                  Datos Personales del Inscripto
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Nombre completo:</span>
                    <span className="font-bold text-slate-800">
                      {selectedReg.datosCorredor?.nombre} {selectedReg.datosCorredor?.apellido}
                    </span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">DNI:</span>
                    <span className="font-bold text-slate-800">{selectedReg.datosCorredor?.dni || '-'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Sexo:</span>
                    <span className="font-medium text-slate-800">{selectedReg.datosCorredor?.sexo || '-'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Fecha de nacimiento:</span>
                    <span className="font-medium text-slate-800">{formatDate(selectedReg.datosCorredor?.fechaNacimiento)}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Ciudad y Provincia:</span>
                    <span className="font-medium text-slate-800">
                      {selectedReg.datosCorredor?.ciudad}
                      {selectedReg.datosCorredor?.provincia && selectedReg.datosCorredor?.provincia !== selectedReg.datosCorredor?.ciudad
                        ? `, ${selectedReg.datosCorredor?.provincia}`
                        : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Datos de Contacto y Emergencia */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-machine" />
                  Contacto y Emergencia
                </h4>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Correo electrónico:</span>
                    <span className="font-medium text-slate-800">{selectedReg.datosCorredor?.email || '-'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Teléfono:</span>
                    <span className="font-medium text-slate-800">{selectedReg.datosCorredor?.telefono || '-'}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="font-semibold text-slate-500">Contacto de emergencia:</span>
                    <span className="font-bold text-machine">
                      {typeof selectedReg.datosCorredor?.contactoEmergencia === 'object'
                        ? selectedReg.datosCorredor?.contactoEmergencia?.telefono
                        : selectedReg.datosCorredor?.contactoEmergencia || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque 4: Fechas de auditoría */}
              <div className="text-[11px] text-slate-400 pt-1 flex justify-between">
                <span>Inscripción realizada: {formatDate(selectedReg.fechaInscripcion || selectedReg.createdAt)}</span>
                {selectedReg.fechaAcreditacion && (
                  <span>Acreditado el: {formatDate(selectedReg.fechaAcreditacion)}</span>
                )}
              </div>

            </div>

            {/* Pie del Modal con botón de cierre */}
            <div className="border-t border-slate-100 pt-4 mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReg(null)}
                className="py-2.5 px-6 text-xs font-bold uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MyRegistrations;
