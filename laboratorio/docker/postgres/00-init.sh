#!/usr/bin/env bash
# ===========================================================================
# Inicializa el volumen de PostgreSQL la PRIMERA vez que se crea (la imagen
# oficial solo ejecuta /docker-entrypoint-initdb.d con el volumen vacio).
#
#  - Si existe /wallet-import/cluster.sql (un pg_dumpall), lo restaura: asi se
#    migran los datos del PostgreSQL nativo que tenia el laboratorio.
#  - Si no, crea desde cero el rol walletucp y las bases walletucp (produccion)
#    y walletucp_qa (QA) con las migraciones y los seeds del repositorio.
# ===========================================================================
set -euo pipefail

if [ -f /wallet-import/cluster.sql ]; then
  echo "[init] Restaurando respaldo /wallet-import/cluster.sql"
  # El respaldo incluye `CREATE ROLE postgres`, que ya existe: ese unico error
  # es esperado, por eso no se usa ON_ERROR_STOP en este paso.
  psql -v ON_ERROR_STOP=0 -U postgres -d postgres -q -f /wallet-import/cluster.sql
  # El respaldo trae la contrasena antigua del rol; se alinea con .env.
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -q \
    -c "ALTER ROLE walletucp WITH LOGIN PASSWORD '${WALLET_DB_PASSWORD}'"
  echo "[init] Restauracion terminada"
  exit 0
fi

echo "[init] Creando bases desde cero"
psql -v ON_ERROR_STOP=1 -U postgres -d postgres -q \
  -c "CREATE ROLE walletucp WITH LOGIN PASSWORD '${WALLET_DB_PASSWORD}'"

for db in walletucp walletucp_qa; do
  psql -v ON_ERROR_STOP=1 -U postgres -d postgres -q -c "CREATE DATABASE ${db} OWNER walletucp"
  for f in /wallet-database/migrations/*.sql /wallet-database/seeds/*.sql; do
    echo "[init] ${db}: $(basename "$f")"
    psql -v ON_ERROR_STOP=1 -U walletucp -d "${db}" -q --single-transaction -f "$f"
  done
done
echo "[init] Bases walletucp y walletucp_qa listas"
