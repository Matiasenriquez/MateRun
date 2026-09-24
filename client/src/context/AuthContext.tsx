/**
 * ==============================================================================
 * CONTEXTO DE AUTENTICACIÓN (AuthContext) - MateRun
 * ==============================================================================
 * Maneja el estado global del usuario logueado en React.
 * Proporciona métodos para login, logout y carga del perfil al recargar la página.
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('materun_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Al cargar la app, si hay token, intentamos recuperar el perfil del usuario (getMe)
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<{ user: User }>('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Error verificando sesión activa:', error);
        localStorage.removeItem('materun_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('materun_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('materun_token');
    sessionStorage.clear();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para consumir el contexto fácilmente
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
