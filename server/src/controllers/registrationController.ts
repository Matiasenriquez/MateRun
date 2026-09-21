/**
 * ==============================================================================
 * CONTROLADOR DE INSCRIPCIONES Y ACREDITACIÓN (Registration Controller) - MateRun
 * ==============================================================================
 * Maneja el ciclo completo de participación de corredores en carreras:
 * 1. registerRunner: Autoinscripción de corredores con asignación automática de dorsal.
 * 2. registerByAdmin: Inscripción manual por parte del Administrador con validación
 *    estricta de dorsal ("Dorsal no disponible").
 * 3. getRegistrationsByRace: Listado de inscriptos para tablas de acreditación y administración.
 * 4. getMyRegistrations: Historial de inscripciones del corredor en sesión.
 * 5. updateAccreditationStatus: Transiciones entre los 4 estados:
 *    - 'Pendiente' -> 'Acreditado' | 'Retira y no corre' | 'Baja'
 * 6. updateRegistration: Edición de datos del inscripto por parte del administrador.
 * 7. deleteRegistration: Baja definitiva de una inscripción.
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { Registration } from '../models/Registration';
import { Race } from '../models/Race';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

/**
 * Función auxiliar: Busca el número de dorsal más bajo disponible en el rango [1, cupoMaximo].
 * 
 * @param raceId ID de la carrera
 * @param cupoMaximo Cupo total permitido en la carrera
 * @returns El número de dorsal libre o null si la carrera está completa
 */
const findAvailableDorsal = async (raceId: string, cupoMaximo: number): Promise<number | null> => {
  // Obtener todos los dorsales actualmente ocupados por inscripciones activas (no dadas de baja)
  const occupiedRegistrations = await Registration.find({
    carrera: raceId,
    estado: { $ne: 'Baja' },
  })
    .select('dorsal')
    .sort({ dorsal: 1 });

  const occupiedSet = new Set(occupiedRegistrations.map((r) => r.dorsal));

  // Buscar el primer número del 1 al cupoMaximo que no esté en el conjunto
  for (let d = 1; d <= cupoMaximo; d++) {
    if (!occupiedSet.has(d)) {
      return d;
    }
  }

  return null; // Cupo agotado
};

/**
 * Autoinscripción de un corredor a una carrera.
 * 
 * Ruta: POST /api/registrations
 * Acceso: Corredor autenticado
 */
export const registerRunner = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const {
      carreraId,
      distancia,
      talleRemera,
      nombre,
      apellido,
      dni,
      email,
      telefono,
      fechaNacimiento,
      sexo,
      ciudad,
      provincia,
      ciudadProvincia,
      contactoEmergencia,
    } = req.body;

    // Normalización de Ciudad y Provincia (soportar tanto campos separados como campo combinado)
    let finalCiudad = ciudad ? ciudad.trim() : '';
    let finalProvincia = provincia ? provincia.trim() : '';
    if ((!finalCiudad || !finalProvincia) && ciudadProvincia) {
      const parts = ciudadProvincia.split(',');
      finalCiudad = parts[0]?.trim() || ciudadProvincia.trim();
      finalProvincia = parts[1]?.trim() || finalCiudad;
    }

    // Normalización de Sexo: Mapear 'Mujer' a 'Femenino' y 'Hombre' a 'Masculino'
    let normalizedSexo: 'Masculino' | 'Femenino' = 'Masculino';
    if (sexo === 'Mujer' || sexo === 'Femenino') {
      normalizedSexo = 'Femenino';
    } else if (sexo === 'Hombre' || sexo === 'Masculino') {
      normalizedSexo = 'Masculino';
    }

    // Normalización de Contacto de Emergencia: aceptar número telefónico como string u objeto
    let formattedContactoEmergencia = undefined;
    if (contactoEmergencia) {
      if (typeof contactoEmergencia === 'string' && contactoEmergencia.trim() !== '') {
        formattedContactoEmergencia = {
          nombre: 'Contacto de Emergencia',
          telefono: contactoEmergencia.trim(),
        };
      } else if (typeof contactoEmergencia === 'object' && contactoEmergencia.telefono) {
        formattedContactoEmergencia = {
          nombre: contactoEmergencia.nombre || 'Contacto de Emergencia',
          telefono: String(contactoEmergencia.telefono).trim(),
        };
      }
    }

    // 1. Validar campos requeridos
    if (
      !carreraId ||
      !distancia ||
      !talleRemera ||
      !nombre ||
      !apellido ||
      !dni ||
      !email ||
      !fechaNacimiento ||
      !sexo ||
      !finalCiudad ||
      !finalProvincia
    ) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Por favor complete todos los campos obligatorios del formulario de inscripción',
      });
      return;
    }

    // 2. Verificar que la carrera exista y esté activa
    const race = await Race.findById(carreraId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    if (race.estado !== 'activa') {
      res.status(400).json({
        error: 'Carrera no disponible',
        message: `Esta carrera se encuentra en estado '${race.estado}' y no acepta nuevas inscripciones`,
      });
      return;
    }

    // Validar que la fecha de realización no haya transcurrido
    if (new Date(race.fecha) < new Date()) {
      res.status(400).json({
        error: 'Inscripciones cerradas',
        message: 'No es posible inscribirse: la fecha de realización de la carrera ya ha transcurrido',
      });
      return;
    }

    // 3. Validar que la distancia seleccionada sea válida para esta carrera
    const distNumber = Number(distancia);
    if (!race.distancias.includes(distNumber)) {
      res.status(400).json({
        error: 'Distancia no válida',
        message: `La distancia ${distNumber}k no está habilitada para esta carrera`,
      });
      return;
    }

    // 4. Verificar si el usuario ya está inscripto en esta carrera (y no está dado de baja)
    const existingRegistration = await Registration.findOne({
      carrera: carreraId,
      corredor: userId,
      estado: { $ne: 'Baja' },
    });

    if (existingRegistration) {
      res.status(400).json({
        error: 'Inscripción existente',
        message: `Ya te encuentras inscripto en esta carrera con el dorsal #${existingRegistration.dorsal}`,
      });
      return;
    }

    // 5. Asignar el menor número de dorsal disponible
    const assignedDorsal = await findAvailableDorsal(carreraId, race.cupoMaximo);
    if (!assignedDorsal) {
      res.status(400).json({
        error: 'Cupo completo',
        message: 'Lo sentimos, la carrera ha alcanzado el límite máximo de corredores permitidos',
      });
      return;
    }

    // 6. Crear la inscripción con snapshot de los datos del corredor
    const newRegistration = new Registration({
      carrera: carreraId,
      corredor: userId,
      dorsal: assignedDorsal,
      distancia: distNumber,
      datosCorredor: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        email: email.toLowerCase().trim(),
        telefono: telefono ? telefono.trim() : '',
        fechaNacimiento: new Date(fechaNacimiento),
        sexo: normalizedSexo,
        ciudad: finalCiudad,
        provincia: finalProvincia,
        contactoEmergencia: formattedContactoEmergencia,
      },
      talleRemera,
      estado: 'Pendiente',
      fechaInscripcion: new Date(),
    });

    await newRegistration.save();

    // 7. Registrar auditoría
    await AuditLog.create({
      carrera: carreraId,
      tipo: 'NUEVA_INSCRIPCION',
      usuarioResponsable: userId,
      descripcion: `Inscripción online: ${nombre} ${apellido} (DNI ${dni}) en distancia ${distNumber}k con dorsal #${assignedDorsal}`,
      detalles: {
        registrationId: newRegistration._id,
        dorsal: assignedDorsal,
        distancia: distNumber,
      },
      fecha: new Date(),
    });

    res.status(201).json({
      message: `¡Inscripción exitosa! Se te ha asignado el dorsal #${assignedDorsal}`,
      registration: newRegistration,
    });
  } catch (error: any) {
    console.error('Error al inscribir corredor:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Inscripción manual de un corredor realizada por el Administrador o SuperAdmin.
 * Permite especificar manualmente el número de dorsal y valida que no esté ocupado.
 * 
 * Regla de negocio crítica:
 * Si el dorsal ingresado ya está asignado a otro corredor en esa carrera,
 * retorna status 400 y mensaje exacto: "Dorsal no disponible".
 * 
 * Ruta: POST /api/registrations/admin
 * Acceso: Admin o SuperAdmin
 */
export const registerByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const adminId = req.user?.id;
    const {
      carreraId,
      dorsal,
      distancia,
      talleRemera,
      nombre,
      apellido,
      dni,
      email,
      telefono,
      fechaNacimiento,
      sexo,
      ciudad,
      provincia,
      contactoEmergencia,
    } = req.body;

    // 1. Validar campos requeridos
    if (!carreraId || dorsal === undefined || !distancia || !talleRemera || !nombre || !apellido || !dni || !email || !fechaNacimiento || !sexo) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Todos los campos, incluyendo el número de dorsal, son obligatorios',
      });
      return;
    }

    const dorsalNumber = Number(dorsal);
    if (isNaN(dorsalNumber) || dorsalNumber < 1) {
      res.status(400).json({
        error: 'Dorsal inválido',
        message: 'El número de dorsal debe ser un entero positivo',
      });
      return;
    }

    // 2. Verificar existencia de la carrera
    const race = await Race.findById(carreraId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // Validar que el dorsal no supere el cupo máximo
    if (dorsalNumber > race.cupoMaximo) {
      res.status(400).json({
        error: 'Dorsal fuera de rango',
        message: `El dorsal #${dorsalNumber} supera el cupo máximo habilitado para esta carrera (${race.cupoMaximo})`,
      });
      return;
    }

    // 3. REGLA CRÍTICA: Validar si el dorsal ya está ocupado en esta carrera
    const existingDorsal = await Registration.findOne({
      carrera: carreraId,
      dorsal: dorsalNumber,
      estado: { $ne: 'Baja' },
    });

    if (existingDorsal) {
      // Mensaje exacto especificado en los requerimientos del usuario
      res.status(400).json({
        error: 'Dorsal no disponible',
        message: 'Dorsal no disponible',
      });
      return;
    }

    // 4. Buscar o crear el usuario corredor asociado a ese DNI/Email
    let runnerUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { dni: dni.trim() }],
    });

    if (!runnerUser) {
      // Si el corredor no existía previamente, se crea automáticamente con contraseña temporal
      runnerUser = new User({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        email: email.toLowerCase().trim(),
        password: `MateRun${dni.trim()}!`, // Contraseña inicial generada
        telefono: telefono?.trim(),
        fechaNacimiento: new Date(fechaNacimiento),
        sexo,
        ciudad: ciudad?.trim(),
        provincia: provincia?.trim(),
        contactoEmergencia,
        rol: 'corredor',
      });
      await runnerUser.save();
    }

    // 5. Crear la inscripción
    const newRegistration = new Registration({
      carrera: carreraId,
      corredor: runnerUser._id,
      dorsal: dorsalNumber,
      distancia: Number(distancia),
      datosCorredor: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        email: email.toLowerCase().trim(),
        telefono: telefono ? telefono.trim() : '',
        fechaNacimiento: new Date(fechaNacimiento),
        sexo,
        ciudad: ciudad ? ciudad.trim() : '',
        provincia: provincia ? provincia.trim() : '',
        contactoEmergencia,
      },
      talleRemera,
      estado: 'Pendiente',
      fechaInscripcion: new Date(),
    });

    await newRegistration.save();

    // 6. Registrar auditoría con el usuario administrador responsable
    await AuditLog.create({
      carrera: carreraId,
      tipo: 'NUEVA_INSCRIPCION',
      usuarioResponsable: adminId,
      descripcion: `Inscripción manual por Admin: ${nombre} ${apellido} (DNI ${dni}) con dorsal #${dorsalNumber}`,
      detalles: {
        registrationId: newRegistration._id,
        dorsal: dorsalNumber,
        distancia: Number(distancia),
      },
      fecha: new Date(),
    });

    res.status(201).json({
      message: `Corredor inscripto correctamente con el dorsal #${dorsalNumber}`,
      registration: newRegistration,
    });
  } catch (error: any) {
    console.error('Error al registrar corredor por admin:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Obtiene todas las inscripciones asociadas a una carrera (para tablas de administración y acreditación).
 * 
 * Ruta: GET /api/registrations/race/:raceId
 * Acceso: Admin o SuperAdmin
 */
export const getRegistrationsByRace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;
    const { search, estado, distancia } = req.query;

    const filter: Record<string, any> = { carrera: raceId };

    if (estado && typeof estado === 'string') {
      filter.estado = estado;
    }

    if (distancia && !isNaN(Number(distancia))) {
      filter.distancia = Number(distancia);
    }

    let registrations = await Registration.find(filter)
      .populate('acreditadoPor', 'nombre apellido')
      .sort({ dorsal: 1 });

    // Filtro por texto si se especifica en la query
    if (search && typeof search === 'string' && search.trim() !== '') {
      const term = search.trim().toLowerCase();
      registrations = registrations.filter((r) => {
        const d = r.datosCorredor;
        return (
          d.nombre.toLowerCase().includes(term) ||
          d.apellido.toLowerCase().includes(term) ||
          d.dni.toLowerCase().includes(term) ||
          r.dorsal.toString().includes(term)
        );
      });
    }

    res.status(200).json({ registrations });
  } catch (error: any) {
    console.error('Error al listar inscripciones de la carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Obtiene las inscripciones del corredor en sesión (activas y pasadas).
 * 
 * Ruta: GET /api/registrations/my-registrations
 * Acceso: Corredor autenticado
 */
export const getMyRegistrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const registrations = await Registration.find({ corredor: userId })
      .populate('carrera')
      .sort({ createdAt: -1 });

    res.status(200).json({ registrations });
  } catch (error: any) {
    console.error('Error al obtener mis inscripciones:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Actualiza el estado de acreditación de un corredor en la mesa de entrada:
 * - 'Acreditado': Retira kit y corre
 * - 'Retira y no corre': Retira kit y no corre
 * - 'Baja': Se da de baja la inscripción
 * 
 * Ruta: PUT /api/registrations/:id/accreditation
 * Acceso: Admin o SuperAdmin
 */
export const updateAccreditationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body;
    const adminId = req.user?.id;

    const estadosPermitidos = ['Acreditado', 'Retira y no corre', 'Baja', 'Pendiente'];
    if (!estadosPermitidos.includes(nuevoEstado)) {
      res.status(400).json({
        error: 'Estado inválido',
        message: `El estado debe ser uno de: ${estadosPermitidos.join(', ')}`,
      });
      return;
    }

    const registration = await Registration.findById(id);
    if (!registration) {
      res.status(404).json({ error: 'Inscripción no encontrada' });
      return;
    }

    const estadoAnterior = registration.estado;
    registration.estado = nuevoEstado;

    if (nuevoEstado === 'Acreditado') {
      registration.fechaAcreditacion = new Date();
      registration.acreditadoPor = adminId as any;
    } else if (nuevoEstado === 'Pendiente') {
      registration.fechaAcreditacion = undefined;
      registration.acreditadoPor = undefined;
    }

    await registration.save();

    // Crear registro en historial de auditoría
    await AuditLog.create({
      carrera: registration.carrera,
      tipo: nuevoEstado === 'Baja' ? 'BAJA' : 'CAMBIO_ESTADO',
      usuarioResponsable: adminId,
      descripcion: `Cambio de estado para ${registration.datosCorredor.nombre} ${registration.datosCorredor.apellido} (Dorsal #${registration.dorsal}): de '${estadoAnterior}' a '${nuevoEstado}'`,
      detalles: {
        registrationId: registration._id,
        estadoAnterior,
        nuevoEstado,
      },
      fecha: new Date(),
    });

    res.status(200).json({
      message: `Estado actualizado a '${nuevoEstado}' exitosamente`,
      registration,
    });
  } catch (error: any) {
    console.error('Error al actualizar estado de acreditación:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Edita los datos de una inscripción existente.
 * 
 * Ruta: PUT /api/registrations/:id
 * Acceso: Admin o SuperAdmin
 */
export const updateRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      distancia,
      talleRemera,
      nombre,
      apellido,
      dni,
      email,
      telefono,
      ciudad,
      provincia,
      contactoEmergencia,
    } = req.body;
    const adminId = req.user?.id;

    const registration = await Registration.findById(id);
    if (!registration) {
      res.status(404).json({ error: 'Inscripción no encontrada' });
      return;
    }

    if (distancia) registration.distancia = Number(distancia);
    if (talleRemera) registration.talleRemera = talleRemera;

    if (nombre) registration.datosCorredor.nombre = nombre.trim();
    if (apellido) registration.datosCorredor.apellido = apellido.trim();
    if (dni) registration.datosCorredor.dni = dni.trim();
    if (email) registration.datosCorredor.email = email.toLowerCase().trim();
    if (telefono !== undefined) registration.datosCorredor.telefono = telefono.trim();
    if (ciudad !== undefined) registration.datosCorredor.ciudad = ciudad.trim();
    if (provincia !== undefined) registration.datosCorredor.provincia = provincia.trim();
    if (contactoEmergencia) registration.datosCorredor.contactoEmergencia = contactoEmergencia;

    await registration.save();

    // Registrar modificación en auditoría
    await AuditLog.create({
      carrera: registration.carrera,
      tipo: 'MODIFICACION',
      usuarioResponsable: adminId,
      descripcion: `Modificación de datos de inscripción para ${registration.datosCorredor.nombre} ${registration.datosCorredor.apellido} (Dorsal #${registration.dorsal})`,
      detalles: req.body,
      fecha: new Date(),
    });

    res.status(200).json({
      message: 'Inscripción actualizada correctamente',
      registration,
    });
  } catch (error: any) {
    console.error('Error al modificar inscripción:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Da de baja o elimina una inscripción.
 * 
 * Ruta: DELETE /api/registrations/:id
 * Acceso: Admin o SuperAdmin
 */
export const deleteRegistration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    const registration = await Registration.findById(id);
    if (!registration) {
      res.status(404).json({ error: 'Inscripción no encontrada' });
      return;
    }

    registration.estado = 'Baja';
    await registration.save();

    // Registrar en auditoría
    await AuditLog.create({
      carrera: registration.carrera,
      tipo: 'BAJA',
      usuarioResponsable: adminId,
      descripcion: `Baja de corredor: ${registration.datosCorredor.nombre} ${registration.datosCorredor.apellido} (Dorsal #${registration.dorsal})`,
      detalles: { registrationId: registration._id },
      fecha: new Date(),
    });

    res.status(200).json({
      message: 'El corredor ha sido dado de baja de la carrera',
    });
  } catch (error: any) {
    console.error('Error al dar de baja inscripción:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
