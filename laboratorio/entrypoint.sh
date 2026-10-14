#!/usr/bin/env bash
# ===========================================================================
# PID 1 del contenedor laboratorio-ubuntu.
#
# Arranca todo el stack al encender el contenedor (antes habia que lanzar
# start-wallet.sh a mano) y, al recibir `docker stop`, apaga los contenedores
# internos de forma ordenada para que PostgreSQL cierre limpio.
# ===========================================================================
set -uo pipefail

COMPOSE=(docker compose -f /opt/wallet/docker/docker-compose.yml --env-file /opt/wallet/docker/.env)

apagar() {
  echo "[wallet] Apagando el laboratorio..."
  "${COMPOSE[@]}" stop -t 30
  pkill -TERM -f Runner.Listener 2>/dev/null
  pkill -TERM dockerd 2>/dev/null
  # Esperar a que dockerd libere sus ficheros antes de salir.
  for _ in $(seq 1 20); do
    pgrep -x dockerd > /dev/null || break
    sleep 1
  done
  exit 0
}
trap apagar TERM INT

/opt/wallet/start-wallet.sh

# `sleep` en segundo plano + `wait` permite que la trap se ejecute en cuanto
# llega la senal; un `sleep infinity` en primer plano la retrasaria.
sleep infinity &
wait $!
