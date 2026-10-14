#!/usr/bin/env bash
# ===========================================================================
# Levanta TODO el stack de WalletUCP dentro del contenedor laboratorio-ubuntu.
#
# Lo ejecuta solo el entrypoint al arrancar el contenedor. Es idempotente, asi
# que tambien se puede lanzar a mano si algo se cae:
#
#   docker exec laboratorio-ubuntu bash /opt/wallet/start-wallet.sh
#
# Cubre: Docker Engine interno, el stack de compose (PostgreSQL, los dos
# backends y NGINX) y el runner de GitHub, que sigue siendo nativo.
# ===========================================================================
set -uo pipefail

COMPOSE=(docker compose -f /opt/wallet/docker/docker-compose.yml --env-file /opt/wallet/docker/.env)

log() { echo "[wallet] $*"; }

# ------------------------------------------------------------ Docker Engine
if docker info > /dev/null 2>&1; then
  log "Docker Engine ya esta arriba"
else
  log "Iniciando Docker Engine..."
  # Tras un `docker stop` del laboratorio quedan pid files viejos y dockerd se
  # niega a arrancar creyendo que ya hay otro corriendo.
  rm -f /var/run/docker.pid /run/docker/containerd/containerd.pid
  nohup dockerd > /var/log/dockerd.log 2>&1 &
  for _ in $(seq 1 30); do
    sleep 1
    docker info > /dev/null 2>&1 && break
  done
  if docker info > /dev/null 2>&1; then
    log "Docker Engine listo"
  else
    log "ERROR: dockerd no arranco. Revisa: docker exec laboratorio-ubuntu tail -30 /var/log/dockerd.log"
    exit 1
  fi
fi

# ------------------------------------------------------------ Stack compose
# Los servicios nativos de antes ocupaban los mismos puertos (5432, 80, 8081,
# 8082). Si alguien los arranco a mano, se detienen para no chocar. Se usa el
# pid file nativo y no `pgrep`, porque desde el Ubuntu tambien se ven los
# procesos nginx/postgres de los contenedores internos.
[ -f /run/nginx.pid ] && nginx -s stop 2>/dev/null
pg_lsclusters -h 2>/dev/null | grep -q online && pg_ctlcluster 16 main stop 2>/dev/null

# Permisos del runner sobre /var/www/html. Son ACLs, y `docker commit` / las
# capas de imagen no las conservan: sin ellas el deploy del pipeline falla con
# "rm: cannot remove '/var/www/html/wallet-ucp-qa': Permission denied".
# El script es idempotente, asi que se aplica en cada arranque.
bash /opt/wallet/preparar-ambientes.sh 2>&1 | sed 's/^/[wallet] /'

# Certificado autofirmado para el SSL de PostgreSQL. La clave debe pertenecer
# al usuario postgres de la imagen alpine (uid 70) con permisos 600, o
# PostgreSQL se niega a arrancar.
SSL_DIR=/opt/wallet/docker/postgres/ssl
if [ ! -f "${SSL_DIR}/server.key" ]; then
  log "Generando certificado SSL de PostgreSQL..."
  mkdir -p "${SSL_DIR}"
  openssl req -new -x509 -days 3650 -nodes -subj "/CN=postgres" \
    -keyout "${SSL_DIR}/server.key" -out "${SSL_DIR}/server.crt" > /dev/null 2>&1
  chown 70:70 "${SSL_DIR}/server.key" "${SSL_DIR}/server.crt"
  chmod 600 "${SSL_DIR}/server.key"
fi

log "Levantando contenedores (postgres, backend-prod, backend-qa, nginx)..."
if "${COMPOSE[@]}" up -d --wait --wait-timeout 180 2>&1 | sed 's/^/[wallet]   /'; then
  log "Contenedores sanos"
else
  log "ERROR: algun contenedor no quedo sano. Diagnostico:"
  "${COMPOSE[@]}" ps 2>&1 | sed 's/^/[wallet]   /'
  log "Logs: docker exec laboratorio-ubuntu docker logs wallet-backend-prod"
fi

# ------------------------------------------------------- Runner de GitHub
# El runner sigue siendo nativo: el pipeline copia el build a /var/www/html,
# carpeta que el contenedor de NGINX monta en solo lectura.
if pgrep -f Runner.Listener > /dev/null 2>&1; then
  log "Runner de GitHub ya esta activo"
elif [ "${WALLET_RUNNER:-1}" = "0" ]; then
  log "Runner de GitHub desactivado (WALLET_RUNNER=0)"
elif [ -x /actions-runner/run.sh ]; then
  log "Iniciando el runner de GitHub..."
  su -s /bin/bash github-runner -c \
    'cd /actions-runner && setsid nohup ./run.sh > /tmp/runner.log 2>&1 < /dev/null &' \
    > /dev/null 2>&1
  sleep 12
  if pgrep -f Runner.Listener > /dev/null 2>&1; then
    log "Runner escuchando jobs"
  else
    log "AVISO: el runner no arranco. Revisa: docker exec laboratorio-ubuntu tail -20 /tmp/runner.log"
  fi
else
  log "AVISO: no hay runner en /actions-runner (solo hace falta si despliegas con GitHub Actions)"
fi

# ------------------------------------------------------------- Comprobacion
echo
log "Estado final:"
"${COMPOSE[@]}" ps --format 'table {{.Name}}\t{{.Status}}' 2>&1 | sed 's/^/[wallet]   /'
for h in wallet-ucp-qa.local wallet-ucp.local; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${h}" http://127.0.0.1/ 2>/dev/null)
  log "  ${h} -> HTTP ${code}"
done
for p in 8081 8082; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${p}/" 2>/dev/null)
  health=$(curl -s "http://127.0.0.1:${p}/health" 2>/dev/null)
  log "  localhost:${p} -> HTTP ${code}  /health: ${health}"
done

echo
log "Desde el Mac (sin /etc/hosts):  http://localhost:8083 (QA) y http://localhost:8082 (Produccion)"
log "(Dentro del laboratorio QA escucha en 8081; el Mac lo publica en 8083 porque Expo usa el 8081.)"
