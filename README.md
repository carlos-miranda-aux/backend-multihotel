# Simet - Backend (API)

Este es el backend del sistema Simet (Sistema de Inventario Multi-Hotel), desarrollado con **Node.js** y **Express**. Utiliza **Prisma ORM** para la gestión de la base de datos MySQL y ofrece una API RESTful para la gestión de activos, mantenimientos, usuarios y reportes.

## Requisitos Previos

Antes de instalar, asegúrate de tener en tu servidor o máquina local:

* **Node.js**: v18 o superior.
* **MySQL**: Base de datos en ejecución (v8.0 recomendada).
* **Git**: Para clonar el repositorio.

## Instalación y Configuración

Sigue estos pasos para desplegar el backend en tu servidor local:

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <URL_DEL_TU_REPOSITORIO>
cd backend-multihotel
npm install
2. Configurar Variables de Entorno
Crea un archivo .env en la raíz de la carpeta backend-multihotel con las siguientes claves. Ajusta los valores según tu entorno local:

Fragmento de código

# Puerto del servidor (por defecto 3000)
PORT=3000

# Conexión a la Base de Datos (MySQL)
# Formato: mysql://USUARIO:CONTRASEÑA@HOST:PUERTO/NOMBRE_DB
DATABASE_URL="mysql://root:password@localhost:3306/simet_v2"

# Clave secreta para firmar los tokens JWT (Cámbiala por una cadena segura)
JWT_SECRET="supersecreto_cambiar_en_produccion"

# Configuración de Correo (Para notificaciones y recordatorios de mantenimiento)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER="tu_correo_soporte@gmail.com"
EMAIL_PASS="tu_contraseña_de_aplicacion"

3. Base de Datos y Migraciones
El sistema utiliza Prisma para gestionar la estructura de la base de datos. Ejecuta los siguientes comandos para crear las tablas:

Bash

# Ejecuta las migraciones (crea tablas en MySQL)
npx prisma migrate dev --name init

# Genera el cliente de Prisma (necesario para que el código reconozca los tipos)
npx prisma generate
Nota: El sistema cuenta con un script de "Preload" que insertará automáticamente los catálogos base (Tipos de equipo, Sistemas Operativos, Roles) y el usuario Root inicial al arrancar el servidor si la base de datos está vacía.

4. Ejecutar el Servidor
Modo Desarrollo (con reinicio automático)
Bash
npm run dev
//Modo Producción
Bash

npm start
El servidor estará corriendo en: http://localhost:3000 (o el puerto que definiste en .env).

## Comandos Útiles
npm run dev: Inicia el servidor usando Nodemon (reinicia al guardar cambios).

npm start: Inicia el servidor con Node estándar.

npx prisma studio: Abre una interfaz web en el navegador para ver y editar los datos de la base de datos visualmente.

## Estructura del Proyecto
src/index.js: Punto de entrada de la aplicación.

src/controllers: Lógica de los endpoints (Auth, Devices, Users, etc.).

src/routes: Definición de las rutas de la API (/api/...).

src/services: Capa de servicio para lógica de negocio y consultas Prisma.

src/middlewares: Validaciones, autenticación JWT y manejo de errores.

src/utils: Utilidades (Envío de correos, Cron jobs).

src/templates: Plantillas .docx para la generación de resguardos.

prisma/schema.prisma: Definición del esquema de la base de datos.

## Tecnologías Principales
- Express: Framework web.

- Prisma: ORM para base de datos.

- MySQL: Motor de base de datos.

- JWT (jsonwebtoken): Autenticación segura.

- Bcryptjs: Encriptación de contraseñas.

- ExcelJS: Generación de reportes en Excel.

- Docxtemplater / PizZip: Generación de documentos Word (Resguardos).

- Node-Cron: Tareas programadas (Alertas de mantenimiento).

- Nodemailer: Envío de correos electrónicos.
