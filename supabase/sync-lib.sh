#!/bin/sh
# Copia il codice condiviso (_lib) dentro ogni funzione come lib/.
# Le Edge Function vengono caricate una cartella alla volta: non possono
# importare da fuori. La sorgente da modificare resta _lib/ — le copie
# sono generate, non si toccano a mano.
set -e
cd "$(dirname "$0")/functions"
for f in api admin; do
  rm -rf "$f/lib"
  mkdir -p "$f/lib"
  cp _lib/*.ts "$f/lib/"
done
echo "lib/ sincronizzata in: api, admin"
