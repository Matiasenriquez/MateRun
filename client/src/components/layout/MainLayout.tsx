/**
 * ==============================================================================
 * LAYOUT PRINCIPAL (MainLayout) - MateRun
 * ==============================================================================
 * Estructura visual principal basada en el diseño "SaaS Limpio".
 * Consta de:
 * 1. Cabecera blanca con título "MateRun" a la izquierda y el nombre del sistema
 *    en rojo ("SISTEMA DE INSCRIPCIONES...") a la derecha (según la referencia).
 * 2. Barra de navegación secundaria roja (#FF2E3A) con links dinámicos por rol.
 * 3. Contenedor de fondo Porcelana para las tarjetas de vistas.
 * ==============================================================================
 */

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Settings, Calendar, Activity, FileText } from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Función para determinar si un enlace está activo
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-porcelain flex flex-col">
      {/* 1. CABECERA SUPERIOR BLANCA */}
      <header className="bg-white h-20 border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20">
        {/* LOGO DE LA MARCA EMPRESA (Texto Rojo) */}
        <div className="flex items-center gap-2 text-machine">
          <Activity className="w-8 h-8" strokeWidth={2.5} />
          <div className="flex flex-col leading-none">
            <span className="font-black text-2xl italic tracking-tight">MateRun</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {user?.rol === 'superadmin' ? 'Super Admin' : user?.rol === 'admin' ? 'Administración' : 'Corredor'}
            </span>
          </div>
        </div>

        {/* TÍTULO DEL SISTEMA (Visible en pantallas medianas o grandes) */}
        <div className="hidden md:block">
          <h1 className="text-machine font-bold text-lg md:text-xl uppercase tracking-wide">
            Sistema de Inscripciones para Trail Running y Maratones
          </h1>
        </div>

        {/* PERFIL Y LOGOUT */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-700">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <UserIcon className="w-4 h-4 text-slate-600" />
            </div>
            <span>{user?.nombre} {user?.apellido}</span>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-machine transition-colors p-2"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. BARRA DE NAVEGACIÓN ROJA (Navbar) */}
      <nav className="bg-machine text-white shadow-md z-10 sticky top-0">
        <div className="flex items-center overflow-x-auto">
          {/* Enlaces para CORREDOR */}
          {user?.rol === 'corredor' && (
            <>
              <NavItem to="/dashboard" icon={<Calendar />} text="Próximas Carreras" active={location.pathname === '/dashboard'} />
              <NavItem to="/my-registrations" icon={<FileText />} text="Mis Inscripciones" active={isActive('/my-registrations')} />
              <NavItem to="/my-stats" icon={<Activity />} text="Mis Datos" active={isActive('/my-stats')} />
            </>
          )}

          {/* Enlaces para ADMINISTRADOR y SUPERADMIN */}
          {(user?.rol === 'admin' || user?.rol === 'superadmin') && (
            <>
              <NavItem to="/dashboard" icon={<Calendar />} text="Panel de Control" active={location.pathname === '/dashboard'} />
            </>
          )}

          {/* Enlaces exclusivos para SUPERADMIN */}
          {user?.rol === 'superadmin' && (
            <>
              <NavItem to="/admin/races" icon={<Settings />} text="Gestión de Carreras" active={isActive('/admin/races')} />
              <NavItem to="/admin/users" icon={<UserIcon />} text="Usuarios y Roles" active={isActive('/admin/users')} />
            </>
          )}
        </div>
      </nav>

      {/* 3. CONTENEDOR PRINCIPAL DE LA VISTA (Outlet) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

// Sub-componente interno para los enlaces de la barra de navegación roja
interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  active: boolean;
}
const NavItem: React.FC<NavItemProps> = ({ to, icon, text, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-5 py-3 font-medium text-sm transition-colors whitespace-nowrap border-b-2
      ${active ? 'bg-black/10 border-white text-white' : 'border-transparent hover:bg-black/5 text-white/90 hover:text-white'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
    {text}
  </Link>
);
