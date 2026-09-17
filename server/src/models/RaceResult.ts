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
  nombreCarrera: string;
  fecha: Date;
  distancia: number; // en kilómetros
  tiempoSegundos: number; // tiempo de llegada expresado en segundos totales
  posicionGeneral: number;
  posicionCategoria: number;
  posicionSexo: number;
  categoria: string;
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
      min: 1,
    },
    tiempoSegundos: {
      type: Number,
      required: true,
      min: 1,
    },
    posicionGeneral: {
      type: Number,
      required: true,
      min: 1,
    },
    posicionCategoria: {
      type: Number,
      required: true,
      min: 1,
    },
    posicionSexo: {
      type: Number,
      required: true,
      min: 1,
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const RaceResult = model<IRaceResult>('RaceResult', RaceResultSchema);
