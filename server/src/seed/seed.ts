/**
 * ==============================================================================
 * SCRIPT DE SEMILLA Y POBLACIÓN DE DATOS (Database Seed) - MateRun
 * ==============================================================================
 * Conecta a MongoDB (base de datos Db_MateRun) y carga un ecosistema completo
 * de prueba listo para ser utilizado de inmediato:
 * 
 * 1. Usuarios con 3 roles:
 *    - SuperAdmin: superadmin@materun.com / SuperAdmin123!
 *    - Admin:      admin@materun.com / Admin123!
 *    - Corredor:   corredor@materun.com / Corredor123!
 * 2. Carreras:
 *    - "Ultra Trail Los Andes 2026" (Activa, cupo 500, distancias [10, 21, 42, 70])
 *    - "Maratón Nocturna del Valle 2026" (Activa, cupo 300, distancias [5, 10, 21, 42])
 *    - "Desafío Quebrada Trail 2025" (Finalizada, distancias [15, 30])
 * 3. Corredor Ejemplo con 5 carreras históricas entre 2025 y 2026:
 *    - Para verificar la sección "Mis Datos", posiciones y promedios calculados.
 * 4. Inscripciones en estados diversos ('Pendiente', 'Acreditado', 'Retira y no corre', 'Baja'):
 *    - Para verificar tablas de acreditación, filtros de inscriptos y doble historial.
 * ==============================================================================
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Race } from '../models/Race';
import { Registration } from '../models/Registration';
import { AuditLog } from '../models/AuditLog';
import { RaceResult } from '../models/RaceResult';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/Db_MateRun';

export const runSeed = async () => {
  try {
    console.log('🌱 [SEED] Conectando a MongoDB en:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ [SEED] Conexión establecida con éxito.');

    // --------------------------------------------------------------------------
    // 1. LIMPIEZA DE DATOS EXISTENTES
    // --------------------------------------------------------------------------
    console.log('🧹 [SEED] Limpiando colecciones anteriores...');
    await User.deleteMany({});
    await Race.deleteMany({});
    await Registration.deleteMany({});
    await AuditLog.deleteMany({});
    await RaceResult.deleteMany({});
    console.log('✨ [SEED] Colecciones limpias.');

    // --------------------------------------------------------------------------
    // 2. CREACIÓN DE USUARIOS BASE (3 ROLES)
    // --------------------------------------------------------------------------
    console.log('👤 [SEED] Creando usuarios base con contraseñas encriptadas...');

    // A. SuperAdmin
    const superAdmin = new User({
      nombre: 'Roberto',
      apellido: 'Gómez',
      dni: '20111222',
      email: 'superadmin@materun.com',
      password: 'SuperAdmin123!',
      telefono: '+54 9 11 4455-6677',
      fechaNacimiento: new Date('1982-04-15'),
      sexo: 'Masculino',
      ciudad: 'San Carlos de Bariloche',
      provincia: 'Río Negro',
      contactoEmergencia: {
        nombre: 'Valeria Gómez',
        telefono: '+54 9 11 4455-8899',
      },
      rol: 'superadmin',
    });
    await superAdmin.save();

    // B. Administrador operativo
    const admin = new User({
      nombre: 'Mariana',
      apellido: 'Pérez',
      dni: '27333444',
      email: 'admin@materun.com',
      password: 'Admin123!',
      telefono: '+54 9 294 411-2233',
      fechaNacimiento: new Date('1988-09-21'),
      sexo: 'Femenino',
      ciudad: 'San Carlos de Bariloche',
      provincia: 'Río Negro',
      contactoEmergencia: {
        nombre: 'Claudio Pérez',
        telefono: '+54 9 294 411-9988',
      },
      rol: 'admin',
    });
    await admin.save();

    // C. Corredor Ejemplo (Matías Fernández)
    const corredorEjemplo = new User({
      nombre: 'Matías',
      apellido: 'Fernández',
      dni: '35666777',
      email: 'corredor@materun.com',
      password: 'Corredor123!',
      telefono: '+54 9 11 5566-7788',
      fechaNacimiento: new Date('1992-07-10'),
      sexo: 'Masculino',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      contactoEmergencia: {
        nombre: 'Sofía Fernández',
        telefono: '+54 9 11 5566-0011',
      },
      rol: 'corredor',
    });
    await corredorEjemplo.save();

    // D. Corredores secundarios para pruebas de mesas de acreditación
    const runnerLaura = new User({
      nombre: 'Laura',
      apellido: 'Sánchez',
      dni: '38123456',
      email: 'laura.sanchez@email.com',
      password: 'Corredor123!',
      telefono: '+54 9 261 455-1234',
      fechaNacimiento: new Date('1994-03-25'),
      sexo: 'Femenino',
      ciudad: 'Mendoza',
      provincia: 'Mendoza',
      contactoEmergencia: { nombre: 'Martín Sánchez', telefono: '+54 9 261 455-9999' },
      rol: 'corredor',
    });
    await runnerLaura.save();

    const runnerCarlos = new User({
      nombre: 'Carlos',
      apellido: 'Benítez',
      dni: '33456789',
      email: 'carlos.benitez@email.com',
      password: 'Corredor123!',
      telefono: '+54 9 351 477-8899',
      fechaNacimiento: new Date('1987-11-14'),
      sexo: 'Masculino',
      ciudad: 'Córdoba',
      provincia: 'Córdoba',
      contactoEmergencia: { nombre: 'Andrea Benítez', telefono: '+54 9 351 477-0000' },
      rol: 'corredor',
    });
    await runnerCarlos.save();

    const runnerLucia = new User({
      nombre: 'Lucía',
      apellido: 'Rossi',
      dni: '36789123',
      email: 'lucia.rossi@email.com',
      password: 'Corredor123!',
      telefono: '+54 9 299 433-2211',
      fechaNacimiento: new Date('1993-01-30'),
      sexo: 'Femenino',
      ciudad: 'Neuquén',
      provincia: 'Neuquén',
      contactoEmergencia: { nombre: 'Pablo Rossi', telefono: '+54 9 299 433-5555' },
      rol: 'corredor',
    });
    await runnerLucia.save();

    const runnerEsteban = new User({
      nombre: 'Esteban',
      apellido: 'Morales',
      dni: '31987654',
      email: 'esteban.morales@email.com',
      password: 'Corredor123!',
      telefono: '+54 9 11 6789-0123',
      fechaNacimiento: new Date('1985-06-08'),
      sexo: 'Masculino',
      ciudad: 'La Plata',
      provincia: 'Buenos Aires',
      contactoEmergencia: { nombre: 'Claudia Morales', telefono: '+54 9 11 6789-9999' },
      rol: 'corredor',
    });
    await runnerEsteban.save();

    console.log('✅ [SEED] Usuarios creados con éxito.');

    // --------------------------------------------------------------------------
    // 3. CREACIÓN DE CARRERAS DEPORTIVAS
    // --------------------------------------------------------------------------
    console.log('🏔️ [SEED] Creando carreras deportivas...');

    const race1 = await Race.create({
      nombre: 'Ultra Trail Los Andes 2026',
      lugar: 'San Carlos de Bariloche, Río Negro',
      cupoMaximo: 500,
      fecha: new Date('2026-11-20T08:00:00.000Z'),
      organizador: 'Andes Trail Running Club',
      distancias: [10, 21, 42, 70],
      estado: 'activa',
      creadoPor: superAdmin._id,
    });

    const race2 = await Race.create({
      nombre: 'Maratón Nocturna del Valle 2026',
      lugar: 'Mendoza Capital, Mendoza',
      cupoMaximo: 300,
      fecha: new Date('2026-10-15T20:00:00.000Z'),
      organizador: 'Asociación Atlética Cuyana',
      distancias: [5, 10, 21, 42],
      estado: 'activa',
      creadoPor: superAdmin._id,
    });

    const race3 = await Race.create({
      nombre: 'Desafío Quebrada Trail 2025',
      lugar: 'Tilcara, Jujuy',
      cupoMaximo: 250,
      fecha: new Date('2025-08-10T09:00:00.000Z'),
      organizador: 'Quebrada Sports & Adventure',
      distancias: [15, 30],
      estado: 'finalizada',
      creadoPor: superAdmin._id,
    });

    console.log('✅ [SEED] Carreras creadas con éxito.');

    // --------------------------------------------------------------------------
    // 4. HISTORIAL DE CARRERAS PASADAS DEL CORREDOR EJEMPLO (2025-2026)
    // --------------------------------------------------------------------------
    console.log('📊 [SEED] Creando 5 carreras históricas y resultados para el corredor de prueba...');

    const historicalResults = [
      {
        corredor: corredorEjemplo._id,
        nombreCarrera: 'Trail Huella Andina 2025',
        fecha: new Date('2025-03-15'),
        distancia: 21,
        tiempoSegundos: 6734, // 01:52:14
        posicionGeneral: 14,
        posicionCategoria: 4,
        posicionSexo: 12,
        categoria: '30-39 Masculino',
      },
      {
        corredor: corredorEjemplo._id,
        nombreCarrera: 'Maratón de las Sierras 2025',
        fecha: new Date('2025-06-22'),
        distancia: 42,
        tiempoSegundos: 13710, // 03:48:30
        posicionGeneral: 28,
        posicionCategoria: 8,
        posicionSexo: 25,
        categoria: '30-39 Masculino',
      },
      {
        corredor: corredorEjemplo._id,
        nombreCarrera: 'Desafío Quebrada Trail 2025',
        fecha: new Date('2025-08-10'),
        distancia: 15,
        tiempoSegundos: 4365, // 01:12:45
        posicionGeneral: 8,
        posicionCategoria: 2,
        posicionSexo: 7,
        categoria: '30-39 Masculino',
      },
      {
        corredor: corredorEjemplo._id,
        nombreCarrera: 'Trail Bosque Encantado 2026',
        fecha: new Date('2026-02-14'),
        distancia: 30,
        tiempoSegundos: 9610, // 02:40:10
        posicionGeneral: 19,
        posicionCategoria: 5,
        posicionSexo: 16,
        categoria: '30-39 Masculino',
      },
      {
        corredor: corredorEjemplo._id,
        nombreCarrera: 'Cross Country Los Molinos 2026',
        fecha: new Date('2026-05-18'),
        distancia: 12,
        tiempoSegundos: 3260, // 00:54:20 -> Mejor tiempo récord personal
        posicionGeneral: 5,
        posicionCategoria: 1,
        posicionSexo: 4,
        categoria: '30-39 Masculino',
      },
    ];

    await RaceResult.insertMany(historicalResults);
    console.log('✅ [SEED] 5 resultados históricos insertados con éxito.');

    // --------------------------------------------------------------------------
    // 5. INSCRIPCIONES EN "Ultra Trail Los Andes 2026" CON DIVERSOS ESTADOS
    // --------------------------------------------------------------------------
    console.log('📝 [SEED] Creando inscripciones de prueba con los 4 estados...');

    // 1. Corredor Ejemplo -> Estado 'Pendiente' (Dorsal #1)
    await Registration.create({
      carrera: race1._id,
      corredor: corredorEjemplo._id,
      dorsal: 1,
      distancia: 21,
      datosCorredor: {
        nombre: corredorEjemplo.nombre,
        apellido: corredorEjemplo.apellido,
        dni: corredorEjemplo.dni,
        email: corredorEjemplo.email,
        telefono: corredorEjemplo.telefono!,
        fechaNacimiento: corredorEjemplo.fechaNacimiento!,
        sexo: corredorEjemplo.sexo!,
        ciudad: corredorEjemplo.ciudad!,
        provincia: corredorEjemplo.provincia!,
        contactoEmergencia: corredorEjemplo.contactoEmergencia,
      },
      talleRemera: 'M',
      estado: 'Pendiente',
      fechaInscripcion: new Date('2026-08-01T10:30:00Z'),
    });

    // 2. Laura Sánchez -> Estado 'Acreditado' (Dorsal #2, acreditada por Admin)
    await Registration.create({
      carrera: race1._id,
      corredor: runnerLaura._id,
      dorsal: 2,
      distancia: 42,
      datosCorredor: {
        nombre: runnerLaura.nombre,
        apellido: runnerLaura.apellido,
        dni: runnerLaura.dni,
        email: runnerLaura.email,
        telefono: runnerLaura.telefono!,
        fechaNacimiento: runnerLaura.fechaNacimiento!,
        sexo: runnerLaura.sexo!,
        ciudad: runnerLaura.ciudad!,
        provincia: runnerLaura.provincia!,
        contactoEmergencia: runnerLaura.contactoEmergencia,
      },
      talleRemera: 'S',
      estado: 'Acreditado',
      fechaAcreditacion: new Date('2026-09-14T09:15:00Z'),
      acreditadoPor: admin._id,
      fechaInscripcion: new Date('2026-08-02T11:20:00Z'),
    });

    // 3. Carlos Benítez -> Estado 'Retira y no corre' (Dorsal #3)
    await Registration.create({
      carrera: race1._id,
      corredor: runnerCarlos._id,
      dorsal: 3,
      distancia: 10,
      datosCorredor: {
        nombre: runnerCarlos.nombre,
        apellido: runnerCarlos.apellido,
        dni: runnerCarlos.dni,
        email: runnerCarlos.email,
        telefono: runnerCarlos.telefono!,
        fechaNacimiento: runnerCarlos.fechaNacimiento!,
        sexo: runnerCarlos.sexo!,
        ciudad: runnerCarlos.ciudad!,
        provincia: runnerCarlos.provincia!,
        contactoEmergencia: runnerCarlos.contactoEmergencia,
      },
      talleRemera: 'L',
      estado: 'Retira y no corre',
      fechaAcreditacion: new Date('2026-09-14T09:30:00Z'),
      acreditadoPor: admin._id,
      fechaInscripcion: new Date('2026-08-03T14:10:00Z'),
    });

    // 4. Lucía Rossi -> Estado 'Baja' (Dorsal #4)
    await Registration.create({
      carrera: race1._id,
      corredor: runnerLucia._id,
      dorsal: 4,
      distancia: 21,
      datosCorredor: {
        nombre: runnerLucia.nombre,
        apellido: runnerLucia.apellido,
        dni: runnerLucia.dni,
        email: runnerLucia.email,
        telefono: runnerLucia.telefono!,
        fechaNacimiento: runnerLucia.fechaNacimiento!,
        sexo: runnerLucia.sexo!,
        ciudad: runnerLucia.ciudad!,
        provincia: runnerLucia.provincia!,
        contactoEmergencia: runnerLucia.contactoEmergencia,
      },
      talleRemera: 'M',
      estado: 'Baja',
      fechaInscripcion: new Date('2026-08-04T16:00:00Z'),
    });

    // 5. Esteban Morales -> Estado 'Acreditado' (Dorsal #5)
    await Registration.create({
      carrera: race1._id,
      corredor: runnerEsteban._id,
      dorsal: 5,
      distancia: 70,
      datosCorredor: {
        nombre: runnerEsteban.nombre,
        apellido: runnerEsteban.apellido,
        dni: runnerEsteban.dni,
        email: runnerEsteban.email,
        telefono: runnerEsteban.telefono!,
        fechaNacimiento: runnerEsteban.fechaNacimiento!,
        sexo: runnerEsteban.sexo!,
        ciudad: runnerEsteban.ciudad!,
        provincia: runnerEsteban.provincia!,
        contactoEmergencia: runnerEsteban.contactoEmergencia,
      },
      talleRemera: 'XL',
      estado: 'Acreditado',
      fechaAcreditacion: new Date('2026-09-14T09:45:00Z'),
      acreditadoPor: superAdmin._id,
      fechaInscripcion: new Date('2026-08-05T18:00:00Z'),
    });

    // --------------------------------------------------------------------------
    // 6. REGISTROS DE AUDITORÍA INICIALES
    // --------------------------------------------------------------------------
    console.log('📜 [SEED] Creando registros de auditoría...');

    await AuditLog.create([
      {
        carrera: race1._id,
        tipo: 'NUEVA_INSCRIPCION',
        usuarioResponsable: corredorEjemplo._id,
        descripcion: 'Inscripción online: Matías Fernández (DNI 35666777) con dorsal #1 en 21k',
        fecha: new Date('2026-08-01T10:30:00Z'),
      },
      {
        carrera: race1._id,
        tipo: 'CAMBIO_ESTADO',
        usuarioResponsable: admin._id,
        descripcion: 'Acreditación confirmada: Laura Sánchez (Dorsal #2) retiró kit de corredor',
        fecha: new Date('2026-09-14T09:15:00Z'),
      },
      {
        carrera: race1._id,
        tipo: 'CAMBIO_ESTADO',
        usuarioResponsable: admin._id,
        descripcion: 'Retira y no corre: Carlos Benítez (Dorsal #3) retiró su kit pero no larga la carrera',
        fecha: new Date('2026-09-14T09:30:00Z'),
      },
      {
        carrera: race1._id,
        tipo: 'BAJA',
        usuarioResponsable: admin._id,
        descripcion: 'Baja administrativa de corredor: Lucía Rossi (Dorsal #4)',
        fecha: new Date('2026-09-14T09:35:00Z'),
      },
      {
        carrera: race1._id,
        tipo: 'CAMBIO_ESTADO',
        usuarioResponsable: superAdmin._id,
        descripcion: 'Acreditación confirmada: Esteban Morales (Dorsal #5) retiró kit oficial 70k',
        fecha: new Date('2026-09-14T09:45:00Z'),
      },
    ]);

    console.log('====================================================');
    console.log('🏁 [SEED] ¡POBLACIÓN DE BASE DE DATOS COMPLETADA CON ÉXITO!');
    console.log('====================================================');
    console.log('Credenciales de prueba generadas en Db_MateRun:');
    console.log('👑 SuperAdmin: superadmin@materun.com / SuperAdmin123!');
    console.log('🛡️ Admin:      admin@materun.com / Admin123!');
    console.log('🏃 Corredor:   corredor@materun.com / Corredor123!');
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ [SEED] Error al poblar la base de datos:', error);
    process.exit(1);
  }
};

// Ejecutar automáticamente al invocar el archivo con ts-node-dev o node
runSeed();
