/**
 * ==============================================================================
 * CONTROLADOR DE AUTENTICACIÓN (Auth Controller) - MateRun
 * ==============================================================================
 * Gestiona los flujos de seguridad y gestión de cuentas:
 * 1. register: Registro de nuevos usuarios corredores.
 * 2. login: Inicio de sesión mediante email y contraseña con generación de JWT.
 * 3. forgotPassword: Flujo de recuperación de credenciales a través de correo electrónico.
 * 4. getMe: Obtención del perfil completo del usuario en sesión.
 * 5. updateMe: Actualización de datos personales y contacto de emergencia.
 * ==============================================================================
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'mate_run_super_secret_jwt_key_2026_trail_running';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Función auxiliar interna para generar el token JWT firmado
 */
const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      rol: user.rol,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
};

/**
 * Registra un nuevo usuario corredor en la plataforma.
 * 
 * Ruta: POST /api/auth/register
 * Acceso: Público
 */
export const register = async (req: Request, res: Response): Promise<void> => {
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
    } = req.body;

    // 1. Validar campos requeridos mínimos
    if (!nombre || !apellido || !dni || !email || !password) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Nombre, apellido, DNI, correo electrónico y contraseña son obligatorios',
      });
      return;
    }

    // 2. Comprobar si ya existe un usuario con el mismo email o DNI
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { dni: dni.trim() }],
    });

    if (existingUser) {
      const isEmail = existingUser.email === email.toLowerCase().trim();
      res.status(400).json({
        error: 'Usuario duplicado',
        message: isEmail
          ? 'Ya existe una cuenta registrada con este correo electrónico'
          : 'Ya existe una cuenta registrada con este número de DNI',
      });
      return;
    }

    // 3. Crear el nuevo usuario (por defecto rol 'corredor')
    const newUser = new User({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      email: email.toLowerCase().trim(),
      password, // Se encripta automáticamente en el hook pre-save de Mongoose
      telefono: telefono?.trim(),
      fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
      sexo,
      ciudad: ciudad?.trim(),
      provincia: provincia?.trim(),
      contactoEmergencia,
      rol: 'corredor',
    });

    await newUser.save();

    // 4. Emitir token JWT para inicio de sesión inmediato
    const token = generateToken(newUser);

    // Preparar objeto de respuesta sin exponer el hash de la contraseña
    const userSafe = newUser.toObject();
    delete userSafe.password;

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: userSafe,
    });
  } catch (error: any) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({
      error: 'Error de servidor',
      message: error.message || 'No se pudo completar el registro del usuario',
    });
  }
};

/**
 * Autentica un usuario con email y contraseña.
 * 
 * Ruta: POST /api/auth/login
 * Acceso: Público
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Validar que se enviaron ambas credenciales
    if (!email || !password) {
      res.status(400).json({
        error: 'Datos incompletos',
        message: 'Por favor ingrese correo electrónico y contraseña',
      });
      return;
    }

    // 2. Buscar usuario por email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Correo electrónico o contraseña incorrectos',
      });
      return;
    }

    // 3. Validar contraseña con bcrypt a través del método de instancia
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Correo electrónico o contraseña incorrectos',
      });
      return;
    }

    // 4. Generar token JWT y responder
    const token = generateToken(user);

    const userSafe = user.toObject();
    delete userSafe.password;

    res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      user: userSafe,
    });
  } catch (error: any) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error de servidor',
      message: error.message || 'Fallo durante el inicio de sesión',
    });
  }
};

/**
 * Recuperación de credenciales a través de correo electrónico.
 * 
 * Ruta: POST /api/auth/forgot-password
 * Acceso: Público
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: 'Campo requerido',
        message: 'Debe ingresar el correo electrónico asociado a su cuenta',
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Por motivos de seguridad, no revelamos si el email existe o no en la base
      res.status(200).json({
        message: 'Si el correo electrónico existe en nuestra base de datos, se han enviado las instrucciones de recuperación.',
      });
      return;
    }

    // En un entorno de producción, aquí se despacha un email vía nodemailer o SendGrid.
    // Para el entorno local y de desarrollo, simulamos la emisión de un enlace temporal de reseteo:
    const resetToken = jwt.sign(
      { id: user._id.toString(), type: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: `Se ha procesado la solicitud para ${user.email}. Se han enviado las instrucciones para restablecer su contraseña.`,
      simulationToken: resetToken, // Token disponible en desarrollo para pruebas
    });
  } catch (error: any) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({
      error: 'Error de servidor',
      message: error.message || 'No se pudo procesar la recuperación de contraseña',
    });
  }
};

/**
 * Obtiene los datos del usuario autenticado en la sesión actual.
 * 
 * Ruta: GET /api/auth/me
 * Acceso: Privado (cualquier usuario con token válido)
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.status(200).json({ user });
  } catch (error: any) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error de servidor' });
  }
};

/**
 * Actualiza los datos personales del usuario actual (perfil).
 * 
 * Ruta: PUT /api/auth/me
 * Acceso: Privado
 */
export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const {
      nombre,
      apellido,
      telefono,
      fechaNacimiento,
      sexo,
      ciudad,
      provincia,
      contactoEmergencia,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    // Actualizar campos permitidos
    if (nombre) user.nombre = nombre.trim();
    if (apellido) user.apellido = apellido.trim();
    if (telefono !== undefined) user.telefono = telefono?.trim();
    if (fechaNacimiento) user.fechaNacimiento = new Date(fechaNacimiento);
    if (sexo) user.sexo = sexo;
    if (ciudad !== undefined) user.ciudad = ciudad?.trim();
    if (provincia !== undefined) user.provincia = provincia?.trim();
    if (contactoEmergencia) user.contactoEmergencia = contactoEmergencia;

    await user.save();

    const userSafe = user.toObject();
    delete userSafe.password;

    res.status(200).json({
      message: 'Datos actualizados con éxito',
      user: userSafe,
    });
  } catch (error: any) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error de servidor', message: error.message });
  }
};
