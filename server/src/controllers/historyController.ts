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
import { Race } from '../models/Race';
import { User } from '../models/User';

/**
 * Obtiene la información consolidada para la pantalla de Historial de una carrera.
 * 
 * Ruta: GET /api/history/race/:raceId
 * Acceso: Admin o SuperAdmin
 */
export const getRaceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;

    const race = await Race.findById(raceId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

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

    // 2. Historial de Auditoría cronológico completo para la carrera
    const rawAuditLogs = await AuditLog.find({ carrera: raceId })
      .populate('usuarioResponsable', 'nombre apellido email rol')
      .sort({ fecha: -1 })
      .limit(500);

    const auditLogs = rawAuditLogs.map((log) => {
      const obj = log.toObject();
      let corredor = obj.detalles?.corredor;
      let dorsal = obj.detalles?.dorsal;
      let cambios = obj.detalles?.cambios;

      // Fallback inteligente para registros de auditoría anteriores
      if (!corredor && obj.descripcion) {
        let nombre = '';
        let dni = '';
        if (obj.descripcion.includes(' para ')) {
          const part = obj.descripcion.split(' para ')[1]?.split(' (Dorsal #')[0];
          nombre = part || '';
        } else if (obj.descripcion.includes('corredor: ')) {
          const part = obj.descripcion.split('corredor: ')[1]?.split(' (DNI')[0];
          nombre = part || '';
          if (obj.descripcion.includes('(DNI ')) {
            dni = obj.descripcion.split('(DNI ')[1]?.split(')')[0] || '';
          }
        }
        if (obj.descripcion.includes('(Dorsal #')) {
          dorsal = obj.descripcion.split('(Dorsal #')[1]?.split(')')[0] || dorsal;
        }
        corredor = { nombre: nombre.trim(), apellido: '', dni: dni.trim() };
      }

      if (!cambios || !Array.isArray(cambios) || cambios.length === 0) {
        if (obj.tipo === 'CAMBIO_ESTADO' && obj.detalles?.estadoAnterior && obj.detalles?.nuevoEstado) {
          cambios = [
            {
              campo: 'Estado',
              etiqueta: 'Estado de Acreditación',
              valorAnterior: obj.detalles.estadoAnterior,
              nuevoValor: obj.detalles.nuevoEstado,
            },
          ];
        } else if (obj.tipo === 'NUEVA_INSCRIPCION') {
          cambios = [
            {
              campo: 'Alta',
              etiqueta: 'Inscripción en Carrera',
              valorAnterior: '-',
              nuevoValor: 'Alta registrada',
            },
            {
              campo: 'Dorsal',
              etiqueta: 'Dorsal Asignado',
              valorAnterior: '-',
              nuevoValor: dorsal || '-',
            },
            {
              campo: 'Estado',
              etiqueta: 'Estado Inicial',
              valorAnterior: '-',
              nuevoValor: 'Pendiente',
            },
          ];
        } else {
          cambios = [
            {
              campo: 'Modificación',
              etiqueta: 'Datos de Inscripción',
              valorAnterior: 'Valor previo',
              nuevoValor: 'Actualizado',
            },
          ];
        }
      }

      return {
        ...obj,
        detalles: {
          ...obj.detalles,
          corredor,
          dorsal,
          cambios,
        },
      };
    });

    res.status(200).json({
      race,
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
