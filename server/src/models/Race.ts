/**
 * ==============================================================================
 * MODELO MONGOOSE: CARRERA / EVENTO DEPORTIVO (Race)
 * ==============================================================================
 * Representa los eventos de Trail Running y Maratones creados por el SuperAdmin.
 * 
 * Atributos requeridos:
 * - nombre: Nombre oficial del evento (ej. "Ultra Trail Los Andes 2026").
 * - lugar: Ciudad, provincia o parque natural donde se realiza la carrera.
 * - cupoMaximo: Cantidad límite de corredores habilitados. Define el rango de dorsales (1 a cupoMaximo).
 * - fecha: Fecha y hora programada del evento deportivo.
 * - organizador: Nombre de la organización o persona a cargo del evento.
 * - distancias: Lista de distancias numéricas en kilómetros (ej. [10, 21, 42]).
 *   Estas distancias se cargan dinámicamente desde el panel del SuperAdmin.
 * - estado: 'activa' | 'finalizada' | 'cancelada'.
 * - adminAsignado: Usuario administrador asignado a la gestión de la carrera.
 * - categorias: Lista de categorías configuradas por rangos etarios (nombre, edadMinima, edadMaxima).
 * ==============================================================================
 */

import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interfaz TypeScript para las categorías por edad de la carrera
 */
export interface IRaceCategory {
  nombre: string;
  edadMinima: number;
  edadMaxima: number;
}

/**
 * Interfaz TypeScript para el documento de Carrera
 */
export interface IRace extends Document {
  _id: Types.ObjectId;
  nombre: string;
  lugar: string;
  cupoMaximo: number;
  fecha: Date;
  organizador: string;
  distancias: number[];
  estado: 'activa' | 'finalizada' | 'cancelada';
  creadoPor?: Types.ObjectId;
  adminAsignado?: Types.ObjectId;
  categorias?: IRaceCategory[];
  createdAt: Date;
  updatedAt: Date;
}

const RaceCategorySchema = new Schema<IRaceCategory>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la categoría es obligatorio'],
      trim: true,
    },
    edadMinima: {
      type: Number,
      required: [true, 'La edad mínima es obligatoria'],
      min: [0, 'La edad mínima no puede ser negativa'],
    },
    edadMaxima: {
      type: Number,
      required: [true, 'La edad máxima es obligatoria'],
      min: [0, 'La edad máxima no puede ser negativa'],
    },
  },
  { _id: false }
);

const RaceSchema = new Schema<IRace>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la carrera es obligatorio'],
      trim: true,
      index: true,
    },
    lugar: {
      type: String,
      required: [true, 'El lugar o localidad es obligatorio'],
      trim: true,
    },
    cupoMaximo: {
      type: Number,
      required: [true, 'El cupo máximo de corredores es obligatorio'],
      min: [1, 'El cupo debe ser de al menos 1 corredor'],
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha del evento es obligatoria'],
      index: true,
    },
    organizador: {
      type: String,
      required: [true, 'El organizador u organización es obligatorio'],
      trim: true,
    },
    distancias: {
      type: [Number],
      required: [true, 'Debe especificarse al menos una distancia'],
      validate: {
        validator: function (val: number[]) {
          // Valida que el arreglo tenga al menos 1 elemento y que sean números positivos
          return Array.isArray(val) && val.length > 0 && val.every((d) => d > 0);
        },
        message: 'Debe ingresar al menos una distancia válida en kilómetros (número positivo)',
      },
    },
    estado: {
      type: String,
      enum: {
        values: ['activa', 'finalizada', 'cancelada'],
        message: '{VALUE} no es un estado de carrera válido',
      },
      default: 'activa',
      index: true,
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    adminAsignado: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    categorias: {
      type: [RaceCategorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Race = model<IRace>('Race', RaceSchema);
