# SIMELAN - Backend

Backend del sistema SIMELAN usando **Node.js**, **Prisma ORM** y **MySQL**.

## 🔧 Requisitos

Instala lo siguiente en tu máquina:

- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [npm](https://www.npmjs.com/) (se instala junto con Node.js)
- [MySQL](https://dev.mysql.com/downloads/) (asegúrate de que esté corriendo el servicio)
- ReactJS
** 
En VS Code:
    - Thunder Client: para hacer pruebas de CRUD con el api rest
    - Snipets para js y react
    - Material Icon
    - ExcelJS

## ⚙️ Instalación y configuración

1. Clona el proyecto:

```bash
git clone <URL_DEL_REPO>
cd backend-simelan
```

2. Instalar dependencias:

```bash
npm install
```

3. Crea el archivo `.env` en la raíz del proyecto con la conexión a la base de datos:

```env
DATABASE_URL="mysql://usuario:password@localhost:3306/simelan"
```

🔹 Cambia `usuario`, `password` y `3306` según tu instalación de MySQL.  
🔹 `simelan` es el nombre de la base de datos (si no existe, Prisma la crea con la migración).

4. Ejecuta la primera migración para crear las tablas:

```bash
npx prisma migrate dev --name init
```

5. Si necesitas reiniciar la base de datos en limpio:

```bash
npx prisma migrate reset
```

6. Abre Prisma Studio (explorador de la base de datos):

```bash
npx prisma studio
```

7. Inicia el servidor:

```bash
npm run dev
```

El backend se levantará en:  
👉 `http://localhost:3000`

## 📦 Comandos rápidos

- `npm install` → Instala dependencias
- `npx prisma migrate dev --name <nombre>` → Nueva migración
- `npx prisma studio` → Interfaz visual de la DB
- `npm run dev` → Inicia el servidor en desarrollo

---

## Notas

Investigar como usar ExcelJS y como integrarlo, dice que en disposal.service, disposal.controller y disposal.routes