#!/bin/bash
echo ">> $ docker ps"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo
echo ">> $ docker exec laboratorio-ubuntu nginx -v"
docker exec laboratorio-ubuntu nginx -v 2>&1
echo
echo ">> $ docker exec laboratorio-ubuntu cat /etc/os-release | head -2"
docker exec laboratorio-ubuntu cat /etc/os-release 2>/dev/null | head -2
echo
echo ">> $ docker exec laboratorio-ubuntu node --version"
docker exec laboratorio-ubuntu node --version 2>/dev/null
echo
echo ">> Los DOS backends Node del servidor: cada ambiente con su base de datos"
docker exec laboratorio-ubuntu bash -c 'for p in 45 68; do
  port=$(tr "\0" "\n" < /proc/$p/environ | grep ^PORT= | cut -d= -f2)
  db=$(tr "\0" "\n" < /proc/$p/environ | grep ^DATABASE_URL= | sed "s|.*/||")
  env=$(tr "\0" "\n" < /proc/$p/environ | grep ^NODE_ENV= | cut -d= -f2)
  echo "  proceso node PID $p : PORT $port | NODE_ENV $env | base de datos $db"
done'
echo
echo ">> $ curl -s http://127.0.0.1:5000/health   (Produccion)"
docker exec laboratorio-ubuntu curl -s --max-time 5 http://127.0.0.1:5000/health; echo
echo ">> $ curl -s http://127.0.0.1:5001/health   (QA)"
docker exec laboratorio-ubuntu curl -s --max-time 5 http://127.0.0.1:5001/health; echo
