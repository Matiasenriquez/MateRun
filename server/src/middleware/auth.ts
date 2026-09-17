/**
 * ==============================================================================
 * MIDDLEWARES DE AUTENTICACIÓN Y CONTROL DE ACCESO (RBAC) - MateRun
 * ==============================================================================
 * Proporciona middlewares para proteger rutas de la API mediante JSON Web Tokens
 * (JWT) y validar permisos según el rol del usuario autenticado:
 * - 'corredor': Acceso a sus propias inscripciones y catálogo de carreras.
 * - 'admin': Acceso a acreditación, gestión de inscriptos e historial.
 * - 'superadmin': Acceso total incluyendo creación y modificación de carreras.
 * ==============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Carga de la clave secreta desde variables de entorno con valor seguro por defecto
 */
const JWT_SECRET = process.env.JWT_SECRET || 'mate_run_super_secret_jwt_key_2026_trail_running';

/**
 * Estructura del payload contenido dentro del token JWT
 */
export interface JwtUserPayload {
  id: string;
  email: string;
  rol: 'corredor' | 'admin' | 'superadmin';
}

/**
 * Extensión de la interfaz Request de Express para incluir el usuario autenticado
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

/**
 * Middleware: verifyToken
 * Intercepta la petición, extrae la cabecera 'Authorization', valida la firma del token JWT
 * y adjunta los datos del usuario en 'req.user'.
 * 
 * Si no hay token o es inválido/expirado, responde con status 401 Unauthorized.
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    // Verificar si la cabecera Authorization está presente y comienza con 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'No autorizado',
        message: 'Acceso denegado: Token de autenticación no proporcionado',
      });
      return;
    }

    // Extraer la cadena del token
    const token = authHeader.split(' ')[1];

    // Verificar y decodificar el token con jwt.verify
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUserPayload;

    // Adjuntar la información del usuario al objeto de la petición
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Token inválido o expirado',
      message: 'Su sesión ha expirado o el token no es válido. Por favor, inicie sesión nuevamente.',
    });
  }
};

/**
 * Middleware generador: requireRole
 * Permite restringir el acceso a endpoints según una lista de roles permitidos.
 * Por ejemplo: requireRole('admin', 'superadmin')
 * 
 * Si el usuario autenticado no tiene ninguno de los roles solicitados,
 * responde con status 403 Forbidden.
 */
export const requireRole = (...allowedRoles: Array<'corredor' | 'admin' | 'superadmin'>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Si no está autenticado, denegar acceso
    if (!req.user) {
      res.status(401).json({
        error: 'No autenticado',
        message: 'Debe iniciar sesión para realizar esta acción',
      });
      return;
    }

    // Comprobar si el rol del usuario se encuentra en la lista permitida
    if (!allowedRoles.includes(req.user.rol)) {
      res.status(403).json({
        error: 'Acceso denegado',
        message: `Esta acción requiere uno de los siguientes roles: [${allowedRoles.join(', ')}]. Su rol actual es: '${req.user.rol}'`,
      });
      return;
    }

    next();
  };
};
