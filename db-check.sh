#!/bin/bash
# Consultar la base de datos de WalletUCP desde la terminal.
# Uso:  ./db-check.sh            -> menú con consultas útiles
#       ./db-check.sh saldos     -> saldos de todas las billeteras
#       ./db-check.sh movimientos-> ultimos movimientos contables
#       ./db-check.sh integrity  -> verifica cuadre del libro mayor
#       ./db-check.sh sql "SELECT ..."  -> consulta libre

q() { docker exec -i walletucp-postgres psql -U walletucp -d walletucp -c "$1"; }

case "$1" in
  saldos)
    q "SELECT u.email, u.rol, b.saldo, b.estado
       FROM billeteras b JOIN usuarios u ON u.id=b.usuario_id
       ORDER BY u.id;"
    ;;
  movimientos)
    q "SELECT m.id, u.email, m.tipo, m.monto,
              m.saldo_anterior, m.saldo_resultante, m.created_at
       FROM movimientos m
       JOIN billeteras b ON b.id=m.wallet_id
       JOIN usuarios u ON u.id=b.usuario_id
       ORDER BY m.id DESC LIMIT 20;"
    ;;
  transacciones)
    q "SELECT t.id, t.referencia, t.tipo, t.monto, t.estado, t.created_at
       FROM transacciones t ORDER BY t.id DESC LIMIT 20;"
    ;;
  integrity)
    echo "== Cuadre: saldo de la billetera vs suma de sus movimientos =="
    q "SELECT u.email, b.saldo AS saldo,
              COALESCE(SUM(CASE WHEN m.tipo='CREDIT' THEN m.monto ELSE -m.monto END),0) AS libro_mayor,
              CASE WHEN b.saldo = COALESCE(SUM(CASE WHEN m.tipo='CREDIT' THEN m.monto ELSE -m.monto END),0)
                   THEN 'OK' ELSE 'DESCUADRE' END AS estado
       FROM billeteras b
       JOIN usuarios u ON u.id=b.usuario_id
       LEFT JOIN movimientos m ON m.wallet_id=b.id
       GROUP BY u.email, b.saldo ORDER BY u.email;"
    ;;
  sql)
    q "$2"
    ;;
  *)
    echo "WalletUCP - consultas a la base de datos"
    echo ""
    echo "  ./db-check.sh saldos        Saldo de cada usuario"
    echo "  ./db-check.sh movimientos   Ultimos movimientos contables"
    echo "  ./db-check.sh transacciones Ultimas transacciones"
    echo "  ./db-check.sh integrity     Verifica que el libro mayor cuadre"
    echo "  ./db-check.sh sql \"SELECT ...\"   Consulta libre"
    echo ""
    echo "También puedes conectarte directamente:"
    echo "  docker exec -it walletucp-postgres psql -U walletucp -d walletucp"
    ;;
esac
