# SIMELAN - Backend

Backend del sistema SIMELAN usando **Node.js**, **Prisma ORM** y **MySQL**.

## 🔧 Requisitos

Instala lo siguiente en tu máquina:

- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [npm](https://www.npmjs.com/) (se instala junto con Node.js)
- [MySQL](https://dev.mysql.com/downloads/) (asegúrate de que esté corriendo el servicio)
- ReactJS

**En VS Code se recomienda instalar:**
- Thunder Client: para hacer pruebas de CRUD con el API REST.
- Snippets para JS y React.
- Material Icon.
- ExcelJS.
- Jsonwebtoken
- Bcryptjs

---

## ⚙️ Instalación y configuración

Clona el proyecto:

```bash
git clone <URL_DEL_REPO>
cd backend-simelan
```
Instala dependencias:

```bash
npm install
```
Crea el archivo .env en la raíz del proyecto con la conexión a la base de datos y la clave secreta para JWT:

env
```bash
DATABASE_URL="mysql://usuario:password@localhost:3306/simelan"
JWT_SECRET="supersecreto"

EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER="email@gmail.com"
EMAIL_PASS="xxxx xxxx xxxx xxxx"
```
- Cambia usuario, password y 3306 según tu instalación de MySQL.
- simelan es el nombre de la base de datos (si no existe, Prisma la crea con la migración).
- JWT_SECRET debe ser una clave segura (puedes cambiar "supersecreto" por otra más robusta).

Ejecuta la primera migración para crear las tablas:

```bash
npx prisma migrate dev --name init
```
Si necesitas reiniciar la base de datos en limpio:

```bash
npx prisma migrate reset
```
Abre Prisma Studio (explorador de la base de datos):

```bash
npx prisma studio
```
Inicia el servidor:

```bash
npm run dev
```
El backend se levantará en:
👉 http://localhost:3000

## 🔐 Autenticación y Roles
El sistema usa JWT para la autenticación.

Al hacer login, se genera un token que debe enviarse en cada petición protegida en el header:

http
Authorization: Bearer <tu_token_aqui>
Roles disponibles:
- ADMIN → Acceso completo: gestionar usuarios, actualizar y eliminar.

- EDITOR → Puede modificar algunos recursos (ej. actualizar contraseñas).

- USER → Acceso básico, uso del sistema sin privilegios administrativos.

Ejemplo de protección de rutas:

```js
router.get("/users", verifyToken, verifyRole(["ADMIN"]), getUsers);
```
## 📚 Librerías utilizadas
Estas son las principales librerías y frameworks usados en el backend de SIMELAN:

**Core**
- express → Framework para crear el servidor y las rutas HTTP.
- cors → Permite habilitar peticiones desde otros dominios (CORS).
- dotenv → Manejo de variables de entorno (.env).

**Base de datos**
- @prisma/client → Cliente de Prisma para interactuar con la base de datos.
- prisma → ORM para modelar y manejar migraciones de la DB.
- mysql2 → Conector de Node.js para MySQL (usado por Prisma).

**Autenticación y seguridad**
- jsonwebtoken (jwt) → Generación y validación de tokens JWT.
- bcryptjs → Encriptación de contraseñas.

**Desarrollo**
- nodemon → Reinicia el servidor automáticamente en desarrollo.

## 📦 Comandos rápidos
```bash
npm install → Instala dependencias

npx prisma migrate dev --name <nombre> → Nueva migración

npx prisma studio → Interfaz visual de la DB

npm run dev → Inicia el servidor en desarrollo
```
