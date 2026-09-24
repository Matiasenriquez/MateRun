/**
 * ==============================================================================
 * CONTROLADOR DE CARRERAS (Race Controller) - MateRun
 * ==============================================================================
 * Gestiona el ciclo de vida de los eventos de trail running y maratones:
 * 1. getAllRaces: Lista todas las carreras con cálculo en tiempo real de inscriptos y cupos,
 *    poblando el administrador asignado y las categorías etarias.
 * 2. getRaceById: Consulta el detalle completo de una carrera específica.
 * 3. createRace: Creación de nueva carrera con distancias dinámicas, categorías y admin asignado (SuperAdmin).
 * 4. updateRace: Edición de datos de una carrera existente (SuperAdmin).
 * 5. deleteRace: Eliminación o cancelación de un evento (SuperAdmin).
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { Race } from '../models/Race';
import { Registration } from '../models/Registration';

/**
 * Obtiene todas las carreras con filtros opcionales (búsqueda por texto o estado).
 * Calcula automáticamente:
 * - totalInscriptos: corredores activos (excluye aquellos con estado 'Baja')
 * - cuposDisponibles: cupoMaximo - totalInscriptos
 * - adminAsignado: datos del usuario administrador a cargo
 * 
 * Ruta: GET /api/races
 * Acceso: Privado (cualquier usuario autenticado)
 */
export const getAllRaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, estado, visibilidad } = req.query;

    const filter: Record<string, any> = {};

    // REGLA ESTRICTA DE VISIBILIDAD DE CARRERAS:
    // 1. Usuarios 'corredor' y 'admin' ÚNICAMENTE pueden visualizar carreras con visibilidad 'Visible'.
    //    Las carreras configuradas como 'Ocultas' no se retornan bajo ninguna circunstancia a estos roles.
    // 2. El usuario 'superadmin' tiene permisos totales para visualizar todas las carreras (Visibles y Ocultas).
    const userRole = req.user?.rol;
    if (userRole !== 'superadmin') {
      filter.visibilidad = { $ne: 'Oculta' };
    } else if (visibilidad && typeof visibilidad === 'string') {
      filter.visibilidad = visibilidad;
    }

    // Filtro por estado ('activa', 'finalizada', etc.) si se proporciona
    if (estado && typeof estado === 'string') {
      filter.estado = estado;
    }

    // Filtro de búsqueda insensible a mayúsculas/minúsculas sobre nombre, lugar u organizador
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { nombre: searchRegex },
        { lugar: searchRegex },
        { organizador: searchRegex },
      ];
    }

    const races = await Race.find(filter)
      .populate('adminAsignado', 'nombre apellido email')
      .sort({ fecha: -1 });

    // Para cada carrera, calcular la cantidad de inscriptos activos y cupos restantes
    const racesWithStats = await Promise.all(
      races.map(async (race) => {
        const inscriptosActivos = await Registration.countDocuments({
          carrera: race._id,
          estado: { $ne: 'Baja' }, // Los dados de baja liberan cupo
        });

        const cuposDisponibles = Math.max(0, race.cupoMaximo - inscriptosActivos);

        return {
          ...race.toObject(),
          totalInscriptos: inscriptosActivos,
          cuposDisponibles,
        };
      })
    );

    res.status(200).json({ races: racesWithStats });
  } catch (error: any) {
    console.error('Error al listar carreras:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Obtiene el detalle de una carrera por su identificador ID.
 * 
 * Ruta: GET /api/races/:id
 * Acceso: Privado
 */
export const getRaceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userRole = req.user?.rol;

    const race = await Race.findById(id).populate('adminAsignado', 'nombre apellido email');
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // Regla de Visibilidad: Si la carrera está 'Oculta', solo el SuperAdmin puede acceder
    if (race.visibilidad === 'Oculta' && userRole !== 'superadmin') {
      res.status(404).json({
        error: 'Carrera no disponible',
        message: 'Esta carrera no se encuentra disponible',
      });
      return;
    }

    const totalInscriptos = await Registration.countDocuments({
      carrera: race._id,
      estado: { $ne: 'Baja' },
    });

    const cuposDisponibles = Math.max(0, race.cupoMaximo - totalInscriptos);

    res.status(200).json({
      race: {
        ...race.toObject(),
        totalInscriptos,
        cuposDisponibles,
      },
    });
  } catch (error: any) {
    console.error('Error al buscar carrera por ID:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Crea una nueva carrera en la plataforma.
 * 
 * Reglas de negocio:
 * - Las distancias deben ser un arreglo de números positivos ingresados dinámicamente.
 * - Categorías etarias opcionales configuradas por rangos de edad.
 * - Admin asignado opcional.
 * - Solo ejecutable por el rol 'superadmin'.
 * 
 * Ruta: POST /api/races
 * Acceso: SuperAdmin únicamente
 */
export const createRace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      nombre, 
      lugar, 
      cupoMaximo, 
      fecha, 
      organizador, 
      distancias, 
      estado,
      visibilidad,
      adminAsignado,
      categorias
    } = req.body;

    // Validar campos obligatorios
    if (!nombre || !cupoMaximo || !fecha || !distancias) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre, cupo de corredores, fecha y distancias son obligatorios',
      });
      return;
    }

    // Normalizar y validar arreglo de distancias
    const parsedDistances = Array.isArray(distancias)
      ? distancias.map((d: any) => Number(d)).filter((d: number) => !isNaN(d) && d > 0)
      : typeof distancias === 'string'
      ? distancias.split(',').map((d: string) => Number(d.trim())).filter((d: number) => !isNaN(d) && d > 0)
      : [];

    if (parsedDistances.length === 0) {
      res.status(400).json({
        error: 'Distancias inválidas',
        message: 'Debe ingresar al menos una distancia numérica válida mayor a 0 (ej. 10, 21, 42)',
      });
      return;
    }

    // Normalizar categorías etarias
    const parsedCategorias = Array.isArray(categorias)
      ? categorias
          .filter((c: any) => c && c.nombre && String(c.nombre).trim() !== '')
          .map((c: any) => ({
            nombre: String(c.nombre).trim(),
            edadMinima: Math.max(0, Number(c.edadMinima) || 0),
            edadMaxima: Math.max(0, Number(c.edadMaxima) || 0),
          }))
      : [];

    const newRace = new Race({
      nombre: String(nombre).trim(),
      lugar: lugar ? String(lugar).trim() : 'Circuito Oficial',
      cupoMaximo: Number(cupoMaximo),
      fecha: new Date(fecha),
      organizador: organizador ? String(organizador).trim() : 'Organización Deportiva',
      distancias: parsedDistances,
      estado: estado || 'activa',
      visibilidad: visibilidad === 'Oculta' ? 'Oculta' : 'Visible',
      creadoPor: req.user?.id,
      adminAsignado: adminAsignado ? adminAsignado : null,
      categorias: parsedCategorias,
    });

    await newRace.save();

    const populatedRace = await Race.findById(newRace._id).populate('adminAsignado', 'nombre apellido email');

    res.status(201).json({
      message: 'Carrera creada exitosamente',
      race: populatedRace || newRace,
    });
  } catch (error: any) {
    console.error('Error al crear carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Modifica los datos de una carrera existente.
 * 
 * Ruta: PUT /api/races/:id
 * Acceso: SuperAdmin únicamente
 */
export const updateRace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      lugar, 
      cupoMaximo, 
      fecha, 
      organizador, 
      distancias, 
      estado,
      visibilidad,
      adminAsignado,
      categorias
    } = req.body;

    const race = await Race.findById(id);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    if (nombre !== undefined) race.nombre = String(nombre).trim();
    if (lugar !== undefined) race.lugar = String(lugar).trim();
    if (cupoMaximo !== undefined) race.cupoMaximo = Number(cupoMaximo);
    if (fecha !== undefined) race.fecha = new Date(fecha);
    if (organizador !== undefined) race.organizador = String(organizador).trim();
    if (estado !== undefined) race.estado = estado;

    // Regla de Visibilidad: Solo SuperAdmin tiene permisos para establecer o modificar visibilidad
    if (visibilidad !== undefined) {
      if (req.user?.rol !== 'superadmin') {
        res.status(403).json({
          error: 'Acceso denegado',
          message: 'Solo el usuario SuperAdmin tiene permisos para modificar la visibilidad de una carrera',
        });
        return;
      }
      race.visibilidad = visibilidad === 'Oculta' ? 'Oculta' : 'Visible';
    }

    // Actualización de distancias si se proporcionan
    if (distancias !== undefined) {
      const parsedDistances = Array.isArray(distancias)
        ? distancias.map((d: any) => Number(d)).filter((d: number) => !isNaN(d) && d > 0)
        : typeof distancias === 'string'
        ? distancias.split(',').map((d: string) => Number(d.trim())).filter((d: number) => !isNaN(d) && d > 0)
        : [];

      if (parsedDistances.length > 0) {
        race.distancias = parsedDistances;
      }
    }

    // Actualización del administrador asignado (permite asignar id o null)
    if (adminAsignado !== undefined) {
      race.adminAsignado = adminAsignado ? adminAsignado : null as any;
    }

    // Actualización de categorías etarias si se proporcionan
    if (categorias !== undefined) {
      race.categorias = Array.isArray(categorias)
        ? categorias
            .filter((c: any) => c && c.nombre && String(c.nombre).trim() !== '')
            .map((c: any) => ({
              nombre: String(c.nombre).trim(),
              edadMinima: Math.max(0, Number(c.edadMinima) || 0),
              edadMaxima: Math.max(0, Number(c.edadMaxima) || 0),
            }))
        : [];
    }

    await race.save();

    const populatedRace = await Race.findById(race._id).populate('adminAsignado', 'nombre apellido email');

    res.status(200).json({
      message: 'Carrera actualizada correctamente',
      race: populatedRace || race,
    });
  } catch (error: any) {
    console.error('Error al actualizar carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Elimina una carrera de la base de datos.
 * 
 * Ruta: DELETE /api/races/:id
 * Acceso: SuperAdmin únicamente
 */
export const deleteRace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const race = await Race.findById(id);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // Limpiar inscripciones asociadas a la carrera eliminada
    await Registration.deleteMany({ carrera: id });
    await Race.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Carrera e inscripciones asociadas eliminadas exitosamente',
    });
  } catch (error: any) {
    console.error('Error al eliminar carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
