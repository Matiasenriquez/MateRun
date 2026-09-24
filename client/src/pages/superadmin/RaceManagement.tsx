/**
 * ==============================================================================
 * GESTIÓN DE CARRERAS (RaceManagement.tsx) - MateRun
 * ==============================================================================
 * Panel exclusivo para SuperAdmin para la administración completa de carreras:
 * 1. Buscador insensible a mayúsculas, minúsculas, acentos y tildes.
 * 2. Descripción oficial: "Panel de administración de carreras."
 * 3. Columna "Admin Asignado" con ComboBox exclusivo para usuarios con rol 'Admin'.
 * 4. Botón "Eliminar" con notificación de confirmación:
 *    "¿Está seguro que desea eliminar la carrera?"
 * 5. Botón "Editar" con precarga completa de datos y opciones "Guardar" / "Cancelar".
 * 6. Sección "Categoría" para definir rangos etarios y asignación automática por edad.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Race, RaceCategory, User } from '../../types';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Search, 
  MapPin, 
  Tag, 
  Users, 
  Edit2, 
  Trash2, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Layers, 
  PlusCircle, 
  Clock,
  Sparkles,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

// Mapeo de meses en español (0 = Enero, 11 = Diciembre)
const MESES = [
  { value: '0', label: 'Enero' },
  { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' },
  { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' },
  { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' },
  { value: '11', label: 'Diciembre' },
];

/**
 * Normaliza un texto removiendo acentos, tildes y diacríticos, y convirtiendo a minúsculas
 * para comparaciones de búsqueda insensibles a mayúsculas y acentos.
 * Ej: "maraton" -> "maraton", "Maratón" -> "maraton", "MARATÓN" -> "maraton"
 */
const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const RaceManagement: React.FC = () => {
  // Lista de carreras y administradores
  const [races, setRaces] = useState<Race[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filtro de búsqueda en tiempo real
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Filtros combinados por año y mes
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Mensaje de éxito / notificación
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Estados para Modal de Crear / Editar Carrera
  // --------------------------------------------------------------------------
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingRaceId, setEditingRaceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Campos del formulario
  const [nombre, setNombre] = useState<string>('');
  const [fecha, setFecha] = useState<string>('');
  const [lugar, setLugar] = useState<string>('');
  const [organizador, setOrganizador] = useState<string>('');
  const [distancias, setDistancias] = useState<string>('10, 21');
  const [cupoMaximo, setCupoMaximo] = useState<string>('500');
  const [adminAsignado, setAdminAsignado] = useState<string>('');
  const [visibilidad, setVisibilidad] = useState<'Visible' | 'Oculta'>('Visible');
  const [categorias, setCategorias] = useState<RaceCategory[]>([]);

  // --------------------------------------------------------------------------
  // Estado para Modal de Confirmación de Eliminación
  // --------------------------------------------------------------------------
  const [raceToDelete, setRaceToDelete] = useState<Race | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  /**
   * Carga inicial de carreras y lista de administradores
   */
  useEffect(() => {
    fetchRacesAndAdmins();
  }, []);

  const fetchRacesAndAdmins = async () => {
    try {
      setIsLoading(true);
      const [racesRes, adminsRes] = await Promise.all([
        api.get('/races'),
        api.get('/users?rol=admin'),
      ]);

      setRaces(racesRes.data.races || []);
      setAdmins(adminsRes.data.users || []);
    } catch (error) {
      console.error('Error al cargar información de carreras o administradores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Helper: Formatea fechas para visualización en formato argentino dd/mm/aaaa
   */
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return String(dateString);
    }
  };

  /**
   * Abre el modal en modo "Nueva Carrera" con valores iniciales limpios
   */
  const handleOpenCreateModal = () => {
    setEditingRaceId(null);
    setNombre('');
    setFecha('');
    setLugar('');
    setOrganizador('');
    setDistancias('10, 21');
    setCupoMaximo('500');
    setAdminAsignado('');
    setVisibilidad('Visible');
    setCategorias([
      { nombre: 'Juveniles (14 a 19 años)', edadMinima: 14, edadMaxima: 19 },
      { nombre: 'Mayores A (20 a 29 años)', edadMinima: 20, edadMaxima: 29 },
      { nombre: 'Mayores B (30 a 39 años)', edadMinima: 30, edadMaxima: 39 },
      { nombre: 'Veteranos A (40 a 49 años)', edadMinima: 40, edadMaxima: 49 },
      { nombre: 'Veteranos B (50 a 59 años)', edadMinima: 50, edadMaxima: 59 },
      { nombre: 'Master (60+ años)', edadMinima: 60, edadMaxima: 120 },
    ]);
    setShowModal(true);
  };

  /**
   * Abre el modal en modo "Editar Carrera", precargando todos los datos existentes
   */
  const handleOpenEditModal = (race: Race) => {
    setEditingRaceId(race._id);
    setNombre(race.nombre);

    // Formatear fecha para el input type="date" (YYYY-MM-DD)
    try {
      const d = new Date(race.fecha);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setFecha(`${yyyy}-${mm}-${dd}`);
    } catch {
      setFecha('');
    }

    setLugar(race.lugar || '');
    setOrganizador(race.organizador || '');
    setDistancias(race.distancias ? race.distancias.join(', ') : '10, 21');
    setCupoMaximo(String(race.cupoMaximo || 500));

    // Admin asignado
    const assignedId = typeof race.adminAsignado === 'object' && race.adminAsignado
      ? race.adminAsignado._id
      : (race.adminAsignado || '');
    setAdminAsignado(assignedId || '');

    // Visibilidad (Visible / Oculta)
    setVisibilidad(race.visibilidad || 'Visible');

    // Categorías etarias
    setCategorias(race.categorias && race.categorias.length > 0 ? [...race.categorias] : []);

    setShowModal(true);
  };

  /**
   * Cierra el modal y restablece el formulario sin aplicar modificaciones
   */
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRaceId(null);
  };

  /**
   * Agrega una nueva fila de categoría etaria
   */
  const handleAddCategoryRow = () => {
    setCategorias(prev => [
      ...prev,
      { nombre: `Categoría ${prev.length + 1}`, edadMinima: 18, edadMaxima: 29 }
    ]);
  };

  /**
   * Elimina una categoría etaria por su índice
   */
  const handleRemoveCategoryRow = (index: number) => {
    setCategorias(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Modifica un campo específico de una categoría
   */
  const handleCategoryChange = (index: number, field: keyof RaceCategory, value: string | number) => {
    setCategorias(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: field === 'nombre' ? String(value) : Number(value) || 0
      };
      return copy;
    });
  };

  /**
   * Carga rápida de categorías estándar predefinidas
   */
  const handleLoadStandardCategories = () => {
    setCategorias([
      { nombre: 'Juveniles (14 a 19 años)', edadMinima: 14, edadMaxima: 19 },
      { nombre: 'Mayores A (20 a 29 años)', edadMinima: 20, edadMaxima: 29 },
      { nombre: 'Mayores B (30 a 39 años)', edadMinima: 30, edadMaxima: 39 },
      { nombre: 'Veteranos A (40 a 49 años)', edadMinima: 40, edadMaxima: 49 },
      { nombre: 'Veteranos B (50 a 59 años)', edadMinima: 50, edadMaxima: 59 },
      { nombre: 'Master (60+ años)', edadMinima: 60, edadMaxima: 120 },
    ]);
  };

  /**
   * Manejador para el botón "Guardar" del formulario (Creación o Edición)
   */
  const handleSubmitRace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !fecha) {
      alert('Por favor complete los campos obligatorios (Nombre y Fecha).');
      return;
    }

    try {
      setIsSubmitting(true);

      // Parseo de distancias
      const distArray = distancias
        .split(',')
        .map(d => Number(d.trim()))
        .filter(n => !isNaN(n) && n > 0);

      if (distArray.length === 0) {
        alert('Debe ingresar al menos una distancia válida en km (ej. 10, 21).');
        setIsSubmitting(false);
        return;
      }

      // Filtrar categorías con nombre no vacío
      const validCategories = categorias
        .filter(c => c.nombre && c.nombre.trim() !== '')
        .map(c => ({
          nombre: c.nombre.trim(),
          edadMinima: Math.max(0, Number(c.edadMinima) || 0),
          edadMaxima: Math.max(0, Number(c.edadMaxima) || 0),
        }));

      const payload = {
        nombre: nombre.trim(),
        fecha,
        lugar: lugar.trim() || 'Circuito Oficial',
        organizador: organizador.trim() || 'Organización Deportiva',
        distancias: distArray,
        cupoMaximo: Number(cupoMaximo) || 500,
        visibilidad,
        adminAsignado: adminAsignado ? adminAsignado : null,
        categorias: validCategories,
      };

      if (editingRaceId) {
        // Modo Edición: Actualizar carrera existente
        const res = await api.put(`/races/${editingRaceId}`, payload);
        const updated = res.data.race;

        setRaces(prev => prev.map(r => r._id === editingRaceId ? { ...r, ...updated } : r));
        setSuccessNotice('La carrera fue actualizada correctamente.');
      } else {
        // Modo Creación: Registrar nueva carrera
        const res = await api.post('/races', payload);
        const created = res.data.race;

        setRaces(prev => [created, ...prev]);
        setSuccessNotice('La carrera fue creada exitosamente.');
      }

      setShowModal(false);
      setEditingRaceId(null);
    } catch (error: any) {
      console.error('Error al guardar la carrera:', error);
      alert(error?.response?.data?.message || 'Error al guardar la carrera. Verifique los datos ingresados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Modificación inmediata de la Visibilidad de la carrera (Visible / Oculta)
   * Exclusivo para el usuario SuperAdmin.
   */
  const handleToggleVisibility = async (raceId: string, currentVis: 'Visible' | 'Oculta' | undefined) => {
    const newVis: 'Visible' | 'Oculta' = currentVis === 'Oculta' ? 'Visible' : 'Oculta';
    try {
      await api.put(`/races/${raceId}`, {
        visibilidad: newVis,
      });

      // Actualizar localmente el estado de las carreras
      setRaces(prev =>
        prev.map(race => (race._id === raceId ? { ...race, visibilidad: newVis } : race))
      );

      setSuccessNotice(`Se modificó la visibilidad de la carrera a: ${newVis}.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (error: any) {
      console.error('Error al modificar visibilidad de la carrera:', error);
      alert('No fue posible modificar la visibilidad de la carrera.');
    }
  };

  /**
   * Asignación inmediata del Administrador mediante el ComboBox de la tabla
   */
  const handleAssignAdminChange = async (raceId: string, newAdminId: string) => {
    try {
      await api.put(`/races/${raceId}`, {
        adminAsignado: newAdminId ? newAdminId : null,
      });

      // Actualizar localmente el estado de las carreras
      setRaces(prev =>
        prev.map(race => {
          if (race._id === raceId) {
            const adminObj = newAdminId ? admins.find(a => a._id === newAdminId) || newAdminId : null;
            return { ...race, adminAsignado: adminObj };
          }
          return race;
        })
      );

      setSuccessNotice('Administrador asignado correctamente a la carrera.');
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Error al asignar administrador:', err);
      alert('Error al asignar el administrador a la carrera.');
    }
  };

  /**
   * Confirma la eliminación de la carrera
   */
  const handleConfirmDelete = async () => {
    if (!raceToDelete) return;

    try {
      setIsDeleting(true);
      await api.delete(`/races/${raceToDelete._id}`);

      // Remover del listado local
      setRaces(prev => prev.filter(r => r._id !== raceToDelete._id));
      setSuccessNotice('La carrera fue eliminada correctamente del sistema.');
      setRaceToDelete(null);

      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (error) {
      console.error('Error al eliminar carrera:', error);
      alert('No fue posible eliminar la carrera.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Años disponibles extraídos de las fechas de las carreras
  const availableYears = Array.from(
    new Set(
      races
        .map((r) => {
          try {
            return new Date(r.fecha).getFullYear().toString();
          } catch {
            return null;
          }
        })
        .filter((y): y is string => Boolean(y) && !isNaN(Number(y)))
    )
  ).sort((a, b) => Number(b) - Number(a));

  /**
   * Filtrado en memoria de carreras con soporte para:
   * 1. Búsqueda por texto (insensible a mayúsculas, minúsculas, tildes y acentos)
   * 2. Filtro combinado por Año
   * 3. Filtro combinado por Mes
   */
  const filteredRaces = races.filter(race => {
    // 1. Filtro por término de búsqueda
    if (searchTerm.trim()) {
      const term = normalizeText(searchTerm);
      const raceNombre = normalizeText(race.nombre);
      const raceLugar = normalizeText(race.lugar);
      const raceOrg = normalizeText(race.organizador);

      const matchesSearch = raceNombre.includes(term) || raceLugar.includes(term) || raceOrg.includes(term);
      if (!matchesSearch) return false;
    }

    // 2. Filtros por Año y Mes
    if (race.fecha) {
      try {
        const raceDate = new Date(race.fecha);
        const raceYear = raceDate.getFullYear().toString();
        const raceMonth = raceDate.getMonth().toString();

        if (selectedYear && raceYear !== selectedYear) {
          return false;
        }

        if (selectedMonth !== '' && raceMonth !== selectedMonth) {
          return false;
        }
      } catch {
        // En caso de fecha inválida
      }
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* ========================================================================= */}
      {/* ENCABEZADO DE LA SECCIÓN CON NUEVA DESCRIPCIÓN Y BOTÓN DE NUEVA CARRERA   */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Carreras</h2>
          {/* Nueva descripción solicitada */}
          <p className="text-sm text-slate-500 mt-1 font-medium">Panel de administración de carreras.</p>
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-machine hover:bg-machine-dark text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Carrera</span>
        </button>
      </div>

      {/* AVISO DE CONFIRMACIÓN / ÉXITO */}
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

      {/* ========================================================================= */}
      {/* CONTENEDOR DE LA TABLA Y BUSCADOR DE CARRERAS                             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* BARRA SUPERIOR CON BUSCADOR Y FILTROS POR AÑO Y MES */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-machine" />
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Catálogo de Eventos Deportivos
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Administra, edita, elimina y asigna administradores a cada una de las carreras.
            </p>
          </div>

          {/* Buscador y Filtros Combinados de Año y Mes */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input Buscador */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar carrera (ej: maraton)..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
              />
            </div>

            {/* Icono de filtro */}
            <div className="hidden sm:flex items-center text-slate-400 pl-1" title="Filtros de fecha">
              <Filter className="w-3.5 h-3.5" />
            </div>

            {/* Filtro Año */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all min-w-[110px]"
              title="Filtrar por año"
            >
              <option value="">Año (Todos)</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Filtro Mes */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all min-w-[120px]"
              title="Filtrar por mes"
            >
              <option value="">Mes (Todos)</option>
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Botón Limpiar Filtros */}
            {(searchTerm.trim() !== '' || selectedYear !== '' || selectedMonth !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedYear('');
                  setSelectedMonth('');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Limpiar filtros de búsqueda, año y mes"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* TABLA DE CARRERAS */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold select-none">
              <tr>
                <th className="px-5 py-4">Nombre de la Carrera</th>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Lugar</th>
                <th className="px-5 py-4 text-center">Distancias</th>
                <th className="px-5 py-4 text-center">Inscriptos / Cupo</th>
                {/* Columna propia para asignar Administrador mediante ComboBox */}
                <th className="px-5 py-4 text-center min-w-[200px]">Admin Asignado</th>
                {/* Columna de Visibilidad: Visible / Oculta */}
                <th className="px-5 py-4 text-center min-w-[130px]">Visibilidad</th>
                {/* Columna de Acciones: Editar y Eliminar */}
                <th className="px-5 py-4 text-center min-w-[150px]">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-3 border-slate-200 border-t-machine rounded-full animate-spin"></div>
                      <span className="text-xs font-semibold text-slate-500">Cargando carreras...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRaces.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">
                      {(searchTerm.trim() !== '' || selectedYear !== '' || selectedMonth !== '') 
                        ? 'No se encontraron carreras con los filtros seleccionados.' 
                        : 'No hay carreras creadas aún.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(searchTerm.trim() !== '' || selectedYear !== '' || selectedMonth !== '')
                        ? 'Prueba modificando el término de búsqueda o restableciendo los filtros de año y mes.' 
                        : 'Comienza creando una con el botón "Nueva Carrera".'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRaces.map((r) => {
                  // Obtener el ID del administrador asignado actualmente
                  const currentAdminId = typeof r.adminAsignado === 'object' && r.adminAsignado
                    ? r.adminAsignado._id
                    : (r.adminAsignado || '');

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* 1. Nombre de la Carrera */}
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-800 text-sm">
                          {r.nombre}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Org: {r.organizador || 'MateRun'}
                        </div>
                      </td>

                      {/* 2. Fecha */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <CalendarIcon className="w-3.5 h-3.5 text-machine" />
                          <span>{formatDate(r.fecha)}</span>
                        </div>
                      </td>

                      {/* 3. Lugar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{r.lugar || 'Circuito Oficial'}</span>
                        </div>
                      </td>

                      {/* 4. Distancias */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.distancias?.map((d) => (
                            <span key={d} className="bg-slate-100 text-slate-700 font-black px-2 py-0.5 rounded text-[11px]">
                              {d}k
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* 5. Inscriptos / Cupo */}
                      <td className="px-5 py-4 text-center">
                        <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                          {r.totalInscriptos ?? 0} <span className="text-slate-400 font-medium">/ {r.cupoMaximo}</span>
                        </span>
                      </td>

                      {/* 6. ADMIN ASIGNADO (ComboBox con rol Admin exclusivamente) */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-slate-400 shrink-0" />
                          <select
                            value={currentAdminId}
                            onChange={(e) => handleAssignAdminChange(r._id, e.target.value)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer transition-all max-w-[180px]"
                            title="Selecciona el usuario Administrador responsable de esta carrera"
                          >
                            <option value="">Sin asignar</option>
                            {admins.map((adm) => (
                              <option key={adm._id} value={adm._id}>
                                {adm.nombre} {adm.apellido}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* 7. VISIBILIDAD (Visible / Oculta con Badge y alternador de estado interactivo) */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(r._id, r.visibilidad || 'Visible')}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                            r.visibilidad === 'Oculta'
                              ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title={`Actualmente ${r.visibilidad || 'Visible'}. Clic para cambiar a ${r.visibilidad === 'Oculta' ? 'Visible' : 'Oculta'}`}
                        >
                          {r.visibilidad === 'Oculta' ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                              <span>Oculta</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Visible</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* 8. ACCIONES: Editar y Eliminar */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Botón Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Editar información de la carrera"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Editar</span>
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            type="button"
                            onClick={() => setRaceToDelete(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar carrera del sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Eliminar</span>
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

        {/* PIE DE LA TABLA */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>Total de carreras: {filteredRaces.length}</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Actualizado en tiempo real
          </span>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL PARA CREAR O EDITAR CARRERA (CON SECCIÓN DE CATEGORÍA POR EDAD)     */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 max-h-[90vh] flex flex-col">
            
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-0.5 rounded">
                  {editingRaceId ? 'Modificación de Carrera' : 'Registro de Nueva Carrera'}
                </span>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">
                  {editingRaceId ? 'Editar Carrera' : 'Crear Nueva Carrera'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario Scrolleable */}
            <form onSubmit={handleSubmitRace} className="overflow-y-auto flex-1 pr-1 space-y-5">
              
              {/* Bloque 1: Datos Principales de la Carrera */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nombre de la Carrera */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Nombre de la Carrera *
                  </label>
                  <input
                    required
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Ultra Trail de los Andes 2026"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine"
                  />
                </div>

                {/* Fecha del Evento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Fecha del Evento *
                  </label>
                  <input
                    required
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine"
                  />
                </div>

                {/* Lugar o Localidad */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Lugar / Localidad
                  </label>
                  <input
                    type="text"
                    value={lugar}
                    onChange={(e) => setLugar(e.target.value)}
                    placeholder="Ej: Villa La Angostura, Neuquén"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine"
                  />
                </div>

                {/* Organizador */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Organizador / Club
                  </label>
                  <input
                    type="text"
                    value={organizador}
                    onChange={(e) => setOrganizador(e.target.value)}
                    placeholder="Ej: Asociación de Trail Running"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine"
                  />
                </div>

                {/* Distancias */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Distancias en Km (separadas por coma) *
                  </label>
                  <input
                    required
                    type="text"
                    value={distancias}
                    onChange={(e) => setDistancias(e.target.value)}
                    placeholder="Ej: 10, 21, 42"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine font-mono"
                  />
                </div>

                {/* Cupo Máximo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Cupo Máximo de Corredores *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={cupoMaximo}
                    onChange={(e) => setCupoMaximo(e.target.value)}
                    placeholder="Ej: 500"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine"
                  />
                </div>

                {/* Administrador Asignado en Formulario */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Administrador Asignado
                  </label>
                  <select
                    value={adminAsignado}
                    onChange={(e) => setAdminAsignado(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer"
                  >
                    <option value="">Sin asignar</option>
                    {admins.map((adm) => (
                      <option key={adm._id} value={adm._id}>
                        {adm.nombre} {adm.apellido} ({adm.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visibilidad de la Carrera (Visible / Oculta) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Visibilidad de la Carrera *
                  </label>
                  <select
                    value={visibilidad}
                    onChange={(e) => setVisibilidad(e.target.value as 'Visible' | 'Oculta')}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine cursor-pointer"
                  >
                    <option value="Visible">Visible (Habilitada)</option>
                    <option value="Oculta">Oculta (No disponible para Admins ni Corredores)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {visibilidad === 'Visible' 
                      ? 'La carrera estará disponible según los permisos de cada usuario.' 
                      : 'Oculta: no aparecerá en las interfaces de Administradores ni Corredores.'}
                  </p>
                </div>

              </div>

              {/* =================================================================== */}
              {/* SECCIÓN: CATEGORÍA (RANGOS ETARIOS Y ASIGNACIÓN AUTOMÁTICA)         */}
              {/* =================================================================== */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-machine" />
                      <span>Categorías por Rangos Etarios</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      El sistema asignará automáticamente la categoría al corredor calculando su edad a la fecha del evento.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botón para sugerir categorías */}
                    <button
                      type="button"
                      onClick={handleLoadStandardCategories}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      title="Cargar categorías estándar por edades"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cargar Sugeridas</span>
                    </button>

                    {/* Botón Agregar Categoría */}
                    <button
                      type="button"
                      onClick={handleAddCategoryRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-machine bg-machine-light hover:bg-machine/15 rounded-lg transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Agregar Categoría</span>
                    </button>
                  </div>
                </div>

                {/* Tabla de Categorías */}
                {categorias.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-semibold text-slate-500">
                      No hay categorías configuradas para esta carrera.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Haz clic en "+ Agregar Categoría" o "Cargar Sugeridas" para definir los rangos de edad.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                      <div className="col-span-6">Nombre de la Categoría</div>
                      <div className="col-span-2 text-center">Edad Mínima</div>
                      <div className="col-span-2 text-center">Edad Máxima</div>
                      <div className="col-span-2 text-center">Quitar</div>
                    </div>

                    {categorias.map((cat, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                        {/* Nombre */}
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={cat.nombre}
                            onChange={(e) => handleCategoryChange(idx, 'nombre', e.target.value)}
                            placeholder="Ej: Mayores A"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-machine font-medium"
                          />
                        </div>

                        {/* Edad Mínima */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={cat.edadMinima}
                            onChange={(e) => handleCategoryChange(idx, 'edadMinima', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-machine text-center font-mono"
                          />
                        </div>

                        {/* Edad Máxima */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            value={cat.edadMaxima}
                            onChange={(e) => handleCategoryChange(idx, 'edadMaxima', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-machine text-center font-mono"
                          />
                        </div>

                        {/* Botón Eliminar Fila */}
                        <div className="col-span-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveCategoryRow(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Eliminar esta categoría"
                          >
                            <Trash2 className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones de Acción: Guardar y Cancelar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR CARRERA                              */}
      {/* ========================================================================= */}
      {raceToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200 animate-in zoom-in-95 duration-150">
            
            {/* Ícono de Alerta */}
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>

            {/* Mensaje exacto de confirmación requerido */}
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              ¿Está seguro que desea eliminar la carrera?
            </h3>

            {/* Información de la carrera */}
            <p className="text-xs text-slate-500 mt-2 font-medium">
              Carrera: <span className="font-bold text-slate-800">{raceToDelete.nombre}</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Fecha: {formatDate(raceToDelete.fecha)}
            </p>

            {/* Botones Confirmar / Cancelar */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setRaceToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RaceManagement;
