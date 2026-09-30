/**
 * ==============================================================================
 * GESTIÓN DE USUARIOS Y ROLES (UserManagement.tsx) - MateRun
 * ==============================================================================
 * Panel exclusivo para el rol SuperAdmin. Permite:
 * 1. Listar todos los usuarios del sistema.
 * 2. Buscar usuarios en tiempo real con filtro insensible a mayúsculas y acentos.
 * 3. Crear nuevos usuarios con el rol "Corredor" asignado por defecto.
 * 4. Ver ficha completa de datos del usuario, incluida su foto de perfil cargada.
 * 5. Editar datos del usuario con notificación de confirmación obligatoria previa al guardado.
 * 6. Eliminar usuario existente con notificación de confirmación previa a la eliminación.
 * ==============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/api';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, 
  ShieldCheck, 
  User as UserIcon, 
  Search, 
  UserPlus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Lock,
  Heart,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertTriangle
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filtro de búsqueda en tiempo real
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Mensaje de notificación global de éxito
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // ==========================================================================
  // ESTADOS PARA "CREAR NUEVO USUARIO"
  // ==========================================================================
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [createModalError, setCreateModalError] = useState<string>('');

  const [createNombre, setCreateNombre] = useState<string>('');
  const [createApellido, setCreateApellido] = useState<string>('');
  const [createDni, setCreateDni] = useState<string>('');
  const [createEmail, setCreateEmail] = useState<string>('');
  const [createFechaNacimiento, setCreateFechaNacimiento] = useState<string>('');
  const [createSexo, setCreateSexo] = useState<'Hombre' | 'Mujer'>('Hombre');
  const [createTelefono, setCreateTelefono] = useState<string>('');
  const [createCiudad, setCreateCiudad] = useState<string>('');
  const [createProvincia, setCreateProvincia] = useState<string>('');
  const [createContactoNombre, setCreateContactoNombre] = useState<string>('');
  const [createContactoTelefono, setCreateContactoTelefono] = useState<string>('');
  const [createPassword, setCreatePassword] = useState<string>('');

  // ==========================================================================
  // ESTADOS PARA "VER USUARIO"
  // ==========================================================================
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // ==========================================================================
  // ESTADOS PARA "EDITAR USUARIO" Y SU NOTIFICACIÓN DE CONFIRMACIÓN
  // ==========================================================================
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isConfirmEditOpen, setIsConfirmEditOpen] = useState<boolean>(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editModalError, setEditModalError] = useState<string>('');

  const [editNombre, setEditNombre] = useState<string>('');
  const [editApellido, setEditApellido] = useState<string>('');
  const [editDni, setEditDni] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editFechaNacimiento, setEditFechaNacimiento] = useState<string>('');
  const [editSexo, setEditSexo] = useState<'Hombre' | 'Mujer'>('Hombre');
  const [editTelefono, setEditTelefono] = useState<string>('');
  const [editCiudad, setEditCiudad] = useState<string>('');
  const [editProvincia, setEditProvincia] = useState<string>('');
  const [editContactoNombre, setEditContactoNombre] = useState<string>('');
  const [editContactoTelefono, setEditContactoTelefono] = useState<string>('');
  const [editRol, setEditRol] = useState<'corredor' | 'admin' | 'superadmin'>('corredor');
  const [editFotoPerfil, setEditFotoPerfil] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================================================
  // ESTADOS PARA "ELIMINAR USUARIO" Y SU NOTIFICACIÓN DE CONFIRMACIÓN
  // ==========================================================================
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Helper: Normaliza texto removiendo acentos/diacríticos y pasando a minúsculas
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

  /**
   * Formatea fechas en dd/mm/aaaa
   */
  const formatDate = (dateString?: string | Date): string => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  /**
   * Calcula la edad en base a la fecha de nacimiento
   */
  const calculateAge = (birthDateString?: string | Date): number | null => {
    if (!birthDateString) return null;
    const birth = new Date(birthDateString);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  /**
   * Filtrado en tiempo real sobre la lista de usuarios
   */
  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const term = normalizeText(searchTerm);
    const fullName = normalizeText(`${u.nombre || ''} ${u.apellido || ''}`);
    const dniVal = normalizeText(u.dni);
    const emailVal = normalizeText(u.email);
    const rolVal = normalizeText(u.rol);
    const ciudadVal = normalizeText(u.ciudad);
    const provVal = normalizeText(u.provincia);
    const telVal = normalizeText(u.telefono);

    return (
      fullName.includes(term) ||
      dniVal.includes(term) ||
      emailVal.includes(term) ||
      rolVal.includes(term) ||
      ciudadVal.includes(term) ||
      provVal.includes(term) ||
      telVal.includes(term)
    );
  });

  /**
   * Manejador para inputs numéricos
   */
  const handleNumericInput = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setter(onlyDigits);
  };

  // ==========================================================================
  // LÓGICA: CREAR NUEVO USUARIO
  // ==========================================================================
  const handleOpenCreateModal = () => {
    setCreateNombre('');
    setCreateApellido('');
    setCreateDni('');
    setCreateEmail('');
    setCreateFechaNacimiento('');
    setCreateSexo('Hombre');
    setCreateTelefono('');
    setCreateCiudad('');
    setCreateProvincia('');
    setCreateContactoNombre('');
    setCreateContactoTelefono('');
    setCreatePassword('');
    setCreateModalError('');
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateModalError('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError('');

    if (
      !createNombre.trim() ||
      !createApellido.trim() ||
      !createDni.trim() ||
      !createEmail.trim() ||
      !createFechaNacimiento ||
      !createSexo ||
      !createTelefono.trim() ||
      !createCiudad.trim() ||
      !createProvincia.trim()
    ) {
      setCreateModalError('Por favor complete todos los campos obligatorios marcados con asterisco (*).');
      return;
    }

    try {
      setIsSubmittingCreate(true);

      const payload = {
        nombre: createNombre.trim(),
        apellido: createApellido.trim(),
        dni: createDni.trim(),
        email: createEmail.trim().toLowerCase(),
        fechaNacimiento: createFechaNacimiento,
        sexo: createSexo,
        telefono: createTelefono.trim(),
        ciudad: createCiudad.trim(),
        provincia: createProvincia.trim(),
        contactoEmergencia: {
          nombre: createContactoNombre.trim() || 'Contacto de Emergencia',
          telefono: createContactoTelefono.trim(),
        },
        password: createPassword.trim() || undefined,
        rol: 'corredor',
      };

      const res = await api.post('/users', payload);

      setSuccessNotice(`¡Usuario ${createNombre.trim()} ${createApellido.trim()} creado con éxito con el rol Corredor! Contraseña inicial: ${res.data.initialPassword}`);
      handleCloseCreateModal();
      fetchUsers();
      setTimeout(() => setSuccessNotice(null), 8000);
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      const msg = err.response?.data?.message || 'No se pudo crear el usuario. Verifique los datos ingresados.';
      setCreateModalError(msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // ==========================================================================
  // LÓGICA: VER USUARIO
  // ==========================================================================
  const handleOpenViewModal = (u: User) => {
    setViewingUser(u);
  };

  const handleCloseViewModal = () => {
    setViewingUser(null);
  };

  // ==========================================================================
  // LÓGICA: EDITAR USUARIO
  // ==========================================================================
  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setEditNombre(u.nombre || '');
    setEditApellido(u.apellido || '');
    setEditDni(u.dni || '');
    setEditEmail(u.email || '');

    if (u.fechaNacimiento) {
      const d = new Date(u.fechaNacimiento);
      if (!isNaN(d.getTime())) {
        setEditFechaNacimiento(d.toISOString().split('T')[0]);
      } else {
        setEditFechaNacimiento('');
      }
    } else {
      setEditFechaNacimiento('');
    }

    setEditSexo(u.sexo === 'Femenino' ? 'Mujer' : 'Hombre');
    setEditTelefono(u.telefono || '');
    setEditCiudad(u.ciudad || '');
    setEditProvincia(u.provincia || '');

    if (u.contactoEmergencia) {
      if (typeof u.contactoEmergencia === 'object') {
        setEditContactoNombre(u.contactoEmergencia.nombre || '');
        setEditContactoTelefono(u.contactoEmergencia.telefono || '');
      } else if (typeof u.contactoEmergencia === 'string') {
        setEditContactoTelefono(u.contactoEmergencia);
      }
    } else {
      setEditContactoNombre('');
      setEditContactoTelefono('');
    }

    setEditRol(u.rol || 'corredor');
    setEditFotoPerfil(u.fotoPerfil || null);
    setEditModalError('');
    setIsConfirmEditOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditingUser(null);
    setIsConfirmEditOpen(false);
    setEditModalError('');
  };

  // Manejador para cargar y optimizar la foto en edición
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setEditModalError('El archivo seleccionado no es una imagen válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const size = 400;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const optimized = canvas.toDataURL('image/jpeg', 0.88);
        setEditFotoPerfil(optimized);
        setEditModalError('');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Solicita la confirmación de guardado
  const handleRequestSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditModalError('');

    if (
      !editNombre.trim() ||
      !editApellido.trim() ||
      !editDni.trim() ||
      !editEmail.trim() ||
      !editFechaNacimiento ||
      !editSexo ||
      !editTelefono.trim() ||
      !editCiudad.trim() ||
      !editProvincia.trim()
    ) {
      setEditModalError('Por favor complete todos los campos obligatorios marcados con asterisco (*).');
      return;
    }

    // Abre el popup de confirmación requerido
    setIsConfirmEditOpen(true);
  };

  // Ejecuta la actualización una vez confirmada
  const handleConfirmSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setIsSubmittingEdit(true);

      const payload = {
        nombre: editNombre.trim(),
        apellido: editApellido.trim(),
        dni: editDni.trim(),
        email: editEmail.trim().toLowerCase(),
        fechaNacimiento: editFechaNacimiento,
        sexo: editSexo,
        telefono: editTelefono.trim(),
        ciudad: editCiudad.trim(),
        provincia: editProvincia.trim(),
        contactoEmergencia: {
          nombre: editContactoNombre.trim() || 'Contacto de Emergencia',
          telefono: editContactoTelefono.trim(),
        },
        rol: editRol,
        fotoPerfil: editFotoPerfil,
      };

      await api.put(`/users/${editingUser._id}`, payload);

      setSuccessNotice(`¡Datos del usuario ${editNombre.trim()} ${editApellido.trim()} actualizados correctamente!`);
      handleCloseEditModal();
      fetchUsers();
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      console.error('Error al actualizar usuario:', err);
      const msg = err.response?.data?.message || 'Error al guardar los cambios del usuario.';
      setEditModalError(msg);
      setIsConfirmEditOpen(false);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // ==========================================================================
  // LÓGICA: ELIMINAR USUARIO
  // ==========================================================================
  const handleOpenDeleteModal = (u: User) => {
    if (currentUser?._id === u._id) {
      alert('No puedes eliminar tu propia cuenta mientras estás conectado.');
      return;
    }
    setDeletingUser(u);
  };

  const handleCloseDeleteModal = () => {
    setDeletingUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      setIsSubmittingDelete(true);
      await api.delete(`/users/${deletingUser._id}`);
      setSuccessNotice(`Usuario ${deletingUser.nombre} ${deletingUser.apellido} eliminado correctamente.`);
      handleCloseDeleteModal();
      fetchUsers();
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      console.error('Error al eliminar usuario:', err);
      alert(err.response?.data?.message || 'Error al eliminar el usuario.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      
      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-0.5 rounded">
              Panel Exclusivo SuperAdmin
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 mt-1.5 tracking-tight">
            Gestión de Usuarios y Roles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Consulta, edita o elimina las cuentas de usuario registradas en la plataforma y administra sus niveles de acceso.
          </p>
        </div>

        {/* BOTÓN CREAR NUEVO USUARIO */}
        <div className="shrink-0">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* AVISO DE ACCIÓN EXITOSA */}
      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CONTENEDOR DE LA TABLA CON BUSCADOR EN TIEMPO REAL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* BARRA SUPERIOR: TÍTULO Y BUSCADOR EN TIEMPO REAL */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-machine" />
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
                Nómina General de Usuarios
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Total de registros: <strong>{filteredUsers.length}</strong> {searchTerm && `(filtrados de ${users.length})`}
            </p>
          </div>

          {/* BUSCADOR EN TIEMPO REAL */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, apellido, DNI, email o rol..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Usuario</th>
                <th className="px-5 py-3.5">DNI</th>
                <th className="px-5 py-3.5">Contacto</th>
                <th className="px-5 py-3.5">Ubicación</th>
                <th className="px-5 py-3.5 text-center">Rol</th>
                <th className="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-machine" />
                      <span>Cargando usuarios registrados...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <p className="font-semibold text-slate-600">No se encontraron usuarios</p>
                    <p className="text-[11px] mt-1 text-slate-400">
                      {searchTerm ? 'Prueba ajustando los términos de búsqueda.' : 'No hay usuarios registrados en el sistema.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Nombre y Avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 overflow-hidden font-bold shrink-0">
                          {u.fotoPerfil ? (
                            <img
                              src={u.fotoPerfil}
                              alt={`${u.nombre} ${u.apellido}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-machine font-black">
                              {u.nombre ? u.nombre.charAt(0).toUpperCase() : 'U'}
                              {u.apellido ? u.apellido.charAt(0).toUpperCase() : ''}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-xs">
                            {u.nombre} {u.apellido}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{u.sexo || 'Corredor'}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* DNI */}
                    <td className="px-5 py-3.5 font-bold text-slate-700">
                      {u.dni || '-'}
                    </td>

                    {/* Contacto: Email y Teléfono */}
                    <td className="px-5 py-3.5">
                      <p className="text-slate-700 font-medium">{u.email}</p>
                      {u.telefono && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{u.telefono}</p>
                      )}
                    </td>

                    {/* Ubicación */}
                    <td className="px-5 py-3.5 text-slate-500">
                      {u.ciudad || u.provincia ? (
                        <span>
                          {u.ciudad ? u.ciudad : ''}
                          {u.ciudad && u.provincia ? ', ' : ''}
                          {u.provincia ? u.provincia : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Badge de Rol Actual */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.rol === 'superadmin' ? 'bg-red-100 text-machine border border-red-200' :
                        u.rol === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {u.rol === 'superadmin' && <ShieldAlert className="w-3 h-3 text-machine" />}
                        {u.rol === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-600" />}
                        {u.rol === 'corredor' && <UserIcon className="w-3 h-3 text-slate-500" />}
                        {u.rol}
                      </span>
                    </td>

                    {/* ACCIONES: VER, EDITAR, ELIMINAR */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        
                        {/* Botón VER */}
                        <button
                          onClick={() => handleOpenViewModal(u)}
                          className="p-1.5 text-slate-500 hover:text-machine hover:bg-machine-light rounded-lg transition-colors cursor-pointer border border-transparent hover:border-machine/20"
                          title="Ver datos del usuario y foto de perfil"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Botón EDITAR */}
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-amber-200"
                          title="Editar datos del usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Botón ELIMINAR */}
                        <button
                          onClick={() => handleOpenDeleteModal(u)}
                          disabled={currentUser?._id === u._id}
                          className={`p-1.5 rounded-lg transition-colors border border-transparent ${
                            currentUser?._id === u._id
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer'
                          }`}
                          title={currentUser?._id === u._id ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VER DETALLES DEL USUARIO                                         */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in zoom-in-95">
            
            {/* Cabecera */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-machine" />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Ficha del Usuario
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseViewModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido de la Ficha */}
            <div className="p-6 space-y-6">
              
              {/* Sección Avatar y Nombre */}
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100 text-center sm:text-left">
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-machine/20 flex items-center justify-center text-machine font-black text-2xl shadow-sm overflow-hidden shrink-0">
                  {viewingUser.fotoPerfil ? (
                    <img
                      src={viewingUser.fotoPerfil}
                      alt={`${viewingUser.nombre} ${viewingUser.apellido}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {viewingUser.nombre ? viewingUser.nombre.charAt(0).toUpperCase() : 'U'}
                      {viewingUser.apellido ? viewingUser.apellido.charAt(0).toUpperCase() : ''}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      viewingUser.rol === 'superadmin' ? 'bg-red-100 text-machine border border-red-200' :
                      viewingUser.rol === 'admin' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {viewingUser.rol}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      ID: {viewingUser._id.substring(0, 8)}...
                    </span>
                  </div>
                  <h4 className="text-xl font-black text-slate-800">
                    {viewingUser.nombre} {viewingUser.apellido}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewingUser.fotoPerfil ? 'Foto de perfil personalizada cargada' : 'Sin foto de perfil cargada (avatar por iniciales)'}
                  </p>
                </div>
              </div>

              {/* Grid de Información Detallada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* DNI */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">DNI</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingUser.dni || '-'}</p>
                </div>

                {/* Email */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> Correo Electrónico
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{viewingUser.email}</p>
                </div>

                {/* Fecha de Nacimiento y Edad */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Fecha de Nacimiento
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {formatDate(viewingUser.fechaNacimiento)}
                    {calculateAge(viewingUser.fechaNacimiento) !== null && (
                      <span className="text-xs text-slate-500 font-normal ml-1">
                        ({calculateAge(viewingUser.fechaNacimiento)} años)
                      </span>
                    )}
                  </p>
                </div>

                {/* Sexo */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Sexo</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingUser.sexo || '-'}</p>
                </div>

                {/* Teléfono */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> Teléfono
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingUser.telefono || '-'}</p>
                </div>

                {/* Ubicación */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> Ubicación
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {viewingUser.ciudad || viewingUser.provincia ? (
                      `${viewingUser.ciudad || ''}${viewingUser.ciudad && viewingUser.provincia ? ', ' : ''}${viewingUser.provincia || ''}`
                    ) : '-'}
                  </p>
                </div>

                {/* Contacto de Emergencia */}
                <div className="sm:col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-machine" /> Contacto de Emergencia
                  </p>
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {viewingUser.contactoEmergencia?.nombre || 'No especificado'}
                    </span>
                    <span className="font-semibold text-slate-600 mt-0.5 sm:mt-0">
                      {viewingUser.contactoEmergencia?.telefono || '-'}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const target = viewingUser;
                  handleCloseViewModal();
                  handleOpenEditModal(target);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Usuario</span>
              </button>

              <button
                type="button"
                onClick={handleCloseViewModal}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR USUARIO                                                   */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95">
            
            {/* Cabecera */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Editar Datos del Usuario
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modifica los datos personales y el rol de {editingUser.nombre} {editingUser.apellido}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleRequestSaveEdit} className="p-6 space-y-4">
              
              {editModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* Fila 0: Gestión de Foto de Perfil */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-600 font-bold overflow-hidden shrink-0">
                  {editFotoPerfil ? (
                    <img
                      src={editFotoPerfil}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {editNombre ? editNombre.charAt(0).toUpperCase() : 'U'}
                      {editApellido ? editApellido.charAt(0).toUpperCase() : ''}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-800">Foto de Perfil</p>
                  <p className="text-[11px] text-slate-500">Carga o modifica la imagen de perfil del usuario.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-machine" />
                      <span>{editFotoPerfil ? 'Cambiar foto' : 'Subir foto'}</span>
                    </button>
                    {editFotoPerfil && (
                      <button
                        type="button"
                        onClick={() => setEditFotoPerfil(null)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Fila 1: Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellido <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={editApellido}
                    onChange={(e) => setEditApellido(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: DNI y Correo Electrónico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DNI <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editDni}
                    onChange={handleNumericInput(setEditDni)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico <span className="text-machine">*</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
              </div>

              {/* Fila 3: Fecha de Nacimiento y Sexo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Nacimiento <span className="text-machine">*</span>
                  </label>
                  <input
                    type="date"
                    value={editFechaNacimiento}
                    onChange={(e) => setEditFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sexo <span className="text-machine">*</span>
                  </label>
                  <select
                    value={editSexo}
                    onChange={(e) => setEditSexo(e.target.value as 'Hombre' | 'Mujer')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all cursor-pointer"
                    required
                  >
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
              </div>

              {/* Fila 4: Teléfono, Ciudad y Provincia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editTelefono}
                    onChange={handleNumericInput(setEditTelefono)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ciudad <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={editCiudad}
                    onChange={(e) => setEditCiudad(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Provincia <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={editProvincia}
                    onChange={(e) => setEditProvincia(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
              </div>

              {/* Fila 5: Rol Asignado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rol del Usuario <span className="text-machine">*</span>
                </label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all cursor-pointer"
                  disabled={currentUser?._id === editingUser._id}
                  required
                >
                  <option value="corredor">Corredor</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
                {currentUser?._id === editingUser._id && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    No puedes modificar tu propio rol de SuperAdmin.
                  </p>
                )}
              </div>

              {/* Fila 6: Contacto de Emergencia */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Heart className="w-3.5 h-3.5 text-machine" />
                  <span>Contacto de Emergencia</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nombre de contacto
                    </label>
                    <input
                      type="text"
                      value={editContactoNombre}
                      onChange={(e) => setEditContactoNombre(e.target.value)}
                      placeholder="Nombre del familiar o amigo"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Teléfono de emergencia
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editContactoTelefono}
                      onChange={handleNumericInput(setEditContactoTelefono)}
                      placeholder="Teléfono para emergencias"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>Guardar Cambios</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICACIÓN DE CONFIRMACIÓN OBLIGATORIA: GUARDAR EDICIÓN                   */}
      {/* ========================================================================= */}
      {isConfirmEditOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-800">
                ¿Desea guardar los cambios realizados en el usuario?
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Se actualizarán los datos de <strong className="text-slate-800">{editNombre} {editApellido}</strong> (DNI: {editDni}) en la plataforma.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmEditOpen(false)}
                disabled={isSubmittingEdit}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveEdit}
                disabled={isSubmittingEdit}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar y Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* NOTIFICACIÓN DE CONFIRMACIÓN OBLIGATORIA: ELIMINAR USUARIO                 */}
      {/* ========================================================================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-800">
                ¿Desea eliminar al usuario {deletingUser.nombre} {deletingUser.apellido}?
              </h4>
              <p className="text-xs text-red-600 font-semibold mt-1">
                Esta acción es definitiva e irreversible.
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Se eliminarán permanentemente la cuenta de usuario (DNI: {deletingUser.dni}, Email: {deletingUser.email}) y todas sus inscripciones asociadas del sistema.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isSubmittingDelete}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmittingDelete}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDelete ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Eliminación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR NUEVO USUARIO (Rol Corredor por Defecto)                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-in zoom-in-95">
            
            {/* Cabecera del Modal */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-machine-light text-machine flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Crear Nuevo Usuario
                  </h3>
                  <p className="text-xs text-slate-500">
                    El usuario será registrado con el rol <strong className="text-machine font-bold">Corredor</strong> por defecto.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCreateModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              
              {createModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{createModalError}</span>
                </div>
              )}

              {/* Fila 1: Nombre y Apellido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={createNombre}
                    onChange={(e) => setCreateNombre(e.target.value)}
                    placeholder="Ej. Juan"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellido <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={createApellido}
                    onChange={(e) => setCreateApellido(e.target.value)}
                    placeholder="Ej. Pérez"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
              </div>

              {/* Fila 2: DNI y Correo Electrónico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DNI <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={createDni}
                    onChange={handleNumericInput(setCreateDni)}
                    placeholder="Número de documento sin puntos"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico <span className="text-machine">*</span>
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="juan.perez@ejemplo.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
              </div>

              {/* Fila 3: Fecha de Nacimiento y Sexo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Nacimiento <span className="text-machine">*</span>
                  </label>
                  <input
                    type="date"
                    value={createFechaNacimiento}
                    onChange={(e) => setCreateFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sexo <span className="text-machine">*</span>
                  </label>
                  <select
                    value={createSexo}
                    onChange={(e) => setCreateSexo(e.target.value as 'Hombre' | 'Mujer')}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all cursor-pointer"
                    required
                  >
                    <option value="Hombre">Hombre</option>
                    <option value="Mujer">Mujer</option>
                  </select>
                </div>
              </div>

              {/* Fila 4: Teléfono, Ciudad y Provincia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={createTelefono}
                    onChange={handleNumericInput(setCreateTelefono)}
                    placeholder="Ej. 1123456789"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ciudad <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={createCiudad}
                    onChange={(e) => setCreateCiudad(e.target.value)}
                    placeholder="Ej. Córdoba"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Provincia <span className="text-machine">*</span>
                  </label>
                  <input
                    type="text"
                    value={createProvincia}
                    onChange={(e) => setCreateProvincia(e.target.value)}
                    placeholder="Ej. Córdoba"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    required
                  />
                </div>
              </div>

              {/* Fila 5: Contacto de Emergencia */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Heart className="w-3.5 h-3.5 text-machine" />
                  <span>Contacto de Emergencia</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nombre de contacto
                    </label>
                    <input
                      type="text"
                      value={createContactoNombre}
                      onChange={(e) => setCreateContactoNombre(e.target.value)}
                      placeholder="Nombre del familiar o amigo"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Teléfono de emergencia
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={createContactoTelefono}
                      onChange={handleNumericInput(setCreateContactoTelefono)}
                      placeholder="Teléfono para emergencias"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Fila 6: Contraseña inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña Inicial <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder={createDni ? `Por defecto: Mate${createDni}!` : 'Por defecto: Mate[DNI]!'}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-machine/20 focus:border-machine transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Si se deja en blanco, el sistema asignará automáticamente <strong className="text-slate-600">{createDni ? `Mate${createDni}!` : 'Mate[DNI]!'}</strong>.
                </p>
              </div>

              {/* Botones de Acción del Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Crear Usuario</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
