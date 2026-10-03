#!/bin/sh
set -e

# Asegura que el volumen de datos (/data) exista y sea escribible por node
# (uid 1000). Docker crea la raiz de los volumenes nombrados como root, asi
# que hay que ajustar el propietario en cada arranque.
mkdir -p /data
chown -R node:node /data

# Ejecuta el comando de la imagen (CMD) bajando privilegios a node.
exec su-exec node:node "$@"
