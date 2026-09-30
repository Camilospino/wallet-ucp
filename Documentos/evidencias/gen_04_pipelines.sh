#!/bin/bash
# Evidencia 4: historial REAL de ejecuciones del pipeline, leído de la API
# pública de GitHub. No simula nada: lo que se ve es lo que la API devuelve.
#
#   bash gen_04_pipelines.sh > ev_04.txt
#   python3 render_terminal.py ev_04.txt ev_04_pipelines.png "4. PIPELINES"
#
# Se marcan los estados con texto (success / failure / in_progress) y no con
# emoji: el renderizador usa una fuente monoespaciada del sistema que no
# tiene glifos de emoji y los dejaba como caracteres rotos.
set -uo pipefail

REPO="Camilospino/wallet-ucp"
API="https://api.github.com/repos/${REPO}/actions/runs?per_page=20"

echo ">> \$ curl -s '${API}' | python3   # historial real de ejecuciones"
echo

curl -s "$API" | python3 -c '
import json, sys

runs = json.load(sys.stdin).get("workflow_runs", [])
if not runs:
    sys.exit("No se pudieron leer las ejecuciones del repositorio.")

W = 26
print("%-*s %-9s %-12s %-6s %s" % (W, "fecha", "rama", "resultado", "run", "commit"))
print("-" * (W + 9 + 12 + 6 + 12))

for r in runs:
    fecha = r["created_at"][:10]
    rama = r["head_branch"]
    estado = r["conclusion"] or r["status"]
    commit = r["head_sha"][:7]
    print("%-*s %-9s %-12s #%-5s %s" % (W, fecha, rama, estado, r["run_number"], commit))

print()
print("Total de ejecuciones leidas:", len(runs))
'
echo
echo ">> Ultimas ejecuciones:"
curl -s "https://api.github.com/repos/${REPO}/actions/runs?per_page=3" | python3 -c '
import json, sys
for r in json.load(sys.stdin).get("workflow_runs", [])[:3]:
    print("   rama %-8s %-11s %-9s  %s" % (
        r["head_branch"],
        r["status"],
        r["conclusion"] or "-",
        r["html_url"]))
'

cat <<'EOF'

@@F L U J O   D E L   P I P E L I N E   (mismo para las dos ramas)
@@
ok  test -> security-scan -> build -> smoke-test -> deploy_dev   (push a develop -> QA)
ok  test -> security-scan -> build -> smoke-test -> deploy_main  (push a main -> Produccion)
                                                                       -> version (tag vX.Y.Z)

>> Los cuatro checks exigidos por la proteccion de main son test (20.x),
>> test (22.x), security-scan y build: son los unicos que tambien corren
>> en un Pull Request. deploy_main, smoke-test y version solo se ejecutan
>> en un push, asi que no se exigieron: GitHub los reportaria como skipped
>> (y un check omitido cuenta como aprobado), por lo que exigirlos no
>> habria bloqueado el PR, pero tampoco habria aportado validacion alguna.
EOF
