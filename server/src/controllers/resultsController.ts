/**
 * ==============================================================================
 * CONTROLADOR DE RESULTADOS DE CARRERAS (Results Controller) - MateRun
 * ==============================================================================
 * Gestiona la carga, edición y publicación de resultados oficiales de carreras:
 * 1. Clasificación general (1.º, 2.º y 3.º puesto) con asignación de corredor y tiempo.
 * 2. Ganadores por cada categoría de edad definida para la carrera.
 * 3. Carga y edición manual de tiempos para cada corredor de la nómina.
 * 4. Transición de estado de la carrera a "Finalizada".
 * 5. Sincronización automática con "Mis Datos" (RaceResult) del perfil del corredor.
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { Race } from '../models/Race';
import { Registration } from '../models/Registration';
import { RaceResultsSummary } from '../models/RaceResultsSummary';
import { RaceResult } from '../models/RaceResult';
import { AuditLog } from '../models/AuditLog';
import { parseTimeToSeconds, formatSecondsToTime } from '../utils/formatters';

/**
 * Obtiene los datos preestablecidos de la carrera, sus corredores inscriptos
 * y los resultados registrados para la distancia seleccionada.
 * 
 * Ruta: GET /api/results/race/:raceId
 * Acceso: SuperAdmin o Admin
 */
export const getRaceResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;
    const { distancia } = req.query;

    const race = await Race.findById(raceId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // Determinar la distancia objetivo
    let targetDistancia: number;
    if (distancia && !isNaN(Number(distancia))) {
      targetDistancia = Number(distancia);
    } else if (race.distancias && race.distancias.length > 0) {
      targetDistancia = race.distancias[0];
    } else {
      targetDistancia = 10;
    }

    // Obtener todos los corredores inscriptos activos en la carrera
    const registrations = await Registration.find({
      carrera: raceId,
      estado: { $ne: 'Baja' },
    })
      .populate('corredor', 'nombre apellido dni email fotoPerfil sexo')
      .sort({ dorsal: 1 });

    // Buscar el resumen de resultados guardado para esta distancia
    const resultsSummary = await RaceResultsSummary.findOne({
      carrera: raceId,
      distancia: targetDistancia,
    });

    // Buscar todos los resúmenes guardados para todas las distancias de la carrera
    const allSummaries = await RaceResultsSummary.find({ carrera: raceId });

    res.status(200).json({
      race,
      selectedDistance: targetDistancia,
      registrations,
      results: resultsSummary || null,
      allSummaries,
    });
  } catch (error: any) {
    console.error('Error al obtener resultados de la carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Guarda o actualiza los resultados oficiales de una carrera para una distancia dada.
 * Actualiza el podio general, los ganadores por categoría, los tiempos individuales
 * y sincroniza la colección `RaceResult` para alimentar la sección "Mis Datos" de los corredores.
 * 
 * Ruta: POST /api/results/race/:raceId
 * Acceso: Exclusivo SuperAdmin
 */
export const saveRaceResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;
    const adminId = req.user?.id;
    const {
      distancia,
      estadoCarrera,
      clasificacionGeneral,
      ganadoresCategorias,
      tiemposCorredores,
    } = req.body;

    const race = await Race.findById(raceId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    // 1. Si se indicó cambio de estado a 'finalizada' o 'activa', actualizar la carrera
    if (estadoCarrera && ['activa', 'finalizada', 'cancelada'].includes(estadoCarrera)) {
      const estadoAnterior = race.estado;
      if (estadoAnterior !== estadoCarrera) {
        race.estado = estadoCarrera;
        await race.save();

        await AuditLog.create({
          carrera: race._id,
          tipo: 'MODIFICACION',
          usuarioResponsable: adminId,
          descripcion: `Estado de la carrera '${race.nombre}' modificado de '${estadoAnterior}' a '${estadoCarrera}'`,
          detalles: {
            cambios: [
              {
                campo: 'Estado de la carrera',
                valorAnterior: estadoAnterior,
                nuevoValor: estadoCarrera,
              },
            ],
          },
          fecha: new Date(),
        });
      }
    }

    const targetDistancia = Number(distancia) || (race.distancias && race.distancias[0]) || 10;

    // 2. Normalizar Clasificación General (1.º, 2.º y 3.º puestos discriminados por sexo)
    const normalizedGeneral = Array.isArray(clasificacionGeneral)
      ? clasificacionGeneral.map((entry: any) => {
          const segs = entry.tiempoSegundos !== undefined && entry.tiempoSegundos !== null
            ? Number(entry.tiempoSegundos)
            : parseTimeToSeconds(entry.tiempo || '');
          const formatted = segs > 0 ? formatSecondsToTime(segs) : entry.tiempo || '';
          const sexoNorm = entry.sexo === 'Femenino' ? 'Femenino' : 'Masculino';
          return {
            posicion: Number(entry.posicion),
            sexo: sexoNorm,
            corredor: entry.corredor,
            registrationId: entry.registrationId,
            dorsal: Number(entry.dorsal) || undefined,
            nombre: entry.nombre || '',
            tiempo: formatted,
            tiempoSegundos: segs,
          };
        })
      : [];

    // 3. Normalizar Ganadores por Categoría de Edad (1.º, 2.º y 3.º puestos discriminados por sexo)
    const normalizedCategorias = Array.isArray(ganadoresCategorias)
      ? ganadoresCategorias.map((entry: any) => {
          const segs = entry.tiempoSegundos !== undefined && entry.tiempoSegundos !== null
            ? Number(entry.tiempoSegundos)
            : parseTimeToSeconds(entry.tiempo || '');
          const formatted = segs > 0 ? formatSecondsToTime(segs) : entry.tiempo || '';
          const sexoNorm = entry.sexo === 'Femenino' ? 'Femenino' : 'Masculino';
          return {
            categoria: String(entry.categoria || '').trim(),
            posicion: Number(entry.posicion) || 1,
            sexo: sexoNorm,
            corredor: entry.corredor,
            registrationId: entry.registrationId,
            dorsal: Number(entry.dorsal) || undefined,
            nombre: entry.nombre || '',
            tiempo: formatted,
            tiempoSegundos: segs,
          };
        })
      : [];

    // 4. Normalizar Tiempos de Corredores de la nómina
    const prevSummary = await RaceResultsSummary.findOne({
      carrera: raceId,
      distancia: targetDistancia,
    });
    const prevMap = new Map(
      (prevSummary?.tiemposCorredores || []).map((t: any) => [
        String(t.corredor || t.registrationId),
        t,
      ])
    );

    const normalizedTiempos = Array.isArray(tiemposCorredores)
      ? tiemposCorredores.map((entry: any) => {
          const isDescalificado = Boolean(entry.descalificado);
          const segs = isDescalificado
            ? null
            : entry.tiempoSegundos !== undefined && entry.tiempoSegundos !== null
            ? Number(entry.tiempoSegundos)
            : parseTimeToSeconds(entry.tiempo || '');
          const formatted = isDescalificado
            ? 'Descalificado'
            : segs && segs > 0
            ? formatSecondsToTime(segs)
            : entry.tiempo || '';
          return {
            corredor: entry.corredor,
            registrationId: entry.registrationId,
            dorsal: Number(entry.dorsal) || undefined,
            nombre: entry.nombre || '',
            categoria: entry.categoria || '',
            sexo: entry.sexo || '',
            distancia: targetDistancia,
            tiempo: formatted,
            tiempoSegundos: segs,
            posicionGeneral: isDescalificado
              ? null
              : entry.posicionGeneral !== undefined
              ? entry.posicionGeneral
              : null,
            posicionCategoria: isDescalificado
              ? null
              : entry.posicionCategoria !== undefined
              ? entry.posicionCategoria
              : null,
            posicionSexo: isDescalificado
              ? null
              : entry.posicionSexo !== undefined
              ? entry.posicionSexo
              : null,
            descalificado: isDescalificado,
          };
        })
      : [];

    // 5. Guardar o actualizar el resumen en RaceResultsSummary
    const summary = await RaceResultsSummary.findOneAndUpdate(
      { carrera: raceId, distancia: targetDistancia },
      {
        carrera: raceId,
        distancia: targetDistancia,
        clasificacionGeneral: normalizedGeneral,
        ganadoresCategorias: normalizedCategorias,
        tiemposCorredores: normalizedTiempos,
        actualizadoPor: adminId,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 6. Sincronizar con `RaceResult` para que cada corredor visualice su resultado en "Mis Datos"
    // Mapa consolidado de corredores afectados
    const runnerResultsMap = new Map<
      string,
      {
        corredorId: string;
        tiempoSegundos: number | null;
        posicionGeneral: number | null;
        posicionCategoria: number | null;
        posicionSexo: number | null;
        categoria?: string | null;
        sexo?: string | null;
        descalificado?: boolean;
      }
    >();

    // Integrar podio general discriminado por sexo
    for (const g of normalizedGeneral) {
      if (!g.corredor) continue;
      const cId = String(g.corredor);
      runnerResultsMap.set(cId, {
        corredorId: cId,
        tiempoSegundos: g.tiempoSegundos && g.tiempoSegundos > 0 ? g.tiempoSegundos : null,
        posicionGeneral: g.posicion,
        posicionSexo: g.posicion,
        posicionCategoria: null,
        sexo: g.sexo,
        descalificado: false,
      });
    }

    // Integrar ganadores por categoría discriminados por sexo
    for (const cat of normalizedCategorias) {
      if (!cat.corredor) continue;
      const cId = String(cat.corredor);
      const prev = runnerResultsMap.get(cId) || {
        corredorId: cId,
        tiempoSegundos: null,
        posicionGeneral: null,
        posicionSexo: null,
        posicionCategoria: null,
        sexo: cat.sexo,
        descalificado: false,
      };

      runnerResultsMap.set(cId, {
        ...prev,
        tiempoSegundos:
          cat.tiempoSegundos && cat.tiempoSegundos > 0 ? cat.tiempoSegundos : prev.tiempoSegundos,
        posicionCategoria: Number(cat.posicion) || 1, // Es 1.º, 2.º o 3.º puesto de su categoría
        categoria: cat.categoria,
        sexo: cat.sexo || prev.sexo,
      });
    }

    // Integrar tiempos individuales de corredores
    for (const t of normalizedTiempos) {
      if (!t.corredor) continue;
      const cId = String(t.corredor);
      const prev = runnerResultsMap.get(cId);

      const isDescalificado = Boolean(t.descalificado);

      const finalTiempoSegundos = isDescalificado
        ? null
        : t.tiempoSegundos && t.tiempoSegundos > 0
        ? t.tiempoSegundos
        : prev?.tiempoSegundos ?? null;

      const finalPosGeneral = isDescalificado
        ? null
        : prev?.posicionGeneral !== null && prev?.posicionGeneral !== undefined
        ? prev.posicionGeneral
        : t.posicionGeneral;

      const finalPosSexo = isDescalificado
        ? null
        : prev?.posicionSexo !== null && prev?.posicionSexo !== undefined
        ? prev.posicionSexo
        : t.posicionSexo;

      const finalPosCategoria = isDescalificado
        ? null
        : prev?.posicionCategoria !== null && prev?.posicionCategoria !== undefined
        ? prev.posicionCategoria
        : t.posicionCategoria;

      runnerResultsMap.set(cId, {
        corredorId: cId,
        tiempoSegundos: finalTiempoSegundos,
        posicionGeneral: finalPosGeneral ?? null,
        posicionSexo: finalPosSexo ?? null,
        posicionCategoria: finalPosCategoria ?? null,
        categoria: t.categoria || prev?.categoria || null,
        sexo: t.sexo || prev?.sexo || null,
        descalificado: isDescalificado,
      });
    }

    // Si la carrera está finalizada, asegurar también a todos los inscriptos de la distancia
    if (race.estado === 'finalizada') {
      const activeRegs = await Registration.find({
        carrera: raceId,
        distancia: targetDistancia,
        estado: { $ne: 'Baja' },
      });

      for (const reg of activeRegs) {
        const cId = String(reg.corredor);
        if (!runnerResultsMap.has(cId)) {
          runnerResultsMap.set(cId, {
            corredorId: cId,
            tiempoSegundos: null,
            posicionGeneral: null,
            posicionSexo: null,
            posicionCategoria: null,
            categoria: reg.categoria || null,
            sexo: reg.datosCorredor?.sexo || null,
            descalificado: false,
          });
        }
      }
    }

    // Persistir cada resultado individual en `RaceResult`
    for (const [corredorId, resData] of runnerResultsMap.entries()) {
      await RaceResult.findOneAndUpdate(
        {
          carrera: raceId,
          corredor: corredorId,
          distancia: targetDistancia,
        },
        {
          corredor: corredorId,
          carrera: raceId,
          nombreCarrera: race.nombre,
          fecha: race.fecha,
          distancia: targetDistancia,
          tiempoSegundos: resData.tiempoSegundos,
          posicionGeneral: resData.posicionGeneral,
          posicionSexo: resData.posicionSexo,
          posicionCategoria: resData.posicionCategoria,
          categoria: resData.categoria,
          descalificado: Boolean(resData.descalificado),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // 7. Registrar auditoría individual de corredores modificados (descalificaciones y tiempos)
    for (const t of normalizedTiempos) {
      const cKey = String(t.corredor || t.registrationId);
      const prevEntry = prevMap.get(cKey);
      const wasDescalificado = Boolean(prevEntry?.descalificado);
      const isDescalificado = Boolean(t.descalificado);

      // Si cambió el estado de descalificación
      if (wasDescalificado !== isDescalificado) {
        await AuditLog.create({
          carrera: race._id,
          tipo: 'MODIFICACION',
          usuarioResponsable: adminId,
          descripcion: `Corredor ${t.nombre || 'inscripto'} (Dorsal #${t.dorsal}) registrado como ${
            isDescalificado ? 'Descalificado' : 'Clasificado'
          } en ${targetDistancia}k`,
          detalles: {
            registrationId: t.registrationId,
            corredor: {
              nombre: t.nombre,
            },
            dorsal: t.dorsal,
            distancia: targetDistancia,
            cambios: [
              {
                campo: 'Estado de Resultado',
                etiqueta: 'Estado de Resultado',
                valorAnterior: wasDescalificado ? 'Descalificado' : 'Clasificado',
                nuevoValor: isDescalificado ? 'Descalificado' : 'Clasificado',
              },
            ],
          },
          fecha: new Date(),
        });
      } else if (
        prevEntry &&
        prevEntry.tiempo !== t.tiempo &&
        !isDescalificado &&
        !wasDescalificado &&
        (prevEntry.tiempo || t.tiempo)
      ) {
        // Si se modificó su tiempo oficial
        await AuditLog.create({
          carrera: race._id,
          tipo: 'MODIFICACION',
          usuarioResponsable: adminId,
          descripcion: `Modificación de tiempo oficial de corredor: ${
            t.nombre || 'inscripto'
          } (Dorsal #${t.dorsal}) en ${targetDistancia}k`,
          detalles: {
            registrationId: t.registrationId,
            corredor: {
              nombre: t.nombre,
            },
            dorsal: t.dorsal,
            distancia: targetDistancia,
            cambios: [
              {
                campo: 'Tiempo Oficial',
                etiqueta: 'Tiempo Oficial',
                valorAnterior: prevEntry.tiempo || '-',
                nuevoValor: t.tiempo || '-',
              },
            ],
          },
          fecha: new Date(),
        });
      }
    }

    // 8. Registrar auditoría general de la carga de resultados
    await AuditLog.create({
      carrera: race._id,
      tipo: 'MODIFICACION',
      usuarioResponsable: adminId,
      descripcion: `Carga y actualización de resultados oficiales de la carrera: ${race.nombre} (${targetDistancia}k)`,
      detalles: {
        distancia: targetDistancia,
        podioCargado: normalizedGeneral.length,
        ganadoresCategoriasCargados: normalizedCategorias.length,
        tiemposCargados: normalizedTiempos.filter((t: any) => t.tiempoSegundos > 0).length,
        descalificados: normalizedTiempos.filter((t: any) => t.descalificado).length,
        estadoCarrera: race.estado,
      },
      fecha: new Date(),
    });

    res.status(200).json({
      message: 'Resultados oficiales guardados correctamente',
      summary,
      race,
    });
  } catch (error: any) {
    console.error('Error al guardar resultados de la carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Permite cambiar exclusivamente el estado de una carrera (ej. marcar como 'finalizada' o 'activa').
 * 
 * Ruta: PUT /api/results/race/:raceId/status
 * Acceso: Exclusivo SuperAdmin
 */
export const updateRaceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raceId } = req.params;
    const { estado } = req.body;
    const adminId = req.user?.id;

    if (!['activa', 'finalizada', 'cancelada'].includes(estado)) {
      res.status(400).json({
        error: 'Estado inválido',
        message: "El estado debe ser 'activa', 'finalizada' o 'cancelada'",
      });
      return;
    }

    const race = await Race.findById(raceId);
    if (!race) {
      res.status(404).json({ error: 'Carrera no encontrada' });
      return;
    }

    const estadoAnterior = race.estado;
    race.estado = estado;
    await race.save();

    await AuditLog.create({
      carrera: race._id,
      tipo: 'MODIFICACION',
      usuarioResponsable: adminId,
      descripcion: `Estado de la carrera '${race.nombre}' modificado a '${estado}'`,
      detalles: {
        cambios: [
          {
            campo: 'Estado de la carrera',
            valorAnterior: estadoAnterior,
            nuevoValor: estado,
          },
        ],
      },
      fecha: new Date(),
    });

    res.status(200).json({
      message: `La carrera ahora se encuentra en estado '${estado}'`,
      race,
    });
  } catch (error: any) {
    console.error('Error al actualizar estado de la carrera:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
