#!/usr/bin/env bash
# ===========================================================================
# Instalacion y registro del runner de GitHub para el repositorio wallet-ucp
# ===========================================================================
# Que hace este script:
#   1. Pide el token de GitHub SIN mostrarlo en pantalla.
#   2. Registra el runner contra Camilospino/wallet-ucp con el label
#      `self-hosted`, que es el que exige el pipeline.
#   3. Lo arranca en segundo plano.
#   4. Muestra como quedó.
#
# Uso (desde la Terminal de macOS):
#   docker exec -it laboratorio-ubuntu bash /opt/wallet/instalar-runner.sh
#
# El token NO se guarda en disco, NO aparece en el historial del shell y NO
# se muestra mientras lo escribes. Vive solo en memoria durante la ejecucion.
# ===========================================================================
set -euo pipefail

# `docker exec` sin terminal asignada deja TERM vacio y `clear` falla con
# "TERM environment variable not set". Se define uno por defecto para que el
# script funcione tanto con -it (interactivo) como sin TTY.
export TERM="${TERM:-xterm}"

REPO_URL="https://github.com/Camilospino/wallet-ucp"
RUNNER_DIR="/actions-runner"
RUNNER_NAME="Runner ubuntu wallet"
LABEL="self-hosted"

# No se usa `clear`: cuando docker exec no asigna terminal, TERM puede valer
# "dumb" y el comando falla, abortando el script por `set -e`.

echo "============================================================"
echo "  Registro del runner para wallet-ucp"
echo "============================================================"
echo
echo "  Repositorio : $REPO_URL"
echo "  Nombre      : $RUNNER_NAME"
echo "  Label       : $LABEL"
echo

if [ ! -x "${RUNNER_DIR}/bin/Runner.Listener" ]; then
  echo "ERROR: el binario del runner no esta en ${RUNNER_DIR}."
  exit 1
fi

# ----------------------------------------------------------------- 1. Token
echo "-----------------------------------------------------------"
echo "PASO 1 de 2: obtén el token en GitHub"
echo
echo "Abre esta pagina en el navegador:"
echo
echo "    https://github.com/settings/actions/runners/new"
echo
echo "  Runner image      :  LINUX   <- importante, NO macOS"
echo "  Architecture      :  ARM64"
echo "  Repository        :  wallet-ucp"
echo "  Runner name       :  Runner ubuntu wallet"
echo "  Labels            :  self-hosted"
echo "  Work folder       :  _work"
echo
echo "Le das Next y GitHub te muestra un comando asi:"
echo
echo "    ./config.sh --url https://github.com/Camilospino/wallet-ucp \\"
echo "                --token AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
echo
echo "Copia SOLO el token (la parte que empieza por A)."
echo "NO pegues el comando completo aqui."
echo
read -rsp "Pega tu token aqui (no se mostrara): " TOKEN
echo
echo

if [ -z "${TOKEN}" ]; then
  echo "ERROR: no se ingreso ningun token. Abortando."
  exit 1
fi

# Quita espacios o comillas que se haya copiado por error con el token.
TOKEN=$(printf '%s' "${TOKEN}" | tr -d "[:space:]'\"")

if [ "${#TOKEN}" -lt 20 ]; then
  echo "ERROR: el token es demasiado corto (${#TOKEN} caracteres)."
  echo "Se esperan al menos 20. Revisa que copiaste el token completo."
  exit 1
fi

if [[ ! "${TOKEN}" =~ ^[A-Za-z0-9]+$ ]]; then
  echo "AVISO: el token tiene caracteres inusuales. Se continuara igualmente."
fi

echo "  Token recibido (${#TOKEN} caracteres). Registrando..."
echo

# ------------------------------------------------- 2. Limpiar configuracion
echo "-----------------------------------------------------------"
echo "PASO 2 de 2: registrando..."
echo
cd "${RUNNER_DIR}"

# Si quedo un registro previo, se elimina para poder volver a ejecutar el script.
if [ -f .runner ]; then
  echo "  Se encontro un registro previo, se elimina..."
  ./config.sh remove --unattended > /dev/null 2>&1 || true
fi

# El runner debe poder escribir en los roots de los dos ambientes.
mkdir -p /var/www/html/wallet-ucp-qa /var/www/html/wallet-ucp-produccion
chown -R github-runner:deploy /var/www/html/wallet-ucp-qa /var/www/html/wallet-ucp-produccion 2>/dev/null || true

./config.sh --url "${REPO_URL}" --token "${TOKEN}" --name "${RUNNER_NAME}" --labels "${LABEL}" --work "_work" --replace

# Por seguridad: el token no debe quedar en el historial del shell.
set +o history 2>/dev/null || true

echo
echo "  Arrancando el runner en segundo plano..."
nohup ./run.sh > /tmp/runner.log 2>&1 &
sleep 8

if pgrep -f 'Runner.Listener' > /dev/null; then
  echo
  echo "============================================================"
  echo "  OK: el runner esta corriendo"
  echo "============================================================"
  echo
  echo "  Ahora haz esto:"
  echo
  echo "  1. Abre https://github.com/Camilospino/wallet-ucp/actions"
  echo "  2. El job 'build' deberia pasar de 'queued' a 'in progress'"
  echo "     en menos de un minuto."
  echo
  echo "  Ver el log del runner en cualquier momento con:"
  echo "     docker exec laboratorio-ubuntu tail -f /tmp/runner.log"
  echo
else
  echo "  El runner no arranco. Diagnostico:"
  echo
  tail -20 /tmp/runner.log || true
  echo
  echo "  Suele ser un token expirado. Genera uno nuevo en:"
  echo "  https://github.com/settings/actions/runners/new"
  exit 1
fi
