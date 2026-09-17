/**
 * ==============================================================================
 * GESTIÓN DE USUARIOS (UserManagement) - MateRun
 * ==============================================================================
 * Panel exclusivo para SuperAdmin. Permite listar usuarios y cambiar roles.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { User } from '../../types';
import { ShieldAlert, ShieldCheck, User as UserIcon } from 'lucide-react';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!window.confirm(`¿Seguro que desea cambiar el rol a ${newRole}?`)) return;
    try {
      await api.patch(`/users/${userId}/role`, { nuevoRol: newRole });
      fetchUsers();
    } catch (error) {
      alert("Error al actualizar el rol.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestión de Usuarios</h2>
        <p className="text-slate-500 mt-1">Modifica los niveles de acceso del personal del sistema.</p>
      </div>

      <div className="card-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Nombre Completo</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold text-center">Rol Actual</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-8">Cargando...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                        {u.rol === 'superadmin' ? <ShieldAlert className="w-4 h-4 text-machine" /> : 
                         u.rol === 'admin' ? <ShieldCheck className="w-4 h-4 text-amber-500" /> : 
                         <UserIcon className="w-4 h-4" />}
                      </div>
                      {u.nombre} {u.apellido}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{u.email}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        u.rol === 'superadmin' ? 'bg-red-100 text-machine' :
                        u.rol === 'admin' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select 
                        value={u.rol}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-machine outline-none"
                      >
                        <option value="corredor">Hacer Corredor</option>
                        <option value="admin">Hacer Admin</option>
                        <option value="superadmin">Hacer SuperAdmin</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
