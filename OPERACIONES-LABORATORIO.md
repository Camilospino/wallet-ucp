# Operaciones del laboratorio (`laboratorio-ubuntu`)

Este documento explica cómo levantar y operar el entorno del laboratorio.
Complementa al `README.md`, que solo cubre el stack de Docker Compose.

## Qué es (y qué NO es)

`laboratorio-ubuntu` es un contenedor Ubuntu 24.04 que reproduce un servidor
real de producción con **dos ambientes independientes**:

| Ambiente  | Puerto host | Backend | Base de datos   | Rama         |
|-----------|-------------|---------|-----------------|--------------|
| QA        | **8081**    | 5001    | `walletucp_qa`  | `develop`    |
| Producción| **8082**    | 5000    | `walletucp`     | `main`       |

**Importante: dentro de este contenedor NO hay Docker.** Todo es nativo:
Node, PostgreSQL 16 y NGINX. Por eso no se levanta con `docker compose`.

## Levantar el entorno

```bash
# 1. Arrancar el contenedor
docker start laboratorio-ubuntu

# 2. Levantar TODO el stack interno (OBLIGATORIO)
docker exec laboratorio-ubuntu bash /opt/wallet/start-wallet.sh
```

El paso 2 **no es opcional**. El contenedor no usa systemd, así que Docker
puede mostrarlo como "Up" mientras PostgreSQL, los backends y NGINX siguen
caídos. El script es idempotente: si algo ya está arriba, lo detecta.

### Verificar que quedó bien

```bash
# Las tres páginas deben devolver 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081   # QA
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8082   # Producción

# /health debe devolver JSON del backend, NO el HTML de la SPA
curl -s http://localhost:8082/health
# {"status":"OK","timestamp":"..."}
```

Si `/health` devuelve HTML, falta el bloque `location = /health` en el vhost
de NGINX (ver "Problemas conocidos" más abajo).

## Comandos de diagnóstico

```bash
# Procesos internos escuchando
docker exec laboratorio-ubuntu bash -lc 'ss -tln | grep -E ":5000|:5001|:8081|:8082"'

# Logs
docker exec laboratorio-ubuntu tail -f /tmp/backend-produccion.log
docker exec laboratorio-ubuntu tail -f /tmp/backend-qa.log
docker exec laboratorio-ubuntu tail -f /tmp/runner.log          # GitHub Actions
docker exec laboratorio-ubuntu tail -f /var/log/nginx/wallet-ucp-produccion.access.log
```

## Base de datos

Son **dos bases distintas** dentro del contenedor. Lo que se hace en una no
afecta a la otra.

```bash
# Producción (BD walletucp)
docker exec -it laboratorio-ubuntu psql \
  "postgresql://walletucp:walletucp_password@127.0.0.1:5432/walletucp"

# QA (BD walletucp_qa)
docker exec -it laboratorio-ubuntu psql \
  "postgresql://walletucp:walletucp_password@127.0.0.1:5432/walletucp_qa"
```

> PostgreSQL dentro del contenedor escucha **solo en `127.0.0.1`** y `pg_hba.conf`
> solo admite `127.0.0.1`/`::1`. Por eso no se puede conectar desde el host
> (ni con TablePlus) sin cambiar ambos ficheros y recrear el contenedor.

## Despliegue (CI/CD)

El `main` y `develop` disparan el pipeline. El `runner` de GitHub Actions vive
dentro del contenedor y es quien ejecuta los jobs `build` y `deploy_*`.

```bash
git push origin develop   # -> despliega a QA        (localhost:8081)
git push origin main     # -> producción + tag vX.Y.Z (localhost:8082)
```

**El pipeline solo despliega el frontend** (build estático a `/var/www/html`).
El backend en `/opt/wallet/backend` **no se actualiza** automáticamente: si
cambias código del backend hay que copiarlo a mano y reiniciar:

```bash
docker cp backend/src/app.js laboratorio-ubuntu:/opt/wallet/backend/src/app.js
docker exec laboratorio-ubuntu bash -lc 'pkill -f "node src/server.js"'
docker exec laboratorio-ubuntu bash /opt/wallet/start-wallet.sh
```

## Problemas conocidos

### 1. El contenedor no reinicia solo

`laboratorio-ubuntu` se creó **sin** política de reinicio, a diferencia de los
tres contenedores del Compose, que sí usan `restart: unless-stopped`. Al cerrar
Docker Desktop hay que repetir los dos comandos de "Levantar el entorno".

**Para arreglarlo** hay que recrear el contenedor con la política puesta:

```bash
docker commit laboratorio-ubuntu laboratorio-ubuntu-backup:latest   # respaldo
docker stop laboratorio-ubuntu
docker rm laboratorio-ubuntu
docker run -d --name laboratorio-ubuntu \
  --restart unless-stopped \
  -p 8080:80 -p 8081:8081 -p 8082:8082 \
  laboratorio-ubuntu-backup:latest \
  sleep infinity

docker exec laboratorio-ubuntu bash /opt/wallet/start-wallet.sh
```

> **ADVERTENCIA:** el contenedor **no tiene volúmenes** montados. Todo (código,
> las dos bases de datos y las páginas) vive en su filesystem interno, así que
> un `docker rm` sin el `docker commit` previo **destruye los datos**. Haz el
> respaldo y verifícalo antes de continuar.

### 2. Cambios en NGINX no se versionan

Los vhosts viven **solo dentro del contenedor** (`/etc/nginx/sites-available/`).
No hay copia en el repositorio, así que si se recrea el contenedor se pierden.
Si los editas, guárdalos también en el repo.

### 3. El smoke-test del pipeline espera `/health`

El job `smoke-test` valida `curl -fsS http://localhost:5000/health`. Esa ruta
solo existe si el vhost de NGINX proxea `/health`; si no, cae en el
`try_files` de la SPA y devuelve el `index.html` con **HTTP 200**, con lo que el
check da **falso positivo**. Cada vhost debe incluir:

```nginx
location = /health {
    proxy_pass http://127.0.0.1:5000;   # 5001 en QA
    proxy_set_header Host $host;
    access_log off;
}
```

### 4. `trust proxy` (rate limiting)

NGINX envía `X-Forwarded-For` y Express debe estar configurado con
`app.set('trust proxy', 1)` en producción. Sin eso, `express-rate-limit` ignora
la IP real, registra `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` y **todas las
peticiones comparten un único contador**, lo que hace que el límite de login se
consuma entre todos los clientes a la vez.

El valor debe ser `1` (un salto) y **nunca `true`**: con `true`, un cliente
directo podría falsificar la cabecera y evadir el límite por completo.
