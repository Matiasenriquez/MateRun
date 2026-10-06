/**
 * ==============================================================================
 * GESTIÓN DE RESULTADOS DE CARRERAS (RaceResultsManagement.tsx) - MateRun
 * ==============================================================================
 * Vista exclusiva de SuperAdmin para:
 * 1. Marcar una carrera como "Finalizada" (o reabrir a "Activa").
 * 2. Visualizar datos preestablecidos de la carrera (Fecha, Carrera, Distancia).
 * 3. Registrar y editar los 3 primeros puestos de la clasificación general (1.º, 2.º, 3.º).
 * 4. Registrar y editar los ganadores por categoría de edad configurada.
 * 5. Cargar manualmente y editar los tiempos obtenidos por los corredores.
 * 6. Alimentar automáticamente la sección "Mis Datos" del perfil del corredor.
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { Race } from '../../types';
import {
  ArrowLeft,
  Trophy,
  Medal,
  Clock,
  Calendar,
  MapPin,
  Tag,
  Search,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Check,
  X,
  Flag,
  RotateCcw,
  History,
  Timer,
  FileSpreadsheet,
  Ban
} from 'lucide-react';

export type SexType = 'Masculino' | 'Femenino';

interface RegistrationItem {
  _id: string;
  corredor: {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    fotoPerfil?: string;
    sexo?: string;
  };
  dorsal: number;
  distancia: number;
  categoria?: string;
  estado: string;
  datosCorredor: {
    nombre: string;
    apellido: string;
    dni: string;
    sexo?: string;
  };
}

interface PodiumPosition {
  posicion: number;
  sexo: SexType;
  corredorId: string;
  registrationId?: string;
  dorsal?: number;
  nombre?: string;
  tiempo: string;
}

interface CategoryPodiumPosition {
  categoria: string;
  posicion: number; // 1, 2, 3
  sexo: SexType;
  corredorId: string;
  registrationId?: string;
  dorsal?: number;
  nombre?: string;
  tiempo: string;
}

/**
 * Helper: Determina de forma normalizada el sexo del corredor ('Masculino' o 'Femenino')
 */
export const getRunnerSex = (r: RegistrationItem): SexType => {
  const s = r.datosCorredor?.sexo || r.corredor?.sexo || '';
  const norm = String(s).toLowerCase();
  if (norm.includes('fem') || norm === 'mujer') return 'Femenino';
  return 'Masculino';
};

export const RaceResultsManagement: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();

  // Estados de datos
  const [race, setRace] = useState<Race | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<number>(10);
  const [selectedSex, setSelectedSex] = useState<SexType>('Masculino');
  const [tableSexFilter, setTableSexFilter] = useState<'Todos' | SexType>('Todos');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Mensajes de éxito y error
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Clasificación General (1.º, 2.º y 3.º puestos discriminados por sexo)
  const [podium, setPodium] = useState<Record<SexType, PodiumPosition[]>>({
    Masculino: [
      { posicion: 1, sexo: 'Masculino', corredorId: '', tiempo: '' },
      { posicion: 2, sexo: 'Masculino', corredorId: '', tiempo: '' },
      { posicion: 3, sexo: 'Masculino', corredorId: '', tiempo: '' },
    ],
    Femenino: [
      { posicion: 1, sexo: 'Femenino', corredorId: '', tiempo: '' },
      { posicion: 2, sexo: 'Femenino', corredorId: '', tiempo: '' },
      { posicion: 3, sexo: 'Femenino', corredorId: '', tiempo: '' },
    ],
  });

  // Ganadores por Categoría de Edad: mapa sexo -> categoria -> 3 puestos (1.º, 2.º y 3.º)
  const [categoryWinners, setCategoryWinners] = useState<
    Record<SexType, Record<string, CategoryPodiumPosition[]>>
  >({
    Masculino: {},
    Femenino: {},
  });

  // Tiempos individuales de corredores: mapa registrationId -> tiempo string (HH:MM:SS)
  const [runnerTimes, setRunnerTimes] = useState<Record<string, string>>({});

  // Corredores registrados como Descalificados: mapa registrationId -> boolean
  const [disqualifiedRunners, setDisqualifiedRunners] = useState<Record<string, boolean>>({});

  // Buscador para la tabla de corredores
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal para confirmar finalización de la carrera
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  /**
   * Carga los datos de la carrera, inscriptos y resultados de la distancia seleccionada
   */
  const fetchResultsData = async (dist?: number) => {
    if (!raceId) return;

    try {
      setIsLoading(true);
      setErrorNotice(null);

      const url = dist
        ? `/results/race/${raceId}?distancia=${dist}`
        : `/results/race/${raceId}`;

      const res = await api.get(url);
      const raceData: Race = res.data.race;
      const regs: RegistrationItem[] = res.data.registrations || [];
      const currentDist: number = res.data.selectedDistance || (raceData.distancias?.[0] ?? 10);
      const existingResults = res.data.results;

      setRace(raceData);
      setRegistrations(regs);
      setSelectedDistance(currentDist);

      // Cargar Clasificación General (1.º, 2.º, 3.º por cada sexo)
      const initialPodium: Record<SexType, PodiumPosition[]> = {
        Masculino: [
          { posicion: 1, sexo: 'Masculino', corredorId: '', tiempo: '' },
          { posicion: 2, sexo: 'Masculino', corredorId: '', tiempo: '' },
          { posicion: 3, sexo: 'Masculino', corredorId: '', tiempo: '' },
        ],
        Femenino: [
          { posicion: 1, sexo: 'Femenino', corredorId: '', tiempo: '' },
          { posicion: 2, sexo: 'Femenino', corredorId: '', tiempo: '' },
          { posicion: 3, sexo: 'Femenino', corredorId: '', tiempo: '' },
        ],
      };

      if (existingResults?.clasificacionGeneral && Array.isArray(existingResults.clasificacionGeneral)) {
        for (const p of existingResults.clasificacionGeneral) {
          const pReg = regs.find(
            (r) => String(r._id) === String(p.registrationId) || String(r.corredor?._id) === String(p.corredor)
          );
          const pSex: SexType =
            p.sexo === 'Femenino' || p.sexo === 'Mujer' || (pReg && getRunnerSex(pReg) === 'Femenino')
              ? 'Femenino'
              : 'Masculino';

          const targetList = initialPodium[pSex];
          const idx = targetList.findIndex((pos) => pos.posicion === p.posicion);
          if (idx !== -1) {
            targetList[idx] = {
              posicion: p.posicion,
              sexo: pSex,
              corredorId: p.corredor ? String(p.corredor) : '',
              registrationId: p.registrationId ? String(p.registrationId) : undefined,
              dorsal: p.dorsal,
              nombre: p.nombre,
              tiempo: p.tiempo || '',
            };
          }
        }
      }
      setPodium(initialPodium);

      // Cargar Ganadores por Categoría (1.º, 2.º y 3.º por categoría y por sexo)
      const catMap: Record<SexType, Record<string, CategoryPodiumPosition[]>> = {
        Masculino: {},
        Femenino: {},
      };
      const configuredCategories = raceData.categorias || [];

      for (const cat of configuredCategories) {
        catMap.Masculino[cat.nombre] = [
          { categoria: cat.nombre, posicion: 1, sexo: 'Masculino', corredorId: '', tiempo: '' },
          { categoria: cat.nombre, posicion: 2, sexo: 'Masculino', corredorId: '', tiempo: '' },
          { categoria: cat.nombre, posicion: 3, sexo: 'Masculino', corredorId: '', tiempo: '' },
        ];
        catMap.Femenino[cat.nombre] = [
          { categoria: cat.nombre, posicion: 1, sexo: 'Femenino', corredorId: '', tiempo: '' },
          { categoria: cat.nombre, posicion: 2, sexo: 'Femenino', corredorId: '', tiempo: '' },
          { categoria: cat.nombre, posicion: 3, sexo: 'Femenino', corredorId: '', tiempo: '' },
        ];
      }

      if (existingResults?.ganadoresCategorias && Array.isArray(existingResults.ganadoresCategorias)) {
        for (const gw of existingResults.ganadoresCategorias) {
          const gwReg = regs.find(
            (r) => String(r._id) === String(gw.registrationId) || String(r.corredor?._id) === String(gw.corredor)
          );
          const gwSex: SexType =
            gw.sexo === 'Femenino' || gw.sexo === 'Mujer' || (gwReg && getRunnerSex(gwReg) === 'Femenino')
              ? 'Femenino'
              : 'Masculino';

          const list = catMap[gwSex]?.[gw.categoria];
          if (list) {
            const pos = Number(gw.posicion) || 1;
            const targetIdx = list.findIndex((p) => p.posicion === pos);
            if (targetIdx !== -1) {
              list[targetIdx] = {
                categoria: gw.categoria,
                posicion: pos,
                sexo: gwSex,
                corredorId: gw.corredor ? String(gw.corredor) : '',
                registrationId: gw.registrationId ? String(gw.registrationId) : undefined,
                dorsal: gw.dorsal,
                nombre: gw.nombre,
                tiempo: gw.tiempo || '',
              };
            }
          }
        }
      }
      setCategoryWinners(catMap);

      // Cargar Tiempos de Corredores y Estado de Descalificación
      const timesMap: Record<string, string> = {};
      const dqMap: Record<string, boolean> = {};
      if (existingResults?.tiemposCorredores && Array.isArray(existingResults.tiemposCorredores)) {
        for (const t of existingResults.tiemposCorredores) {
          if (t.registrationId) {
            timesMap[String(t.registrationId)] = t.tiempo || '';
            if (t.descalificado) {
              dqMap[String(t.registrationId)] = true;
            }
          }
        }
      }
      setRunnerTimes(timesMap);
      setDisqualifiedRunners(dqMap);
    } catch (err: any) {
      console.error('Error al cargar resultados de la carrera:', err);
      setErrorNotice(
        err.response?.data?.message || 'No se pudieron cargar los datos de resultados de la carrera.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResultsData();
  }, [raceId]);

  /**
   * Cambia la distancia seleccionada y recarga los resultados correspondientes
   */
  const handleSelectDistance = (dist: number) => {
    setSelectedDistance(dist);
    fetchResultsData(dist);
  };

  /**
   * Formateador de fechas legible
   */
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return String(dateString);
    }
  };

  /**
   * Filtrado de corredores para la distancia seleccionada
   */
  const runnersForDistance = useMemo(() => {
    return registrations.filter((r) => r.distancia === selectedDistance);
  }, [registrations, selectedDistance]);

  /**
   * Corredores de la distancia que coinciden con el sexo seleccionado para premiación
   */
  const runnersForDistanceAndSex = useMemo(() => {
    return runnersForDistance.filter((r) => getRunnerSex(r) === selectedSex);
  }, [runnersForDistance, selectedSex]);

  /**
   * Corredores filtrados por el buscador y filtro de sexo en la nómina
   */
  const filteredRunners = useMemo(() => {
    let list = runnersForDistance;
    if (tableSexFilter !== 'Todos') {
      list = list.filter((r) => getRunnerSex(r) === tableSexFilter);
    }
    const term = searchTerm.toLowerCase().trim();
    if (!term) return list;

    return list.filter((r) => {
      const nombre = `${r.datosCorredor?.nombre || ''} ${r.datosCorredor?.apellido || ''}`.toLowerCase();
      const dni = String(r.datosCorredor?.dni || '').toLowerCase();
      const dorsal = String(r.dorsal || '');
      return nombre.includes(term) || dni.includes(term) || dorsal.includes(term);
    });
  }, [runnersForDistance, tableSexFilter, searchTerm]);

  /**
   * Helper: Asigna un corredor a una posición del podio (1.º, 2.º o 3.º) del sexo seleccionado
   */
  const handleSelectPodiumRunner = (pos: number, regId: string) => {
    const selectedReg = runnersForDistanceAndSex.find((r) => r._id === regId);

    setPodium((prev) => {
      const list = prev[selectedSex] || [];
      const updatedList = list.map((item) => {
        if (item.posicion === pos) {
          if (!regId) {
            return { ...item, corredorId: '', registrationId: undefined, dorsal: undefined, nombre: '' };
          }
          const regTime = runnerTimes[regId] || item.tiempo || '';
          return {
            ...item,
            sexo: selectedSex,
            corredorId: selectedReg?.corredor?._id || '',
            registrationId: regId,
            dorsal: selectedReg?.dorsal,
            nombre: `${selectedReg?.datosCorredor?.nombre || ''} ${selectedReg?.datosCorredor?.apellido || ''}`.trim(),
            tiempo: regTime,
          };
        }
        return item;
      });

      return {
        ...prev,
        [selectedSex]: updatedList,
      };
    });

    // Si el corredor ya tiene un tiempo en el podio y no en la tabla, sincronizar
    if (regId && !runnerTimes[regId]) {
      const existingPodiumTime = podium[selectedSex]?.find((p) => p.posicion === pos)?.tiempo;
      if (existingPodiumTime) {
        setRunnerTimes((prev) => ({ ...prev, [regId]: existingPodiumTime }));
      }
    }
  };

  /**
   * Helper: Modifica el tiempo de una posición del podio del sexo seleccionado
   */
  const handlePodiumTimeChange = (pos: number, timeVal: string) => {
    setPodium((prev) => {
      const list = prev[selectedSex] || [];
      const updatedList = list.map((item) => {
        if (item.posicion === pos) {
          return { ...item, tiempo: timeVal };
        }
        return item;
      });

      return {
        ...prev,
        [selectedSex]: updatedList,
      };
    });

    // Sincronizar con el mapa de tiempos si el corredor está seleccionado
    const currentItem = podium[selectedSex]?.find((p) => p.posicion === pos);
    if (currentItem?.registrationId) {
      setRunnerTimes((prev) => ({
        ...prev,
        [currentItem.registrationId!]: timeVal,
      }));
    }
  };

  /**
   * Helper: Asigna un corredor a un puesto de una categoría de edad (1.º, 2.º o 3.º) del sexo seleccionado
   */
  const handleSelectCategoryWinner = (catName: string, pos: number, regId: string) => {
    const selectedReg = runnersForDistanceAndSex.find((r) => r._id === regId);

    setCategoryWinners((prev) => {
      const sexMap = prev[selectedSex] || {};
      const currentList = sexMap[catName] || [
        { categoria: catName, posicion: 1, sexo: selectedSex, corredorId: '', tiempo: '' },
        { categoria: catName, posicion: 2, sexo: selectedSex, corredorId: '', tiempo: '' },
        { categoria: catName, posicion: 3, sexo: selectedSex, corredorId: '', tiempo: '' },
      ];

      const updatedList = currentList.map((item) => {
        if (item.posicion === pos) {
          if (!regId) {
            return { ...item, corredorId: '', registrationId: undefined, dorsal: undefined, nombre: '' };
          }
          const regTime = runnerTimes[regId] || item.tiempo || '';
          return {
            ...item,
            sexo: selectedSex,
            corredorId: selectedReg?.corredor?._id || '',
            registrationId: regId,
            dorsal: selectedReg?.dorsal,
            nombre: `${selectedReg?.datosCorredor?.nombre || ''} ${selectedReg?.datosCorredor?.apellido || ''}`.trim(),
            tiempo: regTime,
          };
        }
        return item;
      });

      return {
        ...prev,
        [selectedSex]: {
          ...sexMap,
          [catName]: updatedList,
        },
      };
    });

    if (regId && !runnerTimes[regId]) {
      const existingTime = categoryWinners[selectedSex]?.[catName]?.find((p) => p.posicion === pos)?.tiempo;
      if (existingTime) {
        setRunnerTimes((prev) => ({ ...prev, [regId]: existingTime }));
      }
    }
  };

  /**
   * Helper: Modifica el tiempo de un puesto de categoría de edad del sexo seleccionado
   */
  const handleCategoryWinnerTimeChange = (catName: string, pos: number, timeVal: string) => {
    setCategoryWinners((prev) => {
      const sexMap = prev[selectedSex] || {};
      const currentList = sexMap[catName] || [];
      const updatedList = currentList.map((item) => {
        if (item.posicion === pos) {
          return { ...item, tiempo: timeVal };
        }
        return item;
      });

      return {
        ...prev,
        [selectedSex]: {
          ...sexMap,
          [catName]: updatedList,
        },
      };
    });

    const currentWinner = categoryWinners[selectedSex]?.[catName]?.find((p) => p.posicion === pos);
    if (currentWinner?.registrationId) {
      setRunnerTimes((prev) => ({
        ...prev,
        [currentWinner.registrationId!]: timeVal,
      }));
    }
  };

  /**
   * Helper: Modifica el tiempo individual de un corredor en la tabla
   */
  const handleRunnerTimeChange = (regId: string, timeVal: string) => {
    setRunnerTimes((prev) => ({
      ...prev,
      [regId]: timeVal,
    }));

    // Sincronizar con podio en ambos sexos
    setPodium((prev) => {
      const next = { ...prev };
      for (const s of ['Masculino', 'Femenino'] as SexType[]) {
        next[s] = next[s].map((item) =>
          item.registrationId === regId ? { ...item, tiempo: timeVal } : item
        );
      }
      return next;
    });

    // Sincronizar con ganadores de categoría en ambos sexos
    setCategoryWinners((prev) => {
      const next = { ...prev };
      for (const s of ['Masculino', 'Femenino'] as SexType[]) {
        const sMap = { ...next[s] };
        for (const catKey of Object.keys(sMap)) {
          sMap[catKey] = sMap[catKey].map((p) =>
            p.registrationId === regId ? { ...p, tiempo: timeVal } : p
          );
        }
        next[s] = sMap;
      }
      return next;
    });
  };

  /**
   * Helper: Alterna el estado de descalificación de un corredor en los resultados
   */
  const handleToggleDisqualified = (regId: string) => {
    setDisqualifiedRunners((prev) => {
      const isCurrentlyDq = Boolean(prev[regId]);
      const nextState = !isCurrentlyDq;

      // Si se descalifica al corredor, también removerlo del podio y de ganadores de categoría si estaba asignado
      if (nextState) {
        setPodium((prevPod) => {
          const next = { ...prevPod };
          for (const s of ['Masculino', 'Femenino'] as SexType[]) {
            next[s] = next[s].map((p) =>
              p.registrationId === regId
                ? { ...p, corredorId: '', registrationId: undefined, dorsal: undefined, nombre: '', tiempo: '' }
                : p
            );
          }
          return next;
        });

        setCategoryWinners((prevCatWinners) => {
          const next = { ...prevCatWinners };
          for (const s of ['Masculino', 'Femenino'] as SexType[]) {
            const sMap = { ...next[s] };
            for (const catKey of Object.keys(sMap)) {
              sMap[catKey] = sMap[catKey].map((p) =>
                p.registrationId === regId
                  ? { ...p, corredorId: '', registrationId: undefined, dorsal: undefined, nombre: '', tiempo: '' }
                  : p
              );
            }
            next[s] = sMap;
          }
          return next;
        });
      }

      return {
        ...prev,
        [regId]: nextState,
      };
    });
  };

  /**
   * Guardar Resultados completos de la carrera y distancia seleccionada
   */
  const handleSaveResults = async () => {
    if (!raceId) return;

    try {
      setIsSaving(true);
      setErrorNotice(null);
      setSuccessNotice(null);

      // Preparar payload de podio general de ambos sexos
      const clasificacionGeneralPayload: any[] = [];
      for (const s of ['Masculino', 'Femenino'] as SexType[]) {
        for (const p of podium[s]) {
          if (p.corredorId && !disqualifiedRunners[p.registrationId || '']) {
            clasificacionGeneralPayload.push({
              posicion: p.posicion,
              sexo: p.sexo,
              corredor: p.corredorId,
              registrationId: p.registrationId,
              dorsal: p.dorsal,
              nombre: p.nombre,
              tiempo: p.tiempo.trim(),
            });
          }
        }
      }

      // Preparar payload de ganadores por categoría de ambos sexos
      const ganadoresCategoriasPayload: any[] = [];
      for (const s of ['Masculino', 'Femenino'] as SexType[]) {
        for (const positions of Object.values(categoryWinners[s] || {})) {
          for (const gw of positions) {
            if (gw.corredorId && !disqualifiedRunners[gw.registrationId || '']) {
              ganadoresCategoriasPayload.push({
                categoria: gw.categoria,
                posicion: gw.posicion,
                sexo: gw.sexo,
                corredor: gw.corredorId,
                registrationId: gw.registrationId,
                dorsal: gw.dorsal,
                nombre: gw.nombre,
                tiempo: gw.tiempo.trim(),
              });
            }
          }
        }
      }

      // Preparar payload de tiempos de todos los corredores
      const tiemposCorredoresPayload = runnersForDistance.map((reg) => {
        const isDq = Boolean(disqualifiedRunners[reg._id]);
        const timeStr = runnerTimes[reg._id] || '';
        const runnerSex = getRunnerSex(reg);

        // Verificar si tiene posición en el podio general de su sexo
        const podEntry = isDq ? null : podium[runnerSex]?.find((p) => p.registrationId === reg._id && p.corredorId);
        const posGen = podEntry ? podEntry.posicion : null;
        const posSexo = podEntry ? podEntry.posicion : null;

        // Verificar si tiene posición en su categoría de edad de su sexo
        let posCat: number | null = null;
        if (!isDq) {
          const catMapForSex = categoryWinners[runnerSex] || {};
          for (const positions of Object.values(catMapForSex)) {
            const match = positions.find((p) => p.registrationId === reg._id && p.corredorId);
            if (match) {
              posCat = match.posicion;
              break;
            }
          }
        }

        return {
          corredor: reg.corredor?._id,
          registrationId: reg._id,
          dorsal: reg.dorsal,
          nombre: `${reg.datosCorredor?.nombre || ''} ${reg.datosCorredor?.apellido || ''}`.trim(),
          categoria: reg.categoria || '',
          sexo: runnerSex,
          distancia: selectedDistance,
          tiempo: isDq ? 'Descalificado' : timeStr.trim(),
          posicionGeneral: posGen,
          posicionSexo: posSexo,
          posicionCategoria: posCat,
          descalificado: isDq,
        };
      });

      const payload = {
        distancia: selectedDistance,
        estadoCarrera: race?.estado,
        clasificacionGeneral: clasificacionGeneralPayload,
        ganadoresCategorias: ganadoresCategoriasPayload,
        tiemposCorredores: tiemposCorredoresPayload,
      };

      const res = await api.post(`/results/race/${raceId}`, payload);

      setSuccessNotice(
        `¡Resultados oficiales y premiación de ${selectedDistance}k guardados exitosamente! Los corredores ya pueden consultar su rendimiento en "Mis Datos".`
      );
      if (res.data.race) {
        setRace(res.data.race);
      }
    } catch (err: any) {
      console.error('Error al guardar resultados:', err);
      setErrorNotice(
        err.response?.data?.message || 'Ocurrió un error al guardar los resultados. Intente nuevamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cambiar estado de la carrera a "Finalizada" (o volver a "Activa")
   */
  const handleToggleRaceStatus = async (newStatus: 'activa' | 'finalizada') => {
    if (!raceId) return;

    try {
      setIsUpdatingStatus(true);
      setErrorNotice(null);

      const res = await api.put(`/results/race/${raceId}/status`, { estado: newStatus });

      if (res.data.race) {
        setRace(res.data.race);
      }

      setShowFinalizeModal(false);
      setSuccessNotice(
        newStatus === 'finalizada'
          ? 'La carrera ha sido marcada como "Finalizada". Ya no está disponible para inscripciones y sus resultados oficiales quedaron publicados para los corredores.'
          : 'La carrera ha sido restablecida al estado "Activa".'
      );
    } catch (err: any) {
      console.error('Error al actualizar estado de la carrera:', err);
      setErrorNotice(
        err.response?.data?.message || 'No se pudo actualizar el estado de la carrera.'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* ========================================================================= */}
      {/* BARRA SUPERIOR DE NAVEGACIÓN                                              */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/admin/race-roster/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Volver a la nómina de inscriptos"
          >
            <ArrowLeft className="w-4 h-4 text-machine" />
            <span>Nómina de Inscriptos</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/admin/race-history/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Ver historial de la carrera"
          >
            <History className="w-4 h-4 text-machine" />
            <span>Historial</span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/admin/race-reports/${raceId}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="Ver informes de inscriptos por distancia, categoría y sexo"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Informes</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Volver al panel principal"
          >
            <span>Panel de Control</span>
          </button>
        </div>

        {/* Botón Guardar en la cabecera */}
        <button
          type="button"
          onClick={handleSaveResults}
          disabled={isSaving || isLoading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-machine hover:bg-machine-dark text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-60"
        >
          <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
          <span>{isSaving ? 'Guardando...' : 'Guardar Resultados'}</span>
        </button>
      </div>

      {/* AVISOS DE ÉXITO O ERROR */}
      {successNotice && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-500 hover:text-emerald-800 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-rose-500 hover:text-rose-800 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DATOS PREESTABLECIDOS Y CONTROL DE ESTADO DE LA CARRERA                */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse flex items-center justify-between">
          <div className="h-6 w-64 bg-slate-200 rounded"></div>
          <div className="h-8 w-32 bg-slate-200 rounded"></div>
        </div>
      ) : race ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-0.5 rounded">
                <Trophy className="w-3.5 h-3.5" />
                Gestión de Resultados Oficiales
              </span>

              {/* Badge de Estado Oficial de la Carrera */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider border ${
                  race.estado === 'finalizada'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : race.estado === 'activa'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {race.estado === 'finalizada' && <Check className="w-3 h-3 text-blue-600" />}
                {race.estado === 'activa' && <Flag className="w-3 h-3 text-emerald-600" />}
                Carrera {race.estado}
              </span>
            </div>

            {/* Nombre de la Carrera Preestablecido */}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              {race.nombre}
            </h1>

            {/* Datos preestablecidos de la carrera */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1 font-medium">
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                <Calendar className="w-4 h-4 text-machine" />
                <span>Fecha: <strong>{formatDate(race.fecha)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Lugar: <strong>{race.lugar || 'Circuito Oficial'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Inscriptos en {selectedDistance}k: <strong>{runnersForDistance.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Selector de Estado "Finalizada" / "Activa" */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 shrink-0">
            {race.estado !== 'finalizada' ? (
              <button
                type="button"
                onClick={() => setShowFinalizeModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                title="Cambiar estado a Finalizada y publicar resultados"
              >
                <Check className="w-4 h-4" />
                <span>Marcar como “Finalizada”</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleRaceStatus('activa')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
                title="Reabrir la carrera como activa"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
                <span>Reabrir a “Activa”</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* SELECTOR DE DISTANCIAS PREESTABLECIDAS DE LA CARRERA                      */}
      {/* ========================================================================= */}
      {race && race.distancias && race.distancias.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-machine" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Distancia a Gestionar:
            </span>
          </div>

          <div className="flex items-center gap-2">
            {race.distancias.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleSelectDistance(d)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  selectedDistance === d
                    ? 'bg-machine text-white border-machine shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {d} Kilómetros ({d}k)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN: PREMIACIÓN POR SEXO                                              */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-machine" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Premiación por sexo
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Selecciona el sexo para gestionar los ganadores de la clasificación general y categorías de edad en {selectedDistance}k.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {(['Masculino', 'Femenino'] as SexType[]).map((sex) => {
            const count = runnersForDistance.filter((r) => getRunnerSex(r) === sex).length;
            const isSelected = selectedSex === sex;
            return (
              <button
                key={sex}
                type="button"
                onClick={() => setSelectedSex(sex)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  isSelected
                    ? sex === 'Masculino'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/20'
                      : 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-sm">{sex === 'Masculino' ? '👨' : '👩'}</span>
                <span>{sex}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count} inscriptos
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CLASIFICACIÓN GENERAL (PODIO 1.º, 2.º Y 3.º PUESTOS POR SEXO)          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Clasificación General — Rama {selectedSex} ({selectedDistance}k)
                </h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedSex === 'Masculino'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {selectedSex}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Selecciona a los corredores {selectedSex === 'Masculino' ? 'masculinos' : 'femeninos'} que obtuvieron los tres primeros puestos y carga su tiempo oficial.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Tarjetas de Podio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(podium[selectedSex] || []).map((pod) => {
            const isFirst = pod.posicion === 1;
            const isSecond = pod.posicion === 2;

            return (
              <div
                key={pod.posicion}
                className={`rounded-2xl border p-5 space-y-4 transition-all ${
                  isFirst
                    ? 'border-amber-300 bg-gradient-to-b from-amber-50/60 to-white'
                    : isSecond
                    ? 'border-slate-300 bg-gradient-to-b from-slate-50/80 to-white'
                    : 'border-orange-300 bg-gradient-to-b from-orange-50/50 to-white'
                }`}
              >
                {/* Cabecera del puesto */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl select-none leading-none">
                      {isFirst ? '🥇' : isSecond ? '🥈' : '🥉'}
                    </span>
                    <span className="font-black text-sm uppercase tracking-wider text-slate-800">
                      {pod.posicion}.º Puesto {selectedSex}
                    </span>
                  </div>

                  {pod.registrationId && (
                    <button
                      type="button"
                      onClick={() => handleSelectPodiumRunner(pod.posicion, '')}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Quitar corredor del puesto"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Selector de Corredor */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Corredor Ganador ({selectedSex})
                  </label>
                  <select
                    value={pod.registrationId || ''}
                    onChange={(e) => handleSelectPodiumRunner(pod.posicion, e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all"
                  >
                    <option value="">-- Seleccionar Corredor ({selectedSex}) --</option>
                    {runnersForDistanceAndSex.map((r) => {
                      const isDq = Boolean(disqualifiedRunners[r._id]);
                      const otherPodPos = (podium[selectedSex] || []).find(
                        (p) => p.posicion !== pod.posicion && p.registrationId === r._id
                      );
                      return (
                        <option key={r._id} value={r._id} disabled={isDq || Boolean(otherPodPos)}>
                          [Dorsal #{r.dorsal}] {r.datosCorredor?.nombre} {r.datosCorredor?.apellido}{' '}
                          {isDq ? '(DESCALIFICADO)' : otherPodPos ? `(En ${otherPodPos.posicion}.º puesto)` : `(DNI ${r.datosCorredor?.dni})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Input de Tiempo */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>Tiempo Oficial</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">hh:mm:ss</span>
                  </label>
                  <div className="relative">
                    <Timer className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={pod.tiempo}
                      onChange={(e) => handlePodiumTimeChange(pod.posicion, e.target.value)}
                      placeholder="00:00:00"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    />
                  </div>
                </div>

                {/* Resumen del corredor seleccionado */}
                {pod.registrationId && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>Dorsal #{pod.dorsal}</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Asignado
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. GANADORES POR CATEGORÍA DE EDAD (1.º, 2.º Y 3.º PUESTOS POR SEXO)      */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/80">
              <Medal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                  Ganadores por Categoría de Edad — Rama {selectedSex} ({selectedDistance}k)
                </h2>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                    selectedSex === 'Masculino'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {selectedSex}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Registra los tres corredores ganadores {selectedSex === 'Masculino' ? 'masculinos' : 'femeninos'} (1.º, 2.º y 3.º puesto) con sus tiempos oficiales para cada categoría etaria configurada.
              </p>
            </div>
          </div>
        </div>

        {/* Lista de categorías configuradas */}
        {(!race?.categorias || race.categorias.length === 0) ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm font-bold text-slate-600">No hay categorías etarias configuradas para esta carrera.</p>
            <p className="text-xs text-slate-400 mt-1">
              Puedes configurarlas desde el panel de "Gestión de Carreras".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {race.categorias.map((cat, idx) => {
              const positions = categoryWinners[selectedSex]?.[cat.nombre] || [
                { categoria: cat.nombre, posicion: 1, sexo: selectedSex, corredorId: '', tiempo: '' },
                { categoria: cat.nombre, posicion: 2, sexo: selectedSex, corredorId: '', tiempo: '' },
                { categoria: cat.nombre, posicion: 3, sexo: selectedSex, corredorId: '', tiempo: '' },
              ];

              // Corredores que pertenecen a esta categoría y al sexo seleccionado
              const runnersInCatAndSex = runnersForDistanceAndSex.filter(
                (r) => r.categoria === cat.nombre
              );
              const otherRunnersInSex = runnersForDistanceAndSex.filter(
                (r) => r.categoria !== cat.nombre
              );

              const assignedCount = positions.filter((p) => p.corredorId).length;

              return (
                <div
                  key={idx}
                  className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                          {cat.nombre}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                        Rango: {cat.edadMinima} a {cat.edadMaxima} años • ({runnersInCatAndSex.length} {selectedSex.toLowerCase()}s inscriptos)
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        assignedCount === 3
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : assignedCount > 0
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {assignedCount}/3 cargados
                    </span>
                  </div>

                  {/* Tabla estructurada: Puesto | Corredor | Tiempo */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2.5 w-24">Puesto</th>
                          <th className="px-3.5 py-2.5">Corredor ({selectedSex})</th>
                          <th className="px-3.5 py-2.5 w-36">Tiempo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {positions.map((posItem) => {
                          const isFirst = posItem.posicion === 1;
                          const isSecond = posItem.posicion === 2;
                          const medal = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                          const puestoName = `${posItem.posicion}.º`;

                          return (
                            <tr key={posItem.posicion} className="hover:bg-slate-50/50 transition-colors">
                              {/* Columna: Puesto */}
                              <td className="px-3.5 py-3 align-middle font-bold text-slate-800 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base select-none leading-none">{medal}</span>
                                  <span className="font-extrabold text-xs">{puestoName}</span>
                                </div>
                              </td>

                              {/* Columna: Corredor */}
                              <td className="px-3.5 py-3 align-middle">
                                <div className="space-y-1">
                                  <select
                                    value={posItem.registrationId || ''}
                                    onChange={(e) =>
                                      handleSelectCategoryWinner(cat.nombre, posItem.posicion, e.target.value)
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all"
                                  >
                                    <option value="">-- Seleccionar Corredor ({selectedSex}) --</option>
                                    {runnersInCatAndSex.length > 0 && (
                                      <optgroup label={`Corredores ${selectedSex.toLowerCase()}s de la categoría`}>
                                        {runnersInCatAndSex.map((r) => {
                                          const isDq = Boolean(disqualifiedRunners[r._id]);
                                          const otherPos = positions.find(
                                            (p) => p.posicion !== posItem.posicion && p.registrationId === r._id
                                          );
                                          return (
                                            <option key={r._id} value={r._id} disabled={isDq || Boolean(otherPos)}>
                                              [Dorsal #{r.dorsal}] {r.datosCorredor?.nombre} {r.datosCorredor?.apellido}{' '}
                                              {isDq ? '(DESCALIFICADO)' : otherPos ? `(En ${otherPos.posicion}.º puesto)` : ''}
                                            </option>
                                          );
                                        })}
                                      </optgroup>
                                    )}
                                    {otherRunnersInSex.length > 0 && (
                                      <optgroup label={`Otros corredores ${selectedSex.toLowerCase()}s de la distancia`}>
                                        {otherRunnersInSex.map((r) => {
                                          const isDq = Boolean(disqualifiedRunners[r._id]);
                                          const otherPos = positions.find(
                                            (p) => p.posicion !== posItem.posicion && p.registrationId === r._id
                                          );
                                          return (
                                            <option key={r._id} value={r._id} disabled={isDq || Boolean(otherPos)}>
                                              [Dorsal #{r.dorsal}] {r.datosCorredor?.nombre} {r.datosCorredor?.apellido} (
                                              {r.categoria || 'Sin cat.'}){' '}
                                              {isDq ? '(DESCALIFICADO)' : otherPos ? `(En ${otherPos.posicion}.º puesto)` : ''}
                                            </option>
                                          );
                                        })}
                                      </optgroup>
                                    )}
                                  </select>

                                  {posItem.registrationId && (
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1">
                                      <span>Dorsal #{posItem.dorsal}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectCategoryWinner(cat.nombre, posItem.posicion, '')}
                                        className="text-rose-600 hover:underline font-bold cursor-pointer"
                                        title="Quitar corredor del puesto"
                                      >
                                        Limpiar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* Columna: Tiempo */}
                              <td className="px-3.5 py-3 align-middle">
                                <div className="relative">
                                  <Timer className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  <input
                                    type="text"
                                    value={posItem.tiempo}
                                    onChange={(e) =>
                                      handleCategoryWinnerTimeChange(cat.nombre, posItem.posicion, e.target.value)
                                    }
                                    placeholder="00:00:00"
                                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                                    title="Tiempo oficial del corredor"
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. TABLERO DE PREMIACIÓN FINAL DE LA CARRERA                              */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  Tablero de Premiación Final
                </h2>
                <span className="text-xs text-slate-400 font-medium">
                  Distancia Oficial: <strong className="text-machine-light">{selectedDistance}k</strong> • Cuadro Oficial de Ganadores
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 font-semibold">
              {runnersForDistance.length} corredores inscriptos
            </div>
          </div>
        </div>

        {/* Comparativa por Sexo en Dos Columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Columna Masculina */}
          <div className="bg-slate-800/60 rounded-2xl border border-blue-500/30 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👨</span>
                <h3 className="font-black text-sm uppercase tracking-wider text-blue-400">
                  Premiación Masculina — {selectedDistance}k
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSex('Masculino')}
                className="text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
              >
                Editar Masculino →
              </button>
            </div>

            {/* Podio General Masculino */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Podio Clasificación General
              </span>
              <div className="space-y-2">
                {podium.Masculino.map((p) => {
                  const medal = p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : '🥉';
                  return (
                    <div
                      key={p.posicion}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base select-none">{medal}</span>
                        <span className="font-extrabold text-slate-300 whitespace-nowrap">{p.posicion}.º</span>
                        {p.nombre ? (
                          <div className="truncate">
                            <span className="font-bold text-white truncate">{p.nombre}</span>
                            {p.dorsal !== undefined && (
                              <span className="text-blue-400 font-bold ml-1.5 text-[11px]">#{p.dorsal}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sin asignar</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-300 shrink-0 ml-2">
                        {p.tiempo || '--:--:--'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ganadores por Categoría Masculinos */}
            {race?.categorias && race.categorias.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Podios por Categoría de Edad
                </span>
                <div className="space-y-3">
                  {race.categorias.map((cat) => {
                    const catPositions = categoryWinners.Masculino?.[cat.nombre] || [];
                    return (
                      <div key={cat.nombre} className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/40 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                          <span>{cat.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {cat.edadMinima} a {cat.edadMaxima} años
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                          {[1, 2, 3].map((pos) => {
                            const match = catPositions.find((cp) => cp.posicion === pos);
                            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
                            return (
                              <div key={pos} className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex flex-col justify-between">
                                <div className="flex items-center gap-1 font-bold text-slate-300">
                                  <span>{medal}</span>
                                  <span>{pos}.º</span>
                                </div>
                                {match?.nombre ? (
                                  <div className="truncate mt-0.5">
                                    <span className="text-white font-medium text-[11px] block truncate">{match.nombre}</span>
                                    <span className="font-mono text-[10px] text-blue-400">{match.tiempo || 's/t'}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic text-[10px] mt-0.5">-</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Columna Femenina */}
          <div className="bg-slate-800/60 rounded-2xl border border-rose-500/30 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👩</span>
                <h3 className="font-black text-sm uppercase tracking-wider text-rose-400">
                  Premiación Femenina — {selectedDistance}k
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSex('Femenino')}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
              >
                Editar Femenino →
              </button>
            </div>

            {/* Podio General Femenino */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Podio Clasificación General
              </span>
              <div className="space-y-2">
                {podium.Femenino.map((p) => {
                  const medal = p.posicion === 1 ? '🥇' : p.posicion === 2 ? '🥈' : '🥉';
                  return (
                    <div
                      key={p.posicion}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base select-none">{medal}</span>
                        <span className="font-extrabold text-slate-300 whitespace-nowrap">{p.posicion}.º</span>
                        {p.nombre ? (
                          <div className="truncate">
                            <span className="font-bold text-white truncate">{p.nombre}</span>
                            {p.dorsal !== undefined && (
                              <span className="text-rose-400 font-bold ml-1.5 text-[11px]">#{p.dorsal}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sin asignar</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-300 shrink-0 ml-2">
                        {p.tiempo || '--:--:--'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ganadores por Categoría Femeninos */}
            {race?.categorias && race.categorias.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Podios por Categoría de Edad
                </span>
                <div className="space-y-3">
                  {race.categorias.map((cat) => {
                    const catPositions = categoryWinners.Femenino?.[cat.nombre] || [];
                    return (
                      <div key={cat.nombre} className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/40 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                          <span>{cat.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {cat.edadMinima} a {cat.edadMaxima} años
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                          {[1, 2, 3].map((pos) => {
                            const match = catPositions.find((cp) => cp.posicion === pos);
                            const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉';
                            return (
                              <div key={pos} className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 flex flex-col justify-between">
                                <div className="flex items-center gap-1 font-bold text-slate-300">
                                  <span>{medal}</span>
                                  <span>{pos}.º</span>
                                </div>
                                {match?.nombre ? (
                                  <div className="truncate mt-0.5">
                                    <span className="text-white font-medium text-[11px] block truncate">{match.nombre}</span>
                                    <span className="font-mono text-[10px] text-rose-400">{match.tiempo || 's/t'}</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic text-[10px] mt-0.5">-</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CARGA Y EDICIÓN DE TIEMPOS DE TODOS LOS CORREDORES                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-machine" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Nómina de Corredores y Edición de Tiempos — {selectedDistance}k
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingresa o edita el tiempo individual obtenido por cada corredor. Se asocia directamente a sus métricas en "Mis Datos".
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filtro por sexo en la tabla */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              {(['Todos', 'Masculino', 'Femenino'] as const).map((filterVal) => {
                const isSel = tableSexFilter === filterVal;
                const count = filterVal === 'Todos'
                  ? runnersForDistance.length
                  : runnersForDistance.filter((r) => getRunnerSex(r) === filterVal).length;
                return (
                  <button
                    key={filterVal}
                    type="button"
                    onClick={() => setTableSexFilter(filterVal)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSel
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {filterVal === 'Masculino' ? '👨 ' : filterVal === 'Femenino' ? '👩 ' : ''}
                    {filterVal} ({count})
                  </button>
                );
              })}
            </div>

            {/* Buscador de corredores */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar corredor, DNI o dorsal..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Corredores */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 w-24 text-center">Dorsal</th>
                <th className="px-5 py-4">Corredor</th>
                <th className="px-5 py-4 w-28 text-center">DNI</th>
                <th className="px-5 py-4 w-32 text-center">Sexo</th>
                <th className="px-5 py-4 w-40">Categoría</th>
                <th className="px-5 py-4 w-44 text-center">Distinción</th>
                <th className="px-5 py-4 w-36 text-center">Estado</th>
                <th className="px-5 py-4 w-56 text-center">Edición de Tiempos (HH:MM:SS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRunners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-slate-600">No se encontraron corredores inscriptos en {selectedDistance}k</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm.trim() ? 'Prueba con otro término de búsqueda.' : 'No hay inscripciones activas para esta distancia con el filtro actual.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRunners.map((runner) => {
                  const currentRunnerTime = runnerTimes[runner._id] || '';
                  const isDq = Boolean(disqualifiedRunners[runner._id]);
                  const runnerSex = getRunnerSex(runner);

                  // ¿Tiene puesto en el podio general de su sexo?
                  const podEntry = isDq
                    ? null
                    : podium.Masculino.find((p) => p.registrationId === runner._id && p.corredorId) ||
                      podium.Femenino.find((p) => p.registrationId === runner._id && p.corredorId);
                  
                  // ¿Tiene puesto en su categoría de edad? (1.º, 2.º o 3.º puesto)
                  let catPodiumEntry: CategoryPodiumPosition | undefined = undefined;
                  if (!isDq) {
                    for (const s of ['Masculino', 'Femenino'] as SexType[]) {
                      for (const positions of Object.values(categoryWinners[s] || {})) {
                        const match = positions.find((p) => p.registrationId === runner._id && p.corredorId);
                        if (match) {
                          catPodiumEntry = match;
                          break;
                        }
                      }
                      if (catPodiumEntry) break;
                    }
                  }

                  return (
                    <tr
                      key={runner._id}
                      className={`transition-colors ${
                        isDq ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Dorsal */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`font-black px-2.5 py-1 rounded-md text-xs ${
                            isDq
                              ? 'bg-rose-100 text-rose-800 line-through'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          #{runner.dorsal}
                        </span>
                      </td>

                      {/* Corredor */}
                      <td className="px-5 py-4">
                        <div>
                          <p className={`font-bold text-sm ${isDq ? 'text-slate-500' : 'text-slate-800'}`}>
                            {runner.datosCorredor?.nombre} {runner.datosCorredor?.apellido}
                          </p>
                          <span className="text-[11px] text-slate-400">
                            {runner.corredor?.email}
                          </span>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="px-5 py-4 text-center font-medium text-slate-600">
                        {runner.datosCorredor?.dni || '-'}
                      </td>

                      {/* Sexo */}
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            runnerSex === 'Masculino'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span>{runnerSex === 'Masculino' ? '👨' : '👩'}</span>
                          <span>{runnerSex}</span>
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="px-5 py-4">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {runner.categoria || 'Sin categoría'}
                        </span>
                      </td>

                      {/* Distinción / Posición */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {isDq ? (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded text-[10px] font-black uppercase shadow-2xs">
                              🚫 Descalificado
                            </span>
                          ) : (
                            <>
                              {podEntry && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black shadow-2xs ${
                                    podEntry.posicion === 1
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : podEntry.posicion === 2
                                      ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                      : 'bg-orange-100 text-orange-900 border border-orange-300'
                                  }`}
                                >
                                  {podEntry.posicion === 1 ? '🥇' : podEntry.posicion === 2 ? '🥈' : '🥉'} #{podEntry.posicion} Gral. {podEntry.sexo === 'Masculino' ? 'Masc.' : 'Fem.'}
                                </span>
                              )}

                              {catPodiumEntry && (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-black">
                                  {catPodiumEntry.posicion === 1 ? '🥇' : catPodiumEntry.posicion === 2 ? '🥈' : '🥉'} {catPodiumEntry.posicion}.º Cat. ({catPodiumEntry.sexo === 'Masculino' ? 'Masc.' : 'Fem.'})
                                </span>
                              )}

                              {!podEntry && !catPodiumEntry && (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Estado en Resultados */}
                      <td className="px-5 py-4 text-center">
                        {isDq ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <Ban className="w-3 h-3 text-rose-600" />
                              <span>Descalificado</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleDisqualified(runner._id)}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                              title="Restablecer corredor como Clasificado"
                            >
                              Habilitar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Clasificado</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleDisqualified(runner._id)}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                              title="Descalificar al corredor de la carrera"
                            >
                              Descalificar
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Edición de Tiempos Oficiales */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 max-w-[210px] mx-auto">
                          {isDq ? (
                            <div className="flex-1 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border border-rose-300 bg-rose-50 text-rose-700 text-center select-none shadow-2xs">
                              DESCALIFICADO
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={currentRunnerTime}
                              onChange={(e) => handleRunnerTimeChange(runner._id, e.target.value)}
                              placeholder="00:00:00"
                              className="flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 bg-white text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                              title="Ingresa el tiempo en formato HH:MM:SS"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleDisqualified(runner._id)}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              isDq
                                ? 'bg-rose-100 border-rose-300 text-rose-800 hover:bg-rose-200'
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
                            }`}
                            title={isDq ? 'Restablecer corredor como Clasificado' : 'Marcar corredor como Descalificado'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de acción inferior */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Total inscriptos en {selectedDistance}k: <strong>{runnersForDistance.length}</strong> corredores ({runnersForDistance.filter(r => getRunnerSex(r) === 'Masculino').length} hombres / {runnersForDistance.filter(r => getRunnerSex(r) === 'Femenino').length} mujeres)
          </span>

          <button
            type="button"
            onClick={handleSaveResults}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-machine hover:bg-machine-dark text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Guardando...' : 'Guardar Resultados'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN: MARCAR COMO FINALIZADA                             */}
      {/* ========================================================================= */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  ¿Marcar carrera como “Finalizada”?
                </h3>
                <p className="text-xs text-slate-500">Acción oficial de cierre de evento deportivo</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Al marcar <strong>{race?.nombre}</strong> como <strong>“Finalizada”</strong>:
            </p>
            <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <li>La carrera ya no estará disponible para nuevas inscripciones de corredores.</li>
              <li>Los corredores inscriptos podrán visualizar sus resultados oficiales y posiciones en su apartado <strong>“Mis Datos”</strong>.</li>
              <li>La información quedará asentada oficialmente en el historial y auditoría deportiva.</li>
            </ul>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleToggleRaceStatus('finalizada')}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                {isUpdatingStatus ? 'Actualizando...' : 'Confirmar y Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RaceResultsManagement;
