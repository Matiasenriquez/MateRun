/**
 * ==============================================================================
 * FORMULARIO DE INSCRIPCIÓN A CARRERA (RaceRegistrationForm.tsx) - MateRun
 * ==============================================================================
 * Esta vista permite a un usuario con rol "corredor" completar todos sus datos
 * para registrarse en una carrera deportiva específica.
 * 
 * Características clave:
 * 1. Carga dinámica de la carrera seleccionada por URL (/register-race/:raceId).
 * 2. Precarga automática de datos existentes del usuario en sesión (AuthContext).
 * 3. Restricción estricta en tiempo real para inputs numéricos (Teléfono y Contacto de emergencia).
 * 4. Selector de talles de remera con botones de radio estilizados idénticos a la referencia.
 * 5. Modal de confirmación interactivo: "¿La información cargada es correcta?"
 *    que resume todos los datos antes del envío a la base de datos.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Race } from '../../types';
import { User, Plus, X, AlertCircle, CheckCircle2, Calendar, MapPin } from 'lucide-react';

export const RaceRegistrationForm: React.FC = () => {
  // Parámetro de la URL con el identificador de la carrera
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estado con la información de la carrera seleccionada
  const [race, setRace] = useState<Race | null>(null);
  const [isRaceLoading, setIsRaceLoading] = useState<boolean>(true);

  // Estados individuales de los campos del formulario
  const [nombre, setNombre] = useState<string>('');
  const [apellido, setApellido] = useState<string>('');
  const [dni, setDni] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [contactoEmergencia, setContactoEmergencia] = useState<string>('');
  const [sexo, setSexo] = useState<string>('Mujer');
  const [fechaNacimiento, setFechaNacimiento] = useState<string>('');
  const [distancia, setDistancia] = useState<string>('');
  const [ciudadProvincia, setCiudadProvincia] = useState<string>('');
  const [talleRemera, setTalleRemera] = useState<string>('M');

  // Estados para alertas y carga
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Estado para controlar la visualización del Modal de Verificación
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  /**
   * Efecto 1: Carga los datos de la carrera desde la API.
   * Obtiene nombre, cupos y distancias habilitadas para poblar el ComboBox.
   */
  useEffect(() => {
    const fetchRaceDetails = async () => {
      if (!raceId) return;
      try {
        setIsRaceLoading(true);
        const res = await api.get(`/races/${raceId}`);
        const raceData: Race = res.data.race;
        setRace(raceData);

        // Preseleccionar la primera distancia disponible si existe
        if (raceData.distancias && raceData.distancias.length > 0) {
          setDistancia(String(raceData.distancias[0]));
        }
      } catch (err: any) {
        console.error('Error al cargar detalle de la carrera:', err);
        setFormError('No se pudo cargar la información de la carrera.');
      } finally {
        setIsRaceLoading(false);
      }
    };

    fetchRaceDetails();
  }, [raceId]);

  /**
   * Efecto 2: Precarga los datos personales del usuario logueado.
   * Facilita la experiencia del corredor para no reescribir todo en cada carrera.
   */
  useEffect(() => {
    if (user) {
      if (user.nombre) setNombre(user.nombre);
      if (user.apellido) setApellido(user.apellido);
      if (user.dni) setDni(user.dni);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  /**
   * Helper: Manejador para inputs estrictamente numéricos.
   * Filtra en tiempo real cualquier carácter que no sea un dígito (0-9).
   */
  const handleNumericInput = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, '');
    setter(onlyDigits);
  };

  /**
   * Manejador del botón "Aceptar" del formulario:
   * Valida que todos los campos obligatorios contengan información
   * y abre el modal de confirmación si todo es válido.
   */
  const handleOpenConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validar campos requeridos
    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !dni.trim() ||
      !email.trim() ||
      !telefono.trim() ||
      !contactoEmergencia.trim() ||
      !sexo ||
      !fechaNacimiento ||
      !distancia ||
      !ciudadProvincia.trim() ||
      !talleRemera
    ) {
      setFormError('Por favor complete todos los campos del formulario antes de continuar.');
      return;
    }

    // Abrir modal de verificación
    setShowConfirmModal(true);
  };

  /**
   * Manejador final del Modal ("Aceptar" dentro del modal):
   * Envía la petición POST /api/registrations con los datos verificados.
   */
  const handleConfirmRegistration = async () => {
    if (!raceId) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      await api.post('/registrations', {
        carreraId: raceId,
        distancia: Number(distancia),
        talleRemera,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        dni: dni.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim(),
        contactoEmergencia: contactoEmergencia.trim(),
        sexo, // El backend normaliza 'Mujer' a 'Femenino' / 'Hombre' a 'Masculino'
        fechaNacimiento,
        ciudadProvincia: ciudadProvincia.trim(),
      });

      // Cerrar modal y redirigir a "Mis Inscripciones"
      setShowConfirmModal(false);
      navigate('/my-registrations');
    } catch (err: any) {
      console.error('Error al registrar inscripción:', err);
      setShowConfirmModal(false);
      const serverMessage = err.response?.data?.message || 'Ocurrió un error al procesar la inscripción.';
      setFormError(serverMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Manejador para el botón "Cancelar" del formulario principal:
   * Regresa al panel de Próximas Carreras.
   */
  const handleCancelForm = () => {
    navigate('/dashboard');
  };

  // Listado de talles de remera permitidos en la interfaz
  const tallesDisponibles = ['XS', 'S', 'M', 'L', 'XL', '2XL'];

  if (isRaceLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-machine rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Cargando datos del evento...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4">
      {/* TARJETA SUPERIOR CON DETALLE DE LA CARRERA */}
      {race && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-machine bg-machine-light px-2.5 py-1 rounded">
              Inscripción a Carrera
            </span>
            <h1 className="text-xl font-black text-slate-800 mt-1.5">{race.nombre}</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-machine" />
              <span>{new Date(race.fecha).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span>{race.lugar}</span>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE DE ERROR (Si ocurre) */}
      {formError && (
        <div className="mb-6 p-4 bg-machine-light border border-machine/20 text-machine rounded-xl text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">{formError}</p>
        </div>
      )}

      {/* TARJETA PRINCIPAL: DATOS DEL INSCRIPTO (Basada en la imagen de referencia) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        
        {/* ENCABEZADO CON ÍCONO ROJO Y TÍTULO */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-6">
          <User className="w-6 h-6 text-machine" strokeWidth={2.2} />
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            DATOS DEL INSCRIPTO
          </h2>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleOpenConfirmation} className="space-y-4">
          
          {/* 1. Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Nombre</label>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ingrese el nombre"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 2. Apellido */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Apellido</label>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                placeholder="Ingrese el apellido"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 3. DNI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">DNI</label>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="Ingrese el DNI"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 4. Correo Electrónico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Correo electrónico</label>
            <div className="sm:col-span-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingrese el correo electrónico"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 5. Teléfono (Solo numérico) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Teléfono</label>
            <div className="sm:col-span-2">
              <input
                type="text"
                inputMode="numeric"
                value={telefono}
                onChange={handleNumericInput(setTelefono)}
                placeholder="Ingrese el teléfono (solo números)"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 6. Contacto de Emergencia (Solo numérico) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Contacto de emergencia</label>
            <div className="sm:col-span-2">
              <input
                type="text"
                inputMode="numeric"
                value={contactoEmergencia}
                onChange={handleNumericInput(setContactoEmergencia)}
                placeholder="Ingrese el teléfono de contacto de emergencia"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 7. Sexo (ComboBox: Mujer / Hombre) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Sexo</label>
            <div className="sm:col-span-2">
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

          {/* 8. Fecha de Nacimiento (DateTimePicker / HTML5 Date) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Fecha de nacimiento</label>
            <div className="sm:col-span-2">
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 9. Distancia a Correr (ComboBox dinámico según la carrera) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Distancia a correr</label>
            <div className="sm:col-span-2">
              <select
                value={distancia}
                onChange={(e) => setDistancia(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Seleccione la distancia</option>
                {race?.distancias?.map((d) => (
                  <option key={d} value={String(d)}>
                    {d} km
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 10. Ciudad y Provincia */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-1.5 sm:gap-4">
            <label className="text-sm font-bold text-slate-800">Ciudad y Provincia</label>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={ciudadProvincia}
                onChange={(e) => setCiudadProvincia(e.target.value)}
                placeholder="Ingrese la ciudad y provincia"
                className="input-field"
                required
              />
            </div>
          </div>

          {/* 11. Talle de Remera (Radio Buttons horizontales con círculo rojo) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4 pt-2">
            <label className="text-sm font-bold text-slate-800">Talle de remera</label>
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
                {tallesDisponibles.map((talle) => {
                  const isSelected = talleRemera === talle;
                  return (
                    <label
                      key={talle}
                      className="flex flex-col items-center cursor-pointer group select-none"
                    >
                      {/* Texto del talle */}
                      <span className={`text-xs font-bold mb-1.5 ${isSelected ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                        {talle}
                      </span>
                      {/* Input de Radio real oculto accesible */}
                      <input
                        type="radio"
                        name="talleRemera"
                        value={talle}
                        checked={isSelected}
                        onChange={() => setTalleRemera(talle)}
                        className="sr-only"
                      />
                      {/* Círculo estilizado idéntico a la imagen */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-machine bg-white'
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-machine animate-scale-in"></div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN: AGREGAR Y CANCELAR */}
          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              className="btn-primary w-full sm:flex-1 py-3 text-sm font-bold uppercase tracking-wider"
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
              Aceptar
            </button>
            <button
              type="button"
              onClick={handleCancelForm}
              className="w-full sm:flex-1 py-3 px-6 text-sm font-bold uppercase tracking-wider bg-slate-500 hover:bg-slate-600 text-white rounded-md flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
              Cancelar
            </button>
          </div>

        </form>
      </div>

      {/* ========================================================================
          MODAL DE CONFIRMACIÓN DE INFORMACIÓN
          "¿La información cargada es correcta?"
          ======================================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-200">
            
            {/* Cabecera del Modal */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-machine-light text-machine flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 leading-snug">
                  ¿La información cargada es correcta?
                </h3>
                <p className="text-xs text-slate-500">
                  Verifica que tus datos sean exactos antes de confirmar tu inscripción.
                </p>
              </div>
            </div>

            {/* Resumen de los datos cargados */}
            <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-700 space-y-2 border border-slate-200/70 mb-6 max-h-[50vh] overflow-y-auto">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Carrera:</span>
                <span className="font-black text-slate-800 text-right">{race?.nombre}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Distancia a correr:</span>
                <span className="font-black text-machine text-right">{distancia} km</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Nombre completo:</span>
                <span className="font-semibold text-slate-800 text-right">{nombre} {apellido}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">DNI:</span>
                <span className="font-semibold text-slate-800 text-right">{dni}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Correo electrónico:</span>
                <span className="font-semibold text-slate-800 text-right">{email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Teléfono:</span>
                <span className="font-semibold text-slate-800 text-right">{telefono}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Contacto de emergencia:</span>
                <span className="font-semibold text-slate-800 text-right">{contactoEmergencia}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Sexo:</span>
                <span className="font-semibold text-slate-800 text-right">{sexo}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Fecha de nacimiento:</span>
                <span className="font-semibold text-slate-800 text-right">{fechaNacimiento}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-500">Ciudad y Provincia:</span>
                <span className="font-semibold text-slate-800 text-right">{ciudadProvincia}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-slate-500">Talle de remera:</span>
                <span className="font-black text-machine text-right">{talleRemera}</span>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="py-2.5 px-5 text-sm font-bold rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors uppercase"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRegistration}
                disabled={isSubmitting}
                className="btn-primary py-2.5 px-6 text-sm font-bold uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  'Aceptar'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RaceRegistrationForm;
