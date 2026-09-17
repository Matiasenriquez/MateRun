/**
 * ==============================================================================
 * ENRUTADOR PRINCIPAL (App.tsx) - MateRun
 * ==============================================================================
 * Define las rutas de la aplicación utilizando React Router v7.
 * Integra el AuthProvider para inyectar el estado de sesión y utiliza el
 * componente ProtectedRoute para restringir el acceso a vistas privadas.
 * ==============================================================================
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/Dashboard';
import { MyRegistrations } from './pages/corredor/MyRegistrations';
import { MyStats } from './pages/corredor/MyStats';
import { RaceManagement } from './pages/superadmin/RaceManagement';
import { UserManagement } from './pages/superadmin/UserManagement';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          
          {/* Redirección del directorio raíz */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rutas Privadas (Protegidas) dentro del MainLayout */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            
            {/* Vistas comunes: El Dashboard es dinámico según el rol */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Rutas exclusivas de Corredor */}
            <Route 
              path="/my-registrations" 
              element={<ProtectedRoute allowedRoles={['corredor']}><MyRegistrations /></ProtectedRoute>} 
            />
            <Route 
              path="/my-stats" 
              element={<ProtectedRoute allowedRoles={['corredor']}><MyStats /></ProtectedRoute>} 
            />
            
            {/* Rutas exclusivas de SuperAdmin */}
            <Route 
              path="/admin/races" 
              element={<ProtectedRoute allowedRoles={['superadmin']}><RaceManagement /></ProtectedRoute>} 
            />
            <Route 
              path="/admin/users" 
              element={<ProtectedRoute allowedRoles={['superadmin']}><UserManagement /></ProtectedRoute>} 
            />
          </Route>
          
          {/* Ruta Catch-All (404) */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
