/**
 * ==============================================================================
 * MODELO MONGOOSE: HISTORIAL DE AUDITORÍA (AuditLog)
 * ==============================================================================
 * Almacena el registro cronológico de acciones administrativas sobre inscripciones.
 * 
 * Se utiliza en la interfaz de Administrador en el panel derecho de "Historial",
 * donde se visualizan:
 * - Nuevos inscriptos generados
 * - Inscripciones modificadas
 * - Inscripciones dadas de baja
 * - Cambios de estado (acreditaciones, etc.)
 * ==============================================================================
 */

import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  carrera: Types.ObjectId;
  tipo: 'NUEVA_INSCRIPCION' | 'MODIFICACION' | 'BAJA' | 'CAMBIO_ESTADO';
  usuarioResponsable: Types.ObjectId;
  descripcion: string;
  detalles?: Record<string, unknown>;
  fecha: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    carrera: {
      type: Schema.Types.ObjectId,
      ref: 'Race',
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: ['NUEVA_INSCRIPCION', 'MODIFICACION', 'BAJA', 'CAMBIO_ESTADO'],
      required: true,
      index: true,
    },
    usuarioResponsable: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    descripcion: {
      type: String,
      required: true,
      trim: true,
    },
    detalles: {
      type: Schema.Types.Mixed,
    },
    fecha: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
