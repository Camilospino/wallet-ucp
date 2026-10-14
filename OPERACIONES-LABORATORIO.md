# Operaciones del laboratorio (`laboratorio-ubuntu`)

Este documento explica cómo levantar y operar el entorno del laboratorio.
Complementa al `README.md`, que cubre el stack de Docker Compose de desarrollo
(`docker-compose.yml` de la raíz). Los archivos del laboratorio viven en
`laboratorio/`.

## Qué es

`laboratorio-ubuntu` es un contenedor Ubuntu 24.04 que reproduce un servidor
real con **Docker Engine propio** (Docker-in-Docker). Dentro de él, QA y
Producción corren como contenedores independientes:

```
Mac (Docker Desktop)
└─ laboratorio-ubuntu  (--privileged, restart unless-stopped)
   ├─ dockerd ── stack "wallet-lab" (laboratorio/docker/docker-compose.yml)
   │   ├─ wallet-postgres      PostgreSQL 16: bases walletucp y walletucp_qa
   │   ├─ wallet-backend-prod  :5000 -> BD walletucp
   │   ├─ wallet-backend-qa    :5001 -> BD walletucp_qa
   │   └─ wallet-nginx         :80 (por Host), :8081 (QA), :8082 (Producción)
   └─ runner de GitHub (nativo) -> despliega el frontend en /var/www/html
```

| Ambiente  | Puerto host | Backend | Base de datos   | Rama         |
|-----------|-------------|---------|-----------------|--------------|
| QA        | **8083**    | 5001    | `walletucp_qa`  | `develop`    |
| Producción| **8082**    | 5000    | `walletucp`     | `main`       |

El puerto host **8080** atiende por nombre de host (`wallet-ucp.local` /
`wallet-ucp-qa.local`) igual que antes.

> **¿Por qué QA está en 8083 y no en 8081?** Dentro del laboratorio el NGINX de
> QA sigue escuchando en el 8081, pero en el Mac ese puerto lo usa Expo/Metro
> (el puerto por defecto de React Native). Como un puerto del Mac solo puede
> tener un dueño, el laboratorio publica QA en el **8083** (`-p 8083:8081`)
> y así los dos pueden correr a la vez.

## Levantar el entorno

```bash
docker start laboratorio-ubuntu
```

Eso es todo: el entrypoint (`laboratorio/entrypoint.sh`) arranca Docker
interno, el stack de compose y el runner, y el contenedor tiene
`restart unless-stopped`, así que vuelve solo al reiniciar Docker Desktop.
`docker stop` apaga los contenedores internos en orden (PostgreSQL cierra
limpio).

El primer arranque tarda unos minutos (descarga imágenes y construye el
backend); los siguientes, unos 15 segundos. Para ver el progreso:

```bash
docker logs -f laboratorio-ubuntu
```

> **Puerto ocupado.** Si otro proceso del Mac usa el 8080, 8082 u 8083,
> Docker no puede publicar el puerto y el contenedor no arranca
> (`bind: address already in use`). Para ver quién lo usa:
> `lsof -nP -iTCP:8083 -sTCP:LISTEN`.

### Verificar que quedó bien

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8083   # QA -> 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082   # Producción -> 200
curl -s http://localhost:8082/health
# {"status":"OK","database":"OK","timestamp":"..."}
```

Si algo falla, `start-wallet.sh` es idempotente y muestra un diagnóstico:

```bash
docker exec laboratorio-ubuntu bash /opt/wallet/start-wallet.sh
```

## Comandos de diagnóstico

Los comandos `docker` que van *después* de `docker exec laboratorio-ubuntu` se
ejecutan contra el Docker **interno** del laboratorio.

```bash
# Estado de los contenedores internos
docker exec laboratorio-ubuntu docker ps

# Logs
docker exec laboratorio-ubuntu docker logs -f wallet-backend-prod
docker exec laboratorio-ubuntu docker logs -f wallet-backend-qa
docker exec laboratorio-ubuntu docker logs -f wallet-postgres
docker exec laboratorio-ubuntu tail -f /var/log/nginx/wallet-ucp-produccion.access.log
docker exec laboratorio-ubuntu tail -f /tmp/runner.log          # GitHub Actions
docker exec laboratorio-ubuntu tail -f /var/log/dockerd.log     # Docker interno
```

## Configuración y secretos

| Ruta dentro del laboratorio            | Contenido                                   | En git |
|----------------------------------------|---------------------------------------------|--------|
| `/opt/wallet/docker/.env`              | `POSTGRES_PASSWORD`, `WALLET_DB_PASSWORD`   | No (hay `.env.example`) |
| `/opt/wallet/docker/env/produccion.env`| Variables del backend de producción         | No (hay `.example`) |
| `/opt/wallet/docker/env/qa.env`        | Variables del backend de QA                 | No (hay `.example`) |
| `/opt/wallet/docker/nginx/conf.d/`     | Vhosts de NGINX                              | **Sí** |
| `/opt/wallet/docker/postgres/ssl/`     | Certificado autofirmado de PostgreSQL       | No (se genera solo) |

Con `NODE_ENV=production` el backend exige SSL hacia PostgreSQL
(`backend/src/config/database.js`), por eso el contenedor de PostgreSQL corre
con `ssl=on`. `start-wallet.sh` genera el certificado la primera vez.

## Base de datos

Son **dos bases distintas** en el mismo PostgreSQL. Lo que se hace en una no
afecta a la otra.

```bash
# Producción (BD walletucp)
docker exec -it laboratorio-ubuntu docker exec -it wallet-postgres psql -U postgres -d walletucp

# QA (BD walletucp_qa)
docker exec -it laboratorio-ubuntu docker exec -it wallet-postgres psql -U postgres -d walletucp_qa
```

PostgreSQL solo se publica en el `127.0.0.1` del Ubuntu: no es alcanzable
desde el Mac. Los datos viven en el volumen interno `wallet-lab_pgdata`, que a
su vez está en el volumen `laboratorio-docker-data` del Mac: **sobreviven a
recrear el contenedor** siempre que se reutilice ese volumen.

### Primer arranque: cómo se crean las bases

`laboratorio/docker/postgres/00-init.sh` solo se ejecuta con el volumen vacío:

- Si existe `/opt/wallet/docker/postgres/import/cluster.sql` (un
  `pg_dumpall`), restaura ese respaldo. Así se migraron los datos del
  PostgreSQL nativo que tenía el laboratorio anterior.
- Si no, crea el rol `walletucp` y las dos bases con las migraciones y seeds
  de `database/`.

### Respaldos

```bash
docker exec laboratorio-ubuntu bash -c 'mkdir -p /opt/wallet/backups/$(date +%Y%m%d) && cd $_ &&
  for db in walletucp walletucp_qa; do
    docker exec wallet-postgres pg_dump -U postgres -Fc $db > $db.dump
  done && ls -la'
```

Para restaurar, dentro del laboratorio
(`docker exec -it laboratorio-ubuntu bash`):
`docker exec -i wallet-postgres pg_restore -U postgres --clean --if-exists -d <base> < <archivo>.dump`.

### Migraciones de base de datos

Siempre con respaldo previo y en una sola transacción, en ambas bases:

```bash
docker cp database/migrations/01-create_tables.sql laboratorio-ubuntu:/tmp/migracion.sql
docker exec laboratorio-ubuntu bash -c 'docker cp /tmp/migracion.sql wallet-postgres:/tmp/migracion.sql &&
  for db in walletucp_qa walletucp; do
    docker exec wallet-postgres psql -U postgres -d $db -v ON_ERROR_STOP=1 --single-transaction -f /tmp/migracion.sql
  done'
```

Si la migración crea tablas, las tablas pertenecen a `postgres` y hay que dar
`GRANT ALL PRIVILEGES` sobre la tabla y su secuencia al rol `walletucp`.

## Despliegue (CI/CD)

`main` y `develop` disparan el pipeline. El runner de GitHub Actions vive
dentro del laboratorio (nativo, no en un contenedor) y ejecuta los jobs
`build` y `deploy_*`. El pipeline **no cambió**: copia el build del frontend a
`/var/www/html/wallet-ucp-{qa,produccion}`, carpeta que el contenedor de NGINX
monta en solo lectura, así que el cambio se ve al instante.

```bash
git push origin develop   # -> despliega a QA        (localhost:8083)
git push origin main      # -> producción + tag vX.Y.Z (localhost:8082)
```

**El pipeline solo despliega el frontend.** Para actualizar el backend (los
dos ambientes comparten la misma imagen `wallet-backend:lab`):

```bash
docker cp backend/src/. laboratorio-ubuntu:/opt/wallet/backend/src/
docker cp backend/package.json backend/package-lock.json laboratorio-ubuntu:/opt/wallet/backend/
docker exec laboratorio-ubuntu bash -c 'cd /opt/wallet/docker &&
  docker compose --env-file .env build backend-prod &&
  docker compose --env-file .env up -d backend-prod backend-qa'
```

Si `docker cp` deja archivos que ya no existen en el repo, bórralos dentro de
`/opt/wallet/backend/src` antes de construir.

## Reconstruir el laboratorio

La imagen se construye desde el repo, sobre el respaldo del laboratorio
original (que contiene el registro del runner de GitHub):

```bash
docker build -t laboratorio-ubuntu-docker:latest \
  --build-arg BASE_IMAGE=laboratorio-ubuntu-backup:pre-docker-20261012 \
  -f laboratorio/Dockerfile .

# Guardar primero los secretos del contenedor actual (no estan en git):
docker cp laboratorio-ubuntu:/opt/wallet/docker/.env .env
docker cp laboratorio-ubuntu:/opt/wallet/docker/env/produccion.env produccion.env
docker cp laboratorio-ubuntu:/opt/wallet/docker/env/qa.env qa.env

docker stop laboratorio-ubuntu && docker rm laboratorio-ubuntu
docker create --name laboratorio-ubuntu --hostname laboratorio-ubuntu \
  --privileged --restart unless-stopped --stop-timeout 60 \
  -v laboratorio-docker-data:/var/lib/docker \
  -p 8080:80 -p 8083:8081 -p 8082:8082 \
  laboratorio-ubuntu-docker:latest
# Copiar los secretos (desde tus copias locales) antes del primer arranque:
docker cp .env            laboratorio-ubuntu:/opt/wallet/docker/.env
docker cp produccion.env  laboratorio-ubuntu:/opt/wallet/docker/env/produccion.env
docker cp qa.env          laboratorio-ubuntu:/opt/wallet/docker/env/qa.env
docker start laboratorio-ubuntu
```

Reutilizar `laboratorio-docker-data` conserva las bases y las imágenes.
`--privileged` es obligatorio: sin él Docker interno no puede arrancar.

## Problemas conocidos

### 1. `laboratorio-ubuntu-legacy` no debe arrancarse a la vez

El laboratorio anterior (todo nativo, sin Docker) se conserva detenido como
`laboratorio-ubuntu-legacy` para poder volver atrás. Comparte el registro del
runner de GitHub: si los dos corren a la vez, ambos compiten por los jobs.
Para volver atrás: `docker stop laboratorio-ubuntu`, luego
`docker start laboratorio-ubuntu-legacy` y
`docker exec laboratorio-ubuntu-legacy bash /opt/wallet/start-wallet.sh`.

### 2. ACLs de `/var/www/html`

El runner (usuario `github-runner`) borra y recrea las carpetas de despliegue
gracias a ACLs (`preparar-ambientes.sh`). `docker commit` y las capas de
imagen **no conservan ACLs**, así que `start-wallet.sh` las reaplica en cada
arranque. Si un deploy falla con `rm: cannot remove ... Permission denied`,
ejecuta `docker exec laboratorio-ubuntu bash /opt/wallet/preparar-ambientes.sh`.

### 3. El smoke-test del pipeline espera `/health`

Cada vhost de NGINX debe proxear `/health` al backend; si no, cae en el
`try_files` de la SPA y devuelve `index.html` con HTTP 200 (falso positivo).
Los vhosts de `laboratorio/docker/nginx/conf.d/` ya lo incluyen.

### 4. `trust proxy` (rate limiting)

NGINX envía `X-Forwarded-For` y Express debe estar configurado con
`app.set('trust proxy', 1)` en producción. Sin eso, `express-rate-limit` ignora
la IP real, registra `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` y **todas las
peticiones comparten un único contador**.

El valor debe ser `1` (un salto) y **nunca `true`**: con `true`, un cliente
directo podría falsificar la cabecera y evadir el límite por completo.
