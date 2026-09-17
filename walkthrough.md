# Walkthrough - MateRun (Sistema de Inscripciones)

Este documento detalla el progreso de la implementación por etapas para tener una bitácora clara y detallada de todo el código generado.

## Etapa 1: Configuración Inicial y Base de Datos (Completado)
- **Monorepo setup:** Estructura con `/server` y `/client`.
- **Backend:** Node.js, Express, Mongoose, y TypeScript configurados.
- **Frontend:** React, Vite, Tailwind CSS configurados.
- **Base de Datos:** Conexión exitosa a `Db_MateRun` usando MongoDB Compass.

## Etapa 2: Desarrollo del Backend y API (Completado)
- **Modelos Mongoose:** `User`, `Race`, `Registration`, `AuditLog`, `RaceResult`. Restricciones de dorsales únicos por carrera establecidas.
- **Autenticación (JWT):** Controladores de registro y login, middleware de protección de rutas y Roles (RBAC).
- **Rutas API:** Carreras CRUD, Inscripciones (con validación de dorsal no disponible), Estadísticas, Auditoría y Usuarios.
- **Testing:** Script `seed.ts` y test automáticos `test_api.ts` corriendo de forma 100% exitosa, demostrando robustez.

## Etapa 3: Autenticación, Navegación y Estilos Base en Frontend (Completado)
- **Configuración de Tailwind y Tema Global:**
  - Se añadieron los colores oficiales basados en la referencia solicitada: Blanco Porcelana (`#FFFCF4`) como fondo general, Rojo Machine (`#FF2E3A`) como acento principal, y una paleta Gris Pizarra (Slate) para los secundarios.
- **Layout y UI Base (`MainLayout.tsx`):**
  - Cabecera blanca con el texto de marca en rojo ("MateRun", omitiendo imagen temporalmente) y título general a la derecha.
  - Barra de Navegación secundaria (roja) con iconos y rutas correspondientes según el rol de sesión del usuario.
- **Contexto de Autenticación (`AuthContext.tsx` y `api.ts`):**
  - Se configuró Axios con un interceptor que adjunta automáticamente el token JWT del `localStorage`.
  - El contexto provee estado global `user`, manejo automático de validación de token y métodos `login` / `logout`.
- **Rutas Protegidas y Vistas de Auth:**
  - `ProtectedRoute.tsx`: Restringe vistas y redirige a `/login` si no hay sesión.
  - `Login.tsx`: Pantalla de inicio de sesión estilizada que invoca `api.post('/auth/login')`.
  - `App.tsx`: Enrutamiento inicial de React Router configurado, protegiendo las vistas clave bajo `MainLayout`.
- Se validó el proceso de compilación (`npm run build`) del frontend sin errores, garantizando integridad en los imports.
