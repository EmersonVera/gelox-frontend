# 🍦 GELOX — Frontend

> Sistema de gestión de inventarios y ventas para la heladería **Mágico Sabor**

GELOX es una aplicación web diseñada para centralizar y digitalizar las operaciones diarias de la heladería: control de stock, pedidos a proveedores, despacho a comerciantes, ventas por ventanilla y reportes financieros. Este repositorio contiene **únicamente el frontend**; el backend vive en el repositorio `gelox-backend`.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase&logoColor=black)

---

## 📋 Tabla de contenidos

1. [Stack tecnológico](#-stack-tecnológico)
2. [Arquitectura y organización](#-arquitectura-y-organización)
3. [Módulos del sistema](#-módulos-del-sistema)
4. [Roles y acceso](#-roles-y-acceso)
5. [Variables de entorno](#-variables-de-entorno)
6. [Instalación y ejecución local](#-instalación-y-ejecución-local)
7. [Estructura de carpetas](#-estructura-de-carpetas)
8. [Capturas de pantalla](#-capturas-de-pantalla)
9. [Conexión con el backend](#-conexión-con-el-backend)
10. [Equipo de desarrollo](#-equipo-de-desarrollo)
11. [Licencia](#-licencia)

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| **React** | 19 | Biblioteca principal de UI |
| **Vite** | 8 | Bundler y servidor de desarrollo |
| **React Router DOM** | 7 | Enrutamiento SPA con rutas anidadas y protegidas |
| **Firebase SDK** | 12 | Autenticación de usuarios (cliente) |
| **Axios** | 1.16 | Cliente HTTP con interceptor JWT |
| **Recharts** | 3 | Gráficos de barras, dona e indicadores |
| **React Hook Form** | 7 | Gestión de formularios |
| **Yup** | 1 | Validación de esquemas de formularios |
| **Tailwind CSS** | 4 | Estilos utilitarios |

---

## 🏗️ Arquitectura y organización

### Autenticación

El flujo de autenticación usa **Firebase Authentication** como proveedor de identidad:

1. El usuario inicia sesión en `/login` con correo y contraseña.
2. Firebase SDK valida las credenciales y devuelve un **ID Token** (JWT).
3. El `AuthContext` almacena el usuario, el token y el perfil (incluyendo el rol) en el estado global de React.
4. Cada petición HTTP al backend adjunta automáticamente el token mediante un interceptor de Axios (ver `src/api/axiosConfig.js`).
5. El backend valida el token en cada endpoint protegido.

**Cierre de sesión automático:**
- Si el usuario lleva **30 minutos sin actividad** (sin mover el ratón, teclear, hacer clic, etc.), la sesión se cierra automáticamente.
- Si el usuario cierra la pestaña por más de **24 horas**, también se cierra la sesión al volver.

### Control de acceso por rol

El `AuthContext` (`src/context/AuthContext.jsx`) expone el rol del usuario autenticado. El componente `ProtectedRoute` (`src/routes/ProtectedRoute.jsx`) recibe un array de roles permitidos y sigue este flujo:

```
¿Cargando autenticación? → Spinner de espera
¿Sin usuario?           → Redirige a /login
¿Rol no permitido?      → Redirige a /no-autorizado
✅ Todo correcto        → Renderiza la página
```

### Organización de rutas

Las rutas están definidas en `src/routes/AppRouter.jsx` con tres bloques de rutas protegidas, cada uno envuelto en su propio `<ProtectedRoute allowedRoles={[...]}>`:

- **Rutas públicas:** `/login`, `/recuperar-contrasena`, `/restablecer-contrasena`, `/landing`
- **Rutas de Gerente:** `/dashboard/gerente`, `/usuarios`, `/reportes`, `/cierres-caja`
- **Rutas de Inventarios:** `/inventarios/*` (accesibles por Gerente e Inventarios)
- **Rutas de Ventas:** `/ventas/*` (accesibles por Gerente y Ventas)

---

## 📦 Módulos del sistema

### 🔐 Autenticación
**Ruta:** `/login`, `/recuperar-contrasena`, `/restablecer-contrasena` · **Roles:** Público

Pantalla de inicio de sesión con correo y contraseña usando Firebase. Incluye flujo de recuperación de contraseña (envío de enlace por correo) y página de restablecimiento con nueva contraseña.

---

### 📊 Dashboard gerencial
**Ruta:** `/dashboard/gerente` · **Roles:** Gerente

Panel de control con vista ejecutiva del negocio. Incluye tarjetas de KPIs principales, gráfico de barras de inversión vs. ingresos por período, gráfico de dona con distribución de ventas por canal (ventanilla y pedidos rurales), ranking de los 5 comerciantes con mayor volumen y un feed de actividad reciente del sistema.

---

### 👥 Gestión de usuarios
**Ruta:** `/usuarios`, `/usuarios/nuevo`, `/usuarios/:id/editar` · **Roles:** Gerente

Tabla paginada con todos los usuarios del sistema. Permite crear nuevos usuarios asignando nombre, correo, rol y contraseña inicial. También permite editar datos de un usuario existente y habilitarlo o deshabilitarlo sin eliminarlo permanentemente.

---

### ⚙️ Ajustes de perfil
**Ruta:** `/ajustes`, `/inventarios/ajustes`, `/ventas/ajustes` · **Roles:** Todos

Permite a cualquier usuario editar su información personal: foto de perfil, nombre, correo y teléfono. También incluye la opción de cambiar la contraseña con validación de la contraseña actual.

---

### 🛒 Catálogo de productos
**Ruta:** `/inventarios/catalogo` · **Roles:** Gerente, Encargado de Inventarios

Listado completo de productos con filtros por nombre o código y paginación. Permite agregar nuevos productos con todos sus atributos, editar los existentes y eliminarlos con confirmación.

---

### 📦 Gestión de inventario
**Ruta:** `/inventarios/gestion` · **Roles:** Gerente, Encargado de Inventarios

Tabla en tiempo real con el stock actual de cada producto. Incluye un panel lateral de alertas de bajo stock, y permite buscar por nombre, código o estado del producto.

---

### 📋 Pedido al proveedor
**Ruta:** `/inventarios/generar-pedido`, `/inventarios/reporte-pedido`, `/inventarios/pedidos/:id` · **Roles:** Gerente, Encargado de Inventarios

Formulario para seleccionar productos y definir las cantidades a solicitar al proveedor. Una vez generado el pedido, se puede visualizar el reporte detallado y descargarlo como archivo Excel para enviarlo al proveedor.

---

### 📥 Entrada de mercancía
**Ruta:** `/inventarios/entrada` · **Roles:** Gerente, Encargado de Inventarios

Registro de la mercancía recibida del proveedor. Permite comparar las cantidades pedidas contra las cantidades efectivamente recibidas por referencia de producto, detectando diferencias o faltantes.

---

### 🗑️ Registro de mermas
**Ruta:** `/inventarios/merma` · **Roles:** Gerente, Encargado de Inventarios

Formulario para registrar pérdidas o deterioro de productos del inventario, indicando el producto afectado, la cantidad y el motivo de la merma.

---

### 🧾 Ventas por ventanilla
**Ruta:** `/ventas/pedidos-ventanilla` · **Roles:** Gerente, Encargado de Ventas

Interfaz de punto de venta con catálogo visual de productos disponibles. El encargado selecciona ítems que se agregan a un carrito con subtotal en tiempo real. Al confirmar, se registra la venta y se descuenta el inventario.

---

### 🚜 Pedidos rurales
**Ruta:** `/ventas/pedidos-rurales` · **Roles:** Gerente, Encargado de Ventas

Formulario para registrar pedidos de clientes rurales con venta mixta (cajas completas y unidades sueltas). Permite buscar y seleccionar clientes recurrentes, facilitando el historial y la gestión de pedidos frecuentes.

---

### 🏪 Gestión de comerciantes
**Ruta:** `/ventas/comerciantes`, `/ventas/comerciantes/:id/informacion` · **Roles:** Gerente, Encargado de Ventas

Listado de los comerciantes activos del negocio con su información de contacto. Permite crear nuevos comerciantes, editar sus datos y activar o desactivar su estado en el sistema.

---

### 📝 Planilla diaria
**Ruta:** `/ventas/comerciantes/:id/planilla-hoy`, `/ventas/planilla/:id` · **Roles:** Gerente, Encargado de Ventas

Módulo central de despacho. Permite registrar los productos enviados a cada comerciante, las devoluciones al final del día y la liquidación de la planilla con el cálculo automático de lo vendido. Incluye historial de planillas anteriores e impresión en formato estructurado.

---

### 💰 Reportes financieros
**Ruta:** `/reportes` · **Roles:** Gerente

Resumen financiero con filtros de período (día, semana, mes, rango personalizado). Muestra inversión total, ingresos, utilidad bruta y margen de rentabilidad, acompañados de gráficas comparativas por período y desglose por canal de venta.

---

### 🗄️ Cierre de caja
**Ruta:** `/cierres-caja`, `/cierres-caja/:id` · **Roles:** Gerente

Registro del dinero físico recibido al final del día por cada canal de venta (ventanilla y rural). El sistema compara automáticamente el valor físico ingresado contra el valor digital registrado, marcando diferencias. Incluye historial de cierres anteriores con detalle por cierre.

---

### 📈 Reporte diario de ventas
**Ruta:** `/reportes/ventas-dia`, `/ventas/reportes` · **Roles:** Gerente, Encargado de Ventas

Vista de los indicadores operativos del día: totales por canal, tabla de transacciones realizadas y resumen de cierre operativo para finalizar la jornada.

---

### 🌐 Landing page pública
**Ruta:** `/landing` · **Roles:** Público (sin login)

Página pública de presentación de la heladería Mágico Sabor. Incluye secciones de hero, beneficios, catálogo de productos visible sin autenticación, proceso de pedido, ubicación y horario. Botón flotante de contacto por WhatsApp.

---

## 🔐 Roles y acceso

| Módulo | Gerente | Enc. Inventarios | Enc. Ventas |
|---|:---:|:---:|:---:|
| Dashboard gerencial | ✅ | ❌ | ❌ |
| Gestión de usuarios | ✅ | ❌ | ❌ |
| Reportes financieros | ✅ | ❌ | ❌ |
| Historial de cierres de caja | ✅ | ❌ | ❌ |
| Catálogo de productos | ✅ | ✅ | ❌ |
| Gestión de inventario | ✅ | ✅ | ❌ |
| Pedido al proveedor | ✅ | ✅ | ❌ |
| Entrada de mercancía | ✅ | ✅ | ❌ |
| Registro de mermas | ✅ | ✅ | ❌ |
| Ventas por ventanilla | ✅ | ❌ | ✅ |
| Pedidos rurales | ✅ | ❌ | ✅ |
| Gestión de comerciantes | ✅ | ❌ | ✅ |
| Planilla diaria | ✅ | ❌ | ✅ |
| Reporte diario de ventas | ✅ | ❌ | ✅ |
| Ajustes de perfil | ✅ | ✅ | ✅ |
| Landing page | Público | Público | Público |

---

## 🔑 Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# URL base del backend
VITE_API_BASE_URL=https://gelox-backend.onrender.com

# Configuración de Firebase
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

> Todas las variables deben llevar el prefijo `VITE_` para que Vite las exponga al bundle del cliente.

---

## 🚀 Instalación y ejecución local

### Prerrequisitos

- Node.js >= 18
- npm >= 9
- El servidor de `gelox-backend` corriendo y accesible en la URL configurada en `VITE_API_BASE_URL`

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-org/gelox-frontend.git
cd gelox-frontend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus valores reales

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo con hot-reload
npm run build    # Build de producción en /dist
npm run preview  # Previsualización del build de producción
npm run lint     # Análisis estático con ESLint
```

---

## 🗂️ Estructura de carpetas

```
src/
├── api/
│   └── axiosConfig.js        # Instancia de Axios con interceptor JWT
├── assets/
│   ├── hero.png              # Imagen hero de la landing
│   └── logo.png              # Logo de la aplicación
├── auth/
│   └── firebase.js           # Inicialización del SDK de Firebase
├── components/
│   ├── administrador/        # Sidebar del rol Gerente
│   ├── catalogo/             # Modales de creación/edición/eliminación de productos
│   ├── comerciantes/         # Formulario de nuevo comerciante y sidebar
│   ├── dashboard/            # KPIs, gráficos y feed del dashboard gerencial
│   ├── inventarios/          # Control de cantidades y sidebar de inventarios
│   ├── landing/              # Secciones de la página pública
│   ├── reportes/             # Tabla de rentabilidad por canal
│   ├── ui/                   # Componentes reutilizables (Select, Paginación)
│   ├── ventas/               # Sidebar del módulo de ventas
│   ├── AppLayout.jsx         # Layout principal (Sidebar + Navbar + contenido)
│   ├── CierreCaja.jsx        # Componente de cierre de caja
│   ├── FiltroPeriodo.jsx     # Selector de rango de fechas reutilizable
│   ├── Navbar.jsx            # Barra superior con alertas y perfil
│   ├── Sidebar.jsx           # Router de sidebars según el rol activo
│   └── SuccessToast.jsx      # Notificación de éxito reutilizable
├── context/
│   └── AuthContext.jsx       # Estado global de autenticación y rol
├── hooks/
│   └── useScrollHighlight.js # Hook para resaltar elementos al hacer scroll
├── mocks/
│   └── cierreCajaMock.js     # Datos de ejemplo para desarrollo local
├── pages/
│   ├── administrador/        # Páginas exclusivas del rol Gerente
│   ├── components/           # Páginas compartidas (Ajustes, CambiarContraseña)
│   ├── inventarios/          # Páginas del módulo de inventarios
│   ├── ventas/               # Páginas del módulo de ventas
│   ├── LandingPage.jsx       # Página pública de presentación
│   ├── Login.jsx             # Inicio de sesión
│   ├── RecuperarContrasena.jsx
│   └── RestablecerContrasena.jsx
├── routes/
│   ├── AppRouter.jsx         # Definición completa de rutas de la aplicación
│   └── ProtectedRoute.jsx    # Guard de rutas por rol
├── services/
│   ├── inventarioService.js  # Llamadas API del módulo de inventarios
│   ├── perfilService.js      # Llamadas API de ajustes de perfil
│   ├── reporteService.js     # Llamadas API de reportes financieros
│   ├── usuariosService.js    # Llamadas API de gestión de usuarios
│   └── ventasService.js      # Llamadas API del módulo de ventas
├── App.jsx                   # Raíz: AuthProvider > AppRouter
├── index.css                 # Fuentes globales y keyframes de animación
└── main.jsx                  # Punto de entrada de React
```

---

## 📸 Capturas de pantalla

> 📸 Capturas de pantalla pendientes de agregar

---

## 🔌 Conexión con el backend

### URL base

La URL del backend se configura mediante la variable de entorno `VITE_API_BASE_URL`. En desarrollo, Vite también dispone de un proxy que redirige las peticiones a `/api` hacia `https://gelox-backend.onrender.com`, evitando problemas de CORS durante el desarrollo local.

### Interceptor de Axios — `src/api/axiosConfig.js`

Cada petición HTTP adjunta automáticamente el token de Firebase en el encabezado `Authorization`:

```js
// src/api/axiosConfig.js (simplificado)
instance.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

El interceptor también maneja correctamente las peticiones `multipart/form-data` (subida de fotos de perfil), eliminando el encabezado `Content-Type` para que el navegador lo genere con el `boundary` correcto.

### Expiración del token

Firebase ID Tokens expiran cada **60 minutos**. El SDK de Firebase renueva el token automáticamente en segundo plano. Al llamar a `user.getIdToken()` en el interceptor, Firebase devuelve siempre un token fresco, sin que el usuario perciba la renovación.

---

## 👨‍💻 Equipo de desarrollo

| Nombre | Rol |
|---|---|
| Jesus Gabriel Torres Daza | Gerente del Proyecto, Líder de QA, Desarrollador Full Stack, Analista de Sistemas |
| Zharick Nicole Hernandez Arevalo | Líder Tecnológico, Coordinador Backend, Desarrollador Full Stack, Arquitecto de Software |
| Emerson Amir Vera Gonzalez | Coordinador Frontend, Desarrollador Full Stack, Diseñador UX/UI |
| Jose Luis Jimenez Bayona | Desarrollador Full Stack, Diseñador de Bases de Datos (DBA) |
| Daniela Garcia Peñaranda | Desarrollador Frontend, Diseñador de Bases de Datos (DBA) |
| Angie Nikol Ortiz Amaya | Desarrollador Frontend, Tester |
| Alejandro Ovallos Torrado | Desarrollador Backend, Tester |
| Israel Bulla Rey | Desarrollador Frontend, Tester |

---

