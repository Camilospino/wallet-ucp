#!/bin/bash
echo ">> $ ls /etc/nginx/sites-enabled/"
docker exec laboratorio-ubuntu ls /etc/nginx/sites-enabled/
echo
echo "@@===================== SERVER BLOCK: AMBIENTE QA ====================="
echo "@@   server_name wallet-ucp-qa.local  |  root /var/www/html/wallet-ucp-qa"
echo "@@   proxy /api/ -> 127.0.0.1:5001  ->  base de datos walletucp_qa"
echo "@@======================================================================"
docker exec laboratorio-ubuntu cat /etc/nginx/sites-enabled/wallet-ucp-qa
echo
echo "@@===================== SERVER BLOCK: PRODUCCION ======================"
echo "@@   server_name wallet-ucp.local  |  root /var/www/html/wallet-ucp-produccion"
echo "@@   proxy /api/ -> 127.0.0.1:5000  ->  base de datos walletucp"
echo "@@======================================================================"
docker exec laboratorio-ubuntu cat /etc/nginx/sites-enabled/wallet-ucp-produccion
