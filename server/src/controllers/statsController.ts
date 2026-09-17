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

    // 1. Distancia promedio en km
    const sumaDistancias = raceResults.reduce((acc, curr) => acc + curr.distancia, 0);
    const distanciaPromedio = Number((sumaDistancias / totalCarreras).toFixed(1));

    // 2. Tiempo promedio en segundos y formateado a HH:MM:SS
    const sumaSegundos = raceResults.reduce((acc, curr) => acc + curr.tiempoSegundos, 0);
    const tiempoPromedioSegundos = Math.round(sumaSegundos / totalCarreras);
    const tiempoPromedioFormateado = formatSecondsToTime(tiempoPromedioSegundos);

    // 3. Mejor tiempo (menor cantidad de segundos) y en qué carrera fue
    let mejorRegistro = raceResults[0];
    for (const r of raceResults) {
      if (r.tiempoSegundos < mejorRegistro.tiempoSegundos) {
        mejorRegistro = r;
      }
    }

    const mejorTiempoSegundos = mejorRegistro.tiempoSegundos;
    const mejorTiempoFormateado = formatSecondsToTime(mejorTiempoSegundos);
    const carreraMejorTiempo = `${mejorRegistro.nombreCarrera} (${mejorRegistro.distancia}k)`;

    // Formatear cada resultado para incluir su tiempo legible en HH:MM:SS
    const formattedResults = raceResults.map((r) => ({
      _id: r._id,
      nombreCarrera: r.nombreCarrera,
      fecha: r.fecha,
      distancia: r.distancia,
      tiempoSegundos: r.tiempoSegundos,
      tiempoFormateado: formatSecondsToTime(r.tiempoSegundos),
      posicionGeneral: r.posicionGeneral,
      posicionCategoria: r.posicionCategoria,
      posicionSexo: r.posicionSexo,
      categoria: r.categoria,
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
