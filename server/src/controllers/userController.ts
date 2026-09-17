/**
 * ==============================================================================
 * CONTROLADOR DE USUARIOS Y ROLES (User Controller) - MateRun
 * ==============================================================================
 * Facilita las operaciones CRUD sobre usuarios y corredores para perfiles
 * de Administrador y SuperAdmin:
 * 1. getAllUsers: Listado de usuarios con filtros por rol y búsqueda por texto.
 * 2. getUserById: Consulta de perfil detallado.
 * 3. updateUser: Edición administrativa de un usuario.
 * 4. changeUserRole: Asignación de roles ('corredor', 'admin', 'superadmin') - SuperAdmin.
 * 5. deleteUser: Eliminación de cuentas de usuario.
 * ==============================================================================
 */

import { Request, Response } from 'express';
import { User } from '../models/User';
import { Registration } from '../models/Registration';

/**
 * Lista todos los usuarios registrados en el sistema.
 * 
 * Ruta: GET /api/users
 * Acceso: Admin o SuperAdmin
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rol, search } = req.query;

    const filter: Record<string, any> = {};

    if (rol && typeof rol === 'string') {
      filter.rol = rol;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { nombre: searchRegex },
        { apellido: searchRegex },
        { dni: searchRegex },
        { email: searchRegex },
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({ users });
  } catch (error: any) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Obtiene el detalle de un usuario por su ID.
 * 
 * Ruta: GET /api/users/:id
 * Acceso: Admin o SuperAdmin
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ user });
  } catch (error: any) {
    console.error('Error al buscar usuario por ID:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Actualiza los datos de un usuario desde el panel de administración.
 * 
 * Ruta: PUT /api/users/:id
 * Acceso: Admin o SuperAdmin
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      apellido,
      dni,
      email,
      telefono,
      fechaNacimiento,
      sexo,
      ciudad,
      provincia,
      contactoEmergencia,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (nombre) user.nombre = nombre.trim();
    if (apellido) user.apellido = apellido.trim();
    if (dni) user.dni = dni.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (telefono !== undefined) user.telefono = telefono.trim();
    if (fechaNacimiento) user.fechaNacimiento = new Date(fechaNacimiento);
    if (sexo) user.sexo = sexo;
    if (ciudad !== undefined) user.ciudad = ciudad.trim();
    if (provincia !== undefined) user.provincia = provincia.trim();
    if (contactoEmergencia) user.contactoEmergencia = contactoEmergencia;

    await user.save();

    const userSafe = user.toObject();
    delete userSafe.password;

    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      user: userSafe,
    });
  } catch (error: any) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Asigna o modifica el rol de un usuario ('corredor', 'admin', 'superadmin').
 * 
 * Ruta: PATCH /api/users/:id/role
 * Acceso: SuperAdmin únicamente
 */
export const changeUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nuevoRol } = req.body;

    const rolesValidos = ['corredor', 'admin', 'superadmin'];
    if (!rolesValidos.includes(nuevoRol)) {
      res.status(400).json({
        error: 'Rol inválido',
        message: `El rol debe ser uno de: ${rolesValidos.join(', ')}`,
      });
      return;
    }

    // Evitar que el SuperAdmin se quite a sí mismo el rol por accidente
    if (req.user?.id === id && nuevoRol !== 'superadmin') {
      res.status(400).json({
        error: 'Acción no permitida',
        message: 'No puedes degradar tu propio rol de SuperAdmin',
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    user.rol = nuevoRol;
    await user.save();

    res.status(200).json({
      message: `Rol del usuario ${user.nombre} ${user.apellido} actualizado a '${nuevoRol}'`,
      user: {
        _id: user._id,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error: any) {
    console.error('Error al cambiar rol:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};

/**
 * Elimina un usuario del sistema y sus inscripciones.
 * 
 * Ruta: DELETE /api/users/:id
 * Acceso: Admin o SuperAdmin
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prohibir que un usuario se elimine a sí mismo
    if (req.user?.id === id) {
      res.status(400).json({
        error: 'Acción no permitida',
        message: 'No puedes eliminar tu propia cuenta mientras estás conectado',
      });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Limpiar inscripciones asociadas
    await Registration.deleteMany({ corredor: id });
    await User.findByIdAndDelete(id);

    res.status(200).json({
      message: `Usuario ${user.nombre} ${user.apellido} eliminado correctamente`,
    });
  } catch (error: any) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
