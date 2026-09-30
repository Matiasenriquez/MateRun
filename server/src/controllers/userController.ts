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
 * Crea un nuevo usuario en la plataforma (por defecto con rol 'corredor').
 * Exclusivo para SuperAdmin desde el panel de "Usuarios y Roles".
 * 
 * Ruta: POST /api/users
 * Acceso: SuperAdmin
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      apellido,
      dni,
      email,
      password,
      telefono,
      fechaNacimiento,
      sexo,
      ciudad,
      provincia,
      contactoEmergencia,
      rol,
    } = req.body;

    // 1. Validar campos obligatorios que posee el perfil del corredor
    if (
      !nombre ||
      !apellido ||
      !dni ||
      !email ||
      !fechaNacimiento ||
      !sexo ||
      !telefono ||
      !ciudad ||
      !provincia
    ) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Por favor complete todos los campos obligatorios del usuario',
      });
      return;
    }

    const cleanDni = dni.toString().trim();
    const cleanEmail = email.toString().toLowerCase().trim();

    // 2. Comprobar si ya existe un usuario con el mismo DNI
    const existingDni = await User.findOne({ dni: cleanDni });
    if (existingDni) {
      res.status(400).json({
        error: 'DNI ya registrado',
        message: 'El número de DNI ingresado ya se encuentra registrado por otro usuario.',
      });
      return;
    }

    // 3. Comprobar si ya existe un usuario con el mismo correo electrónico
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      res.status(400).json({
        error: 'Correo ya registrado',
        message: 'El correo electrónico ingresado ya se encuentra en uso por otra cuenta.',
      });
      return;
    }

    // Normalizar Sexo: 'Mujer' / 'Femenino' -> 'Femenino', caso contrario 'Masculino'
    const normalizedSexo = (sexo === 'Mujer' || sexo === 'Femenino') ? 'Femenino' : 'Masculino';

    // Normalizar Contacto de Emergencia
    let formattedContactoEmergencia = undefined;
    if (contactoEmergencia) {
      if (typeof contactoEmergencia === 'object') {
        formattedContactoEmergencia = {
          nombre: contactoEmergencia.nombre ? contactoEmergencia.nombre.trim() : 'Contacto de Emergencia',
          telefono: contactoEmergencia.telefono ? String(contactoEmergencia.telefono).trim() : '',
        };
      } else if (typeof contactoEmergencia === 'string' && contactoEmergencia.trim() !== '') {
        formattedContactoEmergencia = {
          nombre: 'Contacto de Emergencia',
          telefono: contactoEmergencia.trim(),
        };
      }
    }

    // Contraseña inicial: si no se especifica o es menor a 6 caracteres, asignar por defecto Mate{dni}!
    const finalPassword = password && password.trim().length >= 6
      ? password.trim()
      : `Mate${cleanDni}!`;

    // Rol: por defecto 'corredor', o el especificado si es válido
    const userRole = (rol === 'admin' || rol === 'superadmin') ? rol : 'corredor';

    // 4. Crear y guardar el nuevo usuario
    const newUser = new User({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: cleanDni,
      email: cleanEmail,
      password: finalPassword,
      telefono: telefono.toString().trim(),
      fechaNacimiento: new Date(fechaNacimiento),
      sexo: normalizedSexo,
      ciudad: ciudad.trim(),
      provincia: provincia.trim(),
      contactoEmergencia: formattedContactoEmergencia,
      rol: userRole,
    });

    await newUser.save();

    const userSafe = newUser.toObject();
    delete userSafe.password;

    res.status(201).json({
      message: 'Usuario creado exitosamente con el rol Corredor',
      user: userSafe,
      initialPassword: finalPassword,
    });
  } catch (error: any) {
    console.error('Error al crear usuario:', error);
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
      rol,
      fotoPerfil,
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // 1. Validar DNI si fue modificado (debe ser único)
    if (dni && dni.toString().trim() !== user.dni) {
      const cleanDni = dni.toString().trim();
      const existingDni = await User.findOne({ dni: cleanDni, _id: { $ne: user._id } });
      if (existingDni) {
        res.status(400).json({
          error: 'DNI ya registrado',
          message: 'El número de DNI ingresado ya se encuentra registrado por otro usuario.',
        });
        return;
      }
      user.dni = cleanDni;
    }

    // 2. Validar Correo Electrónico si fue modificado (debe ser único)
    if (email && email.toString().toLowerCase().trim() !== user.email) {
      const cleanEmail = email.toString().toLowerCase().trim();
      const existingEmail = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } });
      if (existingEmail) {
        res.status(400).json({
          error: 'Correo ya registrado',
          message: 'El correo electrónico ingresado ya se encuentra en uso por otra cuenta.',
        });
        return;
      }
      user.email = cleanEmail;
    }

    // 3. Actualizar campos personales
    if (nombre) user.nombre = nombre.trim();
    if (apellido) user.apellido = apellido.trim();
    if (telefono !== undefined) user.telefono = telefono ? telefono.toString().trim() : '';
    if (fechaNacimiento) user.fechaNacimiento = new Date(fechaNacimiento);
    if (sexo) {
      user.sexo = (sexo === 'Mujer' || sexo === 'Femenino') ? 'Femenino' : 'Masculino';
    }
    if (ciudad !== undefined) user.ciudad = ciudad ? ciudad.trim() : '';
    if (provincia !== undefined) user.provincia = provincia ? provincia.trim() : '';

    if (contactoEmergencia) {
      if (typeof contactoEmergencia === 'object') {
        user.contactoEmergencia = {
          nombre: contactoEmergencia.nombre ? contactoEmergencia.nombre.trim() : 'Contacto de Emergencia',
          telefono: contactoEmergencia.telefono ? String(contactoEmergencia.telefono).trim() : '',
        };
      } else if (typeof contactoEmergencia === 'string' && contactoEmergencia.trim() !== '') {
        user.contactoEmergencia = {
          nombre: user.contactoEmergencia?.nombre || 'Contacto de Emergencia',
          telefono: contactoEmergencia.trim(),
        };
      }
    }

    // Rol (validar que no se auto-degrade si es el mismo SuperAdmin conectado)
    if (rol && ['corredor', 'admin', 'superadmin'].includes(rol)) {
      if (req.user?.id === id && rol !== 'superadmin') {
        res.status(400).json({
          error: 'Acción no permitida',
          message: 'No puedes degradar tu propio rol de SuperAdmin',
        });
        return;
      }
      user.rol = rol;
    }

    // Foto de perfil
    if (fotoPerfil !== undefined) {
      user.fotoPerfil = fotoPerfil && typeof fotoPerfil === 'string' && fotoPerfil.trim() !== ''
        ? fotoPerfil.trim()
        : null;
    }

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
