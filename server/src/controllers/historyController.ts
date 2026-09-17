/**
 * ==============================================================================
 * CONTROLADOR DE HISTORIAL Y AUDITORÍA (History Controller) - MateRun
 * ==============================================================================
 * Satisface la vista de 2 cuadros de historial para administradores:
 * 
 * 1. Cuadro Izquierdo (Corredores Acreditados):
 *    - Lista de corredores con estado 'Acreditado'.
 *    - Columnas: Fecha/Hora de acreditación, Nombre, Apellido, DNI, Distancia y Dorsal.
 * 
 * 2. Cuadro Derecho (Historial de Acciones / Auditoría):
 *    - Registro cronológico de nuevos inscriptos, inscripciones modificadas y bajas.
 *    - Muestra tipo de evento, usuario responsable, descripción y marca temporal.
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { Registration } from '../models/Registration';
import { AuditLog } from '../models/AuditLog';

/**
 * Obtiene la información consolidada para la pantalla de Historial de una carrera.
 * 
 * Ruta: GET /api/history/race/:raceId
 * Acceso: Admin o SuperAdmin
 */
export const getRaceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;

    // 1. CUADRO IZQUIERDO: Corredores Acreditados
    const accreditedRunners = await Registration.find({
      carrera: raceId,
      estado: 'Acreditado',
    })
      .select('fechaAcreditacion datosCorredor distancia dorsal')
      .sort({ fechaAcreditacion: -1 });

    const formattedAccredited = accreditedRunners.map((r) => ({
      _id: r._id,
      fechaAcreditacion: r.fechaAcreditacion,
      nombre: r.datosCorredor.nombre,
      apellido: r.datosCorredor.apellido,
      dni: r.datosCorredor.dni,
      distancia: r.distancia,
      dorsal: r.dorsal,
    }));

    // 2. CUADRO DERECHO: Historial de Auditoría (nuevos inscriptos, modificados, bajas)
    const auditLogs = await AuditLog.find({ carrera: raceId })
      .populate('usuarioResponsable', 'nombre apellido email rol')
      .sort({ fecha: -1 })
      .limit(100); // Límite de las últimas 100 acciones

    res.status(200).json({
      accreditedRunners: formattedAccredited,
      auditLogs,
    });
  } catch (error: any) {
    console.error('Error al obtener historial de la carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

export const getRecentAuditHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const auditLogs = await AuditLog.find()
      .populate('usuarioResponsable', 'nombre apellido')
      .populate('carrera', 'nombre distancias')
      .sort({ fecha: -1 })
      .limit(20);

    const history = auditLogs.map(log => {
      const carreraObj: any = log.carrera || {};
      const descParts = log.descripcion.split(' (Dorsal #');
      const namePart = descParts[0].split(': ')[1] || '';
      
      return {
        fecha: log.fecha,
        corredorNombre: namePart.split(' (DNI')[0],
        carreraNombre: carreraObj.nombre || 'Desconocida',
        dorsal: log.detalles?.dorsal || '-',
        estadoFinal: log.tipo,
        accion: log.descripcion
      };
    });

    res.status(200).json({ history });
  } catch (error: any) {
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
