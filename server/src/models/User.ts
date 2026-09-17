/**
 * ==============================================================================
 * MODELO MONGOOSE: USUARIO (User)
 * ==============================================================================
 * Representa a todas las personas que interactúan con el sistema MateRun.
 * 
 * Roles disponibles:
 * 1. 'corredor': Usuario que participa en carreras, se inscribe y consulta sus estadísticas.
 * 2. 'admin': Administrador operativo encargado de acreditar corredores y gestionar inscripciones.
 * 3. 'superadmin': Usuario maestro con control total (creación de carreras, asignación de roles).
 * 
 * Seguridad:
 * - La contraseña se almacena con hash bcryptjs mediante un hook 'pre-save'.
 * - El método 'comparePassword' permite verificar contraseñas durante el inicio de sesión.
 * ==============================================================================
 */

import { Schema, model, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Interfaz TypeScript para tipado estricto del documento de Usuario en Mongoose
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  password?: string;
  telefono?: string;
  fechaNacimiento?: Date;
  sexo?: 'Masculino' | 'Femenino';
  ciudad?: string;
  provincia?: string;
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
  };
  rol: 'corredor' | 'admin' | 'superadmin';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * Esquema Mongoose para la colección 'users'
 */
const UserSchema = new Schema<IUser>(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true,
    },
    dni: {
      type: String,
      required: [true, 'El DNI es obligatorio'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
    telefono: {
      type: String,
      trim: true,
    },
    fechaNacimiento: {
      type: Date,
    },
    sexo: {
      type: String,
      enum: {
        values: ['Masculino', 'Femenino'],
        message: '{VALUE} no es un sexo válido (debe ser Masculino o Femenino)',
      },
    },
    ciudad: {
      type: String,
      trim: true,
    },
    provincia: {
      type: String,
      trim: true,
    },
    contactoEmergencia: {
      nombre: { type: String, trim: true },
      telefono: { type: String, trim: true },
    },
    rol: {
      type: String,
      enum: {
        values: ['corredor', 'admin', 'superadmin'],
        message: '{VALUE} no es un rol permitido',
      },
      default: 'corredor',
      index: true,
    },
  },
  {
    timestamps: true, // Agrega automáticamente createdAt y updatedAt
    versionKey: false,
  }
);

/**
 * Hook pre-save: Encripta la contraseña antes de guardarla en la base de datos
 * solo si ha sido modificada o es un nuevo registro.
 */
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Método de instancia: Compara una contraseña ingresada en texto plano con el hash guardado
 * @param candidatePassword Contraseña que envía el usuario en el login
 * @returns true si coincide, false si es incorrecta
 */
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', UserSchema);
