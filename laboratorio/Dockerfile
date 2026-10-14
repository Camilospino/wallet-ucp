# ===========================================================================
# Imagen del laboratorio-ubuntu con Docker Engine interno.
#
# Parte de la imagen del laboratorio ya configurado (usuarios, runner de GitHub
# registrado, sitios en /var/www/html) y le agrega Docker + el stack de
# compose. La base NO es reproducible desde cero porque contiene el registro
# del runner; por eso se pasa como argumento.
#
#   docker build -t laboratorio-ubuntu-docker:latest \
#     --build-arg BASE_IMAGE=laboratorio-ubuntu-backup:pre-docker-20261012 \
#     -f laboratorio/Dockerfile .
# ===========================================================================
ARG BASE_IMAGE=laboratorio-ubuntu-configurado:latest
FROM ${BASE_IMAGE}

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      docker.io docker-compose-v2 docker-buildx iptables \
 && rm -rf /var/lib/apt/lists/*

# Codigo y esquema actuales del repositorio. Los .env de cada ambiente NO van
# en la imagen: se copian al contenedor al crearlo (ver OPERACIONES-LABORATORIO.md).
RUN rm -rf /opt/wallet/backend/src /opt/wallet/database
COPY backend/package.json backend/package-lock.json /opt/wallet/backend/
COPY backend/src /opt/wallet/backend/src
COPY database /opt/wallet/database
COPY laboratorio/docker /opt/wallet/docker
COPY laboratorio/start-wallet.sh laboratorio/entrypoint.sh laboratorio/preparar-ambientes.sh laboratorio/instalar-runner.sh /opt/wallet/
RUN mkdir -p /opt/wallet/docker/postgres/import \
 && chmod +x /opt/wallet/start-wallet.sh /opt/wallet/entrypoint.sh /opt/wallet/docker/postgres/00-init.sh

# Los datos de Docker interno (imagenes y el volumen de PostgreSQL) deben ir en
# un volumen: overlayfs sobre overlayfs no funciona y, ademas, asi sobreviven a
# que se recree el contenedor.
VOLUME /var/lib/docker

STOPSIGNAL SIGTERM
ENTRYPOINT ["/opt/wallet/entrypoint.sh"]
CMD []
