/**
 * ==============================================================================
 * MODELO MONGOOSE: RESULTADOS HISTÓRICOS DE CARRERAS (RaceResult)
 * ==============================================================================
 * Almacena los resultados oficiales de carreras anteriores en las que participó
 * un corredor.
 * 
 * Se utiliza en la sección "Mis Datos" del perfil del Corredor para:
 * 1. Listar las carreras previas con sus métricas oficiales:
 *    - Posición general
 *    - Posición en su categoría
 *    - Posición general por sexo
 * 2. Calcular los promedios globales del corredor:
 *    - Distancia promedio en la que participa
 *    - Tiempo promedio total
 *    - Mejor tiempo (récord personal) y en qué carrera fue logrado
 * ==============================================================================
 */

import { Schema, model, Document, Types } from 'mongoose';

export interface IRaceResult extends Document {
  _id: Types.ObjectId;
  corredor: Types.ObjectId;
  carrera?: Types.ObjectId; // Referencia opcional a la carrera en Race (para futura gestión de resultados SuperAdmin)
  nombreCarrera: string;
  fecha: Date;
  distancia: number; // en kilómetros
  tiempoSegundos?: number | null; // tiempo de llegada expresado en segundos totales (null = Pendiente)
  posicionGeneral?: number | null; // null = Pendiente
  posicionCategoria?: number | null; // null = Pendiente
  posicionSexo?: number | null;
  categoria?: string | null; // ej. "20-29"
  createdAt: Date;
  updatedAt: Date;
}

const RaceResultSchema = new Schema<IRaceResult>(
  {
    corredor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    carrera: {
      type: Schema.Types.ObjectId,
      ref: 'Race',
      required: false,
    },
    nombreCarrera: {
      type: String,
      required: true,
      trim: true,
    },
    fecha: {
      type: Date,
      required: true,
    },
    distancia: {
      type: Number,
      required: true,
      min: 0,
    },
    tiempoSegundos: {
      type: Number,
      required: false,
      default: null,
    },
    posicionGeneral: {
      type: Number,
      required: false,
      default: null,
    },
    posicionCategoria: {
      type: Number,
      required: false,
      default: null,
    },
    posicionSexo: {
      type: Number,
      required: false,
      default: null,
    },
    categoria: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const RaceResult = model<IRaceResult>('RaceResult', RaceResultSchema);
