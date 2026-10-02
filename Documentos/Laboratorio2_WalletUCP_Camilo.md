# LABORATORIO 2 – DESPLIEGUE CI/CD, NGINX Y PIPELINE CON AMBIENTES QA Y PRODUCCIÓN APLICADO AL PROYECTO WALLETUCP

**AUTOR(ES):** CAMILO RODRÍGUEZ

**UNIVERSIDAD CATÓLICA DE PEREIRA**
**OPTATIVA III**
**FACULTAD DE CIENCIAS BÁSICAS E INGENIERÍA**
**TECNOLOGÍA EN DESARROLLO DE SOFTWARE**

**PEREIRA**
**30/09/2026**

---

> **Nota de alcance.** Este laboratorio es el mismo enunciado del informe de
> referencia (*Despliegue CI/CD con WSL, NGINX, GitLab Runner y pipeline*), pero
> aplicado al proyecto **WalletUCP**. Como el equipo de trabajo de este proyecto
> es **macOS** y no Windows 11, el subsistema Linux se implementa con un
> **contenedor Docker con Ubuntu 24.04** en lugar de WSL 2, y la integración y
> despliegue continuo se hace con **GitHub Actions** y un **runner autoalojado**
> en lugar de GitLab CI/CD y GitLab Runner. Todo lo que se afirma en este
> documento corresponde a la configuración real del repositorio y del servidor.

---

## Repositorio del proyecto

→ https://github.com/Camilospino/wallet-ucp

Repositorio remoto de GitHub con dos ramas: `develop` (ambiente QA) y `main`
(ambiente Producción). El pipeline se define en
`.github/workflows/pipeline.yml`.

---

## Descripción de la aplicación

WalletUCP es una billetera virtual académica que permite a los usuarios
administrar saldos y realizar operaciones financieras simuladas entre ellos.
Es un proyecto **100 % educativo**: no se conecta a bancos ni a pasarelas de
pago reales y no maneja dinero real bajo ninguna circunstancia. Todos los
usuarios, saldos y transacciones son ficticios. El valor del proyecto es
académico: demostrar cómo un backend procesa dinero simulado garantizando
que los saldos nunca se pierdan ni se dupliquen.

Con la aplicación, el usuario puede:

- **Registrarse e iniciar sesión.** El registro valida los datos en el
  frontend y en el backend, guarda la contraseña como *hash* con `bcrypt` y
  devuelve un token **JWT** con 24 horas de duración que se usa para las
  peticiones siguientes. Al registrarse se crea automáticamente su billetera
  con saldo `0.00`.

- **Consultar su saldo y sus últimos movimientos.** El panel principal
  (`/dashboard`) muestra el saldo disponible y los cinco movimientos más
  recientes de esa billetera.

- **Depositar.** Permite ingresar dinero simulado a la billetera propia. El
  movimiento queda registrado en el historial con el saldo anterior y el saldo
  resultante.

- **Retirar.** Permite sacar dinero simulado de la billetera propia. Si el
  monto es mayor que el saldo disponible, la operación se rechaza y no se toca
  la base de datos.

- **Transferir.** Permite enviar dinero simulado de la billetera propia a la de
  otro usuario registrado. Genera **dos** movimientos (un débito en el origen y
  un crédito en el destino) ligados a una misma transacción.

- **Consultar el historial de transacciones.** Lista paginada de los
  movimientos de la billetera, con opción de filtrar por tipo de movimiento.

- **Usar el panel de administración.** Un usuario con rol `ADMIN` puede ver
  todos los usuarios, todas las billeteras y todas las transacciones, y además
  bloquear o desbloquear usuarios.

- **Editar su perfil.** Permite consultar y actualizar sus datos personales.

---


La aplicación tiene dos ambientes diferentes. El primero es **QA**
(`http://wallet-ucp-qa.local:8080`), que se utiliza para hacer pruebas y
revisar los cambios antes de pasarlos a la versión final. El segundo es
**Producción** (`http://wallet-ucp.local:8080`), que corresponde a la versión
que se utiliza como definitiva. El nombre del ambiente se muestra en la barra
de navegación para que nunca se confunda uno con el otro al hacer una prueba.

Cada ambiente tiene su propia base de datos, por lo que los datos utilizados
durante las pruebas no se mezclan con los datos de Producción. Un depósito
hecho en QA no altera los saldos de Producción.

---

## Tecnología utilizada

| Capa | Tecnología |
| --- | --- |
| Sistema operativo anfitrión | macOS (MacBook Air, Apple Silicon) |
| Entorno Linux del servidor | Contenedor Docker con Ubuntu 24.04 (`laboratorio-ubuntu`), equivalente a WSL 2 en Windows |
| Servidor web | NGINX 1.24 |
| Lenguaje del servidor | Node.js 20 y Express.js 4 |
| Interfaz | React 18, Bootstrap 5 y Vite 7 (HTML5 y CSS3) |
| Base de datos | PostgreSQL 14 |
| Driver de base de datos | `pg` 8 |
| Autenticación | JSON Web Token (`jsonwebtoken`) y `bcryptjs` |
| Documentación de la API | Swagger / OpenAPI |
| Contenedores | Docker y Docker Compose |

## Motor de base de datos utilizado

Para guardar la información de los usuarios, las billeteras, las transacciones
y los movimientos se utilizó **PostgreSQL**, que corre dentro del contenedor del
servidor web. No se utiliza una base de datos en la nube.

Se crearon dos bases de datos, una para cada ambiente de la aplicación. Cada
ambiente tiene además su propio proceso de backend, de modo que los dos son
completamente independientes:

| Ambiente | Base de datos | Backend Express | Puerto |
| --- | --- | --- | --- |
| QA | `walletucp_qa` | proceso Node independiente | 5001 |
| Producción | `walletucp` | proceso Node independiente | 5000 |

Para conectar la aplicación con la base de datos se creó el usuario
`walletucp`, que tiene los permisos necesarios para trabajar con estas bases de
datos. **No se utiliza directamente el usuario administrador `postgres`.** La
conexión se hace por la variable de entorno `DATABASE_URL`, por ejemplo:

```
DATABASE_URL=postgresql://walletucp:walletucp_password@localhost:5432/walletucp
```

### Tablas de la base de datos

Las dos bases de datos tienen las mismas cuatro tablas:

| Tabla | Guarda |
| --- | --- |
| `usuarios` | `id`, `nombre`, `apellido`, `email`, `password_hash`, `telefono`, `estado` (`ACTIVE` o `BLOCKED`) y `rol` (`USER` o `ADMIN`). |
| `billeteras` | `id`, `usuario_id`, `saldo`, `estado` y fechas. El saldo es `NUMERIC(15,2)`, **nunca un número decimal flotante**, y tiene la restricción `CHECK (saldo >= 0)` que impide a la base de datos misma aceptar un saldo negativo. |
| `transacciones` | `id`, `referencia` (única), billeteras de origen y destino, `tipo` (`DEPOSIT`, `WITHDRAW`, `TRANSFER`), `monto`, `estado` (`PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`) y `descripcion`. |
| `movimientos` | `id`, `wallet_id`, `transaction_id`, `tipo` (`CREDIT` o `DEBIT`), `monto`, `saldo_anterior` y `saldo_resultante`. |

Las tablas `transacciones` y `movimientos` cumplen dos funciones: guardar el
historial que ve el usuario, y dejar registro de cada cambio de saldo. Las
columnas `saldo_anterior` y `saldo_resultante` hacen que el libro mayor sea
auditable: cualquier saldo actual se puede reconstruir sumando los movimientos.

### El mismo código para los dos ambientes

El mismo código de la aplicación se utiliza tanto en QA como en Producción. Lo
que cambia es la configuración de cada ambiente, que le indica al backend qué
base de datos debe utilizar mediante la variable `DATABASE_URL`. En el backend
la conexión se crea una sola vez, en `backend/src/config/database.js`, a partir
de esa variable, de modo que ninguna línea de código cambia entre ambientes:
solo cambia el valor del entorno.

Las tablas se crean con el script `database/migrations/01-create_tables.sql`, que
es **idempotente** (usa `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT
EXISTS` y `DROP TRIGGER IF EXISTS` antes de crear los triggers), por lo que se
puede volver a aplicar sin romper nada. Los datos de prueba iniciales se cargan
con `database/seeds/01-seed_data.sql`, que también es idempotente.

---

| Control de versiones | Git |
| Repositorio remoto | GitHub (github.com) |
| Integración y despliegue continuo | GitHub Actions |
| Ejecutor de pipelines | GitHub Actions *self-hosted runner* (etiqueta `self-hosted`) |
| Editor de código | Visual Studio Code |

### Diferencias frente a la tecnología del enunciado de referencia

| Enunciado de referencia | Este proyecto | Por qué |
| --- | --- | --- |
| Windows 11 + WSL 2 + Ubuntu | macOS + contenedor Docker con Ubuntu 24.04 | El equipo de trabajo es macOS, donde no existe WSL 2. El contenedor cumple la misma función: un Linux donde instalar NGINX, Node.js y servir los dos ambientes. |
| PHP 8 + PHP-FPM + MariaDB | Node.js 20 + Express + PostgreSQL 14 | El proyecto WalletUCP está escrito en JavaScript, con arquitectura en capas y transacciones SQL reales de PostgreSQL. |
| HTML5 y CSS3 | React 18 + Vite 7 + Bootstrap 5 | La interfaz es una SPA (aplicación de una sola página) con React Router. |
| GitLab + GitLab CI/CD + GitLab Runner | GitHub + GitHub Actions + runner autoalojado | Es la plataforma de integración continua con la que ya está construido el proyecto. El flujo es equivalente: `develop` despliega a QA, `main` despliega a Producción tras aprobar el *Pull Request*. |
| MariaDB local en Ubuntu | PostgreSQL en contenedores Docker | Cada ambiente tiene su propio contenedor de base de datos, igual que en el enunciado cada ambiente tenía su propia base de datos. |

---

## Transacciones implementadas contra la base de datos

A diferencia del enunciado de referencia, donde la operación demostrada es un
CRUD sobre una tabla de contactos, en WalletUCP las operaciones que modifican
dinero se implementan como **transacciones SQL atómicas**. Cada una se ejecuta
dentro de un `BEGIN` ... `COMMIT`, y si algo falla se ejecuta un `ROLLBACK` que
deja la base de datos exactamente como estaba.

### Las cuatro operaciones

| Operación | Archivo | Endpoint | Función y efecto en la base de datos |
| --- | --- | --- | --- |
| Registrar un usuario | `backend/src/services/authService.js` | `POST /api/auth/register` | Inserta el usuario y **crea su billetera en la misma transacción**. Si fallara solo el `INSERT` de la billetera, quedaría un usuario que nunca podría operar. |
| Depositar | `backend/src/services/walletService.js` | `POST /api/wallets/deposit` | Bloquea la billetera, suma el saldo, inserta la transacción e inserta un movimiento de tipo `CREDIT`. |
| Retirar | `backend/src/services/walletService.js` | `POST /api/wallets/withdraw` | Bloquea la billetera, **verifica que el saldo alcance**, descuenta el monto, inserta la transacción e inserta un movimiento de tipo `DEBIT`. |
| Transferir | `backend/src/services/walletService.js` | `POST /api/transfers` | Bloquea **las dos** billeteras, descuenta del origen, suma al destino, e inserta una transacción con **dos** movimientos: un `DEBIT` y un `CREDIT`. |

Además, el historial se consulta con `GET /api/transactions` y
`GET /api/transactions/:id`, y el panel de administración con
`GET /api/admin/users`, `GET /api/admin/wallets`,
`GET /api/admin/transactions`, `PATCH /api/admin/users/:id/block` y
`PATCH /api/admin/users/:id/unblock`.

### Cómo se garantiza la atomicidad

Todo el manejo de dinero vive en una función reutilizada por las tres
operaciones financieras, `withTransaction`, definida en `walletService.js`. Su
forma esencial es:

```js
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

Hay un detalle que resulta fácil de equivocar y que este proyecto resolvió de
forma explícita: **cada función de repositorio recibe un `client` opcional como
último argumento y por defecto usa el `pool` compartido**. Si dentro de la
transacción se llamara a un repositorio **sin** pasarle ese `client`, la
sentencia se ejecutaría en **otra conexión** distinta. En ese caso el
`BEGIN`/`COMMIT`/`ROLLBACK` ya no la cubriría y los bloqueos de
`SELECT ... FOR UPDATE` se liberarían de inmediato, destruyendo en silencio
tanto la atomicidad como el control de concurrencia. Por eso la regla del
proyecto es: dentro de un `withTransaction`, **ningún** repositorio se llama sin
`client`.

### Control de concurrencia

Para que dos operaciones simultáneas sobre la misma billetera no se pisen, cada
operación financiera bloquea primero la fila con `SELECT ... FOR UPDATE`
(`walletRepository.lockByUserIdForUpdate`). La fila queda bloqueada hasta el
`COMMIT` o el `ROLLBACK`, así que la segunda operación concurrente tiene que
esperar y, cuando entra, **ya lee el saldo actualizado**. Sin este bloqueo, dos
retiros simultáneos sobre el mismo saldo podrían pasar los dos la validación y
producir un saldo negativo (un *lost update*).

En el caso de la transferencia se bloquean **las dos** billeteras, y para evitar
un *deadlock* se hace **siempre en el mismo orden**: se ordenan los
identificadores de usuario de forma ascendente y se bloquea primero el menor
(`lockWalletsInOrder`). Así, dos transferencias simultáneas en direcciones
opuestas entre los mismos dos usuarios no pueden quedar esperando la una a la
otra.

### Protección contra la inyección SQL

Todas las consultas se hacen con **consultas parametrizadas** del driver `pg`,
donde los valores viajan como parámetros separados de la sentencia:

```js
const query = 'SELECT * FROM billeteras WHERE usuario_id = $1 FOR UPDATE';
const result = await client.query(query, [usuarioId]);
```

Los marcadores `$1`, `$2`, … son posicionales y los valores nunca se
interpolan en la cadena de SQL, de modo que la aplicación no depende de escapar
comillas ni de una lista negra de palabras. La contraseña nunca se consulta en
claro: se guarda como *hash* `bcrypt` y la comparación se hace con
`bcrypt.compare`. La misma lógica de "el backend nunca confía en el frontend"
aparece en los *validators* de entrada, que rechazan montos cero, negativos o no
numéricos antes de tocar la base de datos.

### La transacción que se demuestra

La operación que se demuestra en las evidencias es la **transferencia**, porque
es la que ejercita las dos garantías del proyecto a la vez: mueve saldo entre
dos billeteras y, si algo falla en la mitad, PostgreSQL revierte el débito, el
crédito, la transacción y el movimiento como una sola unidad. La secuencia
completa es:

1. El usuario autenticado entra a `/transfer`, escribe el correo del
   destinatario y el monto, y envía el formulario.
2. El backend valida el monto, busca al destinatario y rechaza el caso en que
   sea el mismo usuario o esté bloqueado.
3. Se abre la transacción y se bloquean las dos billeteras en orden ascendente.
4. Se comprueba el saldo del origen. Si no alcanza, se lanza el error
   `INSUFFICIENT_BALANCE` y el `ROLLBACK` deja todo intacto.
5. Se descuenta del origen, se suma al destino, se inserta la transacción con su
   referencia y se insertan los dos movimientos con `saldo_anterior` y
   `saldo_resultante`.
6. El `COMMIT` confirma todo. Cualquier fallo en el paso 5 provoca el
   `ROLLBACK` y la aplicación responde un error sin haber modificado nada.

En el paso 4 hay una garantía adicional: la restricción `CHECK (saldo >= 0)`
está en la base de datos, así que ni siquiera un error en la lógica de la
aplicación podría dejar un saldo negativo guardado.


### Pruebas que demuestran el comportamiento

El proyecto no se limita a decir que es atómico: lo prueba. Los tests de
integración del backend (`backend/tests`, ejecutados también en el pipeline)
verifican contra un PostgreSQL real que:

- un fallo forzado **después** del débito hace que PostgreSQL revierta el saldo,
  la transacción y los movimientos (atomicidad);
- depósitos y retiros simultáneos no producen *lost updates* y el saldo nunca
  queda negativo (concurrencia);
- transferencias bidireccionales simultáneas entre dos usuarios no se pierden ni
  generan un *deadlock*;
- el libro mayor siempre cuadra con el saldo de cada billetera;
- la precisión decimal es exacta: `0.1 + 0.2 = 0.30`, gracias a
  `NUMERIC(15,2)`.

---

## 1. Evidencias del entorno

### 1.1. Contenedor Linux (equivalente a WSL) funcionando

El enunciado pide evidencia de WSL funcionando. En este proyecto, el sistema
Linux del servidor es un contenedor Docker con Ubuntu 24.04, que cumple la
misma función. Se toma una captura de la terminal con el contenedor
`laboratorio-ubuntu` en ejecución:

```bash
docker ps
```

Debe aparecer una línea como la siguiente, con los puertos 8080, 8081 y 8082
publicados:

```
CONTAINER ID   IMAGE                            PORTS
1d4c448ffbc0   laboratorio-ubuntu-configurado   0.0.0.0:8081-8082->8081-8082/tcp, 0.0.0.0:8080->80/tcp
```

> 📷 **CAPTURA 1.1** — Contenedor `laboratorio-ubuntu` en estado `Up`, con los
> puertos 80, 8081 y 8082 publicados.

### 1.2. Versión de Ubuntu y de Node.js del servidor

```bash
docker exec laboratorio-ubuntu cat /etc/os-release | head -2
docker exec laboratorio-ubuntu node --version
```

Resultados esperados: `Ubuntu 24.04.4 LTS` y una versión `v22.x` de Node.js.

> 📷 **CAPTURA 1.2** — Versión de Ubuntu 24.04 y de Node.js dentro del
> contenedor.

### 1.3. NGINX funcionando

```bash
docker exec laboratorio-ubuntu nginx -v
```

Debe imprimir `nginx version: nginx/1.24.0 (Ubuntu)`. Para comprobar que además
está sirviendo, se pide una página por el puerto alterno:

```bash
curl -I http://localhost:8081
```

> 📷 **CAPTURA 1.3** — Versión de NGINX y respuesta `HTTP/1.1 200 OK` al pedir
> el sitio de QA por el puerto 8081.

### 1.4. Runner registrado (equivalente al GitLab Runner)

El ejecutor de pipelines es un *self-hosted runner* de GitHub Actions, que es el
equivalente funcional del GitLab Runner del enunciado. Está registrado con la
etiqueta `self-hosted` y corre **dentro del mismo contenedor `laboratorio-ubuntu`**
que sirve NGINX, de modo que el build y el despliegue ocurren en la misma máquina
que publica los sitios.

En el repositorio, los jobs que lo usan lo declaran así:

```yaml
build:
  runs-on: [self-hosted]
```

Para evidenciarlo, se toma una captura de la ruta
**GitHub → el repositorio → Settings → Runners**, donde se ve el runner
registrado, en estado *online*, con la etiqueta `self-hosted`.

> 📷 **CAPTURA 1.4** — Pantalla de Runners del repositorio con el runner
> autoalojado registrado y en línea.

### 1.5. Bases de datos configuradas

Los contenedores de PostgreSQL, de la aplicación y del servidor:

```bash
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
```

| Contenedor | Imagen | Puertos publicados |
| --- | --- | --- |
| `laboratorio-ubuntu` | `laboratorio-ubuntu-configurado` | 8080, 8081, 8082 → 80 |
| `walletucp-postgres` | `postgres:14-alpine` | 5433 → 5432 |
| `walletucp-backend` | (backend Express) | 5001 → 5000 |
| `walletucp-frontend` | (frontend Vite) | 3000 → 3000 |

Dentro de `laboratorio-ubuntu` corre el servidor web NGINX 1.24, **dos procesos
Node independientes de Express** (Producción en el 5000 con la base `walletucp`,
QA en el 5001 con la base `walletucp_qa`) y **el servidor PostgreSQL** que aloja
las dos bases de datos. Ese contenedor es, por tanto, el equivalente en este
proyecto de la máquina con WSL 2 del enunciado de referencia.

Para comprobar que PostgreSQL responde y que las dos bases de datos existen:

```bash
docker exec walletucp-postgres psql -U walletucp -d walletucp -c '\l'
```

Se obtiene la lista de bases de datos, donde aparecen `walletucp` (Producción) y
`walletucp_qa` (QA).

> 📷 **CAPTURA 1.5** — Lista de contenedores con sus puertos, y listado de
> bases de datos de PostgreSQL con `walletucp` y `walletucp_qa`.

---

## 2. Evidencias de la configuración de NGINX

NGINX tiene un *server block* independiente por ambiente. Los dos están
habilitados en `/etc/nginx/sites-enabled/`, dentro del contenedor
`laboratorio-ubuntu`.

Para ver la configuración:

```bash
docker exec laboratorio-ubuntu cat /etc/nginx/sites-enabled/wallet-ucp-qa
docker exec laboratorio-ubuntu cat /etc/nginx/sites-enabled/wallet-ucp-produccion
```

| | Ambiente QA | Ambiente Producción |
| --- | --- | --- |
| Archivo | `sites-available/wallet-ucp-qa` | `sites-available/wallet-ucp-produccion` |
| `server_name` | `wallet-ucp-qa.local` | `wallet-ucp.local` |
| `root` | `/var/www/html/wallet-ucp-qa` | `/var/www/html/wallet-ucp-produccion` |
| Logs | `wallet-ucp-qa.access.log` / `.error.log` | `wallet-ucp-produccion.access.log` / `.error.log` |
| `proxy_pass` de `/api/` | `http://127.0.0.1:5001` | `http://127.0.0.1:5000` |
| Backend | Express de QA (BD `walletucp_qa`) | Express de Producción (BD `walletucp`) |
| Rama que lo despliega | `develop` | `main` |

### 2.1. Server block de QA

Configuración completa del ambiente de pruebas, tal como está en el servidor:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name wallet-ucp-qa.local;

    access_log /var/log/nginx/wallet-ucp-qa.access.log;
    error_log  /var/log/nginx/wallet-ucp-qa.error.log;

    root /var/www/html/wallet-ucp-qa;
    index index.html;

    # La aplicacion es una SPA con React Router. Sin try_files, entrar directo
    # a /dashboard daria 404 porque no existe un archivo con ese nombre en disco.
    location / {
        try_files $uri $uri/ /index.html;
    }

    # El bundle es Vite: los assets tienen hash en el nombre, asi que se pueden
    # cachear de forma agresiva sin riesgo de servir versiones viejas.
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Proxy inverso hacia el backend Express de QA (puerto 5001), que a su vez
    # se conecta a la base de datos walletucp_qa.
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /api-docs {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    autoindex off;
}
```

> 📷 **CAPTURA 2.1** — Server block de QA completo en la terminal.

### 2.2. Server block de Producción

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name wallet-ucp.local;

    access_log /var/log/nginx/wallet-ucp-produccion.access.log;
    error_log  /var/log/nginx/wallet-ucp-produccion.error.log;

    root /var/www/html/wallet-ucp-produccion;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API contra el backend Express de PRODUCCION (puerto 5000), que se conecta
    # a la base de datos `walletucp`.
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /api-docs {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    autoindex off;
}
```

> 📷 **CAPTURA 2.2** — Server block de Producción completo en la terminal.

### 2.3. Los dos directorios de publicación en el servidor

Cada ambiente se publica en su propia carpeta, nunca sobre la misma:

```bash
docker exec laboratorio-ubuntu ls /var/www/html
```

```
wallet-ucp-produccion
wallet-ucp-qa
```

Y dentro de cada una está el bundle construido por el pipeline:

```bash
docker exec laboratorio-ubuntu ls /var/www/html/wallet-ucp-qa
```

```
assets
favicon.svg
index.html
site.webmanifest
```

> 📷 **CAPTURA 2.3** — Contenido de `/var/www/html` con las dos carpetas de los
> dos ambientes, y el contenido de la carpeta de QA.

### 2.4. Archivo de hosts del equipo anfitrión

Para que `wallet-ucp.local` y `wallet-ucp-qa.local` resuelvan a la máquina
local, se añaden estas dos líneas al archivo `/etc/hosts` del sistema anfitrión
(macOS). En macOS el archivo se edita con:

```bash
sudo nano /etc/hosts
```

Contenido añadido:

```
127.0.0.1    wallet-ucp-qa.local
127.0.0.1    wallet-ucp.local
```

> 📷 **CAPTURA 2.4** — Archivo `/etc/hosts` con las dos entradas de los dos
> ambientes apuntando a `127.0.0.1`.

> **Nota sobre este punto en macOS.** Editar `/etc/hosts` requiere permisos de
> superusuario, que en un equipo de la universidad no siempre están disponibles.
> Por eso, además del acceso por los dominios, se configuró un tercer *server
> block* de solo revisión llamado `wallet-ucp-preview`, que sirve los mismos
> dos sitios por puerto y **no requiere sudo**:
>
> | Puerto | Equivale a | Ambiente |
> | --- | --- | --- |
> | `http://localhost:8081` | `http://wallet-ucp-qa.local:8080` | QA |
> | `http://localhost:8082` | `http://wallet-ucp.local:8080` | Producción |
>
> Este bloque se puede eliminar sin riesgo cuando ya se pueda editar
> `/etc/hosts`:
>
> ```bash
> docker exec laboratorio-ubuntu rm /etc/nginx/sites-enabled/wallet-ucp-preview
> docker exec laboratorio-ubuntu nginx -s reload
> ```
>
> No altera los ambientes del laboratorio, que siguen sirviéndose por su
> dominio.

### 2.5. Acceso a QA

Con el archivo de hosts configurado, el ambiente de pruebas se abre en:

```
http://wallet-ucp-qa.local:8080
```

> 📷 **CAPTURA 2.5** — Ventana del navegador mostrando la pantalla de
> inicio de sesión de QA en `wallet-ucp-qa.local:8080`.

### 2.6. Acceso a Producción

El ambiente definitivo se abre en:

```
http://wallet-ucp.local:8080
```

> 📷 **CAPTURA 2.6** — Ventana del navegador mostrando la pantalla de
> inicio de sesión de Producción en `wallet-ucp.local:8080`.

En ambas capturas se debe ver, en la barra de navegación, la etiqueta del
ambiente (**QA** o **PRODUCCION**), que el frontend recibe por la variable
`VITE_ENV_NAME` en el momento de la compilación. Sirve para confirmar que los
dos sitios son realmente distintos y no se está viendo por error el mismo
ambiente dos veces.

---



## 3. Evidencias del repositorio

### 3.1. Ramas

El repositorio tiene dos ramas de trabajo, que corresponden a los dos ambientes:

```bash
git --no-pager branch -a
```

```
* develop
  main
  remotes/origin/HEAD -> origin/main
  remotes/origin/develop
  remotes/origin/main
```

| Rama | Ambiente | Regla |
| --- | --- | --- |
| `develop` | QA | Recibe *push* directos; cada *push* dispara el despliegue a QA. |
| `main` | Producción | Está **protegida**: nada llega a `main` sin un *Pull Request* aprobado. Cada *push* a `main` dispara el despliegue a Producción. |

> 📷 **CAPTURA 3.1** — Ramas del repositorio, tanto en la terminal como en la
> pestaña *Branches* de GitHub.

### 3.2. Commits

```bash
git --no-pager log --oneline -14
```

```
e484120 Merge pull request #2 from Camilospino/develop
d2267f9 Corrige la regla de los checks omitidos y documenta la aprobacion real
afdb1a3 Merge pull request #1 from Camilospino/develop
c682ccc Agrega el generador del historial de pipelines y lo regenera
eaea274 Documenta el laboratorio 2: informe, evidencias y generacion del .docx
3fa02bb Merge branch 'main' into develop
06b5e92 Quita del arbol las carpetas vacias docker/ y docs/
1dbba41 Relanza el pipeline con el runner restablecido
a389731 Relanza el pipeline con el runner restablecido
50ca9ae Relanza el pipeline tras reiniciar el runner
1058a1b Documenta los dos ambientes y actualiza el arranque del stack
7033c5d Corrige TruffleHog para que no bloquee en pushes a la rama principal
a9fe6b1 Merge branch 'develop' into main
0a9015e Verifica el despliegue automatico tras corregir permisos de /var/www/html
543efe2 Arregla el fallo "vite: not found" en el job build
```

> 📷 **CAPTURA 3.2** — Historial de commits del repositorio.

### 3.3. Push realizado

Cada *push* a `develop` es el que activa el pipeline de QA:

```bash
git push origin develop
```

> 📷 **CAPTURA 3.3** — Salida del `git push` a `develop`.

### 3.4. La regla de protección de `main`

En GitHub, el equivalente de las *branch protection rules* de GitLab se
configura en **Settings → Branches → Branch protection rules**. La rama `main`
de este repositorio quedó así:

| Ajuste | Valor | Qué protege |
| --- | --- | --- |
| Require a pull request before merging | activado | Nada llega a `main` sin un *Pull Request* abierto y combinado. |
| Require approvals | 1 | Alguien tiene que aprobar el *Pull Request* antes de combinarlo. |
| Require status checks to pass | `test (20.x)`, `test (22.x)`, `security-scan`, `build` | El *Pull Request* no se puede combinar hasta que los cuatro *checks* estén en verde. |
| Require branches to be up to date | activado | El *Pull Request* tiene que incluir el `main` más reciente. |

Los cuatro *checks* exigidos son precisamente los *jobs* que corren en un
*Pull Request*. No se exigieron `deploy_main`, `smoke-test` ni `version`, porque
los tres están condicionados a `github.event_name == 'push'` y al abrir un
*Pull Request* no llegan a ejecutarse. Vale la pena ser preciso sobre lo que
eso significa: GitHub no los cuenta como *fallidos*, sino como ***skipped***, y
un *check* omitido se considera aprobado a efectos de combinar. Es decir,
exigirlos **no** habría bloqueado el *Pull Request* para siempre, como se suele
suponer; simplemente no habría aportado ninguna validación, porque un *check*
que nunca corre no puede aprobar ni reprobar nada. La regla queda así de
efectiva: cuatro *checks* que de verdad se ejecutan en cada *Pull Request*.

Tampoco se activó la casilla *Do not allow bypassing the above settings*, que
impide saltarse las reglas incluso al propietario del repositorio. En un
proyecto de un solo autor eso dejaría el repositorio sin poder avanzar si
nadie más pudiera aprobar.

> 📷 **CAPTURA 3.4** — Regla de protección de la rama `main` en GitHub, con los
> cuatro *status checks* obligatorios listados.

### 3.5. Pull Request y aprobación

El equivalente en GitHub del *Merge Request* de GitLab es el **Pull Request**.
Se abre un *Pull Request* de `develop` hacia `main` en la pestaña *Pull
requests* del repositorio, donde se puede revisar el diff, dejar comentarios y
**aprobarlo** antes de combinarlo.

Para que la aprobación no sea un trámite de una sola persona, el repositorio
tiene un segundo colaborador con permiso de escritura, `xcandres04`, que
revisa y aprueba cada *Pull Request* antes de que se lo combine. La regla de
protección exige **una** aprobación de alguien con acceso de escritura, y ese
revisor no es el autor.

> 📷 **CAPTURA 3.5** — Pull Request abierto de `develop` hacia `main`, con la
> lista de checks del pipeline en verde y la aprobación visible antes de
> combinar.

### 3.6. Aprobación y merge

Al aprobar y combinar el *Pull Request*, GitHub hace el *merge* hacia `main`, y
ese *push* a `main` es lo que dispara `deploy_main` y el job `version`, que crea
la siguiente etiqueta `vX.Y.Z`.

> **Nota sobre el primer Pull Request.** El PR #1 (`develop` → `main`) sí llegó
> a combinarse, pero lo hizo **saltándose la regla de aprobación**: mientras se
> terminaba de poner en marcha el *runner* autoalojado, se marcó la casilla
> *"Merge without waiting for requirements to be met"*, que GitHub solo ofrece al
> propietario del repositorio. Se puede comprobar en el historial: ese PR figura
> como *Merged* con *"No reviews"*, y el `main` avanzó igualmente. No se
> corrigió rebobinando la rama, porque eso habría borrado la etiqueta `v1.0.4` y
> hubiera obligado a volver a desplegar a Producción. Se deja registrado tal
> cual, y el flujo completo **con aprobación de un segundo revisor** se
> demuestra en el PR #2, que es el que ilustran las capturas siguientes.

El PR #2 (`develop` → `main`, commit `d2267f9`) sí siguió el flujo completo:
`xcandres04` lo aprobó el 30 de septiembre de 2026 a las 09:01 UTC y se
combinó un minuto después, sin usar el bypass. Ese `push` a `main` disparó
`deploy_main` y el job `version`, que creó la etiqueta `v1.0.5`.

> 📷 **CAPTURA 3.6** — Pull Request marcado como *Merged*, con la aprobación del
> segundo revisor y el commit de combinación visible en el historial de `main`.

### 3.7. Versionado por etiquetas

Como extensión, el pipeline crea una etiqueta `vX.Y.Z` por cada despliegue a
Producción. Al momento de redactar este informe el repositorio tenía las
etiquetas `v1.0.0` a `v1.0.5`; la numeración crece sola con cada nuevo
despliegue a Producción. Las dos últimas las creó automáticamente el job
`version`: la `v1.0.4` sobre el commit de combinación del PR #1, y la `v1.0.5`
sobre el del PR #2. Cada una es la prueba de que ese recorrido de despliegue se
ejecutó de principio a fin.

```bash
git --no-pager tag
```

> 📷 **CAPTURA 3.7** — Etiquetas del repositorio y sección *Releases* de
> GitHub.

---


## 4. Evidencias de los pipelines

El pipeline está definido en `.github/workflows/pipeline.yml` y se dispara en
cada *push* y cada *Pull Request* contra `main` y `develop`. Cada *job* hace una
sola cosa y **solo publica el artefacto si todo lo anterior pasó**.

### 4.1. Los jobs del pipeline

| Job | Cuándo corre | Qué hace |
| --- | --- | --- |
| `test` | siempre | Lint y pruebas de backend (unitarios e integración contra PostgreSQL) y de frontend, en Node 20 y 22. |
| `security-scan` | siempre | `npm audit` bloqueante sobre las dependencias de producción, informativo sobre las de desarrollo, y escaneo de secretos con TruffleHog. |
| `build` | tras `test` y `security-scan` | Compila `frontend/dist` y lo publica como artefacto del workflow. Corre en el runner autoalojado. |
| `smoke-test` | en *push* | Levanta el stack con `docker compose` y comprueba que `/health` responde, que el frontend sirve la app y que un login real contra la API funciona. |
| `deploy_dev` | *push* a `develop` | Copia el artefacto a `/var/www/html/wallet-ucp-qa` (ambiente QA). |
| `deploy_main` | *push* a `main` | Copia el artefacto a `/var/www/html/wallet-ucp-produccion` (ambiente Producción). |
| `version` | *push* a `main` | Calcula la siguiente etiqueta `vX.Y.Z` y la publica. |

El flujo completo es:

```
push a develop ─► test ─► security-scan ─► build ─► smoke-test ─► deploy_dev  (QA)
                                                                             
push a main    ─► test ─► security-scan ─► build ─► smoke-test ─► deploy_main (Producción) ─► version
```

Nótese que `build` depende de `test` **y** de `security-scan`, y `deploy_dev` /
`deploy_main` dependen de `build`. Por eso **nunca se despliega código que no
haya pasado las pruebas ni el escaneo de seguridad**.

### 4.2. Pipeline de QA

Un *push* a `develop` ejecuta el pipeline de QA, que termina en `deploy_dev`
copiando el bundle a la carpeta del ambiente de pruebas.

> 📷 **CAPTURA 4.1** — Ejecución del pipeline correspondiente al *push* a
> `develop`, en GitHub → *Actions*, con los jobs en verde y `deploy_dev`
> completado.

### 4.3. Jobs ejecutados

Para evidenciar el detalle de cada paso, se toma la captura del log de un job
concreto (por ejemplo `deploy_dev`), donde se ve que descarga el artefacto,
limpia la carpeta de destino, la recrea y copia el contenido:

```bash
rm -rf /var/www/html/wallet-ucp-qa
mkdir -p /var/www/html/wallet-ucp-qa
cp -a dist/. /var/www/html/wallet-ucp-qa
```

Cada *job* borra la carpeta antes de copiarse. Así, un archivo que se elimina del
proyecto en un commit posterior no sigue quedándose en el servidor y serviéndose
para siempre.

> 📷 **CAPTURA 4.2** — Log del job `deploy_dev` mostrando los pasos de limpieza,
> creación y copia de la carpeta de QA.

### 4.4. El runner autoalojado

Los *jobs* `build`, `deploy_dev`, `deploy_main` y `version` no corren en los
servidores de GitHub: corren en el **runner autoalojado** del laboratorio, un
contenedor Ubuntu 24.04 con la etiqueta `self-hosted`. Que esté en línea es la
condición para que el *check* `build` pueda reportarse y para que el *Pull
Request* pueda combinarse.

> 📷 **CAPTURA 4.3** — **Settings → Runners** del repositorio, con el runner
> autoalojado registrado, en línea y con la etiqueta `self-hosted`.

### 4.5. Pipeline de Producción y ejecución exitosa

Tras combinar el *Pull Request* hacia `main`, el pipeline de Producción se
ejecuta completo y termina en `deploy_main` y `version`.

> 📷 **CAPTURA 4.4** — Ejecución del pipeline del *push* a `main`, con
> `deploy_main` y `version` completados, en GitHub → *Actions*.

> 📷 **CAPTURA 4.5** — Vista resumen de una ejecución completa del pipeline con
> todos los jobs en verde y la marca de *success*.

---


## 5. Evidencias del aplicativo

Usuarios de prueba creados por el script de datos iniciales
(`database/seeds/01-seed_data.sql`):

| Ambiente | Correo | Contraseña | Rol |
| --- | --- | --- | --- |
| QA | `user1@example.com` | `User123!` | Usuario |
| QA | `admin@example.com` | `Admin123!` | Administrador |
| Producción | `user1@example.com` | `User123!` | Usuario |
| Producción | `admin@example.com` | `Admin123!` | Administrador |

### 5.1. Aplicación funcionando en QA

1. Abrir `http://wallet-ucp-qa.local:8080` (o `http://localhost:8081`).
2. Iniciar sesión con `user1@example.com` / `User123!`.
3. Entrar al panel, donde se ve la etiqueta **QA** en la barra de navegación.

> 📷 **CAPTURA 5.1** — Panel principal (`/dashboard`) del ambiente QA con el
> saldo del usuario y la etiqueta del ambiente visible en la barra de
> navegación.

### 5.2. Aplicación funcionando en Producción

1. Abrir `http://wallet-ucp.local:8080` (o `http://localhost:8082`).
2. Iniciar sesión con `user1@example.com` / `User123!`.
3. Entrar al panel, donde se ve la etiqueta **PRODUCCION**.

> 📷 **CAPTURA 5.2** — Panel principal del ambiente de Producción, con la
> etiqueta **PRODUCCION** visible.

Que las dos capturas muestren saldos distintos es la evidencia de que los
ambientes no comparten base de datos.

### 5.3. Operación realizada contra la base de datos

Se demuestra una **transferencia**, que es la operación que mueve saldo entre
dos billeteras dentro de una sola transacción:

1. Iniciar sesión en QA como `user1@example.com`.
2. Ir a **Transferir** (`/transfer`), escribir `user2@example.com` y un monto,
   por ejemplo `50.00`.
3. Confirmar la operación.
4. Revisar **Transacciones** (`/transactions`): la transferencia aparece con
   estado `COMPLETED` y con un movimiento `DEBIT` por `50.00`.

Para comprobar en la base de datos que la operación realmente se guardó, se
consulta la base del ambiente de QA:

```bash
docker exec walletucp-postgres psql -U walletucp -d walletucp_qa -c \
  "SELECT u.email, b.saldo FROM billeteras b
     JOIN usuarios u ON u.id = b.usuario_id ORDER BY u.email;"
```

Y el detalle de los movimientos de la transferencia:

```bash
docker exec walletucp-postgres psql -U walletucp -d walletucp_qa -c \
  "SELECT t.referencia, t.tipo, t.monto, t.estado, m.tipo AS movimiento,
          m.saldo_anterior, m.saldo_resultante
     FROM movimientos m
     JOIN transacciones t ON t.id = m.transaction_id
    ORDER BY m.id DESC LIMIT 5;"
```

El resultado esperado muestra, para la transferencia, **dos** movimientos: un
`DEBIT` en la billetera de origen con `saldo_resultante` menor, y un `CREDIT` en
la de destino con `saldo_resultante` mayor, ambos correspondientes a la misma
referencia.

Para demostrar la separación de ambientes, la misma consulta sobre la base de
Producción (`-d walletucp`) **no** muestra esa transferencia:

```bash
docker exec walletucp-postgres psql -U walletucp -d walletucp -c \
  "SELECT u.email, b.saldo FROM billeteras b
     JOIN usuarios u ON u.id = b.usuario_id ORDER BY u.email;"
```

> 📷 **CAPTURA 5.3** — Formulario de transferencia en QA, y resultado de las
> consultas SQL a `walletucp_qa` (con la transferencia) y a `walletucp` (sin
> ella).

---


## Conclusión de los errores

Durante el laboratorio me salieron algunos errores que al principio no
entendía, pero con cada uno aprendí algo nuevo. Estos son los cuatro reales que
tuve que resolver en este proyecto.

**El primero fue `vite: not found` en el job `build`.** El build fallaba justo
antes de generar el bundle, con el error `vite: not found`. Lo primero que
pensé era que faltaba instalar dependencias, pero `npm ci` se estaba ejecutando
bien. El problema estaba en que yo había puesto `NODE_ENV: production` a nivel
de todo el workflow, y con esa variable npm **omite las `devDependencies`**,
que es justamente donde vive Vite. Lo que me confundió más es que el paso de
instalación terminaba con éxito igualmente: npm instala lo que puede y no
avisa. Lo resolví quitando `NODE_ENV` del nivel global y definiéndolo **job por
job**, y además agregué un paso que verifica que el ejecutable de Vite exista
antes de compilar, para que un error así se reporte en su origen y no tres
pasos más adelante.

**El segundo error fue el job `test` muriendo con código 127.** El job se
detenía antes de llegar a las pruebas. El código 127 en Linux significa
"comando no encontrado", y la causa era que yo había agregado un paso que
aplicaba el esquema de la base de datos con `psql`, pero `psql` no viene
instalado en la imagen `ubuntu-latest` de GitHub Actions. Lo resolví **borrando
ese paso**: el proyecto ya tiene un `globalSetup` en los tests de integración
que crea la base de datos si no existe y aplica el mismo archivo de migración,
que es idempotente. Ese paso solo duplicaba trabajo y lo que añadía era un
punto de falla. Con eso aprendí que a veces la mejor corrección es borrar código
en vez de arreglarlo.

**El tercero fue que el escaneo de secretos bloqueaba todos los pushes a
`main`.** El job de seguridad fallaba en cada *push* a la rama principal y no
encontraba ningún secreto real. El mensaje era `BASE and HEAD commits are the
same. TruffleHog won't scan anything`. La causa era que el escaneo comparaba la
rama base por defecto contra el commit actual, y cuando el *push* **era** justo
a la rama principal, ambos eran el mismo commit y el rango quedaba vacío. Lo
resolví indicando el rango explícito de los commits que introduce ese *push*
(`HEAD~1` a `HEAD`), que nunca está vacío. Aprendí que una herramienta de
seguridad mal configurada es igual de problemática como una sin configurar:
puede bloquear el proyecto entero y enseñar a ignorar sus propias alertas.

**El cuarto error fueron los permisos en `/var/www/html`.** El job de
despliegue fallaba al no poder crear ni borrar las carpetas de publicación. El
*self-hosted runner* corre con el usuario `github-runner`, sin privilegios de
superusuario, y `/var/www/html` es propiedad de `root`. Mi primer impulso fue
cambiarle el propietario a `root` con `chown`, pero eso habría afectado también
a los sitios de otros proyectos que viven en esa misma carpeta. Lo correcto, y
lo que terminé haciendo, fue dar permisos solo al usuario del runner con
una ACL: `setfacl -m u:github-runner:rwx /var/www/html`. Así cada proyecto
sigue teniendo lo suyo y el runner puede trabajar solo donde necesita.

También me di cuenta de lo útil que es tener QA antes que producción: si algo
sale mal, se ve primero en pruebas y no le llega al usuario final. Durante el
laboratorio, tres de los cuatro errores anteriores se detectaron **en el
ambiente de QA**, cuando un usuario todavía no dependía de ellos. Ese es el
valor real de separar los dos ambientes con sus propias bases de datos.

Finalmente, me llevo una idea que me pareció la más importante del proyecto:
en una aplicación que maneja dinero, **no basta con que el código "parezca"
correcto, hay que demostrarlo**. El proyecto no se limita a afirmar que sus
operaciones son atómicas: incluye pruebas que fuerzan un fallo en mitad de una
transferencia y comprueban, con consultas directas a la base de datos, que el
saldo, la transacción y el movimiento volvieron exactamente a su estado
anterior. Esa es la diferencia entre decir que algo funciona y probarlo.

---

## Anexo. Cómo reproducir el ambiente

Comandos usados para levantar todo el proyecto desde cero:

```bash
# 1. Levantar PostgreSQL, backend y frontend
docker compose up -d --build

# 2. Comprobar que la API responde
curl http://localhost:5000/health

# 3. Revisar el ambiente de QA por el puerto alterno (sin editar /etc/hosts)
open http://localhost:8081

# 4. Revisar el ambiente de Producción por el puerto alterno
open http://localhost:8082

# 5. Detener todo
docker compose down
```

Ejecutar las pruebas:

```bash
# Solo unitarios, no necesitan base de datos
cd backend && npx jest --selectProjects unit

# Unitarios e integración (requiere PostgreSQL)
cd backend && npm test
```

Generar el documento en PDF a partir de este archivo Markdown:

```bash
pandoc Laboratorio2_WalletUCP_Camilo.md -o Laboratorio2_WalletUCP_Camilo.pdf
```

---

