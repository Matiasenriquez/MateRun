/**
 * ==============================================================================
 * MODELO MONGOOSE: INSCRIPCIÓN A CARRERA (Registration)
 * ==============================================================================
 * Registra la participación de un corredor en una carrera determinada.
 * 
 * Reglas de negocio críticas:
 * 1. Número de dorsal (bib number):
 *    - Debe ser único dentro de la misma carrera (índice compuesto único: carrera + dorsal).
 *    - Rango válido: de 1 a cupoMaximo de la carrera.
 * 2. Un corredor solo puede registrarse una vez por carrera (índice compuesto único: carrera + corredor).
 * 3. Estados de la inscripción (4 estados oficiales):
 *    - 'Pendiente': Corredor inscripto que aún no se acreditó en la mesa del evento.
 *    - 'Acreditado': Corredor que llegó al evento, retiró su kit y va a competir.
 *    - 'Retira y no corre': Corredor que retira su kit pero no larga la carrera.
 *    - 'Baja': Corredor dado de baja por la organización o cancelación.
 * 4. Snapshot de datos:
 *    - Guarda una copia exacta de los datos personales ingresados al momento de inscribirse
 *      (nombre, apellido, dni, email, teléfono, fechaNacimiento, sexo, ciudad, provincia, contactoEmergencia).
 * ==============================================================================
 */

import { Schema, model, Document, Types } from 'mongoose';

/**
 * Interfaz TypeScript para el subdocumento con los datos personales del corredor
 */
export interface IRunnerSnapshot {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  fechaNacimiento: Date;
  sexo: 'Masculino' | 'Femenino';
  ciudad: string;
  provincia: string;
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
  };
}

/**
 * Interfaz TypeScript para el documento de Inscripción
 */
export interface IRegistration extends Document {
  _id: Types.ObjectId;
  carrera: Types.ObjectId;
  corredor: Types.ObjectId;
  dorsal: number;
  distancia: number;
  datosCorredor: IRunnerSnapshot;
  talleRemera: 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL';
  estado: 'Pendiente' | 'Acreditado' | 'Retira y no corre' | 'Baja';
  categoria?: string;
  fechaAcreditacion?: Date;
  acreditadoPor?: Types.ObjectId;
  fechaInscripcion: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RunnerSnapshotSchema = new Schema<IRunnerSnapshot>(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    dni: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    telefono: { type: String, required: true, trim: true },
    fechaNacimiento: { type: Date, required: true },
    sexo: {
      type: String,
      enum: ['Masculino', 'Femenino'],
      required: true,
    },
    ciudad: { type: String, required: true, trim: true },
    provincia: { type: String, required: true, trim: true },
    contactoEmergencia: {
      nombre: { type: String, trim: true },
      telefono: { type: String, trim: true },
    },
  },
  { _id: false }
);

const RegistrationSchema = new Schema<IRegistration>(
  {
    carrera: {
      type: Schema.Types.ObjectId,
      ref: 'Race',
      required: [true, 'La carrera es obligatoria'],
      index: true,
    },
    corredor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario corredor es obligatorio'],
      index: true,
    },
    dorsal: {
      type: Number,
      required: [true, 'El número de dorsal es obligatorio'],
      min: [1, 'El dorsal mínimo es 1'],
    },
    distancia: {
      type: Number,
      required: [true, 'La distancia es obligatoria'],
      min: [1, 'La distancia debe ser mayor a 0'],
    },
    datosCorredor: {
      type: RunnerSnapshotSchema,
      required: true,
    },
    talleRemera: {
      type: String,
      enum: {
        values: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
        message: '{VALUE} no es un talle de remera válido',
      },
      required: [true, 'El talle de remera es obligatorio'],
    },
    estado: {
      type: String,
      enum: {
        values: ['Pendiente', 'Acreditado', 'Retira y no corre', 'Baja'],
        message: '{VALUE} no es un estado de inscripción válido',
      },
      default: 'Pendiente',
      index: true,
    },
    categoria: {
      type: String,
      trim: true,
    },
    fechaAcreditacion: {
      type: Date,
    },
    acreditadoPor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    fechaInscripcion: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/**
 * ÍNDICES COMPUESTOS ÚNICOS:
 * 1. Garantiza que en una misma carrera NO puedan existir dos corredores con el mismo número de dorsal.
 * 2. Garantiza que un mismo corredor NO pueda inscribirse por duplicado a la misma carrera.
 */
RegistrationSchema.index({ carrera: 1, dorsal: 1 }, { unique: true });
RegistrationSchema.index({ carrera: 1, corredor: 1 }, { unique: true });

export const Registration = model<IRegistration>('Registration', RegistrationSchema);
