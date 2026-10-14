#!/usr/bin/env bash
# ===========================================================================
# Prepara los dos ambientes para que el runner pueda desplegar en ellos.
#
# El runner corre como `github-runner` (sin root) y el pipeline hace
# `rm -rf <carpeta>` antes de copiar. Para borrar una carpeta dentro de
# /var/www/html necesita permiso de escritura sobre ESA carpeta, y sobre el
# directorio padre para poder quitarla y volver a crearla.
#
# Se usa ACL y no `chown` para no cambiar el propietario de /var/www/html,
# donde viven los sitios de otros proyectos.
# ===========================================================================
set -euo pipefail

RUNNER_USER="github-runner"
WEB_ROOT="/var/www/html"

# ACL sobre el sitio raiz: el runner puede crear y borrar entradas propias.
setfacl -m "u:${RUNNER_USER}:rwx" "${WEB_ROOT}"
# Los archivos que cree el runner heredan permisos utilizables por NGINX.
setfacl -d -m "u:${RUNNER_USER}:rwx" "${WEB_ROOT}"

for d in wallet-ucp-qa wallet-ucp-produccion; do
  mkdir -p "${WEB_ROOT}/${d}"
  chown -R "${RUNNER_USER}:deploy" "${WEB_ROOT}/${d}"
  setfacl -R -m "u:${RUNNER_USER}:rwx" "${WEB_ROOT}/${d}"
done

echo "[ambientes] ACL aplicada en ${WEB_ROOT}"
echo "[ambientes] Carpetas listas: wallet-ucp-qa, wallet-ucp-produccion"
