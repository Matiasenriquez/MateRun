/**
 * ==============================================================================
 * VISTA DE LOGIN (Login Page) - MateRun
 * ==============================================================================
 * Pantalla pública inicial. Aplica los estilos de la marca (Blanco Porcelana,
 * Rojo Machine). Gestiona la autenticación llamando al endpoint POST /api/auth/login.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { Activity, Mail, Lock, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Obtener la ruta a la que intentaba ir el usuario antes de ser redirigido aquí
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      // Guardar token y usuario en el contexto
      login(res.data.token, res.data.user);
      // Redirigir
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  // Ayudante rápido para desarrollo
  const fillTestCredentials = (role: 'corredor' | 'admin' | 'superadmin') => {
    setEmail(`${role}@materun.com`);
    if (role === 'superadmin') {
      setPassword('SuperAdmin123!');
    } else if (role === 'admin') {
      setPassword('Admin123!');
    } else {
      setPassword('Corredor123!');
    }
  };

  return (
    <div className="min-h-screen bg-porcelain flex items-center justify-center p-4">
      <div className="card-panel max-w-md w-full shadow-lg shadow-slate-200/50">
        
        {/* ENCABEZADO DE LOGIN */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-machine-light text-machine mb-4">
            <Activity className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">MateRun</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistema de Inscripciones para Trail Running y Maratones
          </p>
        </div>

        {/* ALERTA DE ERROR */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="ejemplo@correo.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <a href="#" className="text-xs text-machine hover:underline font-medium">
                ¿Olvidó su contraseña?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-2.5 text-base shadow-md shadow-machine/20"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        {/* Cuentas de prueba (Solo para desarrollo) */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-center font-semibold text-slate-500 mb-3 uppercase tracking-wider">
            Autocompletar Cuentas de Prueba
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => fillTestCredentials('corredor')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded transition-colors font-medium">
              Corredor
            </button>
            <button onClick={() => fillTestCredentials('admin')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded transition-colors font-medium">
              Admin
            </button>
            <button onClick={() => fillTestCredentials('superadmin')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded transition-colors font-medium">
              SuperAdmin
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};
