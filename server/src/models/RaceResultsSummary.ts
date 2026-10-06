/**
 * ==============================================================================
 * MODELO MONGOOSE: RESUMEN OFICIAL DE RESULTADOS DE CARRERA (RaceResultsSummary)
 * ==============================================================================
 * Almacena la estructura oficial de resultados administrada por el SuperAdmin:
 * 1. Clasificación general: Podio (1.º, 2.º y 3.º puestos) con corredor y tiempo oficial.
 * 2. Ganadores por categoría de edad: Corredor ganador y tiempo oficial por categoría.
 * 3. Tiempos individuales de corredores: Tiempos registrados para cada participante.
 * ==============================================================================
 */

import { Schema, model, Document, Types } from 'mongoose';

export interface IPodiumEntry {
  posicion: number; // 1, 2, 3
  sexo?: 'Masculino' | 'Femenino';
  corredor: Types.ObjectId; // User._id
  registrationId?: Types.ObjectId;
  dorsal?: number;
  nombre?: string;
  tiempo?: string; // HH:MM:SS
  tiempoSegundos?: number;
}

export interface ICategoryWinnerEntry {
  categoria: string;
  posicion?: number; // 1, 2, 3
  sexo?: 'Masculino' | 'Femenino';
  corredor: Types.ObjectId; // User._id
  registrationId?: Types.ObjectId;
  dorsal?: number;
  nombre?: string;
  tiempo?: string; // HH:MM:SS
  tiempoSegundos?: number;
}

export interface IRunnerTimeEntry {
  corredor: Types.ObjectId; // User._id
  registrationId?: Types.ObjectId;
  dorsal?: number;
  nombre?: string;
  categoria?: string;
  sexo?: string;
  distancia?: number;
  tiempo?: string; // HH:MM:SS
  tiempoSegundos?: number;
  posicionGeneral?: number | null;
  posicionCategoria?: number | null;
  posicionSexo?: number | null;
  descalificado?: boolean;
}

export interface IRaceResultsSummary extends Document {
  _id: Types.ObjectId;
  carrera: Types.ObjectId;
  distancia: number; // en km
  clasificacionGeneral: IPodiumEntry[];
  ganadoresCategorias: ICategoryWinnerEntry[];
  tiemposCorredores: IRunnerTimeEntry[];
  actualizadoPor?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PodiumEntrySchema = new Schema<IPodiumEntry>(
  {
    posicion: { type: Number, required: true },
    sexo: { type: String, enum: ['Masculino', 'Femenino'], default: 'Masculino' },
    corredor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration' },
    dorsal: { type: Number },
    nombre: { type: String, trim: true },
    tiempo: { type: String, trim: true },
    tiempoSegundos: { type: Number },
  },
  { _id: false }
);

const CategoryWinnerEntrySchema = new Schema<ICategoryWinnerEntry>(
  {
    categoria: { type: String, required: true, trim: true },
    posicion: { type: Number, default: 1 },
    sexo: { type: String, enum: ['Masculino', 'Femenino'], default: 'Masculino' },
    corredor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration' },
    dorsal: { type: Number },
    nombre: { type: String, trim: true },
    tiempo: { type: String, trim: true },
    tiempoSegundos: { type: Number },
  },
  { _id: false }
);

const RunnerTimeEntrySchema = new Schema<IRunnerTimeEntry>(
  {
    corredor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    registrationId: { type: Schema.Types.ObjectId, ref: 'Registration' },
    dorsal: { type: Number },
    nombre: { type: String, trim: true },
    categoria: { type: String, trim: true },
    sexo: { type: String, trim: true },
    distancia: { type: Number },
    tiempo: { type: String, trim: true },
    tiempoSegundos: { type: Number },
    posicionGeneral: { type: Number, default: null },
    posicionCategoria: { type: Number, default: null },
    posicionSexo: { type: Number, default: null },
    descalificado: { type: Boolean, default: false },
  },
  { _id: false }
);

const RaceResultsSummarySchema = new Schema<IRaceResultsSummary>(
  {
    carrera: {
      type: Schema.Types.ObjectId,
      ref: 'Race',
      required: true,
      index: true,
    },
    distancia: {
      type: Number,
      required: true,
      index: true,
    },
    clasificacionGeneral: {
      type: [PodiumEntrySchema],
      default: [],
    },
    ganadoresCategorias: {
      type: [CategoryWinnerEntrySchema],
      default: [],
    },
    tiemposCorredores: {
      type: [RunnerTimeEntrySchema],
      default: [],
    },
    actualizadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índice compuesto único: una carrera tiene un resumen por cada distancia
RaceResultsSummarySchema.index({ carrera: 1, distancia: 1 }, { unique: true });

export const RaceResultsSummary = model<IRaceResultsSummary>(
  'RaceResultsSummary',
  RaceResultsSummarySchema
);
