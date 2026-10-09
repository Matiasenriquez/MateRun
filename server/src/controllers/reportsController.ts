/**
 * ==============================================================================
 * CONTROLADOR DE INFORMES Y REPORTES DE CARRERA (reportsController) - MateRun
 * ==============================================================================
 * Proporciona consultas consolidadas e informes agrupados por:
 * - Distancia (ej: 10k, 21k, 42k)
 * - Categoría de edad (ej: 20-29, 30-35, etc.)
 * - Sexo (Hombres / Mujeres)
 * 
 * Funcionalidad exclusivamente de lectura y consulta analítica para SuperAdmin.
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { Race } from '../models/Race';
import { Registration } from '../models/Registration';
import { determineRunnerCategory } from './registrationController';

/**
 * Normaliza el valor de sexo a la nomenclatura oficial para reportes:
 * 'Masculino' | 'Hombre' -> 'Hombres'
 * 'Femenino' | 'Mujer'   -> 'Mujeres'
 */
export const normalizeSexo = (rawSexo?: string): 'Hombres' | 'Mujeres' => {
  if (!rawSexo) return 'Hombres';
  const s = rawSexo.trim().toLowerCase();
  if (s.startsWith('f') || s === 'mujer' || s === 'mujeres' || s === 'femenino') {
    return 'Mujeres';
  }
  return 'Hombres';
};

/**
 * Estructura de una fila unificada de informes por Distancia + Categoría
 */
export interface IReportGroup {
  id: string;
  distancia: number;
  distanciaLabel: string;
  categoria: string;
  cantidadHombres: number;
  cantidadMujeres: number;
  total: number;
  inscriptosHombres: any[];
  inscriptosMujeres: any[];
  inscriptosTodos: any[];
  // Campos de compatibilidad
  cantidad?: number;
  sexo?: 'Hombres' | 'Mujeres';
  inscriptos?: any[];
}

/**
 * Obtiene el informe consolidado de inscriptos para una carrera específica.
 * Agrupa los corredores activos (estado !== 'Baja') en una única fila por Distancia + Categoría,
 * discriminando las cantidades y nóminas de Hombres y Mujeres en columnas independientes.
 * 
 * Ruta: GET /api/reports/race/:raceId
 * Acceso: SuperAdmin / Admin
 */
export const getRaceReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;

    const race = await Race.findById(raceId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // Regla de Visibilidad y Estado: Si está Oculta o Finalizada y no es SuperAdmin, restringir
    if (req.user?.rol !== 'superadmin' && (race.visibilidad === 'Oculta' || (req.user?.rol === 'admin' && race.estado === 'finalizada'))) {
      res.status(404).json({
        error: 'Carrera no disponible',
        message: 'Esta carrera no se encuentra disponible para informes',
      });
      return;
    }

    // Obtener todas las inscripciones activas (excluye 'Baja')
    const registrations = await Registration.find({
      carrera: raceId,
      estado: { $ne: 'Baja' },
    })
      .populate('corredor', 'nombre apellido email telefono fotoPerfil')
      .sort({ dorsal: 1 });

    // Métricas globales
    let totalHombres = 0;
    let totalMujeres = 0;
    const porDistancia: Record<number, number> = {};
    const porEstado = {
      acreditados: 0,
      pendientes: 0,
      retiraNoCorre: 0,
    };

    // Inicializar mapa de distancias según la configuración de la carrera
    if (race.distancias && Array.isArray(race.distancias)) {
      for (const d of race.distancias) {
        porDistancia[d] = 0;
      }
    }

    // Recopilar todas las distancias disponibles (de la carrera + de inscriptos)
    const allDistancesSet = new Set<number>(race.distancias || []);
    for (const r of registrations) {
      if (r.distancia) {
        allDistancesSet.add(r.distancia);
      }
    }
    const allDistances = Array.from(allDistancesSet).sort((a, b) => a - b);

    // Recopilar categorías preconfiguradas si existen
    const configuredCategories = race.categorias && Array.isArray(race.categorias)
      ? race.categorias.map((c) => c.nombre.trim())
      : [];

    // Mapa de filas unificadas: clave = `${distancia}_${categoria}`
    const groupsMap = new Map<string, IReportGroup>();

    // Inicializar combinaciones preconfiguradas
    if (configuredCategories.length > 0) {
      for (const dist of allDistances) {
        for (const cat of configuredCategories) {
          const key = `${dist}_${cat}`;
          groupsMap.set(key, {
            id: key,
            distancia: dist,
            distanciaLabel: `${dist}k`,
            categoria: cat,
            cantidadHombres: 0,
            cantidadMujeres: 0,
            total: 0,
            inscriptosHombres: [],
            inscriptosMujeres: [],
            inscriptosTodos: [],
            cantidad: 0,
            inscriptos: [],
          });
        }
      }
    }

    // Procesar cada inscripción y agregarla a la fila unificada correspondiente
    for (const reg of registrations) {
      const regObj = reg.toObject();
      const dist = reg.distancia;
      const sexo = normalizeSexo(reg.datosCorredor?.sexo);

      // Determinar categoría exacta (existente o calculada dinámicamente)
      let categoria = reg.categoria?.trim();
      if (!categoria && race.fecha && reg.datosCorredor?.fechaNacimiento) {
        categoria = determineRunnerCategory(
          reg.datosCorredor.fechaNacimiento,
          race.fecha,
          race.categorias
        );
      }
      if (!categoria) {
        categoria = 'General';
      }

      // Snapshot procesado con categoría garantizada y sexo normalizado
      const processedRunner = {
        ...regObj,
        categoria,
        sexoNormalizado: sexo,
      };

      // Actualizar contadores globales
      if (sexo === 'Hombres') totalHombres++;
      if (sexo === 'Mujeres') totalMujeres++;

      porDistancia[dist] = (porDistancia[dist] || 0) + 1;

      if (reg.estado === 'Acreditado') {
        porEstado.acreditados++;
      } else if (reg.estado === 'Retira y no corre') {
        porEstado.retiraNoCorre++;
      } else {
        porEstado.pendientes++;
      }

      // Asignar a la fila unificada por Distancia + Categoría
      const key = `${dist}_${categoria}`;
      let row = groupsMap.get(key);

      if (!row) {
        row = {
          id: key,
          distancia: dist,
          distanciaLabel: `${dist}k`,
          categoria,
          cantidadHombres: 0,
          cantidadMujeres: 0,
          total: 0,
          inscriptosHombres: [],
          inscriptosMujeres: [],
          inscriptosTodos: [],
          cantidad: 0,
          inscriptos: [],
        };
        groupsMap.set(key, row);
      }

      if (sexo === 'Hombres') {
        row.inscriptosHombres.push(processedRunner);
        row.cantidadHombres = row.inscriptosHombres.length;
      } else {
        row.inscriptosMujeres.push(processedRunner);
        row.cantidadMujeres = row.inscriptosMujeres.length;
      }

      row.inscriptosTodos.push(processedRunner);
      row.total = row.inscriptosTodos.length;
      // Compatibilidad
      row.cantidad = row.total;
      row.inscriptos = row.inscriptosTodos;
    }

    // Convertir el mapa de grupos a array ordenado (por Distancia ascendente y luego Categoría)
    const groups = Array.from(groupsMap.values()).sort((a, b) => {
      // 1. Ordenar por Distancia (numérica ascendente)
      if (a.distancia !== b.distancia) {
        return a.distancia - b.distancia;
      }
      // 2. Ordenar por Categoría alfabética / numérica
      return a.categoria.localeCompare(b.categoria, 'es', { numeric: true });
    });

    res.status(200).json({
      success: true,
      race: {
        _id: race._id,
        nombre: race.nombre,
        lugar: race.lugar,
        fecha: race.fecha,
        organizador: race.organizador,
        cupoMaximo: race.cupoMaximo,
        distancias: race.distancias,
        estado: race.estado,
        visibilidad: race.visibilidad,
        categorias: race.categorias,
      },
      totals: {
        totalInscriptos: registrations.length,
        totalHombres,
        totalMujeres,
        porDistancia,
        porEstado,
      },
      groups,
      rows: groups,
    });
  } catch (error: any) {
    console.error('Error al generar informe de la carrera:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message || 'No se pudo generar el informe de la carrera',
    });
  }
};
