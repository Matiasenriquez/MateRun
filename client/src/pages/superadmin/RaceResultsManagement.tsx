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

interface RegistrationItem {
  _id: string;
  corredor: {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    fotoPerfil?: string;
  };
  dorsal: number;
  distancia: number;
  categoria?: string;
  estado: string;
  datosCorredor: {
    nombre: string;
    apellido: string;
    dni: string;
  };
}

interface PodiumPosition {
  posicion: number;
  corredorId: string;
  registrationId?: string;
  dorsal?: number;
  nombre?: string;
  tiempo: string;
}

interface CategoryWinner {
  categoria: string;
  corredorId: string;
  registrationId?: string;
  dorsal?: number;
  nombre?: string;
  tiempo: string;
}

export const RaceResultsManagement: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();

  // Estados de datos
  const [race, setRace] = useState<Race | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Mensajes de éxito y error
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Clasificación General (1.º, 2.º y 3.º puestos)
  const [podium, setPodium] = useState<PodiumPosition[]>([
    { posicion: 1, corredorId: '', tiempo: '' },
    { posicion: 2, corredorId: '', tiempo: '' },
    { posicion: 3, corredorId: '', tiempo: '' },
  ]);

  // Ganadores por Categoría de Edad
  const [categoryWinners, setCategoryWinners] = useState<Record<string, CategoryWinner>>({});

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

      // Cargar Clasificación General (1.º, 2.º, 3.º)
      const initialPodium: PodiumPosition[] = [
        { posicion: 1, corredorId: '', tiempo: '' },
        { posicion: 2, corredorId: '', tiempo: '' },
        { posicion: 3, corredorId: '', tiempo: '' },
      ];

      if (existingResults?.clasificacionGeneral && Array.isArray(existingResults.clasificacionGeneral)) {
        for (const p of existingResults.clasificacionGeneral) {
          const idx = initialPodium.findIndex((pos) => pos.posicion === p.posicion);
          if (idx !== -1) {
            initialPodium[idx] = {
              posicion: p.posicion,
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

      // Cargar Ganadores por Categoría
      const catMap: Record<string, CategoryWinner> = {};
      const configuredCategories = raceData.categorias || [];

      for (const cat of configuredCategories) {
        catMap[cat.nombre] = {
          categoria: cat.nombre,
          corredorId: '',
          tiempo: '',
        };
      }

      if (existingResults?.ganadoresCategorias && Array.isArray(existingResults.ganadoresCategorias)) {
        for (const gw of existingResults.ganadoresCategorias) {
          catMap[gw.categoria] = {
            categoria: gw.categoria,
            corredorId: gw.corredor ? String(gw.corredor) : '',
            registrationId: gw.registrationId ? String(gw.registrationId) : undefined,
            dorsal: gw.dorsal,
            nombre: gw.nombre,
            tiempo: gw.tiempo || '',
          };
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
   * Corredores filtrados por el buscador
   */
  const filteredRunners = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return runnersForDistance;

    return runnersForDistance.filter((r) => {
      const nombre = `${r.datosCorredor?.nombre || ''} ${r.datosCorredor?.apellido || ''}`.toLowerCase();
      const dni = String(r.datosCorredor?.dni || '').toLowerCase();
      const dorsal = String(r.dorsal || '');
      return nombre.includes(term) || dni.includes(term) || dorsal.includes(term);
    });
  }, [runnersForDistance, searchTerm]);

  /**
   * Helper: Asigna un corredor a una posición del podio (1.º, 2.º o 3.º)
   */
  const handleSelectPodiumRunner = (pos: number, regId: string) => {
    const selectedReg = runnersForDistance.find((r) => r._id === regId);

    setPodium((prev) =>
      prev.map((item) => {
        if (item.posicion === pos) {
          if (!regId) {
            return { ...item, corredorId: '', registrationId: undefined, dorsal: undefined, nombre: '' };
          }
          const regTime = runnerTimes[regId] || item.tiempo || '';
          return {
            ...item,
            corredorId: selectedReg?.corredor?._id || '',
            registrationId: regId,
            dorsal: selectedReg?.dorsal,
            nombre: `${selectedReg?.datosCorredor?.nombre || ''} ${selectedReg?.datosCorredor?.apellido || ''}`.trim(),
            tiempo: regTime,
          };
        }
        return item;
      })
    );

    // Si el corredor ya tiene un tiempo en el podio y no en la tabla, sincronizar
    if (regId && !runnerTimes[regId]) {
      const existingPodiumTime = podium.find((p) => p.posicion === pos)?.tiempo;
      if (existingPodiumTime) {
        setRunnerTimes((prev) => ({ ...prev, [regId]: existingPodiumTime }));
      }
    }
  };

  /**
   * Helper: Modifica el tiempo de una posición del podio
   */
  const handlePodiumTimeChange = (pos: number, timeVal: string) => {
    setPodium((prev) =>
      prev.map((item) => {
        if (item.posicion === pos) {
          return { ...item, tiempo: timeVal };
        }
        return item;
      })
    );

    // Sincronizar con el mapa de tiempos si el corredor está seleccionado
    const currentItem = podium.find((p) => p.posicion === pos);
    if (currentItem?.registrationId) {
      setRunnerTimes((prev) => ({
        ...prev,
        [currentItem.registrationId!]: timeVal,
      }));
    }
  };

  /**
   * Helper: Asigna un corredor ganador para una categoría
   */
  const handleSelectCategoryWinner = (catName: string, regId: string) => {
    const selectedReg = runnersForDistance.find((r) => r._id === regId);

    setCategoryWinners((prev) => {
      if (!regId) {
        return {
          ...prev,
          [catName]: { categoria: catName, corredorId: '', tiempo: '' },
        };
      }

      const existingTime = runnerTimes[regId] || prev[catName]?.tiempo || '';
      return {
        ...prev,
        [catName]: {
          categoria: catName,
          corredorId: selectedReg?.corredor?._id || '',
          registrationId: regId,
          dorsal: selectedReg?.dorsal,
          nombre: `${selectedReg?.datosCorredor?.nombre || ''} ${selectedReg?.datosCorredor?.apellido || ''}`.trim(),
          tiempo: existingTime,
        },
      };
    });

    if (regId && !runnerTimes[regId]) {
      const existingTime = categoryWinners[catName]?.tiempo;
      if (existingTime) {
        setRunnerTimes((prev) => ({ ...prev, [regId]: existingTime }));
      }
    }
  };

  /**
   * Helper: Modifica el tiempo de un ganador de categoría
   */
  const handleCategoryWinnerTimeChange = (catName: string, timeVal: string) => {
    setCategoryWinners((prev) => ({
      ...prev,
      [catName]: {
        ...prev[catName],
        tiempo: timeVal,
      },
    }));

    const currentWinner = categoryWinners[catName];
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

    // Sincronizar con podio si el corredor está en el podio
    setPodium((prev) =>
      prev.map((item) => {
        if (item.registrationId === regId) {
          return { ...item, tiempo: timeVal };
        }
        return item;
      })
    );

    // Sincronizar con ganadores de categoría si es ganador
    setCategoryWinners((prev) => {
      const copy = { ...prev };
      for (const catKey of Object.keys(copy)) {
        if (copy[catKey].registrationId === regId) {
          copy[catKey] = { ...copy[catKey], tiempo: timeVal };
        }
      }
      return copy;
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
        setPodium((prevPod) =>
          prevPod.map((p) =>
            p.registrationId === regId
              ? { ...p, corredorId: '', registrationId: undefined, dorsal: undefined, nombre: '', tiempo: '' }
              : p
          )
        );

        setCategoryWinners((prevCatWinners) => {
          const updated = { ...prevCatWinners };
          for (const catKey of Object.keys(updated)) {
            if (updated[catKey]?.registrationId === regId) {
              updated[catKey] = { categoria: catKey, corredorId: '', tiempo: '' };
            }
          }
          return updated;
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

      // Preparar payload de podio general
      const clasificacionGeneralPayload = podium
        .filter((p) => p.corredorId && !disqualifiedRunners[p.registrationId || ''])
        .map((p) => ({
          posicion: p.posicion,
          corredor: p.corredorId,
          registrationId: p.registrationId,
          dorsal: p.dorsal,
          nombre: p.nombre,
          tiempo: p.tiempo.trim(),
        }));

      // Preparar payload de ganadores por categoría
      const ganadoresCategoriasPayload = Object.values(categoryWinners)
        .filter((gw) => gw.corredorId && !disqualifiedRunners[gw.registrationId || ''])
        .map((gw) => ({
          categoria: gw.categoria,
          corredor: gw.corredorId,
          registrationId: gw.registrationId,
          dorsal: gw.dorsal,
          nombre: gw.nombre,
          tiempo: gw.tiempo.trim(),
        }));

      // Preparar payload de tiempos de todos los corredores
      const tiemposCorredoresPayload = runnersForDistance.map((reg) => {
        const isDq = Boolean(disqualifiedRunners[reg._id]);
        const timeStr = runnerTimes[reg._id] || '';

        // Verificar si tiene posición en el podio general (si no está descalificado)
        const podEntry = isDq ? null : podium.find((p) => p.registrationId === reg._id);
        const posGen = podEntry ? podEntry.posicion : null;

        // Verificar si es ganador de su categoría (si no está descalificado)
        const isCatWinner = isDq
          ? false
          : Object.values(categoryWinners).some((gw) => gw.registrationId === reg._id);
        const posCat = isCatWinner ? 1 : null;

        return {
          corredor: reg.corredor?._id,
          registrationId: reg._id,
          dorsal: reg.dorsal,
          nombre: `${reg.datosCorredor?.nombre || ''} ${reg.datosCorredor?.apellido || ''}`.trim(),
          categoria: reg.categoria || '',
          distancia: selectedDistance,
          tiempo: isDq ? 'Descalificado' : timeStr.trim(),
          posicionGeneral: posGen,
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
        `¡Resultados oficiales de ${selectedDistance}k guardados exitosamente! Los corredores ya pueden consultar su rendimiento en "Mis Datos".`
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
      {/* 3. CLASIFICACIÓN GENERAL (PODIO 1.º, 2.º Y 3.º PUESTOS)                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Clasificación General — {selectedDistance}k
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona a los corredores que obtuvieron los tres primeros puestos y carga su tiempo oficial.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Tarjetas de Podio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {podium.map((pod) => {
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
                    <span className="text-2xl">
                      {isFirst ? '🥇' : isSecond ? '🥈' : '🥉'}
                    </span>
                    <span className="font-black text-sm uppercase tracking-wider text-slate-800">
                      {pod.posicion}.º Puesto General
                    </span>
                  </div>

                  {pod.registrationId && (
                    <button
                      type="button"
                      onClick={() => handleSelectPodiumRunner(pod.posicion, '')}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                      title="Quitar corredor del puesto"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Selector de Corredor */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Corredor Ganador
                  </label>
                  <select
                    value={pod.registrationId || ''}
                    onChange={(e) => handleSelectPodiumRunner(pod.posicion, e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all"
                  >
                    <option value="">-- Seleccionar Corredor --</option>
                    {runnersForDistance.map((r) => {
                      const isDq = Boolean(disqualifiedRunners[r._id]);
                      return (
                        <option key={r._id} value={r._id} disabled={isDq}>
                          [Dorsal #{r.dorsal}] {r.datosCorredor?.nombre} {r.datosCorredor?.apellido}{' '}
                          {isDq ? '(DESCALIFICADO)' : `(DNI ${r.datosCorredor?.dni})`}
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
      {/* 4. GANADORES POR CATEGORÍA DE EDAD                                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200/80">
              <Medal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Ganadores por Categoría de Edad — {selectedDistance}k
              </h2>
              <p className="text-xs text-slate-500">
                Asigna y edita el corredor ganador de cada categoría etaria configurada en la carrera.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {race.categorias.map((cat, idx) => {
              const winner = categoryWinners[cat.nombre] || {
                categoria: cat.nombre,
                corredorId: '',
                tiempo: '',
              };

              // Corredores que pertenecen a esta categoría
              const runnersInCat = runnersForDistance.filter(
                (r) => r.categoria === cat.nombre
              );

              return (
                <div
                  key={idx}
                  className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4 space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-800 text-xs sm:text-sm uppercase tracking-wide">
                        {cat.nombre}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-semibold">
                        Rango: {cat.edadMinima} a {cat.edadMaxima} años ({runnersInCat.length} corredores en distancia)
                      </span>
                    </div>

                    {winner.registrationId && (
                      <button
                        type="button"
                        onClick={() => handleSelectCategoryWinner(cat.nombre, '')}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
                        title="Quitar ganador de la categoría"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Selector de Corredor Ganador */}
                    <div className="sm:col-span-2">
                      <select
                        value={winner.registrationId || ''}
                        onChange={(e) => handleSelectCategoryWinner(cat.nombre, e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all"
                      >
                        <option value="">-- Corredor Ganador --</option>
                        {/* Primero los que coinciden con la categoría */}
                        {runnersInCat.length > 0 && (
                          <optgroup label="Corredores de la categoría">
                            {runnersInCat.map((r) => {
                              const isDq = Boolean(disqualifiedRunners[r._id]);
                              return (
                                <option key={r._id} value={r._id} disabled={isDq}>
                                  [Dorsal #{r.dorsal}] {r.datosCorredor?.nombre} {r.datosCorredor?.apellido}{' '}
                                  {isDq ? '(DESCALIFICADO)' : ''}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {/* Todos los demás corredores de la distancia */}
                        <optgroup label="Otros corredores de la distancia">
                          {runnersForDistance
                            .filter((r) => r.categoria !== cat.nombre)
                            .map((r) => {
                              const isDq = Boolean(disqualifiedRunners[r._id]);
                              return (
                                <option key={r._id} value={r._id} disabled={isDq}>
                                  [Dorsal #{r.dorsal}] {r.datosCorredor?.nombre} {r.datosCorredor?.apellido} (
                                  {r.categoria || 'Sin cat.'}) {isDq ? '(DESCALIFICADO)' : ''}
                                </option>
                              );
                            })}
                        </optgroup>
                      </select>
                    </div>

                    {/* Tiempo */}
                    <div>
                      <input
                        type="text"
                        value={winner.tiempo}
                        onChange={(e) => handleCategoryWinnerTimeChange(cat.nombre, e.target.value)}
                        placeholder="HH:MM:SS"
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                        title="Tiempo oficial del ganador de categoría"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. CARGA Y EDICIÓN DE TIEMPOS DE TODOS LOS CORREDORES                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          {/* Buscador de corredores */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por corredor, DNI o dorsal..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
            />
          </div>
        </div>

        {/* Tabla de Corredores */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-5 py-4 w-24 text-center">Dorsal</th>
                <th className="px-5 py-4">Corredor</th>
                <th className="px-5 py-4 w-32 text-center">DNI</th>
                <th className="px-5 py-4 w-44">Categoría</th>
                <th className="px-5 py-4 w-36 text-center">Distinción</th>
                <th className="px-5 py-4 w-36 text-center">Estado</th>
                <th className="px-5 py-4 w-60 text-center">Edición de Tiempos (HH:MM:SS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRunners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-slate-600">No se encontraron corredores inscriptos en {selectedDistance}k</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm.trim() ? 'Prueba con otro término de búsqueda.' : 'No hay inscripciones activas para esta distancia.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRunners.map((runner) => {
                  const currentRunnerTime = runnerTimes[runner._id] || '';
                  const isDq = Boolean(disqualifiedRunners[runner._id]);

                  // ¿Tiene puesto en el podio general? (Solo si no está descalificado)
                  const podEntry = isDq ? null : podium.find((p) => p.registrationId === runner._id);
                  // ¿Es ganador de categoría? (Solo si no está descalificado)
                  const isCatWinner = isDq
                    ? false
                    : Object.values(categoryWinners).some((gw) => gw.registrationId === runner._id);

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
                                  {podEntry.posicion === 1 ? '🥇 #1 General' : podEntry.posicion === 2 ? '🥈 #2 General' : '🥉 #3 General'}
                                </span>
                              )}

                              {isCatWinner && (
                                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-black">
                                  🏆 Ganador Cat.
                                </span>
                              )}

                              {!podEntry && !isCatWinner && (
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
            Total inscriptos en {selectedDistance}k: <strong>{runnersForDistance.length}</strong> corredores
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
