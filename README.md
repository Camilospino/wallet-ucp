# WalletUCP - Billetera Virtual Académica

## Descripción
WalletUCP es una billetera virtual académica que simula operaciones financieras entre usuarios. Es un proyecto 100% educativo diseñado para demostrar el diseño de un backend capaz de recibir, validar, procesar y registrar transacciones financieras en PostgreSQL, garantizando consistencia de datos mediante transacciones SQL (`BEGIN` / `COMMIT` / `ROLLBACK`) y control de concurrencia.

**⚠️ IMPORTANTE:** Este proyecto es 100% académico y simulado. No se conecta a bancos ni pasarelas de pago reales. No maneja dinero real bajo ninguna circunstancia. Todos los saldos, usuarios y transacciones son ficticios.

## Objetivo de Aprendizaje
Demostrar cómo un backend procesa dinero simulado usando transacciones PostgreSQL para garantizar integridad de datos, con énfasis en:
- Arquitectura en capas
- Transacciones atómicas en base de datos
- Control de concurrencia con `SELECT ... FOR UPDATE`
- Validación de datos en backend y frontend
- Autenticación y autorización con JWT

## Stack Tecnológico

### Frontend
- React + Vite
- JavaScript
- React Router
- Axios
- Bootstrap

### Backend
- Node.js + Express.js
- JavaScript
- JWT (jsonwebtoken)
- bcrypt

### Base de Datos
- PostgreSQL
- Driver `pg`

### Infraestructura
- Docker
- Docker Compose
- Nginx (opcional, solo producción)

### Documentación
- Swagger / OpenAPI

### Control de Versiones
- Git + GitHub

## Arquitectura

### Estructura del Proyecto
```
wallet-ucp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── config/          # conexión a BD, variables de entorno, constantes
│   │   ├── controllers/     # reciben request/response, delegan a services
│   │   ├── middlewares/     # auth, roles, manejo de errores, rate limiting
│   │   ├── routes/          # definición de endpoints, sin lógica de negocio
│   │   ├── services/        # lógica de negocio y orquestación de transacciones
│   │   ├── repositories/    # acceso a datos (queries SQL)
│   │   ├── validators/      # validación de payloads de entrada
│   │   ├── utils/           # helpers (generación de referencias, formateo, etc.)
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── database/
│   ├── migrations/
│   └── seeds/
├── docker/
│   ├── nginx/
│   └── postgres/
├── docs/
│   └── swagger/
├── .github/
│   └── workflows/
│       └── pipeline.yml
├── docker-compose.yml
├── README.md
└── .gitignore
```

### Reglas de las capas

Regla de dependencia: `routes → controllers → services → repositories → base de datos`

Ninguna capa superior debe saltarse una capa inferior (por ejemplo, un controller nunca ejecuta SQL directamente).

### Panorama general

```
┌─────────────────┐        ┌──────────────────────────────┐
│   Frontend      │  HTTP  │         Backend              │
│  React + Vite   ├───────►│  routes → controllers →      │
│  :3000          │◄───────┤  services → repositories     │
└─────────────────┘  JSON  └──────────────┬───────────────┘
                                          │ SQL (pg)
                                   ┌──────▼───────┐
                                   │  PostgreSQL  │
                                   │  :5432       │
                                   └──────────────┘
```

Regla de dependencia: `routes → controllers → services → repositories → base de datos`.
Ninguna capa se salta a la anterior; un controller nunca ejecuta SQL.

### La regla más importante: el `client` de la transacción

Todo servicio que abre una transacción debe pasar ese mismo `client` a **cada**
llamada de repositorio:

```js
const client = await pool.connect();
await client.query('BEGIN');
await walletRepository.lockByUserIdForUpdate(userId, client); // <- obligatorio
await client.query('COMMIT');
```

Si una llamada a repositorio **omite** el `client`, esa sentencia se ejecuta
en otra conexión del pool: `BEGIN`/`COMMIT` dejan de cubrirla y los bloqueos de
`SELECT ... FOR UPDATE` se liberan de inmediato, destruyendo tanto la
atomicidad como el control de concurrencia. Cada función de repositorio
acepta `client` como **último** parámetro, con el pool como valor por defecto.

### Integridad del dinero

- Todos los montos son `NUMERIC(15,2)`, nunca `FLOAT`
- El driver convierte `NUMERIC` a número en la frontera de la API
- Toda operación de saldo corre dentro de una transacción con `FOR UPDATE`
- Las transferencias bloquean ambas billeteras en orden ascendente de usuario
  para evitar deadlocks en transferencias bidireccionales
- Cada operación deja un asiento en `movimientos` con saldo anterior y
  resultante, de modo que el libro mayor siempre cuadra con el saldo

## Modelo de Datos

### Tablas Principales

#### `usuarios`
- `id`: SERIAL / UUID (PRIMARY KEY)
- `nombre`: VARCHAR (NOT NULL)
- `apellido`: VARCHAR (NOT NULL)
- `email`: VARCHAR (UNIQUE, NOT NULL)
- `password_hash`: VARCHAR (NOT NULL)
- `telefono`: VARCHAR (opcional)
- `estado`: VARCHAR (CHECK IN ('ACTIVE','BLOCKED'), DEFAULT 'ACTIVE')
- `rol`: VARCHAR (CHECK IN ('USER','ADMIN'), DEFAULT 'USER')
- `created_at`: TIMESTAMP (DEFAULT now())
- `updated_at`: TIMESTAMP (DEFAULT now())

#### `billeteras`
- `id`: SERIAL (PRIMARY KEY)
- `usuario_id`: INTEGER (FOREIGN KEY → usuarios(id), UNIQUE)
- `saldo`: NUMERIC(15,2) (NOT NULL, DEFAULT 0.00, CHECK (saldo >= 0))
- `estado`: VARCHAR (CHECK IN ('ACTIVE','BLOCKED','CLOSED'), DEFAULT 'ACTIVE')
- `created_at`: TIMESTAMP (DEFAULT now())
- `updated_at`: TIMESTAMP (DEFAULT now())

#### `transacciones`
- `id`: SERIAL (PRIMARY KEY)
- `referencia`: VARCHAR (UNIQUE, NOT NULL)
- `origen_wallet_id`: INTEGER (FOREIGN KEY → billeteras(id), NULLABLE)
- `destino_wallet_id`: INTEGER (FOREIGN KEY → billeteras(id), NULLABLE)
- `tipo`: VARCHAR (CHECK IN ('DEPOSIT','WITHDRAW','TRANSFER'))
- `monto`: NUMERIC(15,2) (NOT NULL, CHECK (monto > 0))
- `estado`: VARCHAR (CHECK IN ('PENDING','COMPLETED','FAILED','CANCELLED'))
- `descripcion`: TEXT (opcional)
- `created_at`: TIMESTAMP (DEFAULT now())

#### `movimientos`
- `id`: SERIAL (PRIMARY KEY)
- `wallet_id`: INTEGER (FOREIGN KEY → billeteras(id), NOT NULL)
- `transaction_id`: INTEGER (FOREIGN KEY → transacciones(id), NOT NULL)
- `tipo`: VARCHAR (CHECK IN ('CREDIT','DEBIT'))
- `monto`: NUMERIC(15,2) (NOT NULL, CHECK (monto > 0))
- `saldo_anterior`: NUMERIC(15,2) (NOT NULL)
- `saldo_resultante`: NUMERIC(15,2) (NOT NULL)
- `created_at`: TIMESTAMP (DEFAULT now())

## Instalación

### Requisitos Previos
- Docker y Docker Compose
- Node.js 20+ (para desarrollo local sin Docker)
- PostgreSQL 14+ (para desarrollo local sin Docker)

### Con Docker (Recomendado)
```bash
# Clonar el repositorio
git clone <repository-url>
cd wallet-ucp

# Levantar todos los servicios
docker compose up --build

# La aplicación estará disponible en:
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# Swagger: http://localhost:5000/api-docs
```

### Desarrollo Local
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Configurar variables de entorno en .env
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev

# Base de datos
docker compose up postgres
```

## Variables de Entorno

### Backend (.env)
```env
PORT=5000
DATABASE_URL=postgresql://walletucp:walletucp_password@localhost:5432/walletucp
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=10
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Logging: error | warn | info | debug
LOG_LEVEL=info
# json emits one JSON object per line (use in production)
LOG_FORMAT=text

# Rate limiting (optional, defaults shown)
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_FINANCIAL_MAX=30
RATE_LIMIT_GENERAL_MAX=1000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```

### Puertos (Docker)

El puerto del backend se puede cambiar con un archivo `.env` en la raíz del
proyecto (copia `.env.example`). En macOS, **AirPlay Receiver ocupa el puerto
5000**, por lo que normalmente tendrás que usar:

```env
BACKEND_PORT=5001
VITE_API_URL=http://localhost:5001
DB_PORT=5433
```

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Perfil del usuario autenticado (requiere token)

### Billetera
- `GET /api/wallet` - Obtener saldo y estado de billetera
- `POST /api/wallets/deposit` - Realizar depósito
- `POST /api/wallets/withdraw` - Realizar retiro

### Usuarios
- `GET /api/users/lookup?email=` - Buscar destinatario por email (devuelve solo el nombre)

### Transferencias
- `POST /api/transfers` - Realizar transferencia entre usuarios

### Transacciones
- `GET /api/transactions` - Historial de transacciones (paginado)
- `GET /api/transactions/:id` - Detalle de transacción

### Administración (Requiere rol ADMIN)
- `GET /api/admin/users` - Listar todos los usuarios
- `GET /api/admin/wallets` - Listar todas las billeteras
- `GET /api/admin/transactions` - Listar todas las transacciones
- `PATCH /api/admin/users/:id/block` - Bloquear usuario
- `PATCH /api/admin/users/:id/unblock` - Desbloquear usuario

## Usuarios de Prueba

El sistema incluye seed data con los siguientes usuarios de prueba:

| Email | Rol | Contraseña |
|-------|-----|------------|
| admin@example.com | ADMIN | Admin123! |
| user1@example.com | USER | User123! |
| user2@example.com | USER | User123! |

Cada usuario tiene su billetera creada automáticamente. El seed deja a
`user1` con 65.000 y a `user2` con 25.000 para poder probar transferencias de
inmediato.

## Ejemplos de Requests/Responses

### Registro
```bash
POST /api/auth/register
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@example.com",
  "password": "Password123!",
  "telefono": "+1234567890"
}

Response:
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@example.com"
    }
  }
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "juan@example.com",
  "password": "Password123!"
}

Response:
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@example.com",
      "rol": "USER"
    }
  }
}
```

### Depósito
```bash
POST /api/wallets/deposit
Authorization: Bearer <token>
{
  "amount": 100000
}

Response:
{
  "success": true,
  "message": "Depósito realizado correctamente",
  "data": {
    "transaction": {
      "id": 1,
      "referencia": "TX-20260925-A8F92K",
      "tipo": "DEPOSIT",
      "monto": 100000.00,
      "estado": "COMPLETED"
    },
    "wallet": {
      "saldo": 100000.00
    }
  }
}
```

### Transferencia
```bash
POST /api/transfers
Authorization: Bearer <token>
{
  "recipientEmail": "user2@example.com",
  "amount": 50000
}

Response:
{
  "success": true,
  "message": "Transferencia realizada correctamente",
  "data": {
    "transaction": {
      "id": 2,
      "referencia": "TX-20260925-B7G83L",
      "tipo": "TRANSFER",
      "monto": 50000.00,
      "estado": "COMPLETED"
    }
  }
}
```

## Pruebas

### Ejecutar Pruebas
Los tests de integración requieren un PostgreSQL. Por defecto usan
`walletucp_test` en `localhost:5433` (el puerto publicado por Docker Compose);
puedes cambiarlo con `TEST_DATABASE_URL`.

```bash
# Backend (unitarios + integración)
cd backend
npm test

# Solo unitarios, no necesita base de datos
npx jest --selectProjects unit

# Con Docker
docker compose exec backend npm test
```

### Casos de Prueba Cubiertos

**Unitarios** (validación y utilidades, sin base de datos):
- Validación de registro e inicio de sesión
- Validación de montos: cero, negativos, no numéricos, fuera de rango
- Generación de referencias de transacción

**De integración** (contra PostgreSQL real, con supertest):

| Área | Casos |
|------|-------|
| Autenticación | Registro, login válido/inválido, usuario bloqueado, perfil `/auth/me`, email duplicado, normalización de email |
| Billetera | Depósito, retiro, retiro sin saldo, precisión decimal (`0.1 + 0.2 = 0.30`), validación de montos |
| Transferencias | Exitosa, a sí mismo, destinatario inexistente, destinatario bloqueado, saldo insuficiente, **rollback real** |
| Atomicidad | Se fuerza un fallo **después** del débito y se verifica que PostgreSQL revierte saldo, transacción y movimientos |
| Concurrencia | Depósitos y retiros simultáneos: sin lost updates, el saldo nunca queda negativo, transferencias bidireccionales no se pierden, el libro mayor siempre cuadra |
| Autorización | Rutas privadas sin token, rol ADMIN en panel de administración, aislamiento entre usuarios |
| Paginación | Total acotado a la billetera del usuario, filtros por tipo |

El test de atomicidad es el más importante: simula un fallo en mitad de la
transferencia y comprueba con consultas directas que la base de datos quedó
intacta. Esa es la garantía que demuestra el proyecto.

```bash
# Solo unitarios (rápidos, sin base de datos)
npx jest --selectProjects unit

# Solo integración (requiere PostgreSQL)
npx jest --selectProjects integration
```

## Seguridad de dependencias

`npm audit` se ejecuta en CI con dos niveles, porque no es lo mismo una
dependencia que se despliega y una que solo se usa en desarrollo:

```bash
# Bloqueante: solo lo que llega a produccion
npm audit --omit=dev --audit-level=moderate

# Informativo: herramientas de desarrollo (no bloquea el pipeline)
npm audit --audit-level=high
```

Versiones actuales: `react-router-dom` 7.18.4, `vite` 7.3.6, `vitest` 3.2.7.
Node 20 es el mínimo porque las versiones parcheadas de Vite y React Router
ya no soportan Node 18.

## Documentación Swagger

La documentación interactiva de la API está disponible en:
```
http://localhost:5000/api-docs
```

## Seguridad

- Contraseñas almacenadas como hash `bcrypt` (nunca en texto plano)
- Tokens JWT para autenticación
- Variables sensibles solo en `.env` (nunca en Git)
- CORS restringido al origen del frontend
- Helmet para cabeceras HTTP seguras
- Rate limiting en rutas de autenticación y operaciones financieras
- Validación de entrada en cada endpoint (frontend y backend)
- Transacciones SQL atómicas para integridad de datos
- Control de concurrencia con `SELECT ... FOR UPDATE`

## CI/CD Pipeline

El proyecto incluye un pipeline de CI/CD en `.github/workflows/pipeline.yml` que:
- Ejecuta pruebas en cada push y pull request
- Valida la calidad del código con linters
- Construye las imágenes Docker
- Despliega a entorno de staging (configurable)

## Principios de Diseño

1. **Arquitectura en capas**: Sin lógica de negocio en las rutas
2. **Código simple y legible**: Por sobre soluciones "elegantes" pero complejas
3. **Monto monetario como NUMERIC(15,2)**: Nunca FLOAT
4. **Operaciones atómicas**: Toda operación que modifique saldo usa transacción SQL completa o rollback total
5. **Validación en backend**: El backend nunca confía en el frontend
6. **Desarrollo incremental**: Módulo por módulo, con confirmación entre etapas

## Licencia

Este proyecto es académico y educativo. No debe usarse para fines comerciales o con dinero real.

## Autor

Desarrollado como proyecto académico para demostrar patrones de diseño de backend transaccional.

---

**Generado con [Devin](https://devin.ai)**
