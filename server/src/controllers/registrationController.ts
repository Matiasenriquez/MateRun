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
 * Función auxiliar: Calcula la edad exacta del corredor a la fecha del evento deportivo.
 * Regla de negocio estricta:
 * La edad considerada es exclusivamente la que tenga el corredor a la fecha del evento.
 * Si el corredor todavía no cumplió años en la fecha del evento, se considera su edad menor.
 * 
 * Ejemplo:
 * Nacido el 15/10/2010 y evento el 10/10/2026 -> tiene 15 años (aún no cumplió 16).
 */
export const calculateAgeAtEvent = (birthDate: Date | string, eventDate: Date | string): number => {
  const birth = new Date(birthDate);
  const event = new Date(eventDate);

  let age = event.getFullYear() - birth.getFullYear();
  const monthDiff = event.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && event.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * Función auxiliar: Determina automáticamente la categoría correspondiente al corredor
 * según su edad a la fecha del evento y las categorías definidas en la carrera.
 */
export const determineRunnerCategory = (
  birthDate: Date | string,
  eventDate: Date | string,
  categorias?: { nombre: string; edadMinima: number; edadMaxima: number }[]
): string => {
  const age = calculateAgeAtEvent(birthDate, eventDate);

  if (categorias && Array.isArray(categorias) && categorias.length > 0) {
    const matched = categorias.find((cat) => age >= cat.edadMinima && age <= cat.edadMaxima);
    if (matched) {
      return matched.nombre;
    }
  }

  return `${age} años`;
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

    // 1. Obtener los datos del perfil oficial del usuario autenticado
    const userProfile = await User.findById(userId);
    if (!userProfile) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // REGLA DE NEGOCIO ESTRICTA:
    // Los datos personales (Nombre, Apellido, DNI, Fecha de nacimiento, Sexo y Correo electrónico)
    // provienen SIEMPRE de forma garantizada del perfil del usuario autenticado para impedir
    // que un usuario utilice su cuenta para inscribir a otra persona.
    const finalNombre = userProfile.nombre;
    const finalApellido = userProfile.apellido;
    const finalDni = userProfile.dni;
    const finalEmail = userProfile.email;
    const finalFechaNacimiento = userProfile.fechaNacimiento || (fechaNacimiento ? new Date(fechaNacimiento) : undefined);
    const finalSexo = userProfile.sexo || normalizedSexo;

    // Validar campos requeridos generales
    if (
      !carreraId ||
      !distancia ||
      !talleRemera ||
      !finalNombre ||
      !finalApellido ||
      !finalDni ||
      !finalEmail ||
      !finalFechaNacimiento ||
      !finalSexo ||
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

    // Regla de Visibilidad: Si la carrera está Oculta, no está disponible para inscripciones
    if (race.visibilidad === 'Oculta') {
      res.status(400).json({
        error: 'Carrera no disponible',
        message: 'Esta carrera no se encuentra disponible para inscripciones',
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

    // 6. Asignar automáticamente la categoría por edad al evento
    const assignedCategory = determineRunnerCategory(finalFechaNacimiento, race.fecha, race.categorias);

    // Crear la inscripción con snapshot de los datos del corredor
    const newRegistration = new Registration({
      carrera: carreraId,
      corredor: userId,
      dorsal: assignedDorsal,
      distancia: distNumber,
      datosCorredor: {
        nombre: finalNombre.trim(),
        apellido: finalApellido.trim(),
        dni: finalDni.trim(),
        email: finalEmail.toLowerCase().trim(),
        telefono: telefono ? telefono.trim() : (userProfile.telefono || ''),
        fechaNacimiento: new Date(finalFechaNacimiento),
        sexo: finalSexo,
        ciudad: finalCiudad,
        provincia: finalProvincia,
        contactoEmergencia: formattedContactoEmergencia || userProfile.contactoEmergencia,
      },
      talleRemera,
      estado: 'Pendiente',
      categoria: assignedCategory,
      fechaInscripcion: new Date(),
    });

    await newRegistration.save();

    // 7. Registrar auditoría
    await AuditLog.create({
      carrera: carreraId,
      tipo: 'NUEVA_INSCRIPCION',
      usuarioResponsable: userId,
      descripcion: `Alta de corredor: ${finalNombre} ${finalApellido} (DNI ${finalDni}) con dorsal #${assignedDorsal}`,
      detalles: {
        registrationId: newRegistration._id,
        corredor: {
          nombre: finalNombre,
          apellido: finalApellido,
          dni: finalDni,
        },
        dorsal: assignedDorsal,
        distancia: distNumber,
        estado: 'Pendiente',
        cambios: [
          {
            campo: 'Alta',
            etiqueta: 'Inscripción en Carrera',
            valorAnterior: '-',
            nuevoValor: `Inscripto en ${distNumber}k`,
          },
          {
            campo: 'Dorsal',
            etiqueta: 'Dorsal Asignado',
            valorAnterior: '-',
            nuevoValor: assignedDorsal,
          },
          {
            campo: 'Estado',
            etiqueta: 'Estado de Acreditación',
            valorAnterior: '-',
            nuevoValor: 'Pendiente',
          },
        ],
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
      corredorId,
      usuarioId,
    } = req.body;

    const targetUserId = corredorId || usuarioId;

    // Si se pasa targetUserId, buscar el usuario registrado primero
    let runnerUser = null;
    if (targetUserId) {
      runnerUser = await User.findById(targetUserId);
      if (!runnerUser) {
        res.status(404).json({ error: 'Corredor no encontrado' });
        return;
      }
    } else if (dni || email) {
      runnerUser = await User.findOne({
        $or: [
          ...(email ? [{ email: email.toLowerCase().trim() }] : []),
          ...(dni ? [{ dni: String(dni).trim() }] : []),
        ],
      });
    }

    // Regla de negocio: Solo pueden seleccionarse usuarios que posean el rol "Corredor"
    if (runnerUser && runnerUser.rol && runnerUser.rol.toLowerCase() !== 'corredor') {
      res.status(400).json({
        error: 'Rol no permitido',
        message: 'Solo se pueden asignar usuarios que posean el rol Corredor',
      });
      return;
    }

    const finalNombre = runnerUser?.nombre || nombre;
    const finalApellido = runnerUser?.apellido || apellido;
    const finalDni = runnerUser?.dni || dni;
    const finalEmail = runnerUser?.email || email;
    const finalFechaNacimiento = runnerUser?.fechaNacimiento || fechaNacimiento;
    const finalSexo = runnerUser?.sexo || sexo;

    // 1. Validar campos requeridos
    if (!carreraId || dorsal === undefined || !distancia || !talleRemera || !finalNombre || !finalApellido || !finalDni || !finalEmail || !finalFechaNacimiento || !finalSexo) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Todos los campos obligatorios deben estar presentes',
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

    // Regla de Visibilidad: Si la carrera está Oculta y el usuario no es SuperAdmin, no puede inscribir
    if (race.visibilidad === 'Oculta' && req.user?.rol !== 'superadmin') {
      res.status(400).json({
        error: 'Carrera no disponible',
        message: 'Esta carrera se encuentra oculta y no está disponible para administración',
      });
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
      // Mensaje exacto especificado en los requerimientos del usuario: "Número de Dorsal ocupado."
      res.status(400).json({
        error: 'Número de Dorsal ocupado.',
        message: 'Número de Dorsal ocupado.',
      });
      return;
    }

    // 4. Asignar automáticamente la categoría por edad al evento
    const assignedCategory = determineRunnerCategory(finalFechaNacimiento, race.fecha, race.categorias);

    // 5. Verificar que el corredor no esté ya inscripto en esta carrera (o reactivar si estaba en 'Baja')
    let newRegistration = null;
    if (runnerUser) {
      const existingReg = await Registration.findOne({
        carrera: carreraId,
        corredor: runnerUser._id,
      });

      if (existingReg) {
        if (existingReg.estado !== 'Baja') {
          res.status(400).json({
            error: 'Inscripción existente',
            message: `El corredor ya se encuentra inscripto en esta carrera con el dorsal #${existingReg.dorsal}`,
          });
          return;
        } else {
          // Si estaba en 'Baja', se reactiva con el nuevo dorsal y datos sin violar el índice único carrera_corredor
          existingReg.dorsal = dorsalNumber;
          existingReg.distancia = Number(distancia);
          existingReg.talleRemera = talleRemera;
          existingReg.estado = 'Pendiente';
          existingReg.categoria = assignedCategory;
          existingReg.datosCorredor = {
            nombre: runnerUser.nombre || String(finalNombre).trim(),
            apellido: runnerUser.apellido || String(finalApellido).trim(),
            dni: runnerUser.dni || String(finalDni).trim(),
            email: runnerUser.email || String(finalEmail).toLowerCase().trim(),
            telefono: runnerUser.telefono || (telefono ? telefono.trim() : '-') || '-',
            fechaNacimiento: runnerUser.fechaNacimiento || new Date(finalFechaNacimiento),
            sexo: runnerUser.sexo || finalSexo,
            ciudad: runnerUser.ciudad || (ciudad ? ciudad.trim() : '-') || '-',
            provincia: runnerUser.provincia || (provincia ? provincia.trim() : '-') || '-',
            contactoEmergencia: runnerUser.contactoEmergencia || contactoEmergencia,
          };
          existingReg.fechaInscripcion = new Date();
          await existingReg.save();
          newRegistration = existingReg;
        }
      }
    }

    if (!newRegistration) {
      if (!runnerUser) {
        // Si el corredor no existía previamente, se crea automáticamente con contraseña temporal
        runnerUser = new User({
          nombre: String(finalNombre).trim(),
          apellido: String(finalApellido).trim(),
          dni: String(finalDni).trim(),
          email: String(finalEmail).toLowerCase().trim(),
          password: `MateRun${String(finalDni).trim()}!`, // Contraseña inicial generada
          telefono: telefono?.trim(),
          fechaNacimiento: new Date(finalFechaNacimiento),
          sexo: finalSexo,
          ciudad: ciudad?.trim(),
          provincia: provincia?.trim(),
          contactoEmergencia,
          rol: 'corredor',
        });
        await runnerUser.save();
      }

      // Crear la inscripción
      newRegistration = new Registration({
        carrera: carreraId,
        corredor: runnerUser._id,
        dorsal: dorsalNumber,
        distancia: Number(distancia),
        datosCorredor: {
          nombre: runnerUser.nombre || String(finalNombre).trim(),
          apellido: runnerUser.apellido || String(finalApellido).trim(),
          dni: runnerUser.dni || String(finalDni).trim(),
          email: runnerUser.email || String(finalEmail).toLowerCase().trim(),
          telefono: runnerUser.telefono || (telefono ? telefono.trim() : '-') || '-',
          fechaNacimiento: runnerUser.fechaNacimiento || new Date(finalFechaNacimiento),
          sexo: runnerUser.sexo || finalSexo,
          ciudad: runnerUser.ciudad || (ciudad ? ciudad.trim() : '-') || '-',
          provincia: runnerUser.provincia || (provincia ? provincia.trim() : '-') || '-',
          contactoEmergencia: runnerUser.contactoEmergencia || contactoEmergencia,
        },
        talleRemera,
        estado: 'Pendiente',
        categoria: assignedCategory,
        fechaInscripcion: new Date(),
      });

      await newRegistration.save();
    }

    // 6. Registrar auditoría con el usuario administrador responsable
    await AuditLog.create({
      carrera: carreraId,
      tipo: 'NUEVA_INSCRIPCION',
      usuarioResponsable: adminId,
      descripcion: `Alta manual de corredor: ${finalNombre} ${finalApellido} (DNI ${finalDni}) con dorsal #${dorsalNumber}`,
      detalles: {
        registrationId: newRegistration._id,
        corredor: {
          nombre: finalNombre,
          apellido: finalApellido,
          dni: finalDni,
        },
        dorsal: dorsalNumber,
        distancia: Number(distancia),
        estado: 'Pendiente',
        cambios: [
          {
            campo: 'Alta',
            etiqueta: 'Inscripción en Carrera',
            valorAnterior: '-',
            nuevoValor: `Inscripto en ${distancia}k`,
          },
          {
            campo: 'Dorsal',
            etiqueta: 'Dorsal Asignado',
            valorAnterior: '-',
            nuevoValor: dorsalNumber,
          },
          {
            campo: 'Estado',
            etiqueta: 'Estado de Acreditación',
            valorAnterior: '-',
            nuevoValor: 'Pendiente',
          },
        ],
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

    const race = await Race.findById(raceId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // Regla de Visibilidad y Estado: Si la carrera está Oculta o Finalizada y el usuario no es SuperAdmin, denegar acceso
    if ((race.visibilidad === 'Oculta' || (req.user?.rol === 'admin' && race.estado === 'finalizada')) && req.user?.rol !== 'superadmin') {
      res.status(404).json({
        error: 'Carrera no disponible',
        message: 'Esta carrera no se encuentra disponible para su gestión operativa',
      });
      return;
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

    // Asegurar que cada inscripción tenga su categoría calculada
    const processedRegistrations = registrations.map((r) => {
      const obj = r.toObject();
      if (!obj.categoria && race && obj.datosCorredor?.fechaNacimiento) {
        obj.categoria = determineRunnerCategory(
          obj.datosCorredor.fechaNacimiento,
          race.fecha,
          race.categorias
        );
      }
      return obj;
    });

    res.status(200).json({ registrations: processedRegistrations });
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

    // REGLA CRÍTICA DE VISIBILIDAD (Requerimiento 5):
    // Las carreras configuradas como 'Ocultas' no deberán aparecer en el apartado 'Mis Inscripciones'
    // del perfil del Corredor, aunque se haya inscripto previamente cuando estaba 'Visible'.
    // La inscripción existente se conserva intacta en el sistema.
    // Cuando el SuperAdmin vuelva a establecer la carrera como 'Visible', volverá a mostrarse automáticamente.
    const visibleRegistrations = registrations.filter((reg: any) => {
      if (!reg.carrera) return false;
      return reg.carrera.visibilidad !== 'Oculta';
    });

    res.status(200).json({ registrations: visibleRegistrations });
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

    // Regla de Visibilidad y Estado: Un admin no puede modificar acreditaciones en carreras Ocultas o Finalizadas
    const race = await Race.findById(registration.carrera);
    if (race && req.user?.rol !== 'superadmin' && (race.visibilidad === 'Oculta' || (req.user?.rol === 'admin' && race.estado === 'finalizada'))) {
      res.status(403).json({
        error: 'Operación no permitida',
        message: 'No es posible modificar estados en carreras finalizadas u ocultas',
      });
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
        corredor: {
          nombre: registration.datosCorredor.nombre,
          apellido: registration.datosCorredor.apellido,
          dni: registration.datosCorredor.dni,
        },
        dorsal: registration.dorsal,
        estadoAnterior,
        nuevoEstado,
        cambios: [
          {
            campo: 'Estado',
            etiqueta: 'Estado de Acreditación',
            valorAnterior: estadoAnterior,
            nuevoValor: nuevoEstado,
          },
        ],
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
    const adminId = req.user?.id;

    const registration = await Registration.findById(id);
    if (!registration) {
      res.status(404).json({ error: 'Inscripción no encontrada' });
      return;
    }

    const race = await Race.findById(registration.carrera);

    const cambios: Array<{ campo: string; etiqueta: string; valorAnterior: any; nuevoValor: any }> = [];

    // Modificación de dorsal
    if (dorsal !== undefined && Number(dorsal) !== registration.dorsal) {
      const newDorsalNum = Number(dorsal);
      if (isNaN(newDorsalNum) || newDorsalNum < 1) {
        res.status(400).json({ error: 'Dorsal inválido', message: 'El dorsal debe ser un número positivo mayor a 0' });
        return;
      }

      if (race && race.cupoMaximo && newDorsalNum > race.cupoMaximo) {
        res.status(400).json({
          error: 'Dorsal excede el cupo',
          message: `El dorsal #${newDorsalNum} excede el cupo máximo permitido para esta carrera (${race.cupoMaximo})`,
        });
        return;
      }

      const existingDorsal = await Registration.findOne({
        carrera: registration.carrera,
        dorsal: newDorsalNum,
        _id: { $ne: registration._id },
        estado: { $ne: 'Baja' },
      });
      if (existingDorsal) {
        res.status(400).json({ error: 'Dorsal no disponible', message: 'Dorsal no disponible' });
        return;
      }
      cambios.push({
        campo: 'Dorsal',
        etiqueta: 'Dorsal',
        valorAnterior: registration.dorsal,
        nuevoValor: newDorsalNum,
      });
      registration.dorsal = newDorsalNum;
    }

    // Modificación de distancia
    if (distancia !== undefined && Number(distancia) !== registration.distancia) {
      cambios.push({
        campo: 'Distancia',
        etiqueta: 'Distancia',
        valorAnterior: `${registration.distancia}k`,
        nuevoValor: `${Number(distancia)}k`,
      });
      registration.distancia = Number(distancia);
    }

    // Modificación de talle
    if (talleRemera && talleRemera !== registration.talleRemera) {
      cambios.push({
        campo: 'Talle',
        etiqueta: 'Talle de Remera',
        valorAnterior: registration.talleRemera,
        nuevoValor: talleRemera,
      });
      registration.talleRemera = talleRemera;
    }

    // Modificación de datos personales
    if (nombre && nombre.trim() !== registration.datosCorredor.nombre) {
      cambios.push({
        campo: 'Nombre',
        etiqueta: 'Nombre',
        valorAnterior: registration.datosCorredor.nombre,
        nuevoValor: nombre.trim(),
      });
      registration.datosCorredor.nombre = nombre.trim();
    }

    if (apellido && apellido.trim() !== registration.datosCorredor.apellido) {
      cambios.push({
        campo: 'Apellido',
        etiqueta: 'Apellido',
        valorAnterior: registration.datosCorredor.apellido,
        nuevoValor: apellido.trim(),
      });
      registration.datosCorredor.apellido = apellido.trim();
    }

    if (dni && dni.trim() !== registration.datosCorredor.dni) {
      cambios.push({
        campo: 'DNI',
        etiqueta: 'DNI',
        valorAnterior: registration.datosCorredor.dni,
        nuevoValor: dni.trim(),
      });
      registration.datosCorredor.dni = dni.trim();
    }

    if (email && email.toLowerCase().trim() !== registration.datosCorredor.email) {
      cambios.push({
        campo: 'Email',
        etiqueta: 'Correo Electrónico',
        valorAnterior: registration.datosCorredor.email,
        nuevoValor: email.toLowerCase().trim(),
      });
      registration.datosCorredor.email = email.toLowerCase().trim();
    }

    if (telefono !== undefined && telefono.trim() !== (registration.datosCorredor.telefono || '')) {
      cambios.push({
        campo: 'Teléfono',
        etiqueta: 'Teléfono',
        valorAnterior: registration.datosCorredor.telefono || '-',
        nuevoValor: telefono.trim(),
      });
      registration.datosCorredor.telefono = telefono.trim();
    }

    // Fecha de nacimiento y recálculo automático de categoría
    if (fechaNacimiento) {
      const newBirth = new Date(fechaNacimiento);
      const prevBirth = new Date(registration.datosCorredor.fechaNacimiento);
      const newBirthIso = newBirth.toISOString().slice(0, 10);
      const prevBirthIso = prevBirth.toISOString().slice(0, 10);

      if (newBirthIso !== prevBirthIso) {
        const formatD = (d: Date) =>
          d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        cambios.push({
          campo: 'Fecha de Nacimiento',
          etiqueta: 'Fecha de Nacimiento',
          valorAnterior: formatD(prevBirth),
          nuevoValor: formatD(newBirth),
        });
        registration.datosCorredor.fechaNacimiento = newBirth;

        // Recalcular categoría según la nueva edad a la fecha del evento
        if (race && race.fecha) {
          const newCategory = determineRunnerCategory(newBirth, race.fecha, race.categorias);
          const prevCategory = registration.categoria || '';
          if (newCategory !== prevCategory) {
            cambios.push({
              campo: 'Categoría',
              etiqueta: 'Categoría',
              valorAnterior: prevCategory || '-',
              nuevoValor: newCategory,
            });
            registration.categoria = newCategory;
          }
        }
      }
    }

    // Sexo
    if (sexo && ['Masculino', 'Femenino'].includes(sexo) && sexo !== registration.datosCorredor.sexo) {
      cambios.push({
        campo: 'Sexo',
        etiqueta: 'Sexo',
        valorAnterior: registration.datosCorredor.sexo,
        nuevoValor: sexo,
      });
      registration.datosCorredor.sexo = sexo;
    }

    if (ciudad !== undefined && ciudad.trim() !== (registration.datosCorredor.ciudad || '')) {
      cambios.push({
        campo: 'Ciudad',
        etiqueta: 'Ciudad',
        valorAnterior: registration.datosCorredor.ciudad || '-',
        nuevoValor: ciudad.trim(),
      });
      registration.datosCorredor.ciudad = ciudad.trim();
    }

    if (provincia !== undefined && provincia.trim() !== (registration.datosCorredor.provincia || '')) {
      cambios.push({
        campo: 'Provincia',
        etiqueta: 'Provincia',
        valorAnterior: registration.datosCorredor.provincia || '-',
        nuevoValor: provincia.trim(),
      });
      registration.datosCorredor.provincia = provincia.trim();
    }

    // Contacto de emergencia
    if (contactoEmergencia) {
      const prevNombre = registration.datosCorredor.contactoEmergencia?.nombre || '';
      const prevTel = registration.datosCorredor.contactoEmergencia?.telefono || '';
      const newNombre = (contactoEmergencia.nombre || '').trim();
      const newTel = (contactoEmergencia.telefono || '').trim();

      if (prevNombre !== newNombre || prevTel !== newTel) {
        cambios.push({
          campo: 'Contacto de Emergencia',
          etiqueta: 'Contacto de Emergencia',
          valorAnterior: prevNombre ? `${prevNombre} (${prevTel})` : '-',
          nuevoValor: newNombre ? `${newNombre} (${newTel})` : '-',
        });
        registration.datosCorredor.contactoEmergencia = {
          nombre: newNombre,
          telefono: newTel,
        };
      }
    }

    await registration.save();

    // Registrar modificación en auditoría con detalle estructurado de cambios
    await AuditLog.create({
      carrera: registration.carrera,
      tipo: 'MODIFICACION',
      usuarioResponsable: adminId,
      descripcion: `Modificación de datos de corredor: ${registration.datosCorredor.nombre} ${registration.datosCorredor.apellido} (Dorsal #${registration.dorsal})`,
      detalles: {
        registrationId: registration._id,
        corredor: {
          nombre: registration.datosCorredor.nombre,
          apellido: registration.datosCorredor.apellido,
          dni: registration.datosCorredor.dni,
        },
        dorsal: registration.dorsal,
        cambios: cambios.length > 0 ? cambios : [
          {
            campo: 'Datos',
            etiqueta: 'Datos Personales',
            valorAnterior: 'Anterior',
            nuevoValor: 'Actualizado',
          },
        ],
      },
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

    const estadoAnterior = registration.estado;
    registration.estado = 'Baja';
    await registration.save();

    // Registrar en auditoría
    await AuditLog.create({
      carrera: registration.carrera,
      tipo: 'BAJA',
      usuarioResponsable: adminId,
      descripcion: `Baja de corredor: ${registration.datosCorredor.nombre} ${registration.datosCorredor.apellido} (Dorsal #${registration.dorsal})`,
      detalles: {
        registrationId: registration._id,
        corredor: {
          nombre: registration.datosCorredor.nombre,
          apellido: registration.datosCorredor.apellido,
          dni: registration.datosCorredor.dni,
        },
        dorsal: registration.dorsal,
        cambios: [
          {
            campo: 'Estado',
            etiqueta: 'Estado de Inscripción',
            valorAnterior: estadoAnterior,
            nuevoValor: 'Baja',
          },
        ],
      },
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
