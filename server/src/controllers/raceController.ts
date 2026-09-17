/**
 * ==============================================================================
 * CONTROLADOR DE CARRERAS (Race Controller) - MateRun
 * ==============================================================================
 * Gestiona el ciclo de vida de los eventos de trail running y maratones:
 * 1. getAllRaces: Lista todas las carreras con cálculo en tiempo real de inscriptos y cupos.
 * 2. getRaceById: Consulta el detalle completo de una carrera específica.
 * 3. createRace: Creación de nueva carrera con distancias dinámicas (SuperAdmin).
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
 * 
 * Ruta: GET /api/races
 * Acceso: Privado (cualquier usuario autenticado)
 */
export const getAllRaces = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, estado } = req.query;

    const filter: Record<string, any> = {};

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

    const races = await Race.find(filter).sort({ fecha: -1 });

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

    const race = await Race.findById(id);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
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
 * - Solo ejecutable por el rol 'superadmin'.
 * 
 * Ruta: POST /api/races
 * Acceso: SuperAdmin únicamente
 */
export const createRace = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, lugar, cupoMaximo, fecha, organizador, distancias, estado } = req.body;

    // Validar campos obligatorios
    if (!nombre || !lugar || !cupoMaximo || !fecha || !organizador || !distancias) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre, lugar, cupo de corredores, fecha, organizador y distancias son obligatorios',
      });
      return;
    }

    // Normalizar y validar arreglo de distancias
    const parsedDistances = Array.isArray(distancias)
      ? distancias.map((d: any) => Number(d)).filter((d: number) => !isNaN(d) && d > 0)
      : [];

    if (parsedDistances.length === 0) {
      res.status(400).json({
        error: 'Distancias inválidas',
        message: 'Debe ingresar al menos una distancia numérica válida mayor a 0 (ej. 10, 21, 42)',
      });
      return;
    }

    const newRace = new Race({
      nombre: nombre.trim(),
      lugar: lugar.trim(),
      cupoMaximo: Number(cupoMaximo),
      fecha: new Date(fecha),
      organizador: organizador.trim(),
      distancias: parsedDistances,
      estado: estado || 'activa',
      creadoPor: req.user?.id,
    });

    await newRace.save();

    res.status(201).json({
      message: 'Carrera creada exitosamente',
      race: newRace,
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
    const { nombre, lugar, cupoMaximo, fecha, organizador, distancias, estado } = req.body;

    const race = await Race.findById(id);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    if (nombre) race.nombre = nombre.trim();
    if (lugar) race.lugar = lugar.trim();
    if (cupoMaximo) race.cupoMaximo = Number(cupoMaximo);
    if (fecha) race.fecha = new Date(fecha);
    if (organizador) race.organizador = organizador.trim();
    if (estado) race.estado = estado;

    if (distancias && Array.isArray(distancias)) {
      const parsedDistances = distancias
        .map((d: any) => Number(d))
        .filter((d: number) => !isNaN(d) && d > 0);

      if (parsedDistances.length > 0) {
        race.distancias = parsedDistances;
      }
    }

    await race.save();

    res.status(200).json({
      message: 'Carrera actualizada correctamente',
      race,
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

    // Opcional: También se pueden limpiar inscripciones huérfanas
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
