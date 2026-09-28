/**
 * ==============================================================================
 * CONTROLADOR DE ESTADÍSTICAS Y RESULTADOS HISTÓRICOS (Stats Controller) - MateRun
 * ==============================================================================
 * Alimenta la sección "Mis Datos" del Corredor con:
 * 1. Tabla de resultados de carreras pasadas:
 *    - Posición general
 *    - Posición en su categoría
 *    - Posición general por sexo
 * 2. Tarjetas de métricas y promedios calculados:
 *    - Distancia promedio en la que participa (km)
 *    - Tiempo promedio total invertido en carreras (HH:MM:SS)
 *    - Mejor tiempo personal (récord) y nombre de la carrera donde se alcanzó
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { RaceResult } from '../models/RaceResult';
import { formatSecondsToTime } from '../utils/formatters';

/**
 * Obtiene los resultados históricos y las estadísticas agregadas de un corredor.
 * 
 * Ruta: GET /api/stats/runner/:userId?
 * Acceso: Corredor autenticado (ve sus propios datos) o Admin/SuperAdmin
 */
export const getRunnerStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Si se especifica un userId en los parámetros de ruta, se utiliza ese;
    // de lo contrario se toma el ID del usuario actualmente autenticado
    const targetUserId = req.params.userId || req.user?.id;

    if (!targetUserId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    // Buscar todos los resultados de carreras del corredor ordenados por fecha descendente
    const raceResults = await RaceResult.find({ corredor: targetUserId }).sort({ fecha: -1 });

    // Si el corredor no tiene carreras registradas aún, retornar valores neutros
    if (!raceResults || raceResults.length === 0) {
      res.status(200).json({
        results: [],
        stats: {
          totalCarreras: 0,
          distanciaPromedio: 0,
          tiempoPromedioFormateado: '00:00:00',
          tiempoPromedioSegundos: 0,
          mejorTiempoFormateado: '00:00:00',
          mejorTiempoSegundos: 0,
          carreraMejorTiempo: 'Sin registros',
        },
      });
      return;
    }

    // --------------------------------------------------------------------------
    // CÁLCULO DE PROMEDIOS Y MÉTRICAS
    // --------------------------------------------------------------------------
    const totalCarreras = raceResults.length;

    // 1. Distancia promedio en km (solo carreras con distancia válida registrada)
    const validDistances = raceResults.filter(r => typeof r.distancia === 'number' && r.distancia > 0);
    const distanciaPromedio = validDistances.length > 0
      ? Number((validDistances.reduce((acc, curr) => acc + curr.distancia, 0) / validDistances.length).toFixed(1))
      : null;

    // 2. Tiempo promedio y mejor tiempo (solo carreras con tiempo oficial cargado)
    const validTimes = raceResults.filter(r => typeof r.tiempoSegundos === 'number' && r.tiempoSegundos > 0);
    let tiempoPromedioSegundos: number | null = null;
    let tiempoPromedioFormateado: string | null = null;
    let mejorTiempoSegundos: number | null = null;
    let mejorTiempoFormateado: string | null = null;
    let carreraMejorTiempo: string | null = null;

    if (validTimes.length > 0) {
      const sumaSegundos = validTimes.reduce((acc, curr) => acc + (curr.tiempoSegundos || 0), 0);
      tiempoPromedioSegundos = Math.round(sumaSegundos / validTimes.length);
      tiempoPromedioFormateado = formatSecondsToTime(tiempoPromedioSegundos);

      let mejorRegistro = validTimes[0];
      for (const r of validTimes) {
        if ((r.tiempoSegundos || Infinity) < (mejorRegistro.tiempoSegundos || Infinity)) {
          mejorRegistro = r;
        }
      }

      mejorTiempoSegundos = mejorRegistro.tiempoSegundos || null;
      mejorTiempoFormateado = mejorTiempoSegundos ? formatSecondsToTime(mejorTiempoSegundos) : null;
      carreraMejorTiempo = `${mejorRegistro.nombreCarrera} (${mejorRegistro.distancia}k)`;
    }

    // Formatear cada resultado: si un dato no fue cargado por SuperAdmin, queda en null para renderizar "Pendiente"
    const formattedResults = raceResults.map((r) => ({
      _id: r._id,
      carrera: r.carrera || null,
      nombreCarrera: r.nombreCarrera,
      fecha: r.fecha,
      distancia: r.distancia,
      tiempoSegundos: r.tiempoSegundos ?? null,
      tiempoFormateado: (r.tiempoSegundos && r.tiempoSegundos > 0) ? formatSecondsToTime(r.tiempoSegundos) : null,
      posicionGeneral: r.posicionGeneral ?? null,
      posicionCategoria: r.posicionCategoria ?? null,
      posicionSexo: r.posicionSexo ?? null,
      categoria: r.categoria ?? null,
    }));

    res.status(200).json({
      results: formattedResults,
      stats: {
        totalCarreras,
        distanciaPromedio,
        tiempoPromedioSegundos,
        tiempoPromedioFormateado,
        mejorTiempoSegundos,
        mejorTiempoFormateado,
        carreraMejorTiempo,
      },
    });
  } catch (error: any) {
    console.error('Error al calcular estadísticas del corredor:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
