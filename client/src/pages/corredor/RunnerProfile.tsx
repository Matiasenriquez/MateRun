/**
 * ==============================================================================
 * PERFIL Y DATOS PERSONALES DEL CORREDOR (RunnerProfile.tsx) - MateRun
 * ==============================================================================
 * Permite al usuario Corredor visualizar y editar sus propios datos personales.
 * 
 * Regla de negocio crítica:
 * - Cada corredor cuenta con un perfil personal e individual.
 * - Los datos actualizados aquí se sincronizan con la base de datos y AuthContext.
 * - Posteriormente, se autocompletan de forma inmutable y protegida en el formulario
 *   de inscripción a carreras para garantizar que cada usuario solo pueda inscribirse a sí mismo.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { 
  User, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Heart,
  Loader2
} from 'lucide-react';

export const RunnerProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Estados locales para los campos del perfil
  const [nombre, setNombre] = useState<string>('');
  const [apellido, setApellido] = useState<string>('');
  const [dni, setDni] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [sexo, setSexo] = useState<string>('Mujer');
  const [ciudad, setCiudad] = useState<string>('');
  const [provincia, setProvincia] = useState<string>('');
  const [contactoEmergenciaNombre, setContactoEmergenciaNombre] = useState<string>('');
  const [contactoEmergenciaTelefono, setContactoEmergenciaTelefono] = useState<string>('');

  // Estados de feedback y carga
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Precargar los datos actuales del usuario en sesión
  useEffect(() => {
    if (user) {
      setNombre(user.nombre || '');
      setApellido(user.apellido || '');
      setDni(user.dni || '');
      setEmail(user.email || '');
      setTelefono(user.telefono || '');
      
      if (user.fechaNacimiento) {
        const d = new Date(user.fechaNacimiento);
        if (!isNaN(d.getTime())) {
          setFechaNacimiento(d.toISOString().split('T')[0]);
        }
      }
      
      if (user.sexo) {
        setSexo(user.sexo === 'Femenino' ? 'Mujer' : 'Hombre');
      }

      setCiudad(user.ciudad || '');
      setProvincia(user.provincia || '');

      if (user.contactoEmergencia) {
        if (typeof user.contactoEmergencia === 'object') {
          setContactoEmergenciaNombre(user.contactoEmergencia.nombre || '');
          setContactoEmergenciaTelefono(user.contactoEmergencia.telefono || '');
        } else if (typeof user.contactoEmergencia === 'string') {
          setContactoEmergenciaTelefono(user.contactoEmergencia);
        }
      }
    }
  }, [user]);

  // Manejador para inputs numéricos
  const handleNumericInput = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setter(onlyDigits);
  };

  // Manejador del guardado de cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    // Validar campos obligatorios
    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !dni.trim() ||
      !email.trim() ||
      !fechaNacimiento ||
      !sexo ||
      !telefono.trim() ||
      !ciudad.trim() ||
      !provincia.trim()
    ) {
      setErrorMessage('Por favor complete todos los campos obligatorios marcados con asterisco (*).');
      return;
    }

    try {
      setIsLoading(true);

      const res = await api.put('/auth/me', {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        fechaNacimiento,
        sexo, // El backend normaliza 'Mujer' / 'Hombre'
        ciudad: ciudad.trim(),
        provincia: provincia.trim(),
        contactoEmergencia: {
          nombre: contactoEmergenciaNombre.trim() || 'Contacto de Emergencia',
          telefono: contactoEmergenciaTelefono.trim(),
        },
      });

      // Actualizar el estado global del usuario en AuthContext
      if (res.data.user) {
        updateUser(res.data.user);
      }

      setSuccessMessage('¡Datos personales actualizados exitosamente! La nueva información se utilizará de forma automática en tus próximas inscripciones.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error al actualizar datos personales:', err);
      const msg = err.response?.data?.message || 'No se pudieron actualizar los datos personales.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-4">
      
      {/* BOTÓN VOLVER */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-machine" />
          <span>Volver al Panel</span>
        </button>
      </div>

      {/* ENCABEZADO DE LA SECCIÓN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-machine/10 text-machine flex items-center justify-center border-2 border-machine/20 font-black text-xl">
            {nombre ? nombre.charAt(0).toUpperCase() : 'C'}
            {apellido ? apellido.charAt(0).toUpperCase() : ''}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-0.5 rounded">
                Perfil Oficial
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Corredor
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-800 mt-1 tracking-tight">
              Mis Datos Personales
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Edita tu información personal para mantener siempre actualizados tus registros deportivos e inscripciones.
            </p>
          </div>
        </div>
      </div>

      {/* AVISOS DE ÉXITO O ERROR */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-start gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Cambios guardados</p>
            <p className="text-xs text-green-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Atención</p>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* AVISO INFORMATIVO DE SEGURIDAD Y REGLA DE NEGOCIO */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 mb-6 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950">Garantía de identidad en inscripciones</p>
          <p className="mt-0.5 text-amber-800/90 leading-relaxed">
            Tu <strong>Nombre, Apellido, DNI, Fecha de nacimiento, Sexo y Correo electrónico</strong> se utilizan automáticamente en el formulario de inscripción a carreras y no podrán modificarse durante la inscripción. Si necesitas modificarlos, debes hacerlo exclusivamente desde este apartado.
          </p>
        </div>
      </div>

      {/* FORMULARIO DE EDICIÓN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* SECCIÓN 1: IDENTIDAD BÁSICA */}
          <div className="border-b border-slate-100 pb-3 mb-2 flex items-center gap-2 text-slate-800">
            <User className="w-4 h-4 text-machine" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Identificación Oficial
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre <span className="text-machine">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingresa tu nombre"
                className="input-field"
                required
              />
            </div>

            {/* Apellido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Apellido <span className="text-machine">*</span>
              </label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ingresa tu apellido"
                className="input-field"
                required
              />
            </div>

            {/* DNI */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                DNI <span className="text-machine">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={dni}
                onChange={handleNumericInput(setDni)}
                placeholder="Ingresa tu número de documento"
                className="input-field"
                required
              />
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Correo Electrónico <span className="text-machine">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="input-field"
                required
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Fecha de Nacimiento <span className="text-machine">*</span>
              </label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Sexo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Sexo <span className="text-machine">*</span>
              </label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                className="input-field"
                required
              >
                <option value="Mujer">Mujer</option>
                <option value="Hombre">Hombre</option>
              </select>
            </div>
          </div>

          {/* SECCIÓN 2: CONTACTO Y LOCALIZACIÓN */}
          <div className="border-b border-slate-100 pb-3 pt-4 mb-2 flex items-center gap-2 text-slate-800">
            <MapPin className="w-4 h-4 text-machine" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Contacto y Localización
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Teléfono */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Teléfono <span className="text-machine">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={telefono}
                onChange={handleNumericInput(setTelefono)}
                placeholder="Teléfono móvil"
                className="input-field"
                required
              />
            </div>

            {/* Ciudad */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ciudad <span className="text-machine">*</span>
              </label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ciudad de residencia"
                className="input-field"
                required
              />
            </div>

            {/* Provincia */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Provincia <span className="text-machine">*</span>
              </label>
              <input
                type="text"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                placeholder="Provincia"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* SECCIÓN 3: CONTACTO DE EMERGENCIA */}
          <div className="border-b border-slate-100 pb-3 pt-4 mb-2 flex items-center gap-2 text-slate-800">
            <Heart className="w-4 h-4 text-machine" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Contacto de Emergencia
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre del contacto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Nombre y Apellido del Contacto
              </label>
              <input
                type="text"
                value={contactoEmergenciaNombre}
                onChange={(e) => setContactoEmergenciaNombre(e.target.value)}
                placeholder="Nombre de la persona de contacto"
                className="input-field"
              />
            </div>

            {/* Teléfono del contacto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Teléfono de Emergencia
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={contactoEmergenciaTelefono}
                onChange={handleNumericInput(setContactoEmergenciaTelefono)}
                placeholder="Teléfono para emergencias"
                className="input-field"
              />
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-machine hover:bg-machine-dark rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
