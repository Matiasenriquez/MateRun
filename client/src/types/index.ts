/**
 * ==============================================================================
 * DEFINICIONES DE TIPOS GLOBALES - FRONTEND (MateRun)
 * ==============================================================================
 * Centraliza las interfaces y tipos compartidos entre los componentes React,
 * servicios de API y el contexto de autenticación.
 * ==============================================================================
 */

/**
 * Roles disponibles en el sistema MateRun
 */
export type UserRole = 'corredor' | 'admin' | 'superadmin';

/**
 * Talles oficiales de remeras disponibles para las carreras
 */
export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL';

/**
 * Estados posibles de una inscripción en una carrera
 */
export type RegistrationStatus = 'Pendiente' | 'Acreditado' | 'Retira y no corre' | 'Baja';

/**
 * Representación del usuario autenticado en la plataforma
 */
export interface User {
  _id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono?: string;
  fechaNacimiento?: string;
  sexo?: 'Masculino' | 'Femenino';
  ciudad?: string;
  provincia?: string;
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
  };
  rol: UserRole;
  createdAt?: string;
}

/**
 * Representación de una carrera / evento deportivo
 */
export interface Race {
  _id: string;
  nombre: string;
  lugar: string;
  cupoMaximo: number;
  fecha: string;
  organizador: string;
  distancias: number[]; // Lista de distancias numéricas en km (ej. [10, 21, 42])
  estado: 'activa' | 'finalizada' | 'cancelada';
  creadoPor?: string;
  totalInscriptos?: number;
  cuposDisponibles?: number;
}

/**
 * Representación de una inscripción a una carrera
 */
export interface Registration {
  _id: string;
  carrera: string | Race;
  corredor: string | User;
  dorsal: number;
  distancia: number;
  datosCorredor: {
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    telefono: string;
    fechaNacimiento: string;
    sexo: 'Masculino' | 'Femenino';
    ciudad: string;
    provincia: string;
    contactoEmergencia?: {
      nombre: string;
      telefono: string;
    };
  };
  talleRemera: ShirtSize;
  estado: RegistrationStatus;
  fechaAcreditacion?: string;
  acreditadoPor?: string | User;
  fechaInscripcion: string;
}

/**
 * Registro de auditoría para el historial de administradores
 */
export interface AuditLog {
  _id: string;
  carrera: string;
  tipo: 'NUEVA_INSCRIPCION' | 'MODIFICACION' | 'BAJA' | 'CAMBIO_ESTADO';
  usuarioResponsable: {
    _id: string;
    nombre: string;
    apellido: string;
    rol: UserRole;
  };
  descripcion: string;
  detalles?: Record<string, unknown>;
  fecha: string;
}

/**
 * Registro histórico de carrera para estadísticas de corredores
 */
export interface RaceResult {
  _id: string;
  nombreCarrera: string;
  fecha: string;
  distancia: number;
  tiempoSegundos: number;
  tiempoFormateado: string; // ej. "01:45:30"
  posicionGeneral: number;
  posicionCategoria: number;
  posicionSexo: number;
  categoria: string;
}

/**
 * Métricas calculadas para la sección "Mis Datos" del corredor
 */
export interface RunnerStats {
  distanciaPromedio: number;
  tiempoPromedioFormateado: string;
  tiempoPromedioSegundos: number;
  mejorTiempoFormateado: string;
  mejorTiempoSegundos: number;
  carreraMejorTiempo: string;
  totalCarreras: number;
}
